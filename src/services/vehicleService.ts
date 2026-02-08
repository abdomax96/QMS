/**
 * Vehicle Service
 * Handles vehicle registration, inspection, and management
 */

import type {
    Vehicle,
    VehicleInspection,
    RegisterVehicleInput,
    VehicleInspectionInput,
} from '../types/pallet';
import { supabase } from '../config/supabase';
import { VehicleStatus, InspectionStatus } from '../types/pallet';

export const vehicleService = {
    /**
     * Register a new vehicle
     */
    async registerVehicle(input: RegisterVehicleInput, companyId: string): Promise<Vehicle> {
        try {
            const { data, error } = await supabase
                .from('vehicles')
                .insert({
                    ...input,
                    company_id: companyId,
                    status: VehicleStatus.REGISTERED,
                    registered_at: new Date().toISOString(),
                })
                .select()
                .single();

            if (error) throw error;

            return data!;
        } catch (error) {
            console.error('Error registering vehicle:', error);
            throw error;
        }
    },

    /**
     * Get vehicle by ID
     */
    async getVehicle(vehicleId: string): Promise<Vehicle | null> {
        try {
            const { data, error } = await supabase
                .from('vehicles')
                .select('*')
                .eq('id', vehicleId)
                .single();

            if (error) throw error;

            return data;
        } catch (error) {
            console.error('Error getting vehicle:', error);
            return null;
        }
    },

    /**
     * Get vehicles for today (registered today)
     */
    async getTodayVehicles(companyId: string): Promise<Vehicle[]> {
        try {
            const today = new Date().toISOString().split('T')[0];

            const { data, error } = await supabase
                .from('vehicles')
                .select('*')
                .eq('company_id', companyId)
                .gte('registered_at', `${today}T00:00:00`)
                .lte('registered_at', `${today}T23:59:59`)
                .order('registered_at', { ascending: false });

            if (error) throw error;

            return data || [];
        } catch (error) {
            console.error('Error getting today vehicles:', error);
            return [];
        }
    },

    /**
     * Get pending vehicles (registered but not inspected)
     */
    async getPendingVehicles(companyId: string): Promise<Vehicle[]> {
        try {
            const { data, error } = await supabase
                .from('vehicles')
                .select('*')
                .eq('company_id', companyId)
                .eq('status', VehicleStatus.REGISTERED)
                .order('registered_at', { ascending: true });

            if (error) throw error;

            return data || [];
        } catch (error) {
            console.error('Error getting pending vehicles:', error);
            return [];
        }
    },

    /**
     * Create vehicle inspection
     */
    async createInspection(input: VehicleInspectionInput): Promise<VehicleInspection> {
        try {
            const { vehicle_id, ...inspectionData } = input;

            // Create inspection
            const { data: inspection, error: inspectionError } = await supabase
                .from('vehicle_inspections')
                .insert({
                    ...inspectionData,
                    vehicle_id,
                    inspected_by: (await supabase.auth.getUser()).data.user?.id,
                    inspected_at: new Date().toISOString(),
                })
                .select()
                .single();

            if (inspectionError) throw inspectionError;

            // Update vehicle status
            const newStatus = inspection.overall_status === InspectionStatus.PASSED
                ? VehicleStatus.INSPECTED
                : VehicleStatus.REGISTERED;

            const { error: updateError } = await supabase
                .from('vehicles')
                .update({ status: newStatus })
                .eq('id', vehicle_id);

            if (updateError) throw updateError;

            return inspection!;
        } catch (error) {
            console.error('Error creating inspection:', error);
            throw error;
        }
    },

    /**
     * Get vehicle inspection
     */
    async getVehicleInspection(vehicleId: string): Promise<VehicleInspection | null> {
        try {
            const { data, error } = await supabase
                .from('vehicle_inspections')
                .select('*')
                .eq('vehicle_id', vehicleId)
                .order('inspected_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (error) throw error;

            return data;
        } catch (error) {
            console.error('Error getting vehicle inspection:', error);
            return null;
        }
    },

    /**
     * Update vehicle status
     */
    async updateVehicleStatus(vehicleId: string, status: VehicleStatus): Promise<Vehicle> {
        try {
            const updates: Partial<Vehicle> = { status };

            if (status === VehicleStatus.DISPATCHED) {
                updates.dispatched_at = new Date().toISOString();
            }

            const { data, error } = await supabase
                .from('vehicles')
                .update(updates)
                .eq('id', vehicleId)
                .select()
                .single();

            if (error) throw error;

            return data!;
        } catch (error) {
            console.error('Error updating vehicle status:', error);
            throw error;
        }
    },

    /**
     * Get vehicle with inspection details
     */
    async getVehicleWithInspection(vehicleId: string): Promise<Vehicle & { inspection?: VehicleInspection }> {
        try {
            const { data, error } = await supabase
                .from('vehicles')
                .select(`
          *,
          inspection:vehicle_inspections(*)
        `)
                .eq('id', vehicleId)
                .single();

            if (error) throw error;

            return data!;
        } catch (error) {
            console.error('Error getting vehicle with inspection:', error);
            throw error;
        }
    },
};
