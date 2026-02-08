/**
 * Data Cache Service
 * 
 * Eliminates duplicate API calls by:
 * 1. Request deduplication (in-flight protection)
 * 2. TTL-based caching
 * 3. Real-time invalidation on updates
 * 
 * Usage:
 *   const data = await dataCache.get('folders', () => fetchFolders());
 *   dataCache.invalidate('folders'); // Clear cache
 */

interface CacheEntry<T> {
    data: T;
    timestamp: number;
    promise?: Promise<T>;
}

interface CacheConfig {
    ttl: number; // Time to live in milliseconds
    debug: boolean; // Enable debug logging
}

const DEFAULT_TTL = 60000; // 1 minute
const DEBUG_MODE = import.meta.env.DEV;

class DataCacheService {
    private cache: Map<string, CacheEntry<any>> = new Map();
    private config: Map<string, CacheConfig> = new Map();
    private stats = {
        hits: 0,
        misses: 0,
        invalidations: 0
    };

    /**
     * Configure cache settings for a specific key pattern
     */
    configure(keyPattern: string, options: Partial<CacheConfig>) {
        const existing = this.config.get(keyPattern) || { ttl: DEFAULT_TTL, debug: DEBUG_MODE };
        this.config.set(keyPattern, { ...existing, ...options });
    }

    /**
     * Get cache config for a key
     */
    private getConfig(key: string): CacheConfig {
        // Check for exact match
        if (this.config.has(key)) {
            return this.config.get(key)!;
        }

        // Check for pattern match (e.g., "folders" matches "folders:*")
        for (const [pattern, config] of this.config.entries()) {
            if (key.startsWith(pattern)) {
                return config;
            }
        }

        return { ttl: DEFAULT_TTL, debug: DEBUG_MODE };
    }

    /**
     * Get data from cache or fetch it
     * 
     * Features:
     * - Request deduplication (multiple concurrent calls share same promise)
     * - TTL-based expiration
     * - Automatic cache on fetch
     * 
     * @param key - Unique cache key
     * @param fetcher - Function to fetch data if not cached
     * @returns Cached or freshly fetched data
     */
    async get<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
        const config = this.getConfig(key);
        const cached = this.cache.get(key);

        // ============ CASE 1: In-Flight Request ============
        // Another call is already fetching this data
        if (cached?.promise) {
            if (config.debug) {
                console.log(`[DataCache] ⏳ Waiting for in-flight request: ${key}`);
            }
            this.stats.hits++;
            return cached.promise;
        }

        // ============ CASE 2: Fresh Cache Hit ============
        // Data is cached and still fresh
        const now = Date.now();
        if (cached && now - cached.timestamp < config.ttl) {
            if (config.debug) {
                const age = ((now - cached.timestamp) / 1000).toFixed(1);
                console.log(`[DataCache] ✅ Cache HIT: ${key} (age: ${age}s)`);
            }
            this.stats.hits++;
            return cached.data;
        }

        // ============ CASE 3: Cache Miss - Fetch Data ============
        if (config.debug) {
            if (cached) {
                const age = ((now - cached.timestamp) / 1000).toFixed(1);
                console.log(`[DataCache] ⏰ Cache EXPIRED: ${key} (age: ${age}s, ttl: ${config.ttl / 1000}s)`);
            } else {
                console.log(`[DataCache] ❌ Cache MISS: ${key}`);
            }
        }
        this.stats.misses++;

        // Create promise and store it to prevent duplicate fetches
        const promise = fetcher();

        // Store in-flight promise
        this.cache.set(key, {
            data: null as any,
            timestamp: now,
            promise
        });

