/**
 * Unified Folders Service
 * Service for managing the new unified folder system for forms and reports
 */

import { supabase } from '../config/supabase';
import type { UnifiedFolder } from '../types/supabase';

// Re-export for backwards compatibility
export type { UnifiedFolder };
export type UnifiedFolderInsert = Partial<UnifiedFolder> & { name: string; type: string; path: string };
export type UnifiedFolderUpdate = Partial<UnifiedFolder>;

export interface FolderWithStats extends UnifiedFolder {
    department_name?: string;
    parent_folder_name?: string;
}

export interface UserAccessibleFolder {
    folder_id: string;
    folder_name: string;
    folder_type: string;
    department_name: string | null;
    is_shared: boolean;
    share_type: string | null;
}

/**
 * Get all folders accessible by the current user
 */
export async function getUserAccessibleFolders(): Promise<UserAccessibleFolder[]> {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const { data, error } = await supabase
            .rpc('get_user_accessible_folders', { user_id_param: user.id });

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error fetching user accessible folders:', error);
        throw error;
    }
}

/**
 * Get folders by department
 */
export async function getFoldersByDepartment(departmentId: string): Promise<UnifiedFolder[]> {
    try {
        const { data, error } = await supabase
            .from('unified_folders')
            .select('*')
            .eq('department_id', departmentId)
            .not('archived', 'is', true)
            .order('sort_order', { ascending: true })
            .order('name', { ascending: true });

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error fetching folders by department:', error);
        throw error;
    }
}

/**
 * Get default folder for a department
 */
export async function getDepartmentDefaultFolder(departmentId: string): Promise<UnifiedFolder | null> {
    try {
        const { data, error } = await supabase
            .from('unified_folders')
            .select('*')
            .eq('department_id', departmentId)
            .eq('is_default_for_department', true)
            .single();

        if (error) {
            if (error.code === 'PGRST116') return null; // No rows returned
            throw error;
        }
        return data;
    } catch (error) {
        console.error('Error fetching department default folder:', error);
        throw error;
    }
}

/**
 * Get folder by ID with related data
 */
export async function getFolderById(folderId: string): Promise<FolderWithStats | null> {
    try {
        const { data, error } = await supabase
            .from('unified_folders')
            .select(`
        *,
        department:department_id (
          name,
          name_en
        ),
        parent_folder:parent_id (
          name,
          name_en
        )
      `)
            .eq('id', folderId)
            .single();

        if (error) {
            if (error.code === 'PGRST116') return null;
            throw error;
        }

        return {
            ...data,
            department_name: data.department?.name || null,
            parent_folder_name: data.parent_folder?.name || null,
        } as FolderWithStats;
    } catch (error) {
        console.error('Error fetching folder by ID:', error);
        throw error;
    }
}

/**
 * Get child folders
 */
export async function getChildFolders(parentId: string): Promise<UnifiedFolder[]> {
    try {
        const { data, error } = await supabase
            .from('unified_folders')
            .select('*')
            .eq('parent_id', parentId)
            .not('archived', 'is', true)
            .order('sort_order', { ascending: true })
            .order('name', { ascending: true });

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error fetching child folders:', error);
        throw error;
    }
}

/**
 * Get folder path (breadcrumb trail)
 */
export async function getFolderPath(folderId: string): Promise<UnifiedFolder[]> {
    try {
        const folder = await getFolderById(folderId);
        if (!folder) return [];

        const pathIds = folder.path.split('/').filter(id => id !== '');

        if (pathIds.length === 0) return [folder];

        const { data, error } = await supabase
            .from('unified_folders')
            .select('*')
            .in('id', pathIds)
            .order('depth', { ascending: true });

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error fetching folder path:', error);
        throw error;
    }
}

/**
 * Create a new folder
 */
export async function createFolder(
    folderData: Omit<UnifiedFolderInsert, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'updated_by' | 'path' | 'depth'>
): Promise<UnifiedFolder> {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const { data, error } = await supabase
            .from('unified_folders')
            .insert({
                ...folderData,
                created_by: user.id,
                updated_by: user.id,
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error creating folder:', error);
        throw error;
    }
}

/**
 * Update folder
 */
export async function updateFolder(
    folderId: string,
    updates: UnifiedFolderUpdate
): Promise<UnifiedFolder> {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const { data, error } = await supabase
            .from('unified_folders')
            .update({
                ...updates,
                updated_by: user.id,
            })
            .eq('id', folderId)
            .select()
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error updating folder:', error);
        throw error;
    }
}

