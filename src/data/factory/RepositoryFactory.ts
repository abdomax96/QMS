/**
 * Repository Factory
 * Creates the appropriate repository based on database configuration
 */

import { dbConfig } from '../config';
import { SupabaseRepository } from '../repositories/supabase/SupabaseRepository';
import type { IRepository, BaseEntity } from '../interfaces/IRepository';

/**
 * Entity to collection/table name mapping
 * Add your entities here
 */
const ENTITY_MAPPING: Record<string, string> = {
    // NCR System
    ncr: 'ncr_reports',
    ncrSettings: 'settings',

    // Users
    users: 'users',

    // Reports System
    folders: 'folders',
    templates: 'templates',
    reports: 'reports',
    formInstances: 'form_instances',

    // Holds
    holds: 'holds'
};

/**
 * Get collection/table name for an entity
 */
export function getEntityName(entity: string): string {
    return ENTITY_MAPPING[entity] || entity;
}

/**
 * Create a repository for the specified entity
 * Always uses Supabase now
 */
export function createRepository<T extends BaseEntity>(entity: string): IRepository<T> {
    const collectionName = getEntityName(entity);
    return new SupabaseRepository<T>(collectionName);
}

/**
 * Repository instances cache
 * Reuses repository instances for the same entity
 */
const repositoryCache = new Map<string, IRepository<any>>();

/**
 * Get or create a cached repository instance
 */
export function getRepository<T extends BaseEntity>(entity: string): IRepository<T> {
    const cacheKey = `supabase:${entity}`;

    if (!repositoryCache.has(cacheKey)) {
        repositoryCache.set(cacheKey, createRepository<T>(entity));
    }

    return repositoryCache.get(cacheKey) as IRepository<T>;
}

/**
 * Clear repository cache
 */
export function clearRepositoryCache(): void {
    repositoryCache.clear();
}

/**
 * Pre-configured repository getters for common entities
 */
export const repositories = {
    get ncr() { return getRepository('ncr'); },
    get ncrSettings() { return getRepository('ncrSettings'); },
    get users() { return getRepository('users'); },
    get folders() { return getRepository('folders'); },
    get templates() { return getRepository('templates'); },
    get reports() { return getRepository('reports'); },
    get formInstances() { return getRepository('formInstances'); },
    get holds() { return getRepository('holds'); }
};

export default repositories;
