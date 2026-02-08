/**
 * Content Sharing Service
 * Service for managing the advanced 3-level sharing system (Department/User/Role)
 */

import { supabase } from '../config/supabase';
import type { ContentShare } from '../types/supabase';

// Re-export for backwards compatibility
export type { ContentShare };
export type ContentShareInsert = Partial<ContentShare> & {
    content_type: string;
    content_id: string;
    shared_by_user_id: string;
    share_type: string;
};
export type ContentShareUpdate = Partial<ContentShare>;

export type ShareType = 'department' | 'user' | 'role' | 'public';
export type ContentType = 'folder' | 'form_template' | 'form_instance' | 'report';
export type PermissionLevel = 'view' | 'comment' | 'edit' | 'full';

export interface ShareWithDetails extends ContentShare {
    shared_by_user_name?: string;
    shared_by_department_name?: string;
    content_name?: string;
}

export interface SharePermissions {
    can_view: boolean;
    can_download: boolean;
    can_comment: boolean;
    can_edit: boolean;
    can_delete: boolean;
    can_share: boolean;
    can_export: boolean;
}

/**
 * Create a new share
 */
export async function createShare(
    shareData: {
        contentType: ContentType;
        contentId: string;
        shareType: ShareType;
        departments?: string[];
        users?: string[];
        roles?: string[];
        permissionLevel?: PermissionLevel;
        customPermissions?: SharePermissions;
        expiresAt?: string | null;
        title?: string;
        note?: string;
        notifyOnAccess?: boolean;
        notifyOnEdit?: boolean;
    }
): Promise<ContentShare> {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        // Get user's department
        const { data: userData } = await supabase
            .from('users')
            .select('department_id')
            .eq('id', user.id)
            .single();

        const { data, error } = await supabase
            .from('content_shares')
            .insert({
                content_type: shareData.contentType,
                content_id: shareData.contentId,
                shared_by_user_id: user.id,
                shared_by_department_id: userData?.department_id || null,
                share_type: shareData.shareType,
                shared_with_departments: shareData.departments || [],
                shared_with_users: shareData.users || [],
                shared_with_roles: shareData.roles || [],
                permission_level: shareData.permissionLevel || 'view',
                custom_permissions: shareData.customPermissions || {
                    can_view: true,
                    can_download: true,
                    can_comment: false,
                    can_edit: false,
                    can_delete: false,
                    can_share: false,
                    can_export: true,
                },
                expires_at: shareData.expiresAt || null,
                title: shareData.title || null,
                note: shareData.note || null,
                notify_on_access: shareData.notifyOnAccess || false,
                notify_on_edit: shareData.notifyOnEdit || false,
            })
            .select()
            .single();

        if (error) throw error;

        // Log the share activity
        await logShareActivity(data.id, 'created', user.id);

        return data;
    } catch (error) {
        console.error('Error creating share:', error);
        throw error;
    }
}

/**
 * Get shares I created
 */
export async function getMyShares(): Promise<ShareWithDetails[]> {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const { data, error } = await supabase
            .from('content_shares')
            .select(`
        *,
        shared_by_user:shared_by_user_id (name),
        shared_by_department:shared_by_department_id (name)
      `)
            .eq('shared_by_user_id', user.id)
            .eq('is_active', true)
            .order('created_at', { ascending: false });

        if (error) throw error;

        return (data || []).map(share => ({
            ...share,
            shared_by_user_name: share.shared_by_user?.name,
            shared_by_department_name: share.shared_by_department?.name,
        })) as ShareWithDetails[];
    } catch (error) {
        console.error('Error fetching my shares:', error);
        throw error;
    }
}

/**
 * Get shares shared with me
 */
export async function getSharedWithMe(): Promise<ShareWithDetails[]> {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        // Get user's department and roles
        const { data: userData } = await supabase
            .from('users')
            .select(`
        department_id,
        user_roles (role_id)
      `)
            .eq('id', user.id)
            .single();

        const roleIds = userData?.user_roles?.map((ur: any) => ur.role_id) || [];

        const { data, error } = await supabase
            .from('content_shares')
            .select(`
        *,
        shared_by_user:shared_by_user_id (name),
        shared_by_department:shared_by_department_id (name, name_en)
      `)
            .eq('is_active', true)
            .or(
                `shared_with_users.cs.{${user.id}}` +
                (userData?.department_id ? `,shared_with_departments.cs.{${userData.department_id}}` : '') +
                (roleIds.length > 0 ? `,shared_with_roles.cs.{${roleIds.join(',')}}` : '')
            )
            .order('created_at', { ascending: false });

        if (error) throw error;

        return (data || []).map(share => ({
            ...share,
            shared_by_user_name: share.shared_by_user?.name,
            shared_by_department_name: share.shared_by_department?.name || share.shared_by_department?.name_en,
        })) as ShareWithDetails[];
    } catch (error) {
        console.error('Error fetching shares with me:', error);
        throw error;
    }
}

/**
 * Get shares for specific content
 */
export async function getContentShares(
    contentType: ContentType,
    contentId: string
): Promise<ContentShare[]> {
    try {
        const { data, error } = await supabase
            .from('content_shares')
            .select('*')
            .eq('content_type', contentType)
            .eq('content_id', contentId)
            .eq('is_active', true)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error fetching content shares:', error);
        throw error;
    }
}

/**
 * Update share
 */
