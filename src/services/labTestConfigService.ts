/**
 * Lab Test Configuration Service
 * خدمة تكوين فحوصات المعمل
 */

import { supabase } from '../config/supabase';
import type {
    LabTestCategory,
    LabTestType,
    LabTestConfig,
    LabTestField,
    TestConfigWithFields,
    CreateTestCategoryData,
    CreateTestTypeData,
    CreateTestConfigData,
    CreateTestFieldData
} from '../types/labTests';

const mapConfig = (row: any): LabTestConfig => {
    const equipment =
        row?.equipment_links?.map((link: any) => link.equipment).filter(Boolean) || [];

    return {
        ...row,
        equipment
    } as LabTestConfig;
};

class LabTestConfigService {
    // =====================================================
    // Test Categories
    // =====================================================

    async getCategories(): Promise<LabTestCategory[]> {
        const { data, error } = await supabase
            .from('lab_test_categories')
            .select('*')
            .eq('is_active', true)
            .order('display_order', { ascending: true });

        if (error) throw error;
        return data || [];
    }

    async getCategoryById(id: string): Promise<LabTestCategory | null> {
        const { data, error } = await supabase
            .from('lab_test_categories')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;
        return data;
    }

    async createCategory(categoryData: CreateTestCategoryData): Promise<LabTestCategory> {
        const { data: user } = await supabase.auth.getUser();
        const { data: settings } = await supabase
            .from('settings')
            .select('main_company_id')
            .eq('id', 'global')
            .single();

        const { data, error } = await supabase
            .from('lab_test_categories')
            .insert({
                ...categoryData,
                company_id: settings?.main_company_id,
                created_by: user.user?.id
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    async updateCategory(id: string, updates: Partial<CreateTestCategoryData>): Promise<LabTestCategory> {
        const { data: user } = await supabase.auth.getUser();

        const { data, error } = await supabase
            .from('lab_test_categories')
            .update({
                ...updates,
                updated_by: user.user?.id
            })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    async deleteCategory(id: string): Promise<void> {
        const { error } = await supabase
            .from('lab_test_categories')
            .delete()
            .eq('id', id);

        if (error) throw error;
    }

    // =====================================================
    // Test Types
    // =====================================================

    async getTypesByCategory(categoryId: string): Promise<LabTestType[]> {
        const { data, error } = await supabase
            .from('lab_test_types')
            .select(`
                *,
                category:lab_test_categories(*)
            `)
            .eq('category_id', categoryId)
            .eq('is_active', true)
            .order('display_order', { ascending: true });

        if (error) throw error;
        return data || [];
    }

    async getAllTypes(): Promise<LabTestType[]> {
        const { data, error } = await supabase
            .from('lab_test_types')
            .select(`
                *,
                category:lab_test_categories(*)
            `)
            .eq('is_active', true)
            .order('display_order', { ascending: true });

        if (error) throw error;
        return data || [];
    }

    async getTypeById(id: string): Promise<LabTestType | null> {
        const { data, error } = await supabase
            .from('lab_test_types')
            .select(`
                *,
                category:lab_test_categories(*)
            `)
            .eq('id', id)
            .single();

        if (error) throw error;
        return data;
    }

    async createType(typeData: CreateTestTypeData): Promise<LabTestType> {
        const { data: user } = await supabase.auth.getUser();
        const { data: settings } = await supabase
            .from('settings')
            .select('main_company_id')
            .eq('id', 'global')
            .single();

        const { data, error } = await supabase
            .from('lab_test_types')
            .insert({
                ...typeData,
                company_id: settings?.main_company_id,
                created_by: user.user?.id
            })
            .select(`
                *,
                category:lab_test_categories(*)
            `)
            .single();

        if (error) throw error;
        return data;
    }

    async updateType(id: string, updates: Partial<CreateTestTypeData>): Promise<LabTestType> {
        const { data: user } = await supabase.auth.getUser();

        const { data, error } = await supabase
            .from('lab_test_types')
            .update({
                ...updates,
                updated_by: user.user?.id
            })
            .eq('id', id)
            .select(`
                *,
                category:lab_test_categories(*)
            `)
            .single();

        if (error) throw error;
        return data;
    }

    async deleteType(id: string): Promise<void> {
        const { error } = await supabase
            .from('lab_test_types')
            .delete()
            .eq('id', id);

        if (error) throw error;
    }

    // =====================================================
    // Test Configurations
    // =====================================================

    async getConfigsByType(typeId: string): Promise<LabTestConfig[]> {
        const { data, error } = await supabase
            .from('lab_tests_config')
            .select(`
                *,
                test_type:lab_test_types(
                    *,
                    category:lab_test_categories(*)
                ),
                equipment_links:lab_test_equipment(
                    equipment:lab_equipment(*)
                )
            `)
            .eq('test_type_id', typeId)
            .eq('is_active', true)
            .order('name', { ascending: true });

        if (error) throw error;
        return (data || []).map(mapConfig);
    }

    async getAllConfigs(): Promise<LabTestConfig[]> {
        const { data, error } = await supabase
            .from('lab_tests_config')
            .select(`
                *,
                test_type:lab_test_types(
                    *,
                    category:lab_test_categories(*)
                ),
                equipment_links:lab_test_equipment(
                    equipment:lab_equipment(*)
                )
            `)
            .eq('is_active', true)
            .order('name', { ascending: true });

        if (error) throw error;
        return (data || []).map(mapConfig);
    }

    async getConfigById(id: string): Promise<LabTestConfig | null> {
        const { data, error } = await supabase
            .from('lab_tests_config')
            .select(`
                *,
                test_type:lab_test_types(
                    *,
                    category:lab_test_categories(*)
                ),
                equipment_links:lab_test_equipment(
                    equipment:lab_equipment(*)
                )
            `)
            .eq('id', id)
            .single();

        if (error) throw error;
        return data ? mapConfig(data) : null;
    }

    async getConfigWithFields(id: string): Promise<TestConfigWithFields | null> {
        const { data, error } = await supabase
            .from('lab_tests_config')
            .select(`
                *,
                test_type:lab_test_types(
                    *,
                    category:lab_test_categories(*)
                ),
                fields:lab_test_fields(*),
                equipment_links:lab_test_equipment(
                    equipment:lab_equipment(*)
                )
            `)
            .eq('id', id)
            .single();

        if (error) throw error;

        if (!data) return null;

        // Sort fields by display_order
        if (data.fields) {
            data.fields.sort((a: LabTestField, b: LabTestField) => a.display_order - b.display_order);
        }

        return mapConfig(data) as TestConfigWithFields;
    }

    async createConfig(configData: CreateTestConfigData): Promise<TestConfigWithFields> {
        const { data: user } = await supabase.auth.getUser();
        const { data: settings } = await supabase
            .from('settings')
            .select('main_company_id')
            .eq('id', 'global')
            .single();

        const { fields, equipment_ids, ...testConfigData } = configData;

        // Create test config
        const { data: config, error: configError } = await supabase
            .from('lab_tests_config')
            .insert({
                ...testConfigData,
                company_id: settings?.main_company_id,
                created_by: user.user?.id
            })
            .select()
            .single();

        if (configError) throw configError;

        // Link equipment if provided
        if (equipment_ids !== undefined) {
            await this.setConfigEquipment(config.id, equipment_ids, user.user?.id);
        }

        // Create fields
        if (fields && fields.length > 0) {
            const fieldsToInsert = fields.map((field, index) => ({
                test_config_id: config.id,
                ...field,
                display_order: field.display_order ?? index
            }));

            const { error: fieldsError } = await supabase
                .from('lab_test_fields')
                .insert(fieldsToInsert);

            if (fieldsError) throw fieldsError;
        }

        // Return with fields
        const result = await this.getConfigWithFields(config.id);
        if (!result) throw new Error('Failed to fetch created config');
        return result;
    }

    async updateConfig(id: string, updates: Partial<CreateTestConfigData>): Promise<TestConfigWithFields> {
        const { data: user } = await supabase.auth.getUser();
        const { fields, equipment_ids, ...configUpdates } = updates;

        // Update test config
        const { error: configError } = await supabase
            .from('lab_tests_config')
            .update({
                ...configUpdates,
                updated_by: user.user?.id
            })
            .eq('id', id);

        if (configError) throw configError;

        if (equipment_ids !== undefined) {
            await this.setConfigEquipment(id, equipment_ids, user.user?.id);
        }

        // If fields are provided, replace all fields
        if (fields) {
            // Delete existing fields
            await supabase
                .from('lab_test_fields')
                .delete()
                .eq('test_config_id', id);

            // Insert new fields
            if (fields.length > 0) {
                const fieldsToInsert = fields.map((field, index) => ({
                    test_config_id: id,
                    ...field,
                    display_order: field.display_order ?? index
                }));

                const { error: fieldsError } = await supabase
                    .from('lab_test_fields')
                    .insert(fieldsToInsert);

                if (fieldsError) throw fieldsError;
            }
        }

        // Return with fields
        const result = await this.getConfigWithFields(id);
        if (!result) throw new Error('Failed to fetch updated config');
        return result;
    }

    async deleteConfig(id: string): Promise<void> {
        const { error } = await supabase
            .from('lab_tests_config')
            .delete()
            .eq('id', id);

        if (error) throw error;
    }

    async setConfigEquipment(configId: string, equipmentIds: string[], userId?: string | null): Promise<void> {
        const { error: deleteError } = await supabase
            .from('lab_test_equipment')
            .delete()
            .eq('test_config_id', configId);

        if (deleteError) throw deleteError;

        if (!equipmentIds || equipmentIds.length === 0) return;

        const rows = equipmentIds.map((equipmentId) => ({
            test_config_id: configId,
            equipment_id: equipmentId,
            created_by: userId ?? undefined
        }));

        const { error: insertError } = await supabase.from('lab_test_equipment').insert(rows);
        if (insertError) throw insertError;
    }

    // =====================================================
    // Test Fields
    // =====================================================

    async getFieldsByConfig(configId: string): Promise<LabTestField[]> {
        const { data, error } = await supabase
            .from('lab_test_fields')
            .select('*')
            .eq('test_config_id', configId)
            .order('display_order', { ascending: true });

        if (error) throw error;
        return data || [];
    }

    async updateField(fieldId: string, updates: Partial<CreateTestFieldData>): Promise<LabTestField> {
        const { data, error } = await supabase
            .from('lab_test_fields')
            .update(updates)
            .eq('id', fieldId)
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    async deleteField(fieldId: string): Promise<void> {
        const { error } = await supabase
            .from('lab_test_fields')
            .delete()
            .eq('id', fieldId);

        if (error) throw error;
    }

    // =====================================================
    // Search & Filter
    // =====================================================

    async searchConfigs(query: string): Promise<LabTestConfig[]> {
        const { data, error } = await supabase
            .from('lab_tests_config')
            .select(`
                *,
                test_type:lab_test_types(
                    *,
                    category:lab_test_categories(*)
                ),
                equipment_links:lab_test_equipment(
                    equipment:lab_equipment(*)
                )
            `)
            .or(`name.ilike.%${query}%,name_ar.ilike.%${query}%,code.ilike.%${query}%`)
            .eq('is_active', true)
            .limit(20);

        if (error) throw error;
        return (data || []).map(mapConfig);
    }
}

export const labTestConfigService = new LabTestConfigService();
export default labTestConfigService;
