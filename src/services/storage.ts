import localforage from 'localforage';

/**
 * Storage Service using localforage for IndexedDB/localStorage abstraction
 */

// Configure localforage
localforage.config({
  name: 'FormBuilderApp',
  storeName: 'form_builder_store',
  description: 'Local storage for Form Builder application',
});

// Create separate stores for different data types
const stores = {
  templates: localforage.createInstance({
    name: 'FormBuilderApp',
    storeName: 'templates',
  }),
  reports: localforage.createInstance({
    name: 'FormBuilderApp',
    storeName: 'reports',
  }),
  folders: localforage.createInstance({
    name: 'FormBuilderApp',
    storeName: 'folders',
  }),
  drafts: localforage.createInstance({
    name: 'FormBuilderApp',
    storeName: 'drafts',
  }),
  files: localforage.createInstance({
    name: 'FormBuilderApp',
    storeName: 'files',
  }),
};

class StorageService {
  // Generic CRUD operations
  async get<T>(store: keyof typeof stores, key: string): Promise<T | null> {
    try {
      return await stores[store].getItem<T>(key);
    } catch (error) {
      console.error(`Error getting ${key} from ${store}:`, error);
      return null;
    }
  }

  async set<T>(store: keyof typeof stores, key: string, value: T): Promise<boolean> {
    try {
      await stores[store].setItem(key, value);
      return true;
    } catch (error) {
      console.error(`Error setting ${key} in ${store}:`, error);
      return false;
    }
  }

  async remove(store: keyof typeof stores, key: string): Promise<boolean> {
    try {
      await stores[store].removeItem(key);
      return true;
    } catch (error) {
      console.error(`Error removing ${key} from ${store}:`, error);
      return false;
    }
  }

  async getAll<T>(store: keyof typeof stores): Promise<Record<string, T>> {
    const items: Record<string, T> = {};
    try {
      await stores[store].iterate<T, void>((value, key) => {
        items[key] = value;
      });
    } catch (error) {
      console.error(`Error getting all items from ${store}:`, error);
    }
    return items;
  }

  async clear(store: keyof typeof stores): Promise<boolean> {
    try {
      await stores[store].clear();
      return true;
    } catch (error) {
      console.error(`Error clearing ${store}:`, error);
      return false;
    }
  }

  // Template operations
  async saveTemplate(id: string, template: any): Promise<boolean> {
    return this.set('templates', id, template);
  }

  async getTemplate(id: string): Promise<any> {
    return this.get('templates', id);
  }

  async getAllTemplates(): Promise<Record<string, any>> {
    return this.getAll('templates');
  }

  async deleteTemplate(id: string): Promise<boolean> {
    return this.remove('templates', id);
  }

  // Report operations
  async saveReport(id: string, report: any): Promise<boolean> {
    return this.set('reports', id, report);
  }

  async getReport(id: string): Promise<any> {
    return this.get('reports', id);
  }

  async getAllReports(): Promise<Record<string, any>> {
    return this.getAll('reports');
  }

  async deleteReport(id: string): Promise<boolean> {
    return this.remove('reports', id);
  }

  // Folder operations
  async saveFolder(id: string, folder: any): Promise<boolean> {
    return this.set('folders', id, folder);
  }

  async getFolder(id: string): Promise<any> {
    return this.get('folders', id);
  }

  async getAllFolders(): Promise<Record<string, any>> {
    return this.getAll('folders');
  }

  async deleteFolder(id: string): Promise<boolean> {
    return this.remove('folders', id);
  }

  // Draft operations (for auto-save)
  async saveDraft(id: string, draft: any): Promise<boolean> {
    return this.set('drafts', id, {
      ...draft,
      savedAt: new Date().toISOString(),
    });
  }

  async getDraft(id: string): Promise<any> {
    return this.get('drafts', id);
  }

  async deleteDraft(id: string): Promise<boolean> {
    return this.remove('drafts', id);
  }

  async getAllDrafts(): Promise<Record<string, any>> {
    return this.getAll('drafts');
  }

  // File operations (for offline file storage)
  async saveFile(id: string, file: Blob, metadata: { name: string; type: string }): Promise<boolean> {
    return this.set('files', id, { blob: file, metadata });
  }

  async getFile(id: string): Promise<{ blob: Blob; metadata: { name: string; type: string } } | null> {
    return this.get('files', id);
  }

  async deleteFile(id: string): Promise<boolean> {
    return this.remove('files', id);
  }

  // Sync operations
  async getUnsyncedItems(store: keyof typeof stores): Promise<any[]> {
    const items: any[] = [];
    const allItems = await this.getAll(store);
    
    for (const item of Object.values(allItems)) {
      if (item && typeof item === 'object' && 'synced' in item && !item.synced) {
        items.push(item);
      }
    }
    
    return items;
  }

  async markAsSynced(store: keyof typeof stores, id: string): Promise<boolean> {
    const item = await this.get(store, id);
    if (item && typeof item === 'object') {
      return this.set(store, id, { ...item, synced: true, syncedAt: new Date().toISOString() });
    }
    return false;
  }

  // Storage info
  async getStorageInfo(): Promise<{ used: number; available: number }> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      return {
        used: estimate.usage || 0,
        available: estimate.quota || 0,
      };
    }
    return { used: 0, available: 0 };
  }

  // Clear all data
  async clearAll(): Promise<boolean> {
    try {
      await Promise.all([
        stores.templates.clear(),
        stores.reports.clear(),
        stores.folders.clear(),
        stores.drafts.clear(),
        stores.files.clear(),
      ]);
      return true;
    } catch (error) {
      console.error('Error clearing all storage:', error);
      return false;
    }
  }
}

export const storage = new StorageService();
export default StorageService;
