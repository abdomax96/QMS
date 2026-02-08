import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type {
  Folder,
  FormTemplate,
  FormInstance,
  User,
  AppState,
  ViewMode,
  EditorMode
} from '../types';
import supabaseService from '../services/supabaseService';
import { useToastStore } from './toastStore';

interface StoreState extends AppState {
  // Folders (Unified)
  folders: Record<string, Folder>;
  currentFolderId: string | null;
  lastFormsFolderId: string | null;
  lastReportsFolderId: string | null;
  expandedFolders: Set<string>;

  // Form Templates
  formTemplates: Record<string, FormTemplate>;
  currentTemplateId: string | null;

  // Form Instances (Reports)
  formInstances: Record<string, FormInstance>;
  currentInstanceId: string | null;

  // UI State
  viewMode: ViewMode;
  editorMode: EditorMode;
  selectedItems: Set<string>;
  searchQuery: string;

  // Actions - Folders
  addFolder: (folder: Folder) => void;
  updateFolder: (id: string, updates: Partial<Folder>) => void;
  deleteFolder: (id: string) => void;
  moveFolder: (id: string, newParentId: string | null) => void;
  copyFolder: (id: string, newParentId: string | null) => void;
  archiveFolder: (id: string) => void;
  unarchiveFolder: (id: string) => void;
  toggleFolderExpanded: (id: string) => void;
  setCurrentFolder: (id: string | null) => void;
  setFolders: (folders: Record<string, Folder>) => void;
  setLastFormsFolder: (id: string | null) => void;
  setLastReportsFolder: (id: string | null) => void;

  // Actions - Form Templates (AUDIT FIX: All now async database-first)
  addFormTemplate: (template: FormTemplate) => Promise<void>;
  updateFormTemplate: (id: string, updates: Partial<FormTemplate>) => Promise<void>;
  deleteFormTemplate: (id: string) => Promise<void>;
  duplicateFormTemplate: (id: string) => Promise<string | undefined>;
  moveFormTemplate: (id: string, newFolderId: string | null) => Promise<void>;
  archiveFormTemplate: (id: string) => Promise<void>;
  unarchiveFormTemplate: (id: string) => Promise<void>;
  setCurrentTemplate: (id: string | null) => void;
  setFormTemplates: (templates: Record<string, FormTemplate>) => void;

  // Actions - Form Instances
  addFormInstance: (instance: FormInstance) => Promise<void>;
  updateFormInstance: (id: string, updates: Partial<FormInstance>) => Promise<void>;
  deleteFormInstance: (id: string) => Promise<void>;
  submitFormInstance: (id: string) => Promise<void>;
  moveFormInstance: (id: string, newFolderId: string | null) => Promise<void>;
  archiveFormInstance: (id: string) => Promise<void>;
  unarchiveFormInstance: (id: string) => Promise<void>;
  setCurrentInstance: (id: string | null) => void;
  setFormInstances: (instances: Record<string, FormInstance>) => void;

  // Actions - UI
  setViewMode: (mode: ViewMode) => void;
  setEditorMode: (mode: EditorMode) => void;
  toggleItemSelection: (id: string) => void;
  clearSelection: () => void;
  setSearchQuery: (query: string) => void;

  // Actions - App
  setUser: (user: User | null) => void;
  toggleTheme: () => void;
  setLanguage: (lang: 'en' | 'ar') => void;
  toggleSidebar: () => void;

  // Utils
  getFolderPath: (id: string) => string[];
  getFolderChildren: (parentId: string | null) => Folder[];
  getTemplatesInFolder: (folderId: string) => FormTemplate[];
  getInstancesInFolder: (folderId: string) => FormInstance[];

  // Realtime Sync Actions (Surgical Updates)
  syncFolder: (folder: Folder) => void;
  syncDeleteFolder: (id: string) => void;
  syncTemplate: (template: FormTemplate) => void;
  syncDeleteTemplate: (id: string) => void;
  syncInstance: (instance: FormInstance) => void;
  syncDeleteInstance: (id: string) => void;

