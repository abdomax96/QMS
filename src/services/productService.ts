/**
 * Product Service
 * خدمة إدارة المنتجات وخطوط الإنتاج
 */

import { supabase } from '../config/supabase';
import type { Product, ProductionLine } from '../types/product';

// ==================== PRODUCTION LINES ====================

export async function getProductionLines(companyId?: string): Promise<ProductionLine[]> {
    let query = supabase
        .from('production_lines')
        .select('id, code, name, description, is_active, company_id, created_at, updated_at')
        .order('name', { ascending: true });

    if (companyId) {
        query = query.eq('company_id', companyId);
    }

    const { data, error } = await query;
    if (error) {
        console.error('Error fetching production lines:', error);
        return [];
    }
    return data || [];
}

export async function createProductionLine(line: Omit<ProductionLine, 'id' | 'created_at' | 'updated_at'>): Promise<ProductionLine | null> {
    const { data, error } = await supabase
        .from('production_lines')
        .insert({
            ...line,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        })
        .select()
        .single();

    if (error) {
        console.error('Error creating production line:', error);
        return null;
    }
    return data;
}

export async function updateProductionLine(id: string, updates: Partial<ProductionLine>): Promise<boolean> {
    const { error } = await supabase
        .from('production_lines')
        .update({
            ...updates,
            updated_at: new Date().toISOString()
        })
        .eq('id', id);

    if (error) {
        console.error('Error updating production line:', error);
        return false;
    }
    return true;
}

export async function deleteProductionLine(id: string): Promise<boolean> {
    const { error } = await supabase
        .from('production_lines')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('Error deleting production line:', error);
        return false;
    }
    return true;
}

// ==================== PRODUCTS ====================

export async function getProducts(companyId?: string, lineId?: string): Promise<Product[]> {
    let query = supabase
        .from('products')
        .select(`
            *,
            production_line:production_lines(id, name, code)
        `)
        .order('name', { ascending: true });

    if (companyId) {
        query = query.eq('company_id', companyId);
    }
    if (lineId) {
        query = query.eq('production_line_id', lineId);
    }

    const { data, error } = await query;
    if (error) {
        console.error('Error fetching products:', error);
        return [];
    }
    return data || [];
}

// Get only active products (for use in forms and dropdowns)
export async function getActiveProducts(companyId?: string, lineId?: string): Promise<Product[]> {
    let query = supabase
        .from('products')
        .select(`
            *,
            production_line:production_lines(id, name, code)
        `)
        .eq('is_active', true)
        .order('name', { ascending: true });

    if (companyId) {
        query = query.eq('company_id', companyId);
    }
    if (lineId) {
        query = query.eq('production_line_id', lineId);
    }

    const { data, error } = await query;
    if (error) {
        console.error('Error fetching active products:', error);
        return [];
    }
    return data || [];
}

export async function getProductById(id: string): Promise<Product | null> {
    const { data, error } = await supabase
        .from('products')
        .select(`
            *,
            production_line:production_lines(id, name, code)
        `)
        .eq('id', id)
        .single();

    if (error) {
        console.error('Error fetching product:', error);
        return null;
    }
    return data;
}

export async function createProduct(product: Omit<Product, 'id' | 'created_at' | 'updated_at'>): Promise<Product | null> {
    const { data, error } = await supabase
        .from('products')
        .insert({
            ...product,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        })
        .select()
        .single();

    if (error) {
        console.error('Error creating product:', error);
        return null;
    }
    return data;
}

export async function updateProduct(id: string, updates: Partial<Product>): Promise<boolean> {
    const { error } = await supabase
        .from('products')
        .update({
            ...updates,
            updated_at: new Date().toISOString()
        })
        .eq('id', id);

    if (error) {
        console.error('Error updating product:', error);
        return false;
    }
    return true;
}

export async function deleteProduct(id: string): Promise<boolean> {
    const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('Error deleting product:', error);
        return false;
    }
    return true;
}

/**
 * Get allergens for a product based on its recipe ingredients
 * حساب مسببات الحساسية للمنتج بناءً على خامات الوصفة
 */
export async function getProductAllergens(productId: string): Promise<string[]> {
    try {
        // Get the default active recipe for the product
        const { data: recipes, error: recipeError } = await supabase
            .from('recipes')
            .select('id, ingredients')
            .eq('product_id', productId)
            .eq('is_active', true)
            .order('is_default', { ascending: false })
            .limit(1);

        if (recipeError || !recipes || recipes.length === 0) {
            return [];
        }

        const recipe = recipes[0];
        const ingredients = recipe.ingredients as any[];

        if (!ingredients || ingredients.length === 0) {
            return [];
        }

        // Extract material IDs from ingredients
        const materialIds = ingredients
            .map((ing: any) => ing.materialId || ing.material_id)
            .filter((id: string) => id);

        if (materialIds.length === 0) {
            return [];
        }

        // Fetch allergens from raw materials
        const { data: materials, error: materialError } = await supabase
            .from('raw_materials')
            .select('allergens')
            .in('id', materialIds);

        if (materialError || !materials) {
            return [];
        }

        // Collect unique allergens
        const allergensSet = new Set<string>();
        materials.forEach((mat: any) => {
            if (mat.allergens && Array.isArray(mat.allergens)) {
                mat.allergens.forEach((a: string) => allergensSet.add(a));
            }
        });

        return Array.from(allergensSet);
    } catch (error) {
        console.error('Error calculating product allergens:', error);
        return [];
    }
}

/**
 * Get allergens for multiple products
 * حساب مسببات الحساسية لعدة منتجات
 */
export async function getProductsAllergens(productIds: string[]): Promise<Map<string, string[]>> {
    const result = new Map<string, string[]>();

    // Fetch all recipes for these products
    const { data: recipes, error } = await supabase
        .from('recipes')
        .select('product_id, ingredients')
        .in('product_id', productIds)
        .eq('is_active', true);

    if (error || !recipes) {
        return result;
    }

    // Collect all material IDs
    const allMaterialIds = new Set<string>();
    const productIngredients = new Map<string, string[]>();

    recipes.forEach((recipe: any) => {
        const ingredients = recipe.ingredients as any[];
        const matIds: string[] = [];
        if (ingredients && Array.isArray(ingredients)) {
            ingredients.forEach((ing: any) => {
                const matId = ing.materialId || ing.material_id;
                if (matId) {
                    allMaterialIds.add(matId);
                    matIds.push(matId);
                }
            });
        }
        productIngredients.set(recipe.product_id, matIds);
    });

    // Fetch all materials allergens
    if (allMaterialIds.size === 0) {
        return result;
    }

    const { data: materials } = await supabase
        .from('raw_materials')
        .select('id, allergens')
        .in('id', Array.from(allMaterialIds));

    if (!materials) {
        return result;
    }

    // Create material allergens map
    const materialAllergens = new Map<string, string[]>();
    materials.forEach((mat: any) => {
        materialAllergens.set(mat.id, mat.allergens || []);
    });

    // Calculate allergens for each product
    productIngredients.forEach((matIds, productId) => {
        const allergensSet = new Set<string>();
        matIds.forEach(matId => {
            const allergens = materialAllergens.get(matId) || [];
            allergens.forEach(a => allergensSet.add(a));
        });
        result.set(productId, Array.from(allergensSet));
    });

    return result;
}
