/**
 * Recycle Bin Service
 * Handles soft delete and restore operations
 * Uses Supabase with localStorage fallback for offline support
 */

import { supabase } from '../config/supabase';

export interface RecycleBinItem {
    id: string;
    originalId: string;
    type: 'folder' | 'template' | 'instance';
    name: string;
    deletedAt: string;
    deletedBy: string;
    originalPath: string;
    originalParentId: string | null;
    data: any; // The original item data
    expiresAt: string; // Auto-delete after this date
}

const STORAGE_KEY = 'qms_recycle_bin';
const DEFAULT_RETENTION_DAYS = 30;

// Convert DB record to RecycleBinItem
const dbToItem = (record: any): RecycleBinItem => ({
    id: record.id,
    originalId: record.original_id,
    type: record.item_type,
    name: record.name,
    deletedAt: record.deleted_at,
    deletedBy: record.deleted_by,
    originalPath: record.original_path || '/',
    originalParentId: record.original_parent_id,
    data: record.data,
    expiresAt: record.expires_at,
});


// Helper to check if a string is a valid UUID
const isValidUUID = (str: string): boolean => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
};

// Convert RecycleBinItem to DB format
const itemToDb = (item: RecycleBinItem) => ({
    id: item.id,
    original_id: item.originalId,
    item_type: item.type,
    name: item.name,
    deleted_at: item.deletedAt,
    deleted_by: isValidUUID(item.deletedBy) ? item.deletedBy : null, // Only use valid UUIDs
    original_path: item.originalPath,
    original_parent_id: item.originalParentId,
    data: item.data,
    expires_at: item.expiresAt,
});

const chunkArray = <T,>(items: T[], size: number): T[][] => {
    if (size <= 0) return [items];
    const chunks: T[][] = [];
    for (let i = 0; i < items.length; i += size) {
        chunks.push(items.slice(i, i + size));
    }
    return chunks;
};

const deleteByIds = async (table: string, ids: string[]): Promise<void> => {
    const uniqueIds = Array.from(new Set(ids.filter(Boolean)));
    if (uniqueIds.length === 0) return;

    const chunks = chunkArray(uniqueIds, 50);
    for (const chunk of chunks) {
        const { error } = await supabase
            .from(table)
            .delete()
            .in('id', chunk);
        if (error) throw error;
    }
};

const deleteInstancesByTemplate = async (templateId: string): Promise<void> => {
    const { error } = await supabase
        .from('form_instances')
        .delete()
        .eq('template_id', templateId);
    if (error) throw error;
};

const hardDeleteOriginalItem = async (item: RecycleBinItem): Promise<void> => {
    switch (item.type) {
        case 'instance': {
            try {
                await supabase.rpc('admin_delete_report', { p_report_id: item.originalId });
            } catch (error) {
                console.warn('admin_delete_report failed, falling back to direct delete:', error);
            }

            const { error } = await supabase
                .from('form_instances')
                .delete()
                .eq('id', item.originalId);
            if (error) throw error;
            break;
        }
        case 'template': {
            await deleteInstancesByTemplate(item.originalId);
            const { error } = await supabase
                .from('form_templates')
                .delete()
                .eq('id', item.originalId);
            if (error) throw error;
            break;
        }
        case 'folder': {
            const contents = item.data?.contents;
            if (contents) {
                const instanceIds = (contents.instances || [])
                    .map((instance: any) => instance.instance_id || instance.id)
                    .filter(Boolean);
                const templateIds = (contents.templates || [])
                    .map((template: any) => template.id)
                    .filter(Boolean);
                const folderIds = (contents.folders || [])
                    .map((folder: any) => folder.id)
                    .filter(Boolean);

                if (instanceIds.length > 0) {
                    await deleteByIds('form_instances', instanceIds);
                }

                if (templateIds.length > 0) {
                    await deleteByIds('form_templates', templateIds);
                }

                if (folderIds.length > 0) {
                    const sortedFolderIds = (contents.folders || [])
                        .slice()
                        .sort((a: any, b: any) => (b.path?.length || 0) - (a.path?.length || 0))
                        .map((folder: any) => folder.id)
                        .filter(Boolean);
                    await deleteByIds('unified_folders', sortedFolderIds);
                }
            }

            const { error } = await supabase
                .from('unified_folders')
                .delete()
                .eq('id', item.originalId);
            if (error) throw error;
            break;
        }
    }
};

