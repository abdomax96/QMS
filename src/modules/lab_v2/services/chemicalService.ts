import { supabase } from '../../../config/supabase';
import type { LabV2Chemical, LabV2ChemicalReceipt } from '../types/chemical.types';
import { getLabV2Context } from './labV2Context';

export const labV2ChemicalService = {
  async listChemicals(filters?: { search?: string; activeOnly?: boolean }): Promise<LabV2Chemical[]> {
    const ctx = await getLabV2Context();

    let query = supabase
      .from('lab_v2_chemicals')
      .select('*')
      .order('created_at', { ascending: false });

    if (ctx.company_id) query = query.eq('company_id', ctx.company_id);
    if (filters?.activeOnly) query = query.eq('is_active', true);
    if (filters?.search) {
      const s = filters.search.trim();
      if (s) {
        query = query.or(
          [
            `code.ilike.%${s}%`,
            `name.ilike.%${s}%`,
            `name_ar.ilike.%${s}%`,
            `cas_number.ilike.%${s}%`,
            `supplier.ilike.%${s}%`,
          ].join(',')
        );
      }
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data || []) as LabV2Chemical[];
  },

  async getChemicalById(id: string): Promise<LabV2Chemical | null> {
    const { data, error } = await supabase.from('lab_v2_chemicals').select('*').eq('id', id).single();
    if (error) throw error;
    return data as LabV2Chemical;
  },

  async createChemical(input: Partial<LabV2Chemical>): Promise<LabV2Chemical> {
    const ctx = await getLabV2Context();
    if (!ctx.company_id) throw new Error('Company is not set');

    const { data, error } = await supabase
      .from('lab_v2_chemicals')
      .insert({
        ...input,
        company_id: ctx.company_id,
        created_by: ctx.user_id,
        updated_by: ctx.user_id,
      })
      .select('*')
      .single();

    if (error) throw error;
    return data as LabV2Chemical;
  },

  async updateChemical(id: string, updates: Partial<LabV2Chemical>): Promise<LabV2Chemical> {
    const ctx = await getLabV2Context();
    const { data, error } = await supabase
      .from('lab_v2_chemicals')
      .update({
        ...updates,
        updated_by: ctx.user_id,
      })
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;
    return data as LabV2Chemical;
  },

  async deleteChemical(id: string): Promise<void> {
    const { error } = await supabase.from('lab_v2_chemicals').delete().eq('id', id);
    if (error) throw error;
  },

  async listReceipts(chemical_id?: string): Promise<LabV2ChemicalReceipt[]> {
    const ctx = await getLabV2Context();

    let query = supabase
      .from('lab_v2_chemical_receipts')
      .select('*')
      .order('received_date', { ascending: false });

    if (ctx.company_id) query = query.eq('company_id', ctx.company_id);
    if (chemical_id) query = query.eq('chemical_id', chemical_id);

    const { data, error } = await query;
    if (error) throw error;
    return (data || []) as LabV2ChemicalReceipt[];
  },

  async createReceipt(input: Partial<LabV2ChemicalReceipt> & { chemical_id: string }): Promise<LabV2ChemicalReceipt> {
    const ctx = await getLabV2Context();
    if (!ctx.company_id) throw new Error('Company is not set');

    const quantity = Number(input.quantity ?? 0);
    const remaining_quantity =
      input.remaining_quantity == null ? (Number.isFinite(quantity) ? quantity : null) : Number(input.remaining_quantity);

    const { data, error } = await supabase
      .from('lab_v2_chemical_receipts')
      .insert({
        ...input,
        remaining_quantity,
        company_id: ctx.company_id,
        created_by: ctx.user_id,
      })
      .select('*')
      .single();

    if (error) throw error;
    return data as LabV2ChemicalReceipt;
  },

  async updateReceipt(id: string, updates: Partial<LabV2ChemicalReceipt>): Promise<LabV2ChemicalReceipt> {
    const { data, error } = await supabase
      .from('lab_v2_chemical_receipts')
      .update({ ...updates })
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;
    return data as LabV2ChemicalReceipt;
  },
};