  // Data Fetching
  isLoading: boolean;
  fetchAllData: () => Promise<void>;
}

const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      // Initial State
      folders: {},
      currentFolderId: null,
      lastFormsFolderId: null,
      lastReportsFolderId: null,
      expandedFolders: new Set(),
      formTemplates: {},
      currentTemplateId: null,
      formInstances: {},
      currentInstanceId: null,
      viewMode: 'tree',
      editorMode: 'design',
      selectedItems: new Set(),
      searchQuery: '',
      user: null,
      theme: 'light',
      language: 'en',
      sidebarCollapsed: false,
      isLoading: false,

      // Folder Actions - Database-First Pattern
      addFolder: async (folder) => {
        const { folderSaved, folderSaveFailed } = useToastStore.getState();

        try {
          // Save to database FIRST
          await supabaseService.folders.saveFolder(folder);

          // Only update local state after successful database save
          set((state) => ({
            folders: { ...state.folders, [folder.id]: folder }
          }));

          folderSaved(folder.name);
        } catch (error: any) {
          console.error('Error saving folder:', error);
          folderSaveFailed(error.message || 'حدث خطأ غير متوقع');
          throw error; // Re-throw so caller knows it failed
        }
      },

      updateFolder: async (id, updates) => {
        const state = get();
        const folder = state.folders[id];
        if (!folder) return;

        const { folderSaved, folderSaveFailed } = useToastStore.getState();

        try {
          // Database-first: Update server FIRST
          await supabaseService.folders.updateFolder(id, updates);

          // Only update local state after successful database update
          set((state) => ({
            folders: {
              ...state.folders,
              [id]: {
                ...state.folders[id],
                ...updates,
                modified_at: new Date().toISOString()
              }
            }
          }));

          folderSaved(folder.name);
        } catch (error: any) {
          console.error('Error updating folder:', error);
          folderSaveFailed(error.message || 'حدث خطأ غير متوقع');
          // No rollback needed as we haven't updated state yet
        }
      },

      deleteFolder: async (id) => {
        const state = get();
        const folder = state.folders[id];
        const folderName = folder?.name || 'المجلد';
        const { itemDeleted, itemDeleteFailed } = useToastStore.getState();

        try {
          // AUDIT FIX: Simplified cascade delete handling
          // 1. Collect all descendant IDs BEFORE deleting (for local state cleanup)
          // 2. Database handles cascade delete atomically
          // 3. Remove all collected IDs from local state in one operation

          const collectDescendantIds = (folderId: string, folders: Record<string, Folder>): string[] => {
            const ids: string[] = [folderId];
            const children = Object.values(folders).filter(f => f.parent_id === folderId);
            children.forEach(child => {
              ids.push(...collectDescendantIds(child.id, folders));
            });
            return ids;
          };

          const idsToRemove = new Set(collectDescendantIds(id, state.folders));

          // Delete from database FIRST (CASCADE handles children in DB)
          await supabaseService.folders.deleteFolder(id);

          // Remove all affected folders from local state atomically
          set((state) => {
            const newFolders: Record<string, Folder> = {};
            for (const [fid, f] of Object.entries(state.folders)) {
              if (!idsToRemove.has(fid)) {
                newFolders[fid] = f;
              }
            }
            return { folders: newFolders };
          });

          itemDeleted('المجلد', folderName);
        } catch (error: any) {
          console.error('Error deleting folder:', error);
          itemDeleteFailed('المجلد', error.message || 'حدث خطأ غير متوقع');
          throw error; // Re-throw so caller knows it failed
        }
      },

      moveFolder: async (id, newParentId) => {
        const state = get();
        const folder = state.folders[id];
        if (!folder) return;

        const { folderSaved, folderSaveFailed } = useToastStore.getState();

        // Prevent moving folder into itself
        if (id === newParentId) {
          console.error('Cannot move folder into itself');
          folderSaveFailed('لا يمكن نقل المجلد إلى نفسه');
          return;
        }

        // Prevent moving to same location (no-op)
        if (folder.parent_id === newParentId) {
          return;
        }

        // Prevent moving folder into its own descendants (circular reference)
        if (newParentId) {
          let currentId: string | null = newParentId;
          while (currentId) {
            if (currentId === id) {
              console.error('Cannot move folder into its own descendant');
              folderSaveFailed('لا يمكن نقل المجلد إلى أحد مجلداته الفرعية');
              return;
            }
            const parentFolder = state.folders[currentId];
            currentId = parentFolder?.parent_id || null;
          }
        }

        const newPath = newParentId
          ? `${state.folders[newParentId].path}/${folder.name}`
          : `/${folder.name}`;

        try {
          // Database-first: Update server FIRST
          await supabaseService.folders.updateFolder(id, { parent_id: newParentId, path: newPath });

          // Only update local state after successful database update
          set((state) => ({
            folders: {
              ...state.folders,
              [id]: { ...folder, parent_id: newParentId, path: newPath }
            }
          }));

          folderSaved(folder.name);
        } catch (error: any) {
          console.error('Error moving folder:', error);
          folderSaveFailed(error.message || 'حدث خطأ أثناء نقل المجلد');
          throw error; // Re-throw so caller knows it failed
        }
      },

      copyFolder: async (id, newParentId) => {
        const state = get();
        const folder = state.folders[id];
        if (!folder) return;

        const { folderSaved, folderSaveFailed } = useToastStore.getState();

        // Generate proper UUID for new folder
        const newId = crypto.randomUUID();
        const newPath = newParentId
          ? `${state.folders[newParentId].path}/${folder.name} (نسخة)`
          : `/${folder.name} (نسخة)`;

        const newFolder: Folder = {
          ...folder,
          id: newId,
          name: `${folder.name} (نسخة)`,
          parent_id: newParentId,
          path: newPath,
          created_at: new Date().toISOString(),
          created_by: state.user?.id || 'unknown',
          modified_at: new Date().toISOString()
        };

        try {
          // Database-first: Save to server FIRST
          await supabaseService.folders.saveFolder(newFolder);

          // Only update local state after successful database save
          set((state) => ({
            folders: { ...state.folders, [newId]: newFolder }
          }));

          folderSaved(newFolder.name);
          return newId; // Return new ID for undo tracking
        } catch (error: any) {
          console.error('Error copying folder:', error);
          folderSaveFailed(error.message || 'حدث خطأ أثناء نسخ المجلد');
          throw error; // Re-throw so caller knows it failed
        }
      },

      archiveFolder: async (id) => {
        const state = get();
        const folder = state.folders[id];
        if (!folder) return;

        const { folderSaved, folderSaveFailed } = useToastStore.getState();

        const updates = {
          archived: true,
          archived_at: new Date().toISOString(),
          archived_by: (state.user?.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(state.user.id)) ? state.user.id : undefined,
          modified_at: new Date().toISOString()
        };

        try {
          // Database-first: Update server FIRST
          await supabaseService.folders.updateFolder(id, updates);

          // Update local state
          set((state) => ({
            folders: {
              ...state.folders,
              [id]: { ...state.folders[id], ...updates }
            }
          }));

          folderSaved('تم نقل المجلد للأرشيف');
        } catch (error: any) {
          console.error('Error archiving folder:', error);
          folderSaveFailed(error.message || 'حدث خطأ أثناء أرشفة المجلد');
        }
      },

      unarchiveFolder: async (id) => {
        const state = get();
        if (!state.folders[id]) return;

        const { folderSaved, folderSaveFailed } = useToastStore.getState();

        const updates = {
          archived: false,
          archived_at: null,
          archived_by: null,
          modified_at: new Date().toISOString()
        };

        try {
          // Database-first
          await supabaseService.folders.updateFolder(id, { archived: false });

          // Update local state
          set((state) => ({
            folders: {
              ...state.folders,
              [id]: {
                ...state.folders[id],
                archived: false,
                archived_at: undefined,
                archived_by: undefined,
                modified_at: updates.modified_at
              }
            }
          }));

          folderSaved('تم استعادة المجلد من الأرشيف');
        } catch (error: any) {
          console.error('Error unarchiving folder:', error);
          folderSaveFailed(error.message || 'حدث خطأ أثناء استعادة المجلد');
        }
      },

      toggleFolderExpanded: (id) => set((state) => {
        const expanded = new Set(state.expandedFolders);
        if (expanded.has(id)) {
          expanded.delete(id);
        } else {
          expanded.add(id);
        }
        return { expandedFolders: expanded };
      }),

      setCurrentFolder: (id) => set({ currentFolderId: id }),

      setFolders: (folders) => set({ folders }),

      setLastFormsFolder: (id) => set({ lastFormsFolderId: id }),

      setLastReportsFolder: (id) => set({ lastReportsFolderId: id }),

      // Form Template Actions - AUDIT FIX: Database-First Pattern
      // All template operations now save to database FIRST, then update local state
      // This prevents data loss on network failures and ensures consistency
      addFormTemplate: async (template) => {
        const { templateSaved, templateSaveFailed } = useToastStore.getState();

        try {
          // ✅ CRITICAL: Validate and refresh session BEFORE database operation
          const { supabase } = await import('../config/supabase');
          const { data: { session }, error: sessionError } = await supabase.auth.getSession();

          if (sessionError || !session) {
            console.error('❌ Session invalid before save:', sessionError);
            templateSaveFailed('انتهت صلاحية الجلسة. يرجى تسجيل الدخول مرة أخرى.');
            window.location.href = '/login';
            throw new Error('Session expired');
          }

          // Force refresh if token expires within 5 minutes
          const expiresAt = session.expires_at ? session.expires_at * 1000 : 0;
          const timeUntilExpiry = expiresAt - Date.now();
          if (timeUntilExpiry < 5 * 60 * 1000) {
            console.log('🔄 Token expiring soon, refreshing before save...');
            const { error: refreshError } = await supabase.auth.refreshSession();
            if (refreshError) {
              console.error('❌ Token refresh failed:', refreshError);
              templateSaveFailed('فشل تجديد الجلسة. يرجى تسجيل الدخول مرة أخرى.');
              window.location.href = '/login';
              throw new Error('Session refresh failed');
            }
          }

          // Save to database FIRST (database-first pattern)
          console.log('💾 Saving new template to database:', template.id);
          await supabaseService.templates.saveTemplate(template);
          console.log('✅ Database save successful');

          // Only update local state after successful database save
          set((state) => ({
            formTemplates: { ...state.formTemplates, [template.id]: template }
          }));

          templateSaved(template.name);
        } catch (error: any) {
          console.error('❌ Error saving template:', error);
          if (!error.message?.includes('Session')) {
            templateSaveFailed(error.message || 'حدث خطأ غير متوقع');
          }
          throw error; // Re-throw so caller knows it failed
        }
      },

      updateFormTemplate: async (id, updates) => {
        const state = get();
        const template = state.formTemplates[id];
        if (!template) return;

        const { templateSaved, templateSaveFailed } = useToastStore.getState();

        try {
          // ✅ CRITICAL: Validate and refresh session BEFORE database operation
          const { supabase } = await import('../config/supabase');
          const { data: { session }, error: sessionError } = await supabase.auth.getSession();

          if (sessionError || !session) {
            console.error('❌ Session invalid before save:', sessionError);
            templateSaveFailed('انتهت صلاحية الجلسة. يرجى تسجيل الدخول مرة أخرى.');
            // Force redirect to login
            window.location.href = '/login';
            throw new Error('Session expired');
          }

          // Force refresh if token expires within 5 minutes
          const expiresAt = session.expires_at ? session.expires_at * 1000 : 0;
          const timeUntilExpiry = expiresAt - Date.now();
          if (timeUntilExpiry < 5 * 60 * 1000) {
            console.log('🔄 Token expiring soon, refreshing before save...');
            const { error: refreshError } = await supabase.auth.refreshSession();
            if (refreshError) {
              console.error('❌ Token refresh failed:', refreshError);
              templateSaveFailed('فشل تجديد الجلسة. يرجى تسجيل الدخول مرة أخرى.');
              window.location.href = '/login';
              throw new Error('Session refresh failed');
            }
          }

          // Database-first: Update server FIRST
          console.log('💾 Saving template to database:', id);
          await supabaseService.templates.updateTemplate(id, updates);
          console.log('✅ Database save successful');

          // Only update local state after successful database update
          set((state) => ({
            formTemplates: {
              ...state.formTemplates,
              [id]: { ...state.formTemplates[id], ...updates }
            }
          }));

          templateSaved(template.name);
        } catch (error: any) {
          console.error('❌ Error updating template:', error);
          // Only show error if not already shown (session errors handled above)
          if (!error.message?.includes('Session')) {
            templateSaveFailed(error.message || 'حدث خطأ غير متوقع');
          }
          throw error;
        }
      },

      deleteFormTemplate: async (id) => {
        const state = get();
        const template = state.formTemplates[id];
        const templateName = template?.name || 'النموذج';

        const { itemDeleted, itemDeleteFailed } = useToastStore.getState();

        try {
          // ✅ FIX: Check for linked instances before attempting delete
          const linkedInstances = Object.values(state.formInstances)
            .filter(instance => instance.template_id === id);

          if (linkedInstances.length > 0) {
            const errorMessage = `لا يمكن حذف النموذج "${templateName}" لأنه يحتوي على ${linkedInstances.length} تقرير/تقارير مرتبطة.\n\nيرجى حذف التقارير أولاً ثم إعادة المحاولة.`;
            itemDeleteFailed('النموذج', errorMessage);
            throw new Error(errorMessage);
          }

          // Delete from database FIRST (database-first pattern)
          await supabaseService.templates.deleteTemplate(id);

          // Only update local state after successful database delete
          set((state) => {
            const { [id]: deleted, ...rest } = state.formTemplates;
            return { formTemplates: rest };
          });

          itemDeleted('النموذج', templateName);
        } catch (error: any) {
          console.error('Error deleting template:', error);
          // Only show error if not already shown (linked instances error handled above)
          if (!error.message?.includes('تقرير/تقارير مرتبطة')) {
            itemDeleteFailed('النموذج', error.message || 'حدث خطأ غير متوقع');
          }
          throw error;
        }
      },

      duplicateFormTemplate: async (id) => {
        const state = get();
        const template = state.formTemplates[id];
        if (!template) return;

        const { templateSaved, templateSaveFailed } = useToastStore.getState();

        // Generate unique copy name
        const baseName = `${template.name} (نسخة)`;
        const existingNames = Object.values(state.formTemplates)
          .filter(t => t.folder_id === template.folder_id)
          .map(t => t.name);

        let copyName = baseName;
        let counter = 2;
        while (existingNames.includes(copyName)) {
          copyName = `${template.name} (نسخة ${counter})`;
          counter++;
        }

        // AUDIT FIX: Use proper UUID instead of non-standard ID format
        const newId = crypto.randomUUID();
        const newTemplate: FormTemplate = {
          ...template,
          id: newId,
          name: copyName,
          created_at: new Date().toISOString()
        };

        try {
          // Database-first: Save to server FIRST
          await supabaseService.templates.saveTemplate(newTemplate);

          // Only update local state after successful database save
          set((state) => ({
            formTemplates: { ...state.formTemplates, [newId]: newTemplate }
          }));

          templateSaved(newTemplate.name);
          return newId; // Return new ID for caller
        } catch (error: any) {
          console.error('Error duplicating template:', error);
          templateSaveFailed(error.message || 'حدث خطأ أثناء نسخ النموذج');
          throw error;
        }
      },

      moveFormTemplate: async (id, newFolderId) => {
        const state = get();
        const template = state.formTemplates[id];
        if (!template) return;

        const { templateSaved, templateSaveFailed } = useToastStore.getState();

        try {
          // Update database first (database-first pattern)
          await supabaseService.templates.updateTemplate(id, { folder_id: newFolderId });

          // Update local state after successful database update
          set((state) => ({
            formTemplates: {
              ...state.formTemplates,
              [id]: { ...state.formTemplates[id], folder_id: newFolderId }
            }
          }));

          templateSaved(template.name);
        } catch (error: any) {
          console.error('Error moving template:', error);
          templateSaveFailed(error.message || 'حدث خطأ أثناء نقل النموذج');
          throw error;
        }
      },

      archiveFormTemplate: async (id) => {
        const state = get();
        const template = state.formTemplates[id];
        if (!template) return;

        const { templateSaved, templateSaveFailed } = useToastStore.getState();

        const updates = {
          archived: true,
          archived_at: new Date().toISOString(),
          archived_by: (state.user?.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(state.user.id)) ? state.user.id : undefined
        };

        try {
          // Database-first
          await supabaseService.templates.updateTemplate(id, updates);

          // Update local state
          set((state) => ({
            formTemplates: {
              ...state.formTemplates,
              [id]: { ...template, ...updates }
            }
          }));

          templateSaved('تم أرشفة النموذج');
        } catch (error: any) {
          console.error('Error archiving template:', error);
          templateSaveFailed(error.message || 'حدث خطأ أثناء أرشفة النموذج');
        }
      },

      unarchiveFormTemplate: async (id) => {
        const state = get();
        const template = state.formTemplates[id];
        if (!template) return;

        const { templateSaved, templateSaveFailed } = useToastStore.getState();

        try {
          // Database-first
          await supabaseService.templates.updateTemplate(id, { archived: false });

          // Update local state
          set((state) => ({
            formTemplates: {
              ...state.formTemplates,
              [id]: {
                ...template,
                archived: false,
                archived_at: undefined,
                archived_by: undefined
              }
            }
          }));

          templateSaved('تم استعادة النموذج');
        } catch (error: any) {
          console.error('Error unarchiving template:', error);
          templateSaveFailed(error.message || 'حدث خطأ أثناء استعادة النموذج');
        }
      },

      setCurrentTemplate: (id) => set({ currentTemplateId: id }),

      setFormTemplates: (templates) => set({ formTemplates: templates }),

      // Form Instance Actions - Database-first async pattern to prevent data loss
      addFormInstance: async (instance) => {
        const state = get();
        // Get the template to ensure it exists in database
        const template = state.formTemplates[instance.template_id];

        const { instanceSaved, instanceSaveFailed } = useToastStore.getState();

        try {
          // Save to database FIRST (database-first pattern)
          await supabaseService.instances.saveInstance(instance, template);

          // Only update local state after successful database save
          set((state) => ({
            formInstances: { ...state.formInstances, [instance.instance_id]: instance }
          }));

          instanceSaved(instance.instance_id || 'التقرير');
        } catch (error: any) {
          console.error('Error saving instance:', error);
          instanceSaveFailed(error.message || 'حدث خطأ غير متوقع');
          throw error; // Re-throw so caller knows it failed
        }
      },

      updateFormInstance: async (id, updates) => {
        const state = get();
        const instance = state.formInstances[id];

        // Remove attachments field as it doesn't exist in database
        const { attachments, ...updatesWithoutAttachments } = updates as any;

        const { instanceSaved, instanceSaveFailed } = useToastStore.getState();

        try {
          // Save to database FIRST (database-first pattern)
          await supabaseService.instances.updateInstance(id, updatesWithoutAttachments);

          // Only update local state after successful database save
          set((state) => ({
            formInstances: {
              ...state.formInstances,
              [id]: { ...state.formInstances[id], ...updates }
            }
          }));

          instanceSaved(instance?.instance_id || 'التقرير');
        } catch (error: any) {
          console.error('Error updating instance:', error);
          instanceSaveFailed(error.message || 'حدث خطأ غير متوقع');
          throw error; // Re-throw so caller knows it failed
        }
      },

      deleteFormInstance: async (id) => {
        const state = get();
        const instance = state.formInstances[id];
        const instanceName = instance?.instance_id || 'التقرير';

        const { itemDeleted, itemDeleteFailed } = useToastStore.getState();

        try {
          // Delete from database FIRST (database-first pattern)
          await supabaseService.instances.deleteInstance(id);

          // Only update local state after successful database delete
          set((state) => {
            const { [id]: deleted, ...rest } = state.formInstances;
            return { formInstances: rest };
          });

          itemDeleted('التقرير', instanceName);
        } catch (error: any) {
          console.error('Error deleting instance:', error);
          itemDeleteFailed('التقرير', error.message || 'حدث خطأ غير متوقع');
          throw error; // Re-throw so caller knows it failed
        }
      },

      submitFormInstance: async (id) => {
        const state = get();
        const user = state.user;

        const updates = {
          status: 'submitted' as const,
          submitted_at: new Date().toISOString(),
          submitted_by: user?.id || 'unknown'
        };

        const { instanceSaved, instanceSaveFailed } = useToastStore.getState();

        try {
          // Save to database FIRST
          await supabaseService.instances.updateInstance(id, updates);

          // Only update local state after successful database save
          set((state) => ({
            formInstances: {
              ...state.formInstances,
              [id]: {
                ...state.formInstances[id],
                ...updates
              }
            }
          }));

          instanceSaved(state.formInstances[id]?.instance_id || 'التقرير');
        } catch (error: any) {
          console.error('Error submitting instance:', error);
          instanceSaveFailed(error.message || 'حدث خطأ غير متوقع');
          throw error;
        }
      },

      moveFormInstance: async (id, newFolderId) => {
        const state = get();
        const instance = state.formInstances[id];
        if (!instance) return;

        const { instanceSaved, instanceSaveFailed } = useToastStore.getState();

        try {
          // Update database first (database-first pattern)
          await supabaseService.instances.updateInstance(id, { folder_id: newFolderId });

          // Update local state after successful database update
          set((state) => ({
            formInstances: {
              ...state.formInstances,
              [id]: { ...state.formInstances[id], folder_id: newFolderId }
            }
          }));

          instanceSaved(instance.instance_id);
        } catch (error: any) {
          console.error('Error moving instance:', error);
          instanceSaveFailed(error.message || 'حدث خطأ أثناء نقل التقرير');
          throw error;
        }
      },

      archiveFormInstance: async (id) => {
        const state = get();
        const instance = state.formInstances[id];
        if (!instance) return;

        const { instanceSaved, instanceSaveFailed } = useToastStore.getState();

        const updates = {
          archived: true,
          archived_at: new Date().toISOString(),
          archived_by: (state.user?.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(state.user.id)) ? state.user.id : undefined
        };

        try {
          // Database-first
          await supabaseService.instances.updateInstance(id, updates);

          // Update local state
          set((state) => ({
            formInstances: {
              ...state.formInstances,
              [id]: { ...instance, ...updates }
            }
          }));

          instanceSaved('تم أرشفة التقرير');
        } catch (error: any) {
          console.error('Error archiving instance:', error);
          instanceSaveFailed(error.message || 'حدث خطأ أثناء أرشفة التقرير');
        }
      },

      unarchiveFormInstance: async (id) => {
        const state = get();
        const instance = state.formInstances[id];
        if (!instance) return;

        const { instanceSaved, instanceSaveFailed } = useToastStore.getState();

        try {
          // Database-first
          await supabaseService.instances.updateInstance(id, { archived: false });

          // Update local state
          set((state) => ({
            formInstances: {
              ...state.formInstances,
              [id]: {
                ...instance,
                archived: false,
                archived_at: undefined,
                archived_by: undefined
              }
            }
          }));

          instanceSaved('تم استعادة التقرير');
        } catch (error: any) {
          console.error('Error unarchiving instance:', error);
          instanceSaveFailed(error.message || 'حدث خطأ أثناء استعادة التقرير');
        }
      },

      setCurrentInstance: (id) => set({ currentInstanceId: id }),

      setFormInstances: (instances) => set({ formInstances: instances }),

      // UI Actions
      setViewMode: (mode) => set({ viewMode: mode }),

      setEditorMode: (mode) => set({ editorMode: mode }),

      toggleItemSelection: (id) => set((state) => {
        const selected = new Set(state.selectedItems);
        if (selected.has(id)) {
          selected.delete(id);
        } else {
          selected.add(id);
        }
        return { selectedItems: selected };
      }),

      clearSelection: () => set({ selectedItems: new Set() }),

      setSearchQuery: (query) => set({ searchQuery: query }),

      // App Actions
      setUser: (user) => set({ user }),

      toggleTheme: () => set((state) => ({
        theme: state.theme === 'light' ? 'dark' : 'light'
      })),

      setLanguage: (lang) => set({ language: lang }),

      toggleSidebar: () => set((state) => ({
        sidebarCollapsed: !state.sidebarCollapsed
      })),

      // Utils
      getFolderPath: (id) => {
        const state = get();
        const path: string[] = [];
        let currentId: string | null = id;

        while (currentId) {
          const folder = state.folders[currentId];
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
        const state = get();
        return Object.values(state.folders)
          .filter(f => f.parent_id === parentId && !f.archived)
          .sort((a, b) => a.name.localeCompare(b.name));
      },

      getTemplatesInFolder: (folderId) => {
        const state = get();
        return Object.values(state.formTemplates)
          .filter(t => t.folder_id === folderId && !t.archived)
          .sort((a, b) => a.name.localeCompare(b.name));
      },

      getInstancesInFolder: (folderId) => {
        const state = get();
        return Object.values(state.formInstances)
          .filter(i => i.folder_id === folderId && !i.archived)
          .sort((a, b) => a.created_at.localeCompare(b.created_at));
      },

      // Realtime Sync Actions - with equality check to prevent infinite loops
      syncFolder: (folder) => set((state) => {
        // Skip update if folder data hasn't changed
        const existing = state.folders[folder.id];
        if (existing && JSON.stringify(existing) === JSON.stringify(folder)) {
          return state;
        }
        return { folders: { ...state.folders, [folder.id]: folder } };
      }),

      syncDeleteFolder: (id) => set((state) => {
        if (!state.folders[id]) return state; // Already deleted
        const { [id]: deleted, ...rest } = state.folders;
        return { folders: rest };
      }),

      syncTemplate: (template) => set((state) => {
        // Skip update if template data hasn't changed
        const existing = state.formTemplates[template.id];
        if (existing && JSON.stringify(existing) === JSON.stringify(template)) {
          return state;
        }
        return { formTemplates: { ...state.formTemplates, [template.id]: template } };
      }),

      syncDeleteTemplate: (id) => set((state) => {
        if (!state.formTemplates[id]) return state; // Already deleted
        const { [id]: deleted, ...rest } = state.formTemplates;
        return { formTemplates: rest };
      }),

      syncInstance: (instance) => set((state) => {
        // Skip update if instance data hasn't changed
        const existing = state.formInstances[instance.instance_id];
        if (existing && JSON.stringify(existing) === JSON.stringify(instance)) {
          return state;
        }
        return { formInstances: { ...state.formInstances, [instance.instance_id]: instance } };
      }),

      syncDeleteInstance: (id) => set((state) => {
        if (!state.formInstances[id]) return state; // Already deleted
        const { [id]: deleted, ...rest } = state.formInstances;
        return { formInstances: rest };
      }),

      // Data Fetching
      fetchAllData: async () => {
        set({ isLoading: true });
        try {
          const { folders, templates, instances } = await supabaseService.batch.loadAllData();
          set({
            folders,
            formTemplates: templates,
            formInstances: instances,
            isLoading: false
          });
        } catch (error) {
          console.error('Error fetching data:', error);
          set({ isLoading: false });
        }
      }
    }),
    {
      name: 'qms-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        // Persist UI preferences
        viewMode: state.viewMode,
        editorMode: state.editorMode,
        theme: state.theme,
        language: state.language,
        sidebarCollapsed: state.sidebarCollapsed,
        // Don't persist large data sets to avoid hydration issues, let them load fresh
        // or rely on React Query / manual fetch
      })
    }
  )
);

export default useStore;