// Load from localStorage (fallback)
const loadFromLocalStorage = (): RecycleBinItem[] => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            const items = JSON.parse(stored);
            const now = new Date();
            return items.filter((item: RecycleBinItem) => new Date(item.expiresAt) > now);
        }
    } catch (e) {
        console.error('Failed to load recycle bin from localStorage:', e);
    }
    return [];
};

// Save to localStorage (fallback)
const saveToLocalStorage = (items: RecycleBinItem[]): void => {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
        console.error('Failed to save recycle bin to localStorage:', e);
    }
};

// Load recycle bin from Supabase with localStorage fallback
export const loadRecycleBin = async (): Promise<RecycleBinItem[]> => {
    try {
        const { data, error } = await supabase
            .from('recycle_bin')
            .select('id, original_id, item_type, name, deleted_at, deleted_by, original_path, original_parent_id, data, expires_at')
            .gt('expires_at', new Date().toISOString())
            .order('deleted_at', { ascending: false });

        if (error) {
            console.warn('Supabase recycle bin load failed, using localStorage:', error.message);
            return loadFromLocalStorage();
        }

        // Trigger background cleanup
        cleanupExpiredItems().catch(console.error);

        return (data || []).map(dbToItem);
    } catch (e) {
        console.error('Failed to load recycle bin:', e);
        return loadFromLocalStorage();
    }
};

// Add item to recycle bin
export const addToRecycleBin = async (
    item: {
        id: string;
        type: 'folder' | 'template' | 'instance';
        name: string;
        path?: string;
        parentId?: string | null;
        data: any;
    },
    deletedBy: string,
    retentionDays: number = DEFAULT_RETENTION_DAYS
): Promise<RecycleBinItem> => {
    const recycleBinItem: RecycleBinItem = {
        id: crypto.randomUUID(),
        originalId: item.id,
        type: item.type,
        name: item.name,
        deletedAt: new Date().toISOString(),
        deletedBy,
        originalPath: item.path || '/',
        originalParentId: item.parentId || null,
        data: item.data,
        expiresAt: new Date(Date.now() + retentionDays * 24 * 60 * 60 * 1000).toISOString(),
    };

    try {
        const { error } = await supabase
            .from('recycle_bin')
            .insert(itemToDb(recycleBinItem));

        if (error) {
            console.warn('Supabase insert failed, using localStorage:', error.message);
            // Fallback to localStorage
            const items = loadFromLocalStorage();
            items.push(recycleBinItem);
            saveToLocalStorage(items);
        }
    } catch (e) {
        console.error('Error adding to recycle bin:', e);
        const items = loadFromLocalStorage();
        items.push(recycleBinItem);
        saveToLocalStorage(items);
    }

    return recycleBinItem;
};

// Remove item from recycle bin (for restore or permanent delete)
export const removeFromRecycleBin = async (id: string): Promise<RecycleBinItem | null> => {
    try {
        // First get the item
        const { data: item, error: fetchError } = await supabase
            .from('recycle_bin')
            .select('id, original_id, item_type, name, deleted_at, deleted_by, original_path, original_parent_id, data, expires_at')
            .eq('id', id)
            .single();

        if (fetchError || !item) {
            // Try localStorage
            const items = loadFromLocalStorage();
            const index = items.findIndex(i => i.id === id);
            if (index === -1) return null;
            const [removed] = items.splice(index, 1);
            saveToLocalStorage(items);
            return removed;
        }

        // Delete from Supabase
        const { error: deleteError } = await supabase
            .from('recycle_bin')
            .delete()
            .eq('id', id);

        if (deleteError) {
            console.error('Error removing from recycle bin:', deleteError);
            return null;
        }

        return dbToItem(item);
    } catch (e) {
        console.error('Error removing from recycle bin:', e);
        return null;
    }
};

// Permanently delete item from DB + remove from recycle bin
export const permanentlyDeleteItem = async (target: RecycleBinItem | string): Promise<RecycleBinItem | null> => {
    const item = typeof target === 'string' ? await getRecycleBinItem(target) : target;
    if (!item) return null;

    try {
        const { error } = await supabase.rpc('hard_delete_recycle_bin_item', {
            p_recycle_bin_id: item.id
        });
        if (!error) {
            return item;
        }
        console.warn('hard_delete_recycle_bin_item failed, falling back to client delete:', error);
    } catch (error) {
        console.warn('hard_delete_recycle_bin_item threw, falling back to client delete:', error);
    }

    await hardDeleteOriginalItem(item);
    await removeFromRecycleBin(item.id);
    return item;
};

