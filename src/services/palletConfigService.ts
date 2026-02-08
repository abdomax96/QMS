/**
 * Pallet Configuration Service
 * CRUD operations for product pallet configurations and company settings
 */

import { supabase } from '../config/supabase';
import type {
    ProductPalletConfig,
    ProductPalletConfigInput,
    ProductPalletConfigWithProduct,
    PalletCompanySettings
} from '../types/palletConfig';

// =====================================================
// Product Pallet Configuration
// =====================================================

/**
 * Get pallet config for a specific product
 */
export async function getConfigByProductId(
    productId: string
): Promise<ProductPalletConfig | null> {
    const { data, error } = await supabase
        .from('product_pallet_config')
        .select('*')
        .eq('product_id', productId)
        .single();

    if (error && error.code !== 'PGRST116') {
        console.error('Error fetching pallet config:', error);
        throw error;
    }

    return data;
}

/**
 * Get all pallet configs for a company with product info
 */
export async function getConfigsByCompanyId(
    companyId: string
): Promise<ProductPalletConfigWithProduct[]> {
    const { data, error } = await supabase
        .from('product_pallet_config')
        .select(`
            *,
            product:products(id, name, sku)
        `)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching pallet configs:', error);
        throw error;
    }

    return data || [];
}

/**
 * Get products without pallet config (for adding new configs)
 */
export async function getProductsWithoutConfig(
    companyId: string
): Promise<Array<{ id: string; name: string; sku: string }>> {
    // Get all product IDs that have config
    const { data: configuredIds } = await supabase
        .from('product_pallet_config')
        .select('product_id')
        .eq('company_id', companyId);

    const excludeIds = configuredIds?.map(c => c.product_id) || [];

    // Get products not in the list
    let query = supabase
        .from('products')
        .select('id, name, sku')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .order('name');

    if (excludeIds.length > 0) {
        query = query.not('id', 'in', `(${excludeIds.join(',')})`);
    }

    const { data, error } = await query;

    if (error) {
        console.error('Error fetching products without config:', error);
        throw error;
    }

    return data || [];
}

/**
 * Create or update pallet config for a product
 */
export async function upsertConfig(
    productId: string,
    companyId: string,
    config: ProductPalletConfigInput
): Promise<ProductPalletConfig> {
    const { data: user } = await supabase.auth.getUser();
    const userId = user?.user?.id;

    const { data, error } = await supabase
        .from('product_pallet_config')
        .upsert({
            product_id: productId,
            company_id: companyId,
            carton_width_cm: config.carton_width_cm,
            carton_depth_cm: config.carton_depth_cm,
            carton_height_cm: config.carton_height_cm,
            pallet_width_cm: config.pallet_width_cm,
            pallet_depth_cm: config.pallet_depth_cm,
            pallet_max_height_cm: config.pallet_max_height_cm,
            cartons_per_layer: config.cartons_per_layer,
            number_of_layers: config.number_of_layers,
            base_pattern: config.base_pattern,
            alternate_layers: config.alternate_layers,
            layer_patterns: config.layer_patterns,
            shelf_life_variable_id: config.shelf_life_variable_id || null,
            notes: config.notes,
            updated_at: new Date().toISOString(),
            updated_by: userId,
        }, {
            onConflict: 'product_id'
        })
        .select()
        .single();

    if (error) {
        console.error('Error upserting pallet config:', error);
        throw error;
    }

    return data!;
}

/**
 * Delete pallet config
 */
export async function deleteConfig(configId: string): Promise<void> {
    const { error } = await supabase
        .from('product_pallet_config')
        .delete()
        .eq('id', configId);

    if (error) {
        console.error('Error deleting pallet config:', error);
        throw error;
    }
}

/**
 * Delete config by product ID
 */
export async function deleteConfigByProductId(productId: string): Promise<void> {
    const { error } = await supabase
        .from('product_pallet_config')
        .delete()
        .eq('product_id', productId);

    if (error) {
        console.error('Error deleting pallet config:', error);
        throw error;
    }
}

// =====================================================
// Company Settings
// =====================================================

/**
 * Get company-wide pallet settings
 */
export async function getCompanySettings(
    companyId: string
): Promise<PalletCompanySettings | null> {
    const { data, error } = await supabase
        .from('pallet_settings')
        .select('*')
        .eq('company_id', companyId)
        .single();

    if (error && error.code !== 'PGRST116') {
        console.error('Error fetching company settings:', error);
        throw error;
    }

    return data;
}

/**
 * Update company-wide pallet settings
 */
export async function updateCompanySettings(
    companyId: string,
    settings: Partial<PalletCompanySettings>
): Promise<PalletCompanySettings> {
    const { data: user } = await supabase.auth.getUser();
    const userId = user?.user?.id;

    const { data, error } = await supabase
        .from('pallet_settings')
        .upsert({
            company_id: companyId,
            ...settings,
            updated_at: new Date().toISOString(),
            updated_by: userId,
        }, {
            onConflict: 'company_id'
        })
        .select()
        .single();

    if (error) {
        console.error('Error updating company settings:', error);
        throw error;
    }

    return data!;
}

// =====================================================
// Helper Functions
// =====================================================

/**
 * Get effective cartons per pallet for a product
 * Returns product-specific config if exists, otherwise company default
 */
export async function getEffectiveCartonsPerPallet(
    productId: string,
    companyId: string
): Promise<number> {
    // Try product-specific config first
    const config = await getConfigByProductId(productId);
    if (config) {
        return config.total_cartons_per_pallet;
    }

    // Fall back to company default
    const companySettings = await getCompanySettings(companyId);
    return companySettings?.default_cartons_per_pallet || 48;
}

/**
 * Bulk create configs for products without config
 * Uses company default values
 */
export async function bulkCreateDefaultConfigs(
    companyId: string
): Promise<number> {
    const productsWithoutConfig = await getProductsWithoutConfig(companyId);

    if (productsWithoutConfig.length === 0) {
        return 0;
    }

    const companySettings = await getCompanySettings(companyId);
    const defaultCartons = companySettings?.default_cartons_per_pallet || 48;

    // Calculate default layers (try to make it divisible)
    const layers = defaultCartons <= 12 ? 1 :
        defaultCartons % 6 === 0 ? 6 :
        defaultCartons % 5 === 0 ? 5 :
        defaultCartons % 4 === 0 ? 4 : 6;

    const cartonsPerLayer = Math.ceil(defaultCartons / layers);

    const records = productsWithoutConfig.map(product => ({
        product_id: product.id,
        company_id: companyId,
        cartons_per_layer: cartonsPerLayer,
        number_of_layers: layers,
        base_pattern: 'brick',
        alternate_layers: true,
        layer_patterns: []
    }));

    const { error } = await supabase
        .from('product_pallet_config')
        .insert(records);

    if (error) {
        console.error('Error bulk creating configs:', error);
        throw error;
    }

    return productsWithoutConfig.length;
}

// Export as service object for consistent usage
export const palletConfigService = {
    getConfigByProductId,
    getConfigsByCompanyId,
    getProductsWithoutConfig,
    upsertConfig,
    deleteConfig,
    deleteConfigByProductId,
    getCompanySettings,
    updateCompanySettings,
    getEffectiveCartonsPerPallet,
    bulkCreateDefaultConfigs
};
