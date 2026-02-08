/**
 * Recipe Service
 * خدمة إدارة الوصفات
 */

import { supabase } from '../config/supabase';
import type { Recipe, CreateRecipeInput, UpdateRecipeInput } from '../types/recipe';

// جلب جميع وصفات منتج معين
export async function getRecipesByProduct(productId: string): Promise<Recipe[]> {
    const { data, error } = await supabase
        .from('recipes')
        .select('id, product_id, name, name_en, version, is_default, is_active, ingredients, notes, permissions, created_by, created_at, updated_at')
        .eq('product_id', productId)
        .order('is_default', { ascending: false })
        .order('name');

    if (error) {
        console.error('Error fetching recipes:', error);
        return [];
    }

    return data || [];
}

// جلب وصفة واحدة بالمعرف
export async function getRecipeById(id: string): Promise<Recipe | null> {
    const { data, error } = await supabase
        .from('recipes')
        .select('id, product_id, name, name_en, version, is_default, is_active, ingredients, notes, permissions, created_by, created_at, updated_at')
        .eq('id', id)
        .single();

    if (error) {
        console.error('Error fetching recipe:', error);
        return null;
    }

    return data;
}

// إنشاء وصفة جديدة
export async function createRecipe(input: CreateRecipeInput): Promise<Recipe | null> {
    const { data: user } = await supabase.auth.getUser();

    const newRecipe = {
        ...input,
        version: input.version || 1,
        is_active: true,
        is_default: input.is_default || false,
        ingredients: input.ingredients || [],
        permissions: input.permissions || {
            view_roles: ['admin', 'manager', 'user'],
            edit_roles: ['admin', 'manager']
        },
        created_by: user?.user?.id || 'system',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
        .from('recipes')
        .insert([newRecipe])
        .select()
        .single();

    if (error) {
        console.error('Error creating recipe:', error);
        return null;
    }

    // إذا كانت الوصفة الجديدة افتراضية، نلغي الافتراضية من الوصفات الأخرى
    if (input.is_default && data) {
        await supabase
            .from('recipes')
            .update({ is_default: false })
            .eq('product_id', input.product_id)
            .neq('id', data.id);
    }

    return data;
}

// تحديث وصفة
export async function updateRecipe(id: string, updates: UpdateRecipeInput): Promise<Recipe | null> {
    const updateData = {
        ...updates,
        updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
        .from('recipes')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

    if (error) {
        console.error('Error updating recipe:', error);
        return null;
    }

    // إذا تم تعيينها كافتراضية، نلغي الافتراضية من الوصفات الأخرى
    if (updates.is_default && data) {
        await supabase
            .from('recipes')
            .update({ is_default: false })
            .eq('product_id', data.product_id)
            .neq('id', id);
    }

    return data;
}

// حذف وصفة
export async function deleteRecipe(id: string): Promise<boolean> {
    const { error } = await supabase
        .from('recipes')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('Error deleting recipe:', error);
        return false;
    }

    return true;
}

// نسخ وصفة (تكرار)
export async function duplicateRecipe(id: string, newName?: string): Promise<Recipe | null> {
    const original = await getRecipeById(id);
    if (!original) return null;

    const { data: user } = await supabase.auth.getUser();

    const duplicated = {
        product_id: original.product_id,
        name: newName || `${original.name} (نسخة)`,
        name_en: original.name_en ? `${original.name_en} (copy)` : undefined,
        version: 1,
        is_active: true,
        is_default: false,
        ingredients: original.ingredients,
        notes: original.notes,
        permissions: original.permissions,
        created_by: user?.user?.id || 'system',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
        .from('recipes')
        .insert([duplicated])
        .select()
        .single();

    if (error) {
        console.error('Error duplicating recipe:', error);
        return null;
    }

    return data;
}

// التحقق من صلاحية المستخدم للتعديل
export function canEditRecipe(recipe: Recipe, userRole: string): boolean {
    return recipe.permissions.edit_roles.includes(userRole);
}

// التحقق من صلاحية المستخدم للعرض
export function canViewRecipe(recipe: Recipe, userRole: string): boolean {
    return recipe.permissions.view_roles.includes(userRole);
}

// جلب عدد الوصفات لمنتج
export async function getRecipeCountByProduct(productId: string): Promise<number> {
    const { count, error } = await supabase
        .from('recipes')
        .select('*', { count: 'exact', head: true })
        .eq('product_id', productId);

    if (error) {
        console.error('Error counting recipes:', error);
        return 0;
    }

    return count || 0;
}
