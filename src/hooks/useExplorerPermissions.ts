/**
 * useExplorerPermissions - Permission checks for Explorer operations
 * 
 * Wraps the core usePermissions hook with Explorer-specific permission codes.
 * Uses permission codes: explorer.create, explorer.delete, explorer.update, explorer.move
 */
import { useMemo } from 'react';
import { usePermissions } from './ncr/usePermissions';

export function useExplorerPermissions() {
    const { hasPermission, isAdmin, isSuperAdmin, loading } = usePermissions();

    return useMemo(() => ({
        // Folder permissions
        canCreateFolder: hasPermission('explorer.create') || hasPermission('folders.create'),
        canDeleteFolder: hasPermission('explorer.delete') || hasPermission('folders.delete'),
        canMoveFolder: hasPermission('explorer.update') || hasPermission('folders.update'),
        canRenameFolder: hasPermission('explorer.update') || hasPermission('folders.update'),

        // Template permissions
        canCreateTemplate: hasPermission('templates.create') || hasPermission('explorer.create'),
        canDeleteTemplate: hasPermission('templates.delete') || hasPermission('explorer.delete'),
        canMoveTemplate: hasPermission('templates.update') || hasPermission('explorer.update'),
        canDuplicateTemplate: hasPermission('templates.create') || hasPermission('explorer.create'),

        // Instance/Report permissions
        canDeleteInstance: hasPermission('instances.delete') || hasPermission('reports.delete') || hasPermission('explorer.delete'),
        canMoveInstance: hasPermission('instances.update') || hasPermission('reports.update') || hasPermission('explorer.update'),

        // General permissions
        canCopy: hasPermission('explorer.create'),
        canCut: hasPermission('explorer.update'),
        canPaste: hasPermission('explorer.create') || hasPermission('explorer.update'),

        // Admin status
        isAdmin,
        isSuperAdmin,
        loading,
    }), [hasPermission, isAdmin, isSuperAdmin, loading]);
}

export default useExplorerPermissions;
