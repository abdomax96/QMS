/**
 * IndexedDB Storage Utility for Tab State Persistence
 * 
 * Provides persistent storage for tab form data that survives browser refresh.
 * Uses IndexedDB because localStorage is limited to ~5MB and synchronous.
 */

const DB_NAME = 'qms_tabs_db';
const DB_VERSION = 1;
const STORE_NAME = 'tab_states';

let dbInstance: IDBDatabase | null = null;

/**
 * Open or get existing database connection
 */
async function openDB(): Promise<IDBDatabase> {
    if (dbInstance) {
        return dbInstance;
    }

    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => {
            console.error('IndexedDB open error:', request.error);
            reject(request.error);
        };

        request.onsuccess = () => {
            dbInstance = request.result;
            resolve(dbInstance);
        };

        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;

            // Create object store for tab states
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
                store.createIndex('timestamp', 'timestamp', { unique: false });
            }
        };
    });
}

/**
 * Save tab state to IndexedDB
 */
export async function saveTabState(tabId: string, state: any): Promise<void> {
    try {
        const db = await openDB();
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);

        const record = {
            id: tabId,
            state: state,
            timestamp: Date.now(),
        };

        return new Promise((resolve, reject) => {
            const request = store.put(record);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    } catch (error) {
        console.error('Failed to save tab state:', error);
        throw error;
    }
}

/**
 * Load tab state from IndexedDB
 */
export async function loadTabState(tabId: string): Promise<any | null> {
    try {
        const db = await openDB();
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);

        return new Promise((resolve, reject) => {
            const request = store.get(tabId);
            request.onsuccess = () => {
                const result = request.result;
                resolve(result?.state || null);
            };
            request.onerror = () => reject(request.error);
        });
    } catch (error) {
        console.error('Failed to load tab state:', error);
        return null;
    }
}

/**
 * Delete tab state from IndexedDB
 */
export async function deleteTabState(tabId: string): Promise<void> {
    try {
        const db = await openDB();
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);

        return new Promise((resolve, reject) => {
            const request = store.delete(tabId);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    } catch (error) {
        console.error('Failed to delete tab state:', error);
        throw error;
    }
}

/**
 * Load all tab states (for app initialization)
 */
export async function loadAllTabStates(): Promise<Map<string, any>> {
    try {
        const db = await openDB();
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);

        return new Promise((resolve, reject) => {
            const request = store.getAll();
            request.onsuccess = () => {
                const states = new Map<string, any>();
                for (const record of request.result) {
                    states.set(record.id, record.state);
                }
                resolve(states);
            };
            request.onerror = () => reject(request.error);
        });
    } catch (error) {
        console.error('Failed to load all tab states:', error);
        return new Map();
    }
}

/**
 * Clear old tab states (LRU cleanup)
 * Keeps only the most recent N states
 */
export async function cleanupOldTabStates(keepCount: number = 20): Promise<void> {
    try {
        const db = await openDB();
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const index = store.index('timestamp');

        return new Promise((resolve, reject) => {
            const request = index.openCursor(null, 'prev'); // Descending order
            let count = 0;

            request.onsuccess = (event) => {
                const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
                if (cursor) {
                    count++;
                    if (count > keepCount) {
                        cursor.delete();
                    }
                    cursor.continue();
                } else {
                    resolve();
                }
            };
            request.onerror = () => reject(request.error);
        });
    } catch (error) {
        console.error('Failed to cleanup old tab states:', error);
    }
}

/**
 * Clear all tab states (for testing or logout)
 */
export async function clearAllTabStates(): Promise<void> {
    try {
        const db = await openDB();
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);

        return new Promise((resolve, reject) => {
            const request = store.clear();
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    } catch (error) {
        console.error('Failed to clear all tab states:', error);
        throw error;
    }
}

export default {
    saveTabState,
    loadTabState,
    deleteTabState,
    loadAllTabStates,
    cleanupOldTabStates,
    clearAllTabStates,
};
