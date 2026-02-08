/**
 * Lab Equipment Service
 * خدمة سجل أجهزة المختبر
 */

import { supabase } from '../config/supabase';
import type { LabEquipment, CreateLabEquipmentData, LabTestConfigSummary } from '../types/labTests';

type EquipmentRow = LabEquipment & {
    links?: { test_config?: LabTestConfigSummary }[];
};

class LabEquipmentService {
    async getEquipment(): Promise<LabEquipment[]> {
        const { data, error } = await supabase
            .from('lab_equipment')
            .select(
                `
                *,
                links:lab_test_equipment(
                    test_config:lab_tests_config(id, name, name_ar)
                )
            `
            )
            .order('name', { ascending: true });

        if (error) throw error;

        return (data || []).map((row: EquipmentRow) => ({
            ...row,
            linked_tests: row.links?.map((link) => link.test_config).filter(Boolean) || []
        }));
    }

    async createEquipment(data: CreateLabEquipmentData): Promise<LabEquipment> {
        const { data: user } = await supabase.auth.getUser();
        const { data: settings } = await supabase
            .from('settings')
            .select('main_company_id')
            .eq('id', 'global')
            .single();

        const { data: created, error } = await supabase
            .from('lab_equipment')
            .insert({
                ...data,
                company_id: settings?.main_company_id,
                created_by: user.user?.id
            })
            .select()
            .single();

        if (error) throw error;
        return { ...created, linked_tests: [] } as LabEquipment;
    }

    async updateEquipment(id: string, updates: Partial<CreateLabEquipmentData>): Promise<LabEquipment> {
        const { data: user } = await supabase.auth.getUser();

        const { data, error } = await supabase
            .from('lab_equipment')
            .update({
                ...updates,
                updated_by: user.user?.id
            })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data as LabEquipment;
    }

    async deleteEquipment(id: string): Promise<void> {
        const { error } = await supabase.from('lab_equipment').delete().eq('id', id);
        if (error) throw error;
    }
}

export const labEquipmentService = new LabEquipmentService();
export default labEquipmentService;