/**
 * Archive folder (soft delete)
 */
export async function archiveFolder(folderId: string): Promise<void> {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const { error } = await supabase
            .from('unified_folders')
            .update({
                archived: true,
                archived_at: new Date().toISOString(),
                archived_by: user.id,
            })
            .eq('id', folderId);

        if (error) throw error;
    } catch (error) {
        console.error('Error archiving folder:', error);
        throw error;
    }
}

/**
 * Delete folder permanently
 */
export async function deleteFolder(folderId: string): Promise<void> {
    try {
        const { error } = await supabase
            .from('unified_folders')
            .delete()
            .eq('id', folderId);

        if (error) throw error;
    } catch (error) {
        console.error('Error deleting folder:', error);
        throw error;
    }
}

/**
 * Move folder to a new parent
 */
export async function moveFolder(
    folderId: string,
    newParentId: string | null
): Promise<UnifiedFolder> {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const { data, error } = await supabase
            .from('unified_folders')
            .update({
                parent_id: newParentId,
                updated_by: user.id,
            })
            .eq('id', folderId)
            .select()
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error moving folder:', error);
        throw error;
    }
}

/**
 * Toggle folder favorite status
 */
export async function toggleFavorite(folderId: string): Promise<UnifiedFolder> {
    try {
        const folder = await getFolderById(folderId);
        if (!folder) throw new Error('Folder not found');

        return await updateFolder(folderId, {
            is_favorite: !folder.is_favorite,
        });
    } catch (error) {
        console.error('Error toggling favorite:', error);
        throw error;
    }
}

/**
 * Update folder stats manually
 */
export async function updateFolderStats(folderId: string): Promise<void> {
    try {
        const { error } = await supabase
            .rpc('update_folder_stats', { folder_id_param: folderId });

        if (error) throw error;
    } catch (error) {
        console.error('Error updating folder stats:', error);
        throw error;
    }
}

/**
 * Check if user can access a specific folder
 */
export async function canUserAccessFolder(
    folderId: string
): Promise<boolean> {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return false;

        const { data, error } = await supabase
            .rpc('can_user_access_content', {
                user_id_param: user.id,
                content_type_param: 'folder',
                content_id_param: folderId,
            });

        if (error) throw error;
        return data || false;
    } catch (error) {
        console.error('Error checking folder access:', error);
        return false;
    }
}

/**
 * Search folders by name
 */
export async function searchFolders(query: string, departmentId?: string): Promise<UnifiedFolder[]> {
    try {
        let queryBuilder = supabase
            .from('unified_folders')
            .select('*')
            .not('archived', 'is', true)
            .or(`name.ilike.%${query}%,name_en.ilike.%${query}%,description.ilike.%${query}%`);

        if (departmentId) {
            queryBuilder = queryBuilder.eq('department_id', departmentId);
        }

        const { data, error } = await queryBuilder
            .order('name', { ascending: true })
            .limit(50);

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error searching folders:', error);
        throw error;
    }
}

/**
 * Get recent folders (based on stats.last_activity)
 */
export async function getRecentFolders(limit: number = 10): Promise<UnifiedFolder[]> {
    try {
        const { data, error } = await supabase
            .from('unified_folders')
            .select('*')
            .not('archived', 'is', true)
            .not('stats->last_activity', 'is', null)
            .order('stats->last_activity', { ascending: false })
            .limit(limit);

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error fetching recent folders:', error);
        throw error;
    }
}

/**
 * Subscribe to folder changes
 */
export function subscribeFolderChanges(
    departmentId: string,
    callback: (payload: any) => void
) {
    const subscription = supabase
        .channel(`unified_folders:${departmentId}`)
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'unified_folders',
                filter: `department_id=eq.${departmentId}`,
            },
            callback
        )
        .subscribe();

    return () => {
        subscription.unsubscribe();
    };
}
