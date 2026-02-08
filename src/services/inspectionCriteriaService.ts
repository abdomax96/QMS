import { supabase } from '../config/supabase';

export interface InspectionCriterion {
    id: string;
    code?: string;
    name: string;
    nameEn?: string;
    testType: 'chemical' | 'physical' | 'microbiological' | 'sensory';
    defaultParameters: any[];
    description?: string;
    active: boolean;
    companyId?: string;
    createdAt?: string;
    updatedAt?: string;
}

export async function getAllCriteria(companyId?: string): Promise<InspectionCriterion[]> {
    let query = supabase
        .from('inspection_criteria')
        .select('id, code, name, name_en, test_type, default_parameters, description, is_active, company_id, created_at, updated_at')
        .eq('is_active', true)
        .order('name');

    if (companyId) {
        query = query.eq('company_id', companyId);
    }

    const { data, error } = await query;

    if (error) {
        console.error('Error fetching criteria:', error);
        return [];
    }

    return (data || []).map(item => ({
        id: item.id,
        code: item.code,
        name: item.name,
        nameEn: item.name_en,
        testType: item.test_type,
        defaultParameters: item.default_parameters,
        description: item.description,
        active: item.is_active,
        companyId: item.company_id,
        createdAt: item.created_at,
        updatedAt: item.updated_at
    }));
}

export async function createCriterion(data: Omit<InspectionCriterion, 'id' | 'createdAt' | 'updatedAt'>): Promise<InspectionCriterion | null> {
    const { data: result, error } = await supabase
        .from('inspection_criteria')
        .insert({
            code: data.code,
            name: data.name,
            name_en: data.nameEn,
            test_type: data.testType,
            default_parameters: data.defaultParameters,
            description: data.description,
            is_active: data.active,
            company_id: data.companyId
        })
        .select()
        .single();

    if (error) {
        console.error('Error creating criterion:', error);
        throw error;
    }

    return {
        id: result.id,
        code: result.code,
        name: result.name,
        nameEn: result.name_en,
        testType: result.test_type,
        defaultParameters: result.default_parameters,
        description: result.description,
        active: result.is_active,
        companyId: result.company_id,
        createdAt: result.created_at,
        updatedAt: result.updated_at
    };
}

export async function updateCriterion(id: string, data: Partial<InspectionCriterion>): Promise<boolean> {
    const updateData: any = {
        updated_at: new Date().toISOString()
    };

    if (data.name !== undefined) updateData.name = data.name;
    if (data.nameEn !== undefined) updateData.name_en = data.nameEn;
    if (data.code !== undefined) updateData.code = data.code;
    if (data.testType !== undefined) updateData.test_type = data.testType;
    if (data.defaultParameters !== undefined) updateData.default_parameters = data.defaultParameters;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.active !== undefined) updateData.is_active = data.active;
    // company_id generally shouldn't change, but can be added if needed

    const { error } = await supabase
        .from('inspection_criteria')
        .update(updateData)
        .eq('id', id);

    if (error) {
        console.error('Error updating criterion:', error);
        return false;
    }
    return true;
}

export async function deleteCriterion(id: string): Promise<boolean> {
    const { error } = await supabase
        .from('inspection_criteria')
        .update({ is_active: false }) // Soft delete
        .eq('id', id);

    return !error;
}
