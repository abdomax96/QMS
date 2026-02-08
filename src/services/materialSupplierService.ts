/**
 * Material-Supplier Linking Service
 * خدمة ربط المواد بالموردين
 */

import { supabase } from '../config/supabase';

export interface MaterialSupplierLink {
    id: string;
    raw_material_id: string;
    supplier_id: string;
    company_id?: string;
    is_primary: boolean;
    approval_status: 'pending' | 'approved' | 'suspended' | 'rejected';
    approval_date?: string;
    approved_by?: string;
    approval_notes?: string;
    valid_from?: string;
    valid_until?: string;
    active: boolean;
    created_at: string;
    updated_at: string;
    // Joined data
    raw_material?: { id: string; code: string; name: string };
    supplier?: { id: string; code: string; name: string };
}

// ==================== Get Links ====================

export async function getMaterialSuppliers(materialId: string): Promise<MaterialSupplierLink[]> {
    const { data, error } = await supabase
        .from('raw_material_suppliers')
        .select(`
            *,
            supplier:suppliers(id, code, name)
        `)
        .eq('raw_material_id', materialId)
        .eq('is_active', true)
        .order('is_primary', { ascending: false });

    if (error) {
        console.error('Error fetching material suppliers:', error);
        return [];
    }
    return data || [];
}

export async function getSupplierMaterials(supplierId: string): Promise<MaterialSupplierLink[]> {
    const { data, error } = await supabase
        .from('raw_material_suppliers')
        .select(`
            *,
            raw_material:raw_materials(id, code, name)
        `)
        .eq('supplier_id', supplierId)
        .eq('is_active', true)
        .order('is_primary', { ascending: false });

    if (error) {
        console.error('Error fetching supplier materials:', error);
        return [];
    }
    return data || [];
}

export async function getApprovedSuppliersForMaterial(materialId: string): Promise<MaterialSupplierLink[]> {
    const { data, error } = await supabase
        .from('raw_material_suppliers')
        .select(`
            *,
            supplier:suppliers(id, code, name, phone, email)
        `)
        .eq('raw_material_id', materialId)
        .eq('is_active', true)
        .eq('approval_status', 'approved')
        .order('is_primary', { ascending: false });

    if (error) {
        console.error('Error fetching approved suppliers:', error);
        return [];
    }
    return data || [];
}

// ==================== Create/Update Links ====================

export async function linkMaterialToSupplier(
    materialId: string,
    supplierId: string,
    companyId?: string,
    options?: {
        isPrimary?: boolean;
        approvalStatus?: 'pending' | 'approved' | 'suspended' | 'rejected';
        validFrom?: string;
        validUntil?: string;
        approvalNotes?: string;
    }
): Promise<MaterialSupplierLink | null> {
    // First, check if link already exists
    let query = supabase
        .from('raw_material_suppliers')
        .select('id, raw_material_id, supplier_id, company_id, is_primary, approval_status, approval_date, approved_by, approval_notes, valid_from, valid_until, active, created_at, updated_at')
        .eq('raw_material_id', materialId)
        .eq('supplier_id', supplierId);

    if (companyId) {
        query = query.eq('company_id', companyId);
    } else {
        query = query.is('company_id', null);
    }

    const { data: existing } = await query.maybeSingle();

    const now = new Date().toISOString();
    const linkData = {
        raw_material_id: materialId,
        supplier_id: supplierId,
        company_id: companyId || null,
        is_primary: options?.isPrimary || false,
        approval_status: options?.approvalStatus || 'pending',
        valid_from: options?.validFrom,
        valid_until: options?.validUntil,
        approval_notes: options?.approvalNotes,
        is_active: true,
        updated_at: now
    };

    if (existing) {
        // Update existing link
        const { data, error } = await supabase
            .from('raw_material_suppliers')
            .update(linkData)
            .eq('id', existing.id)
            .select()
            .single();

        if (error) {
            console.error('Error updating supplier link:', error);
            return null;
        }
        return data;
    } else {
        // Insert new link
        const { data, error } = await supabase
            .from('raw_material_suppliers')
            .insert({
                ...linkData,
                created_at: now
            })
            .select()
            .single();

        if (error) {
            console.error('Error linking supplier to material:', error);
            return null;
        }
        return data;
    }
}

export async function updateMaterialSupplierLink(
    linkId: string,
    updates: Partial<MaterialSupplierLink>
): Promise<boolean> {
    const { error } = await supabase
        .from('raw_material_suppliers')
        .update({
            ...updates,
            updated_at: new Date().toISOString()
        })
        .eq('id', linkId);

    if (error) {
        console.error('Error updating link:', error);
        return false;
    }
    return true;
}

export async function approveMaterialSupplier(
    linkId: string,
    approvedBy: string,
    notes?: string
): Promise<boolean> {
    const { error } = await supabase
        .from('raw_material_suppliers')
        .update({
            approval_status: 'approved',
            approval_date: new Date().toISOString(),
            approved_by: approvedBy,
            approval_notes: notes,
            updated_at: new Date().toISOString()
        })
        .eq('id', linkId);

    if (error) {
        console.error('Error approving link:', error);
        return false;
    }
    return true;
}

export async function setPrimarySupplier(materialId: string, supplierId: string): Promise<boolean> {
    // First, unset all primary flags for this material
    await supabase
        .from('raw_material_suppliers')
        .update({ is_primary: false })
        .eq('raw_material_id', materialId);

    // Then set the new primary
    const { error } = await supabase
        .from('raw_material_suppliers')
        .update({ is_primary: true, updated_at: new Date().toISOString() })
        .eq('raw_material_id', materialId)
        .eq('supplier_id', supplierId);

    if (error) {
        console.error('Error setting primary supplier:', error);
        return false;
    }
    return true;
}

// ==================== Remove Links ====================

export async function unlinkMaterialFromSupplier(linkId: string): Promise<boolean> {
    const { error } = await supabase
        .from('raw_material_suppliers')
        .update({
            is_active: false,
            updated_at: new Date().toISOString()
        })
        .eq('id', linkId);

    if (error) {
        console.error('Error unlinking:', error);
        return false;
    }
    return true;
}

export async function deleteMaterialSupplierLink(linkId: string): Promise<boolean> {
    const { error } = await supabase
        .from('raw_material_suppliers')
        .delete()
        .eq('id', linkId);

    if (error) {
        console.error('Error deleting link:', error);
        return false;
    }
    return true;
}

// ==================== Supplier Company Linking ====================

export async function updateSupplierCompany(supplierId: string, companyId: string | null): Promise<boolean> {
    const { error } = await supabase
        .from('suppliers')
        .update({
            company_id: companyId,
            updated_at: new Date().toISOString()
        })
        .eq('id', supplierId);

    if (error) {
        console.error('Error updating supplier company:', error);
        return false;
    }
    return true;
}

export async function getSuppliersByCompany(companyId: string): Promise<any[]> {
    const { data, error } = await supabase
        .from('suppliers')
        .select('id, code, name, contact_person, phone, email, address, approved, rating, company_id, is_active, created_at, updated_at')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .order('name');

    if (error) {
        console.error('Error fetching suppliers by company:', error);
        return [];
    }
    return data || [];
}
