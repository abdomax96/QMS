import type { Folder, FormTemplate, FormInstance, User } from '../types';

export interface FolderSlice {
    folders: Record<string, Folder>;
    currentFolderId: string | null;
    expandedFolders: Set<string>;

    addFolder: (folder: Folder) => void;
    updateFolder: (id: string, updates: Partial<Folder>) => void;
    deleteFolder: (id: string) => void;
    moveFolder: (id: string, newParentId: string | null) => void;
    toggleFolderExpanded: (id: string) => void;
    setCurrentFolder: (id: string | null) => void;

    // Selectors/Getters (exposed as functions in the store)
    getFolderPath: (id: string) => string[];
    getFolderChildren: (parentId: string | null) => Folder[];
}



export interface TemplateSlice {
    formTemplates: Record<string, FormTemplate>;
    currentTemplateId: string | null;

    addFormTemplate: (template: FormTemplate) => void;
    updateFormTemplate: (id: string, updates: Partial<FormTemplate>) => void;
    deleteFormTemplate: (id: string) => void;
    duplicateFormTemplate: (id: string) => void;
    setCurrentTemplate: (id: string | null) => void;

    getTemplatesInFolder: (folderId: string) => FormTemplate[];
}

export interface ReportSlice {
    formInstances: Record<string, FormInstance>;
    currentInstanceId: string | null;

    addFormInstance: (instance: FormInstance) => Promise<void>;
    updateFormInstance: (id: string, updates: Partial<FormInstance>) => Promise<void>;
    deleteFormInstance: (id: string) => Promise<void>;
    submitFormInstance: (id: string) => Promise<void>;
    setCurrentInstance: (id: string | null) => void;

    getInstancesInFolder: (folderId: string) => FormInstance[];
}

export type ViewMode = 'tree' | 'list' | 'grid';
export type EditorMode = 'design' | 'preview' | 'logic';

export interface UISlice {
    viewMode: ViewMode;
    editorMode: EditorMode;
    selectedItems: Set<string>;
    searchQuery: string;
    theme: 'light' | 'dark';
    language: 'en' | 'ar';
    sidebarCollapsed: boolean;

    setViewMode: (mode: ViewMode) => void;
    setEditorMode: (mode: EditorMode) => void;
    toggleItemSelection: (id: string) => void;
    clearSelection: () => void;
    setSearchQuery: (query: string) => void;
    toggleTheme: () => void;
    setLanguage: (lang: 'en' | 'ar') => void;
    toggleSidebar: () => void;
}

export interface AuthSlice {
    user: User | null;
    setUser: (user: User | null) => void;
}

export type StoreState = FolderSlice & TemplateSlice & ReportSlice & UISlice & AuthSlice;