export async function updateShare(
    shareId: string,
    updates: ContentShareUpdate
): Promise<ContentShare> {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const { data, error } = await supabase
            .from('content_shares')
            .update(updates)
            .eq('id', shareId)
            .eq('shared_by_user_id', user.id) // Can only update own shares
            .select()
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error updating share:', error);
        throw error;
    }
}

/**
 * Revoke share (deactivate)
 */
export async function revokeShare(shareId: string): Promise<void> {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const { error } = await supabase
            .from('content_shares')
            .update({ is_active: false })
            .eq('id', shareId)
            .eq('shared_by_user_id', user.id);

        if (error) throw error;

        // Log the revocation
        await logShareActivity(shareId, 'revoked', user.id);
    } catch (error) {
        console.error('Error revoking share:', error);
        throw error;
    }
}

/**
 * Delete share permanently
 */
export async function deleteShare(shareId: string): Promise<void> {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const { error } = await supabase
            .from('content_shares')
            .delete()
            .eq('id', shareId)
            .eq('shared_by_user_id', user.id);

        if (error) throw error;
    } catch (error) {
        console.error('Error deleting share:', error);
        throw error;
    }
}

/**
 * Log share activity
 */
export async function logShareActivity(
    shareId: string,
    activityType: string,
    performedBy: string,
    metadata?: Record<string, any>
): Promise<void> {
    try {
        const { error } = await supabase
            .rpc('log_share_activity', {
                share_id_param: shareId,
                activity_type_param: activityType,
                performed_by_param: performedBy,
                metadata_param: metadata || {},
            });

        if (error) throw error;
    } catch (error) {
        console.error('Error logging share activity:', error);
        // Don't throw - activity logging is not critical
    }
}

/**
 * Get share activity log
 */
export async function getShareActivity(shareId: string): Promise<any[]> {
    try {
        const { data, error } = await supabase
            .from('share_activity_log')
            .select('*')
            .eq('share_id', shareId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error fetching share activity:', error);
        throw error;
    }
}

/**
 * Get share statistics
 */
export async function getShareStatistics(): Promise<{
    total_shares_created: number;
    total_shares_received: number;
    active_shares: number;
    expired_shares: number;
}> {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const [createdShares, receivedShares, activeShares, expiredShares] = await Promise.all([
            supabase.from('content_shares').select('id', { count: 'exact', head: true }).eq('shared_by_user_id', user.id),
            getSharedWithMe(),
            supabase.from('content_shares').select('id', { count: 'exact', head: true }).eq('shared_by_user_id', user.id).eq('is_active', true),
            supabase.from('content_shares').select('id', { count: 'exact', head: true }).eq('shared_by_user_id', user.id).not('expires_at', 'is', null).lt('expires_at', new Date().toISOString()),
        ]);

        return {
            total_shares_created: createdShares.count || 0,
            total_shares_received: receivedShares.length,
            active_shares: activeShares.count || 0,
            expired_shares: expiredShares.count || 0,
        };
    } catch (error) {
        console.error('Error fetching share statistics:', error);
        throw error;
    }
}

/**
 * Check if user has access to shared content
 */
export async function hasShareAccess(
    contentType: ContentType,
    contentId: string
): Promise<{
    hasAccess: boolean;
    share?: ContentShare;
    permissions?: SharePermissions;
}> {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { hasAccess: false };

        // Get user's department and roles
        const { data: userData } = await supabase
            .from('users')
            .select('department_id, user_roles (role_id)')
            .eq('id', user.id)
            .single();

        const roleIds = userData?.user_roles?.map((ur: any) => ur.role_id) || [];

        const { data, error } = await supabase
            .from('content_shares')
            .select('*')
            .eq('content_type', contentType)
            .eq('content_id', contentId)
            .eq('is_active', true)
            .or(
                `shared_with_users.cs.{${user.id}}` +
                (userData?.department_id ? `,shared_with_departments.cs.{${userData.department_id}}` : '') +
                (roleIds.length > 0 ? `,shared_with_roles.cs.{${roleIds.join(',')}}` : '')
            )
            .maybeSingle();

        if (error) throw error;

        if (!data) {
            return { hasAccess: false };
        }

        // Check expiration
        if (data.expires_at && new Date(data.expires_at) < new Date()) {
            return { hasAccess: false };
        }

        return {
            hasAccess: true,
            share: data,
            permissions: data.custom_permissions as SharePermissions,
        };
    } catch (error) {
        console.error('Error checking share access:', error);
        return { hasAccess: false };
    }
}

/**
 * Subscribe to share changes
 */
export function subscribeShareChanges(
    callback: (payload: any) => void
) {
    const subscription = supabase
        .channel('content_shares_changes')
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'content_shares',
            },
            callback
        )
        .subscribe();

    return () => {
        subscription.unsubscribe();
    };
}

/**
 * Batch share with multiple targets
 */
export async function batchShare(
    contentType: ContentType,
    contentIds: string[],
    shareConfig: {
        shareType: ShareType;
        departments?: string[];
        users?: string[];
        roles?: string[];
        permissionLevel?: PermissionLevel;
        note?: string;
    }
): Promise<ContentShare[]> {
    try {
        const shares: ContentShare[] = [];

        for (const contentId of contentIds) {
            const share = await createShare({
                contentType,
                contentId,
                ...shareConfig,
            });
            shares.push(share);
        }

        return shares;
    } catch (error) {
        console.error('Error batch sharing:', error);
        throw error;
    }
}