// Get item from recycle bin
export const getRecycleBinItem = async (id: string): Promise<RecycleBinItem | null> => {
    try {
        const { data, error } = await supabase
            .from('recycle_bin')
            .select('id, original_id, item_type, name, deleted_at, deleted_by, original_path, original_parent_id, data, expires_at')
            .eq('id', id)
            .single();

        if (error || !data) {
            const items = loadFromLocalStorage();
            return items.find(item => item.id === id) || null;
        }

        return dbToItem(data);
    } catch (e) {
        console.error('Error getting recycle bin item:', e);
        return null;
    }
};

// Get all items in recycle bin
export const getRecycleBinItems = async (): Promise<RecycleBinItem[]> => {
    return loadRecycleBin();
};

// Clear all items from recycle bin
export const clearRecycleBin = async (): Promise<void> => {
    try {
        const { error } = await supabase
            .from('recycle_bin')
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

        if (error) {
            console.warn('Supabase clear failed, clearing localStorage:', error.message);
        }
    } catch (e) {
        console.error('Error clearing recycle bin:', e);
    }

    // Also clear localStorage
    saveToLocalStorage([]);
};

// Get recycle bin statistics
export const getRecycleBinStats = async (): Promise<{
    totalItems: number;
    folders: number;
    templates: number;
    instances: number;
    oldestItem: string | null;
    newestItem: string | null;
}> => {
    const items = await loadRecycleBin();

    return {
        totalItems: items.length,
        folders: items.filter(i => i.type === 'folder').length,
        templates: items.filter(i => i.type === 'template').length,
        instances: items.filter(i => i.type === 'instance').length,
        oldestItem: items.length > 0
            ? items.reduce((oldest, item) =>
                new Date(item.deletedAt) < new Date(oldest.deletedAt) ? item : oldest
            ).deletedAt
            : null,
        newestItem: items.length > 0
            ? items.reduce((newest, item) =>
                new Date(item.deletedAt) > new Date(newest.deletedAt) ? item : newest
            ).deletedAt
            : null,
    };
};

// Search recycle bin
export const searchRecycleBin = async (query: string): Promise<RecycleBinItem[]> => {
    try {
        const { data, error } = await supabase
            .from('recycle_bin')
            .select('id, original_id, item_type, name, deleted_at, deleted_by, original_path, original_parent_id, data, expires_at')
            .or(`name.ilike.%${query}%,original_path.ilike.%${query}%`)
            .gt('expires_at', new Date().toISOString());

        if (error || !data) {
            const items = loadFromLocalStorage();
            const lowerQuery = query.toLowerCase();
            return items.filter(item =>
                item.name.toLowerCase().includes(lowerQuery) ||
                item.originalPath.toLowerCase().includes(lowerQuery)
            );
        }

        return data.map(dbToItem);
    } catch (e) {
        console.error('Error searching recycle bin:', e);
        return [];
    }
};

// Sync localStorage items to Supabase (run on app startup)
export const syncLocalStorageToSupabase = async (): Promise<void> => {
    const localItems = loadFromLocalStorage();
    if (localItems.length === 0) return;

    try {
        for (const item of localItems) {
            const { error } = await supabase
                .from('recycle_bin')
                .upsert(itemToDb(item), { onConflict: 'id' });

            if (!error) {
                console.log(`Synced recycle bin item ${item.id} to Supabase`);
            }
        }
        // Clear localStorage after successful sync
        saveToLocalStorage([]);
    } catch (e) {
        console.error('Failed to sync localStorage to Supabase:', e);
    }
};



// Cleanup expired items
const cleanupExpiredItems = async () => {
    try {
        if (!navigator.onLine) return; // Only cleanup when online

        const { error } = await supabase
            .from('recycle_bin')
            .delete()
            .lt('expires_at', new Date().toISOString());

        if (error) {
            console.error('Failed to cleanup expired items:', error);
        } else {
            // Also cleanup localStorage
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                const items = JSON.parse(stored);
                const now = new Date();
                const validItems = items.filter((item: RecycleBinItem) => new Date(item.expiresAt) > now);
                if (validItems.length !== items.length) {
                    saveToLocalStorage(validItems);
                }
            }
        }
    } catch (error) {
        console.error('Error in cleanupExpiredItems:', error);
    }
};

export default {
    loadRecycleBin,
    addToRecycleBin,
    removeFromRecycleBin,
    permanentlyDeleteItem,
    getRecycleBinItem,
    getRecycleBinItems,
    clearRecycleBin,
    getRecycleBinStats,
    searchRecycleBin,
    syncLocalStorageToSupabase,
};

