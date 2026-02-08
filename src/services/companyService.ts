/**
 * Company Service - Supabase Integration
 * خدمة إدارة الشركات/العملاء
 */

import { supabase } from '../config/supabase';

export interface Company {
    id: string;
    code: string;
    name: string;
    nameEn?: string;
    logoUrl?: string;
    address?: string;
    phone?: string;
    email?: string;
    taxNumber?: string;
    active: boolean;
    createdAt: string;
    updatedAt: string;
}

export async function getAllCompanies(): Promise<Company[]> {
    const { data, error } = await supabase
        .from('companies')
        .select('id, code, name, name_en, logo_url, address, phone, email, tax_number, is_active, created_at, updated_at')
        .eq('is_active', true)
        .order('name');

    if (error) {
        console.error('Error fetching companies:', error);
        return [];
    }

    return (data || []).map(item => ({
        id: item.id,
        code: item.code,
        name: item.name,
        nameEn: item.name_en,
        logoUrl: item.logo_url,
        address: item.address,
        phone: item.phone,
        email: item.email,
        taxNumber: item.tax_number,
        active: item.is_active,
        createdAt: item.created_at,
        updatedAt: item.updated_at
    }));
}

export async function createCompany(data: Omit<Company, 'id' | 'createdAt' | 'updatedAt'>): Promise<Company | null> {
    const now = new Date().toISOString();

    const { data: result, error } = await supabase
        .from('companies')
        .insert({
            code: data.code,
            name: data.name,
            name_en: data.nameEn,
            logo_url: data.logoUrl,
            address: data.address,
            phone: data.phone,
            email: data.email,
            tax_number: data.taxNumber,
            is_active: data.active,
            created_at: now,
            updated_at: now
        })
        .select()
        .single();

    if (error) {
        console.error('Error creating company:', error);
        return null;
    }

    return {
        id: result.id,
        code: result.code,
        name: result.name,
        nameEn: result.name_en,
        logoUrl: result.logo_url,
        address: result.address,
        phone: result.phone,
        email: result.email,
        taxNumber: result.tax_number,
        active: result.is_active,
        createdAt: result.created_at,
        updatedAt: result.updated_at
    };
}

export async function updateCompany(id: string, data: Partial<Company>): Promise<boolean> {
    const { error } = await supabase
        .from('companies')
        .update({
            code: data.code,
            name: data.name,
            name_en: data.nameEn,
            logo_url: data.logoUrl,
            address: data.address,
            phone: data.phone,
            email: data.email,
            tax_number: data.taxNumber,
            is_active: data.active,
            updated_at: new Date().toISOString()
        })
        .eq('id', id);

    return !error;
}

export async function getCompanyById(id: string): Promise<Company | null> {
    const { data, error } = await supabase
        .from('companies')
        .select('id, code, name, name_en, logo_url, address, phone, email, tax_number, is_active, created_at, updated_at')
        .eq('id', id)
        .single();

    if (error) {
        console.error('Error fetching company:', error);
        return null;
    }

    return {
        id: data.id,
        code: data.code,
        name: data.name,
        nameEn: data.name_en,
        logoUrl: data.logo_url,
        address: data.address,
        phone: data.phone,
        email: data.email,
        taxNumber: data.tax_number,
        active: data.is_active,
        createdAt: data.created_at,
        updatedAt: data.updated_at
    };
}

export async function getMainCompanyId(): Promise<string | null> {
    const { data, error } = await supabase
        .from('settings')
        .select('main_company_id')
        .eq('id', 'global')
        .single();

    if (error) {
        // If error is PGRST116 (0 rows), return null silently
        if (error.code !== 'PGRST116') {
            console.error('Error fetching main company setting:', error);
        }
        return null;
    }

    return data.main_company_id;
}

export async function setMainCompanyId(companyId: string | null): Promise<boolean> {
    // We use update here to avoid overwriting other settings if we used upsert with partial data.
    // The global settings row is assumed to exist (created by GeneralSettings). 
    // If it doesn't exist, we might need to create it, but GeneralSettings handles the main record creation.

    // First try update
    const { error: updateError } = await supabase
        .from('settings')
        .update({
            main_company_id: companyId,
            updated_at: new Date().toISOString()
        })
        .eq('id', 'global');

    if (!updateError) return true;

    // If update failed (likely row doesn't exist), try upsert with minimal required fields
    // attempting to preserve potential concurrent creations. 
    // However, given the schema of settings is not strictly enforced in types, usage suggests it holds many config columns.
    // Better to fail and let GeneralSettings init the row, OR create a minimal row.
    // We'll fallback to upserting a minimal row if it fails, which is safer than doing nothing.

    const { error: upsertError } = await supabase
        .from('settings')
        .upsert({
            id: 'global',
            main_company_id: companyId,
            updated_at: new Date().toISOString()
        });

    if (upsertError) {
        console.error('Error saving main company setting:', upsertError);
        return false;
    }

    return true;
}
