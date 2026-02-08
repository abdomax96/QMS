/**
 * useUnifiedFolders Hook
 * React hook for managing unified folders with real-time updates and caching
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import * as unifiedFoldersService from '../services/unifiedFoldersService';
import type { UnifiedFolder, UserAccessibleFolder, FolderWithStats } from '../services/unifiedFoldersService';
import useStore from '../store';

export interface UseUnifiedFoldersOptions {
    departmentId?: string;
    parentId?: string | null;
    autoLoad?: boolean;
    enableRealtime?: boolean;
}

export interface UseUnifiedFoldersReturn {
    folders: UnifiedFolder[];
    loading: boolean;
    error: Error | null;

    // CRUD Operations
    createFolder: (folderData: any) => Promise<UnifiedFolder>;
    updateFolder: (folderId: string, updates: any) => Promise<UnifiedFolder>;
    archiveFolder: (folderId: string) => Promise<void>;
    deleteFolder: (folderId: string) => Promise<void>;
    moveFolder: (folderId: string, newParentId: string | null) => Promise<UnifiedFolder>;

    // Helpers
    toggleFavorite: (folderId: string) => Promise<UnifiedFolder>;
    refreshFolders: () => Promise<void>;
    getFolderById: (folderId: string) => Promise<FolderWithStats | null>;
    canAccess: (folderId: string) => Promise<boolean>;
}

/**
 * Hook for managing unified folders
 */
