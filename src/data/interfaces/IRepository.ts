/**
 * Database Query Options
 */
export interface QueryOptions {
    where?: Array<{
        field: string;
        operator: '==' | '!=' | '<' | '<=' | '>' | '>=' | 'in' | 'array-contains' | 'like' | 'ilike';
        value: unknown;
    }>;
    orderBy?: Array<{
        field: string;
        direction?: 'asc' | 'desc';
    }>;
    limit?: number;
    offset?: number;
}

/**
 * Database Response Wrapper
 */
export interface DatabaseResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
    metadata?: {
        total?: number;
        page?: number;
        pageSize?: number;
    };
}

/**
 * Base Entity Interface
 */
export interface BaseEntity {
    id: string;
    createdAt?: string | Date;
    updatedAt?: string | Date;
}

/**
 * Repository Interface - Abstract contract for data access
 * This interface should be implemented by all database adapters (Firebase, PostgreSQL, etc.)
 */
export interface IRepository<T extends BaseEntity> {
    /**
     * Get a single entity by ID
     */
    getById(id: string): Promise<DatabaseResponse<T>>;

    /**
     * Get all entities with optional query options
     */
    getAll(options?: QueryOptions): Promise<DatabaseResponse<T[]>>;

    /**
     * Create a new entity
     */
    create(data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<DatabaseResponse<T>>;

    /**
     * Update an existing entity
     */
    update(id: string, data: Partial<Omit<T, 'id' | 'createdAt' | 'updatedAt'>>): Promise<DatabaseResponse<T>>;

    /**
     * Delete an entity by ID
     */
    delete(id: string): Promise<DatabaseResponse<void>>;

    /**
     * Count entities matching query options
     */
    count(options?: QueryOptions): Promise<DatabaseResponse<number>>;

    /**
     * Check if entity exists
     */
    exists(id: string): Promise<boolean>;

    /**
     * Subscribe to real-time updates (optional - mainly for Firebase)
     * Returns unsubscribe function
     */
    subscribe?(callback: (data: T[]) => void, options?: QueryOptions): () => void;

    /**
     * Subscribe to a single document (optional)
     */
    subscribeToOne?(id: string, callback: (data: T | null) => void): () => void;

    /**
     * Batch create multiple entities
     */
    createMany?(data: Array<Omit<T, 'id' | 'createdAt' | 'updatedAt'>>): Promise<DatabaseResponse<T[]>>;

    /**
     * Batch update multiple entities
     */
    updateMany?(updates: Array<{ id: string; data: Partial<T> }>): Promise<DatabaseResponse<T[]>>;

    /**
     * Batch delete multiple entities
     */
    deleteMany?(ids: string[]): Promise<DatabaseResponse<void>>;
}

/**
 * Repository with transactions support
 */
export interface ITransactionalRepository<T extends BaseEntity> extends IRepository<T> {
    /**
     * Execute operations within a transaction
     */
    transaction<R>(operations: () => Promise<R>): Promise<R>;
}
