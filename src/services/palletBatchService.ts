/**
 * Pallet Batch Service
 * Handles batch management operations
 */

import type {
  PalletBatch,
  PalletBatchWithRelations,
  CreatePalletBatchInput,
  CreateSessionRequest,
  CreateSessionResponse,
  RegistrationSession,
} from '../types/pallet';
import { supabase } from '../config/supabase';
import { BatchStatus } from '../types/pallet';
import { palletConfigService } from './palletConfigService';

export const palletBatchService = {
  /**
   * Create or get session for pallet registration
   */
  async createSession(request: CreateSessionRequest): Promise<CreateSessionResponse> {
    try {
      const { company_id, product_id, batch_number, form_instance_id, shift, shift_date, use_existing_batch } = request;

      // Get product info
      const { data: product, error: productError } = await supabase
        .from('products')
        .select('id, name, standard_cartons_per_pallet')
        .eq('id', product_id)
        .single();

      if (productError || !product) {
        throw new Error('Product not found');
      }

      // Get company info
      const { data: company, error: companyError } = await supabase
        .from('companies')
        .select('id, name')
        .eq('id', company_id)
        .single();

      if (companyError || !company) {
        throw new Error('Company not found');
      }

      // Get settings
      const { data: settings } = await supabase
        .from('pallet_settings')
        .select('allow_multiple_batches_per_pallet')
        .eq('company_id', company_id)
        .single();

      // Get effective cartons per pallet (product config > company default)
      let standardCartons = 48;
      try {
        standardCartons = await palletConfigService.getEffectiveCartonsPerPallet(product_id, company_id);
      } catch (e) {
        console.warn('Failed to get effective cartons per pallet, using default 48:', e);
      }

      let batch: PalletBatch | null = null;

      // Try to find existing batch
      if (use_existing_batch) {
        const { data: existingBatch } = await supabase
          .from('pallet_batches')
          .select('*')
          .eq('company_id', company_id)
          .eq('batch_number', batch_number)
          .maybeSingle();

        if (existingBatch && existingBatch.product_id !== product_id) {
          throw new Error('Batch belongs to a different product');
        }

        batch = existingBatch;
      }

      // Create new batch if not found
      if (!batch) {
        const { data: newBatch, error: batchError } = await supabase
          .from('pallet_batches')
          .insert({
            batch_number,
            company_id,
            product_id,
            production_date: shift_date || new Date().toISOString().split('T')[0],
            form_instance_id,
            status: BatchStatus.ACTIVE,
            is_rework: false,
          })
          .select()
          .single();

        if (batchError) throw batchError;
        batch = newBatch!;
      }

      // Calculate next pallet number
      const { data: lastPallet } = await supabase
        .from('pallets')
        .select('sequence_number')
        .eq('batch_id', batch!.id)
        .order('sequence_number', { ascending: false })
        .limit(1)
        .maybeSingle();

      const nextSequence = (lastPallet?.sequence_number || 0) + 1;
      const nextPalletNumber = `${batch_number}-P${String(nextSequence).padStart(3, '0')}`;

      // Fetch existing pallets for this batch (if any) to populate session history
      const { data: existingPallets } = await supabase
        .from('pallets')
        .select('*')
        .eq('batch_id', batch!.id)
        .order('created_at', { ascending: true }); // Order by creation to match history

      const session: RegistrationSession = {
        company_id,
        company_name: company.name,
        product_id,
        product_name: product.name,
        batch_id: batch!.id,
        batch_number,
        form_instance_id,
        shift,
        shift_date: shift_date || new Date().toISOString().split('T')[0],
        standard_cartons_per_pallet: standardCartons,
        allow_multiple_batches: settings?.allow_multiple_batches_per_pallet || false,
        registered_pallets: existingPallets || [], // Use existing pallets if found
        started_at: new Date().toISOString(),
        last_updated: new Date().toISOString(),
      };

      return {
        session,
        next_pallet_number: nextPalletNumber,
      };
    } catch (error) {
      console.error('Error creating session:', error);
      throw error;
    }
  },

  /**
   * Create a new batch
   */
  async createBatch(input: CreatePalletBatchInput): Promise<PalletBatch> {
    try {
      const { data, error } = await supabase
        .from('pallet_batches')
        .insert({
          ...input,
          status: BatchStatus.ACTIVE,
          is_rework: input.is_rework || false,
          created_by: (await supabase.auth.getUser()).data.user?.id,
        })
        .select()
        .single();

      if (error) throw error;

      return data!;
    } catch (error) {
      console.error('Error creating batch:', error);
      throw error;
    }
  },

  /**
   * Get batch by ID with relations
   */
  async getBatchWithRelations(batchId: string): Promise<PalletBatchWithRelations | null> {
    try {
      const { data, error } = await supabase
        .from('pallet_batches')
        .select(`
          *,
          product:products(id, name, name_ar),
          pallets:pallets(*),
          form_instance:form_instances(id, instance_number)
        `)
        .eq('id', batchId)
        .single();

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Error getting batch:', error);
      return null;
    }
  },

  /**
   * Get active batches for a company
   * Excludes batches where linked form_instance is archived (soft deleted)
   */
  async getActiveBatches(companyId: string, productId?: string): Promise<PalletBatch[]> {
    try {
      let query = supabase
        .from('pallet_batches')
        .select(`
          *,
          form_instances!left(archived)
        `)
        .eq('company_id', companyId)
        .eq('status', BatchStatus.ACTIVE)
        .order('created_at', { ascending: false });

      if (productId) {
        query = query.eq('product_id', productId);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Filter out batches with archived form_instances
      // Keep: manual batches (no form_instance_id) OR batches with active reports
      const filtered = (data || []).filter((batch: any) =>
        !batch.form_instance_id ||
        batch.form_instances?.archived === false
      );

      // Remove the nested form_instances object before returning
      return filtered.map((batch: any) => {
        const { form_instances, ...rest } = batch;
        return rest as PalletBatch;
      });
    } catch (error) {
      console.error('Error getting active batches:', error);
      return [];
    }
  },

  /**
   * Complete a batch
   */
  async completeBatch(batchId: string): Promise<PalletBatch> {
    try {
      const { data, error } = await supabase
        .from('pallet_batches')
        .update({
          status: BatchStatus.COMPLETED,
          completed_at: new Date().toISOString(),
        })
        .eq('id', batchId)
        .select()
        .single();

      if (error) throw error;

      return data!;
    } catch (error) {
      console.error('Error completing batch:', error);
      throw error;
    }
  },

  /**
   * Cancel a batch
   */
  async cancelBatch(batchId: string): Promise<PalletBatch> {
    try {
      const { data, error } = await supabase
        .from('pallet_batches')
        .update({
          status: BatchStatus.CANCELLED,
        })
        .eq('id', batchId)
        .select()
        .single();

      if (error) throw error;

      return data!;
    } catch (error) {
      console.error('Error cancelling batch:', error);
      throw error;
    }
  }
  ,

  /**
   * Get unique batch numbers from form instances for a specific product
   */
  async getBatchesFromReports(companyId: string, productId: string): Promise<string[]> {
    try {
      // 1. Find templates linked to this product (JSON query for basic_info -> product_id)
      const { data: templates, error: tmplError } = await supabase
        .from('form_templates')
        .select('id')
        .eq('company_id', companyId)
        .contains('basic_info', { product_id: productId });

      if (tmplError) throw tmplError;
      if (!templates || templates.length === 0) return [];

      const templateIds = templates.map(t => t.id);

      // 2. Find instances (reports) created from these templates
      const { data: instances, error: instError } = await supabase
        .from('form_instances')
        .select('form_data')
        .in('template_id', templateIds)
        .eq('archived', false) // ✅ FIX: Exclude deleted/archived reports
        .order('created_at', { ascending: false })
        .limit(50); // Limit to recent 50 reports for performance

      if (instError) throw instError;
      if (!instances || instances.length === 0) return [];

      // 3. Extract unique batch numbers from form_data
      const batches = new Set<string>();
      instances.forEach(inst => {
        // Option A: Standard field 'batch_number' in form_data root
        if (inst.form_data?.batch_number) {
          batches.add(inst.form_data.batch_number);
        }
      });

      return Array.from(batches);
    } catch (error) {
      console.error('Error fetching batches from reports:', error);
      return [];
    }
  },

  /**
   * Get shifts that have reports for a specific batch
   */
  async getShiftsForBatchReports(companyId: string, batchNumber: string): Promise<string[]> {
    try {
      const shifts = new Set<string>();

      // 1. Check Form Instances (QC Reports)
      const { data: instances, error: reportsError } = await supabase
        .from('form_instances')
        .select('form_data')
        .or(`company_id.eq.${companyId},company_id.is.null`) // ✅ FIX: Allow null company_id
        .eq('archived', false) // ✅ FIX: Exclude deleted/archived reports
        .contains('form_data', { batch_number: batchNumber })
        .order('created_at', { ascending: false });

      if (!reportsError && instances) {
        instances.forEach(inst => {
          const fd = inst.form_data || {};
          if (fd.shift) shifts.add(fd.shift);
          if (fd.Shift) shifts.add(fd.Shift);
        });
      }

      // Fallback: Fetch slightly larger set if strict key match failed (e.g. BatchNumber vs batch_number)
      if (shifts.size === 0) {
        const { data: fallbackInstances } = await supabase
          .from('form_instances')
          .select('form_data')
          .or(`company_id.eq.${companyId},company_id.is.null`) // ✅ FIX: Allow null company_id
          .eq('archived', false) // ✅ FIX: Exclude deleted/archived reports
          .order('created_at', { ascending: false })
          .limit(200);

        if (fallbackInstances) {
          fallbackInstances.forEach(inst => {
            const fd = inst.form_data || {};
            const bNum = fd.batch_number || fd.BatchNumber || fd.batch_id;
            if (bNum === batchNumber) {
              if (fd.shift) shifts.add(fd.shift);
              if (fd.Shift) shifts.add(fd.Shift);
            }
          });
        }
      }

      // 2. Check Pallet Contributions (Production Reports)
      // First get batch ID
      const { data: batch } = await supabase
        .from('pallet_batches')
        .select('id')
        .eq('company_id', companyId)
        .eq('batch_number', batchNumber)
        .single();

      if (batch) {
        // Get pallets for this batch
        const { data: pallets } = await supabase
          .from('pallets')
          .select('id')
          .eq('batch_id', batch.id);

        if (pallets && pallets.length > 0) {
          const palletIds = pallets.map(p => p.id);

          // Get shifts from contributions for these pallets
          const { data: contributions } = await supabase
            .from('pallet_contributions')
            .select('shift')
            .in('pallet_id', palletIds);

          if (contributions) {
            contributions.forEach(p => {
              if (p.shift) shifts.add(p.shift);
            });
          }
        }
      }

      return Array.from(shifts).sort();
    } catch (error) {
      console.error('Error fetching shifts from reports:', error);
      return [];
    }
  },

  /**
   * Get batch statistics
   */
  async getBatchStatistics(batchId: string): Promise<{
    total_pallets: number;
    completed_pallets: number;
    partial_pallets: number;
    total_cartons: number;
  }> {
    try {
      const { data, error } = await supabase
        .from('pallets')
        .select('status, actual_cartons')
        .eq('batch_id', batchId);

      if (error) throw error;

      const stats = {
        total_pallets: data?.length || 0,
        completed_pallets: data?.filter(p => p.status === 'complete').length || 0,
        partial_pallets: data?.filter(p => p.status === 'partial').length || 0,
        total_cartons: data?.reduce((sum, p) => sum + p.actual_cartons, 0) || 0,
      };

      return stats;
    } catch (error) {
      console.error('Error getting batch statistics:', error);
      throw error;
    }
  },

  // Get aggregated dashboard statistics
  async getDashboardStatistics(companyId: string): Promise<{
    stats: import('../types/pallet').PalletStatistics;
    loadingStats: import('../types/pallet').LoadingStatistics;
  }> {

    // 1. Fetch Pallet Stats
    const { data: pallets, error: palletError } = await supabase
      .from('pallets')
      .select('status, actual_cartons')
      .eq('company_id', companyId);

    if (palletError) throw palletError;

    const totalPallets = pallets.length;
    const totalCartons = pallets.reduce((sum, p) => sum + (p.actual_cartons || 0), 0);

    const palletsByStatus = pallets.reduce((acc, p) => {
      acc[p.status] = (acc[p.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // 2. Fetch Batch Stats
    const { data: batches, error: batchError } = await supabase
      .from('pallet_batches')
      .select('status')
      .eq('company_id', companyId);

    if (batchError) throw batchError;

    const totalBatches = batches.length;
    const activeBatches = batches.filter(b => b.status === 'active').length;
    const completedBatches = batches.filter(b => b.status === 'completed').length;

    // 3. Fetch Hold Stats
    const { data: holds, error: holdError } = await supabase
      .from('pallet_holds')
      .select('status, pallets!inner(company_id)')
      .eq('pallets.company_id', companyId);

    if (holdError) throw holdError;

    const holdsCount = holds.length;
    const activeHoldsCount = holds.filter(h => h.status === 'active').length;

    // 4. Fetch Loading Stats
    const { data: operations, error: opError } = await supabase
      .from('loading_operations')
      .select('status, vehicle_id, actual_pallets, actual_cartons')
      .eq('company_id', companyId);

    if (opError) throw opError;

    const totalOperations = operations.length;
    const operationsByStatus = operations.reduce((acc, op) => {
      acc[op.status] = (acc[op.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);


    const totalPalletsLoaded = operations.reduce((sum, op) => sum + (op.actual_pallets || 0), 0);
    const totalCartonsLoaded = operations.reduce((sum, op) => sum + (op.actual_cartons || 0), 0);
    const uniqueVehicles = new Set(operations.map(op => op.vehicle_id)).size;
    const totalVehicles = uniqueVehicles;

    return {
      stats: {
        total_batches: totalBatches,
        active_batches: activeBatches,
        completed_batches: completedBatches,
        total_pallets: totalPallets,
        pallets_by_status: {
          partial: palletsByStatus['partial'] || 0,
          complete: palletsByStatus['complete'] || 0,
          hold: palletsByStatus['hold'] || 0,
          partial_hold: palletsByStatus['partial_hold'] || 0,
          loaded: palletsByStatus['loaded'] || 0,
          partial_load: palletsByStatus['partial_load'] || 0,
          scrapped: palletsByStatus['scrapped'] || 0,
        },
        total_cartons: totalCartons,
        average_cartons_per_pallet: totalPallets > 0 ? Math.round(totalCartons / totalPallets) : 0,
        holds_count: holdsCount,
        active_holds_count: activeHoldsCount
      },
      loadingStats: {
        total_operations: totalOperations,
        operations_by_status: {
          planned: operationsByStatus['planned'] || 0,
          in_progress: operationsByStatus['in_progress'] || 0,
          completed: operationsByStatus['completed'] || 0,
          cancelled: operationsByStatus['cancelled'] || 0,
        },
        total_pallets_loaded: totalPalletsLoaded,
        total_cartons_loaded: totalCartonsLoaded,
        average_pallets_per_load: totalVehicles > 0 ? Math.round(totalPalletsLoaded / totalVehicles) : 0,
        vehicles_count: totalVehicles
      }
    };
  }
};