export function useUnifiedFolders(options: UseUnifiedFoldersOptions = {}): UseUnifiedFoldersReturn {
    const {
        departmentId,
        parentId,
        autoLoad = true,
        enableRealtime = true,
    } = options;

    const [folders, setFolders] = useState<UnifiedFolder[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const user = useStore((state) => state.user);

    // Load folders
    const loadFolders = useCallback(async () => {
        if (!autoLoad || !user) return;

        setLoading(true);
        setError(null);

        try {
            let data: UnifiedFolder[];

            if (departmentId) {
                data = await unifiedFoldersService.getFoldersByDepartment(departmentId);
            } else if (parentId) {
                data = await unifiedFoldersService.getChildFolders(parentId);
            } else {
                const accessible = await unifiedFoldersService.getUserAccessibleFolders();
                // Map to UnifiedFolder format (simplified)
                data = accessible as any; // Will need proper mapping
            }

            setFolders(data);
        } catch (err) {
            setError(err as Error);
        } finally {
            setLoading(false);
        }
    }, [departmentId, parentId, autoLoad, user]);

    // Initial load
    useEffect(() => {
        loadFolders();
    }, [loadFolders]);

    // Real-time updates
    useEffect(() => {
        if (!enableRealtime || !departmentId) return;

        const unsubscribe = unifiedFoldersService.subscribeFolderChanges(
            departmentId,
            (payload) => {
                console.log('Folder change detected:', payload);
                loadFolders(); // Reload on any change
            }
        );

        return unsubscribe;
    }, [enableRealtime, departmentId, loadFolders]);

    // Create folder
    const createFolder = useCallback(async (folderData: any) => {
        try {
            const newFolder = await unifiedFoldersService.createFolder(folderData);
            setFolders(prev => [...prev, newFolder]);
            return newFolder;
        } catch (err) {
            setError(err as Error);
            throw err;
        }
    }, []);

    // Update folder
    const updateFolder = useCallback(async (folderId: string, updates: any) => {
        try {
            const updated = await unifiedFoldersService.updateFolder(folderId, updates);
            setFolders(prev => prev.map(f => f.id === folderId ? updated : f));
            return updated;
        } catch (err) {
            setError(err as Error);
            throw err;
        }
    }, []);

    // Archive folder
    const archiveFolder = useCallback(async (folderId: string) => {
        try {
            await unifiedFoldersService.archiveFolder(folderId);
            setFolders(prev => prev.filter(f => f.id !== folderId));
        } catch (err) {
            setError(err as Error);
            throw err;
        }
    }, []);

    // Delete folder
    const deleteFolder = useCallback(async (folderId: string) => {
        try {
            await unifiedFoldersService.deleteFolder(folderId);
            setFolders(prev => prev.filter(f => f.id !== folderId));
        } catch (err) {
            setError(err as Error);
            throw err;
        }
    }, []);

    // Move folder
    const moveFolder = useCallback(async (folderId: string, newParentId: string | null) => {
        try {
            const moved = await unifiedFoldersService.moveFolder(folderId, newParentId);
            setFolders(prev => prev.map(f => f.id === folderId ? moved : f));
            return moved;
        } catch (err) {
            setError(err as Error);
            throw err;
        }
    }, []);

    // Toggle favorite
    const toggleFavorite = useCallback(async (folderId: string) => {
        try {
            const updated = await unifiedFoldersService.toggleFavorite(folderId);
            setFolders(prev => prev.map(f => f.id === folderId ? updated : f));
            return updated;
        } catch (err) {
            setError(err as Error);
            throw err;
        }
    }, []);

    // Refresh folders
    const refreshFolders = useCallback(async () => {
        await loadFolders();
    }, [loadFolders]);

    // Get folder by ID
    const getFolderById = useCallback(async (folderId: string) => {
        try {
            return await unifiedFoldersService.getFolderById(folderId);
        } catch (err) {
            setError(err as Error);
            throw err;
        }
    }, []);

    // Check access
    const canAccess = useCallback(async (folderId: string) => {
        try {
            return await unifiedFoldersService.canUserAccessFolder(folderId);
        } catch (err) {
            return false;
        }
    }, []);

    return {
        folders,
        loading,
        error,
        createFolder,
        updateFolder,
        archiveFolder,
        deleteFolder,
        moveFolder,
        toggleFavorite,
        refreshFolders,
        getFolderById,
        canAccess,
    };
}

/**
 * Hook for a single folder
 */
export function useFolder(folderId: string | null) {
    const [folder, setFolder] = useState<FolderWithStats | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const loadFolder = useCallback(async () => {
        if (!folderId) {
            setFolder(null);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const data = await unifiedFoldersService.getFolderById(folderId);
            setFolder(data);
        } catch (err) {
            setError(err as Error);
        } finally {
            setLoading(false);
        }
    }, [folderId]);

    useEffect(() => {
        loadFolder();
    }, [loadFolder]);

    return {
        folder,
        loading,
        error,
        refresh: loadFolder,
    };
}

/**
 * Hook for folder path (breadcrumb)
 */
export function useFolderPath(folderId: string | null) {
    const [path, setPath] = useState<UnifiedFolder[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        if (!folderId) {
            setPath([]);
            return;
        }

        const loadPath = async () => {
            setLoading(true);
            setError(null);

            try {
                const data = await unifiedFoldersService.getFolderPath(folderId);
                setPath(data);
            } catch (err) {
                setError(err as Error);
            } finally {
                setLoading(false);
            }
        };

        loadPath();
    }, [folderId]);

    return { path, loading, error };
}

/**
 * Hook for searching folders
 */
export function useSearchFolders(query: string, departmentId?: string) {
    const [results, setResults] = useState<UnifiedFolder[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        if (!query || query.trim().length < 2) {
            setResults([]);
            return;
        }

        const searchFolders = async () => {
            setLoading(true);
            setError(null);

            try {
                const data = await unifiedFoldersService.searchFolders(query, departmentId);
                setResults(data);
            } catch (err) {
                setError(err as Error);
            } finally {
                setLoading(false);
            }
        };

        const debounce = setTimeout(searchFolders, 300);
        return () => clearTimeout(debounce);
    }, [query, departmentId]);

    return { results, loading, error };
}

/**
 * Hook for recent folders
 */
export function useRecentFolders(limit: number = 10) {
    const [folders, setFolders] = useState<UnifiedFolder[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const loadRecent = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const data = await unifiedFoldersService.getRecentFolders(limit);
            setFolders(data);
        } catch (err) {
            setError(err as Error);
        } finally {
            setLoading(false);
        }
    }, [limit]);

    useEffect(() => {
        loadRecent();
    }, [loadRecent]);

    return { folders, loading, error, refresh: loadRecent };
}