        try {
            const data = await promise;

            // Store successful result
            this.cache.set(key, {
                data,
                timestamp: now,
                promise: undefined
            });

            if (config.debug) {
                console.log(`[DataCache] 💾 Cached: ${key}`);
            }

            return data;
        } catch (error) {
            // Remove failed promise from cache
            this.cache.delete(key);

            if (config.debug) {
                console.error(`[DataCache] ❌ Fetch failed: ${key}`, error);
            }

            throw error;
        }
    }

    /**
     * Invalidate cache entries
     * 
     * @param pattern - Key or pattern to invalidate
     *                  - Exact key: "folders"
     *                  - Pattern: "folders:*" (invalidates all keys starting with "folders:")
     *                  - All: undefined (clears entire cache)
     */
    invalidate(pattern?: string) {
        if (!pattern) {
            // Clear everything
            const count = this.cache.size;
            this.cache.clear();
            this.stats.invalidations += count;

            if (DEBUG_MODE) {
                console.log(`[DataCache] 🗑️ Cleared entire cache (${count} entries)`);
            }
            return;
        }

        // Check if pattern is a wildcard
        const isWildcard = pattern.endsWith('*');
        const prefix = isWildcard ? pattern.slice(0, -1) : pattern;

        let count = 0;
        if (isWildcard) {
            // Remove all keys matching pattern
            for (const key of this.cache.keys()) {
                if (key.startsWith(prefix)) {
                    this.cache.delete(key);
                    count++;
                }
            }
        } else {
            // Remove exact key
            if (this.cache.delete(pattern)) {
                count = 1;
            }
        }

        this.stats.invalidations += count;

        if (DEBUG_MODE && count > 0) {
            console.log(`[DataCache] 🗑️ Invalidated ${count} entr${count === 1 ? 'y' : 'ies'}: ${pattern}`);
        }
    }

    /**
     * Check if a key is cached and fresh
     */
    has(key: string): boolean {
        const cached = this.cache.get(key);
        if (!cached) return false;

        const config = this.getConfig(key);
        const now = Date.now();
        return now - cached.timestamp < config.ttl;
    }

    /**
     * Get cache statistics
     */
    getStats() {
        const hitRate = this.stats.hits + this.stats.misses > 0
            ? (this.stats.hits / (this.stats.hits + this.stats.misses) * 100).toFixed(1)
            : '0.0';

        return {
            ...this.stats,
            cacheSize: this.cache.size,
            hitRate: `${hitRate}%`
        };
    }

    /**
     * Reset statistics
     */
    resetStats() {
        this.stats = {
            hits: 0,
            misses: 0,
            invalidations: 0
        };
    }

    /**
     * Clear all cache and stats
     */
    clear() {
        this.cache.clear();
        this.resetStats();

        if (DEBUG_MODE) {
            console.log('[DataCache] 🗑️ Cache and stats cleared');
        }
    }
}

// ============ Singleton Instance ============

export const dataCache = new DataCacheService();

// ============ Configuration for Different Data Types ============

// Folders - cached for 2 minutes (relatively static)
dataCache.configure('folders', {
    ttl: 120000, // 2 minutes
    debug: DEBUG_MODE
});

// Templates - cached for 5 minutes (very static)
dataCache.configure('templates', {
    ttl: 300000, // 5 minutes
    debug: DEBUG_MODE
});

// Instances - cached for 30 seconds (more dynamic)
dataCache.configure('instances', {
    ttl: 30000, // 30 seconds
    debug: DEBUG_MODE
});

// Permissions - cached for 1 minute (security-critical but frequently checked)
dataCache.configure('permissions', {
    ttl: 60000, // 1 minute
    debug: DEBUG_MODE
});

// Users - cached for 2 minutes
dataCache.configure('users', {
    ttl: 120000, // 2 minutes
    debug: DEBUG_MODE
});

// ============ Real-Time Invalidation Helpers ============

/**
 * Setup real-time invalidation listeners
 * Call this in your App.tsx or main component
 */
export function setupCacheInvalidation() {
    // Listen for permission changes
    if (typeof window !== 'undefined') {
        window.addEventListener('permissions-changed', () => {
            dataCache.invalidate('permissions*');
            if (DEBUG_MODE) {
                console.log('[DataCache] Permissions changed, cache invalidated');
            }
        });
    }
}

/**
 * Invalidate cache after mutations
 * Use this in your service functions after create/update/delete
 */
export function invalidateAfterMutation(entityType: 'folders' | 'templates' | 'instances' | 'users' | 'permissions') {
    dataCache.invalidate(`${entityType}*`);

    // Trigger re-fetch for any listening components
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent(`${entityType}-changed`));
    }
}

// ============ Debug Utilities ============

// Expose cache stats in development
if (import.meta.env.DEV && typeof window !== 'undefined') {
    (window as any).__dataCache = {
        stats: () => console.table(dataCache.getStats()),
        clear: () => dataCache.clear(),
        invalidate: (pattern?: string) => dataCache.invalidate(pattern),
        instance: dataCache
    };

    console.log('[DataCache] Debug utilities available at window.__dataCache');
}

export default dataCache;
