/**
 * @deprecated This slice is NOT USED. The main store (src/store/index.ts) 
 * defines its own folder operations with database-first pattern.
 * Kept for reference only. DO NOT USE.
 */
import type { StateCreator } from 'zustand';
import type { Folder } from '../../types';
import type { FolderSlice, StoreState } from '../types';

export const createFolderSlice: StateCreator<
    StoreState,
    any,
    [],
    FolderSlice
> = (set: any, get) => ({
    folders: {},
    currentFolderId: null,
    expandedFolders: new Set(),

    addFolder: (folder) =>
        set((state) => {
            state.folders[folder.id] = folder;
        }),

    updateFolder: (id, updates) =>
        set((state) => {
            if (state.folders[id]) {
                state.folders[id] = {
                    ...state.folders[id],
                    ...updates,
                    modified_at: new Date().toISOString()
                };
            }
        }),

    deleteFolder: (id) =>
        set((state) => {
            delete state.folders[id];
            const childFolders = (Object.values(state.folders) as Folder[]).filter(f => f.parent_id === id);
            childFolders.forEach(child => {
                delete state.folders[child.id];
            });
        }),

    moveFolder: (id, newParentId) =>
        set((state) => {
            const folder: Folder = state.folders[id];
            if (folder) {
                folder.parent_id = newParentId;
                if (newParentId && state.folders[newParentId]) {
                    folder.path = `${state.folders[newParentId].path}/${folder.name}`;
                } else {
                    folder.path = `/${folder.name}`;
                }
            }
        }),

    toggleFolderExpanded: (id) =>
        set((state) => {
            const newSet = new Set(state.expandedFolders);
            if (newSet.has(id)) {
                newSet.delete(id);
            } else {
                newSet.add(id);
            }
            state.expandedFolders = newSet;
        }),

    setCurrentFolder: (id) =>
        set((state) => {
            state.currentFolderId = id;
        }),

    getFolderPath: (id) => {
        const folders = get().folders;
        const path: string[] = [];
        let currentId: string | null = id;

        while (currentId) {
            const folder: Folder = folders[currentId];
            if (folder) {
                path.unshift(folder.name);
                currentId = folder.parent_id;
            } else {
                break;
            }
        }
        return path;
    },

    getFolderChildren: (parentId) => {
        const folders = get().folders;
        return Object.values(folders).filter((f) => f.parent_id === parentId);
    },
});
