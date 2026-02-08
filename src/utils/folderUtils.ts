/**
 * Folder Utilities
 * 
 * Utility functions for folder operations including:
 * - Depth calculation and validation
 * - Path building
 * - Circular reference detection
 */

import type { Folder } from '../types';

/** Maximum allowed folder nesting depth to prevent performance issues */
export const MAX_FOLDER_DEPTH = 10;

/**
 * Calculate the depth of a folder in the hierarchy
 * @param folderId The ID of the folder to check
 * @param folders Record of all folders
 * @returns The depth (0 = root level, 1 = first child, etc.)
 */
export function getFolderDepth(folderId: string | null, folders: Record<string, Folder>): number {
    if (!folderId) return 0;

    let depth = 0;
    let currentId: string | null = folderId;
    const visited = new Set<string>();

    while (currentId) {
        // Circular reference protection
        if (visited.has(currentId)) {
            console.warn('Circular folder reference detected:', currentId);
            return depth;
        }
        visited.add(currentId);

        const folder = folders[currentId];
        if (!folder) return depth;

        depth++;
        currentId = folder.parent_id;
    }

    return depth;
}

/**
 * Check if adding a folder at the given parent would exceed depth limit
 * @param parentId The parent folder ID (null for root)
 * @param folders Record of all folders
 * @returns true if the new folder would be within depth limit
 */
export function canCreateFolderAtDepth(parentId: string | null, folders: Record<string, Folder>): boolean {
    const parentDepth = getFolderDepth(parentId, folders);
    return parentDepth < MAX_FOLDER_DEPTH;
}

/**
 * Check if moving a folder would exceed depth limit or create circular reference
 * @param folderId The folder being moved
 * @param newParentId The target parent folder
 * @param folders Record of all folders
 * @returns Object with validation result and error message if invalid
 */
export function validateFolderMove(
    folderId: string,
    newParentId: string | null,
    folders: Record<string, Folder>
): { valid: boolean; error?: string } {
    // Can't move to itself
    if (folderId === newParentId) {
        return { valid: false, error: 'لا يمكن نقل المجلد إلى نفسه' };
    }

    // Check for circular reference (moving parent into child)
    if (newParentId) {
        let currentId: string | null = newParentId;
        const visited = new Set<string>();

        while (currentId) {
            if (currentId === folderId) {
                return { valid: false, error: 'لا يمكن نقل المجلد إلى مجلد فرعي منه' };
            }
            if (visited.has(currentId)) break;
            visited.add(currentId);
            currentId = folders[currentId]?.parent_id || null;
        }
    }

    // Calculate resulting depth
    const folderSubtreeDepth = getMaxSubtreeDepth(folderId, folders);
    const newParentDepth = getFolderDepth(newParentId, folders);
    const resultingMaxDepth = newParentDepth + 1 + folderSubtreeDepth;

    if (resultingMaxDepth > MAX_FOLDER_DEPTH) {
        return {
            valid: false,
            error: `تجاوز الحد الأقصى للعمق (${MAX_FOLDER_DEPTH} مستويات). العمق الناتج: ${resultingMaxDepth}`
        };
    }

    return { valid: true };
}

/**
 * Get the maximum depth of subfolders under a folder
 * @param folderId The root folder to check
 * @param folders Record of all folders
 * @returns Maximum depth of children (0 if no children)
 */
export function getMaxSubtreeDepth(folderId: string, folders: Record<string, Folder>): number {
    const children = Object.values(folders).filter(f => f.parent_id === folderId);

    if (children.length === 0) return 0;

    let maxChildDepth = 0;
    for (const child of children) {
        const childDepth = 1 + getMaxSubtreeDepth(child.id, folders);
        maxChildDepth = Math.max(maxChildDepth, childDepth);
    }

    return maxChildDepth;
}

/**
 * Build the full path string for a folder
 * @param folderId The folder ID
 * @param folders Record of all folders
 * @returns Path string like "/Parent/Child/GrandChild"
 */
export function buildFolderPath(folderId: string, folders: Record<string, Folder>): string {
    const pathParts: string[] = [];
    let currentId: string | null = folderId;
    const visited = new Set<string>();

    while (currentId) {
        if (visited.has(currentId)) break;
        visited.add(currentId);

        const folder = folders[currentId];
        if (!folder) break;

        pathParts.unshift(folder.name);
        currentId = folder.parent_id;
    }

    return '/' + pathParts.join('/');
}

/**
 * Get folder ancestry chain (for breadcrumbs)
 * @param folderId The folder ID
 * @param folders Record of all folders
 * @returns Array of folders from root to current
 */
export function getFolderAncestry(folderId: string | null, folders: Record<string, Folder>): Folder[] {
    if (!folderId) return [];

    const ancestry: Folder[] = [];
    let currentId: string | null = folderId;
    const visited = new Set<string>();

    while (currentId) {
        if (visited.has(currentId)) break;
        visited.add(currentId);

        const folder = folders[currentId];
        if (!folder) break;

        ancestry.unshift(folder);
        currentId = folder.parent_id;
    }

    return ancestry;
}
