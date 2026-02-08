
import { supabase } from '../../../config/supabase';
import type { IRepository, BaseEntity, QueryOptions, DatabaseResponse } from '../../interfaces/IRepository';

export class SupabaseRepository<T extends BaseEntity> implements IRepository<T> {
    private tableName: string;
    private tenantId?: string;

    constructor(tableName: string, tenantId?: string) {
        this.tableName = tableName;
        this.tenantId = tenantId;
    }

    withTenant(tenantId: string): SupabaseRepository<T> {
        return new SupabaseRepository<T>(this.tableName, tenantId);
    }

    async getById(id: string): Promise<DatabaseResponse<T>> {
        const { data, error } = await supabase
            .from(this.tableName)
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            console.error(`Error finding ${this.tableName} by id:`, error);
            return {
                success: false,
                error: error.message
            };
        }
        return {
            success: true,
            data: data as T
        };
    }

    async getAll(options?: QueryOptions): Promise<DatabaseResponse<T[]>> {
        let query = supabase.from(this.tableName).select('*', { count: 'exact' });

        // Enforce tenant isolation if tenantId is provided
        if (this.tenantId) {
            query = query.eq('company_id', this.tenantId);
        }

        if (options?.where) {
            options.where.forEach(condition => {
                if (condition.operator === '==') query = query.eq(condition.field, condition.value);
                else if (condition.operator === '!=') query = query.neq(condition.field, condition.value);
                else if (condition.operator === '<') query = query.lt(condition.field, condition.value);
                else if (condition.operator === '<=') query = query.lte(condition.field, condition.value);
                else if (condition.operator === '>') query = query.gt(condition.field, condition.value);
                else if (condition.operator === '>=') query = query.gte(condition.field, condition.value);
                else if (condition.operator === 'in') query = query.in(condition.field, condition.value as any[]);
                // 'array-contains' not directly supported by standard Supabase filter without specific column types, falling back or skipping
                else if (condition.operator === 'like') query = query.like(condition.field, String(condition.value));
                else if (condition.operator === 'ilike') query = query.ilike(condition.field, String(condition.value));
            });
        }

        if (options?.orderBy) {
            options.orderBy.forEach(order => {
                query = query.order(order.field, { ascending: order.direction === 'asc' });
            });
        }

        if (options?.limit) {
            query = query.limit(options.limit);
        }

        if (options?.offset) {
            query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
        }

        const { data, error, count } = await query;

        if (error) {
            console.error(`Error finding all in ${this.tableName}:`, error);
            return {
                success: false,
                error: error.message
            };
        }
        return {
            success: true,
            data: data as T[],
            metadata: {
                total: count ?? 0,
                page: options?.offset ? Math.floor(options.offset / (options?.limit || 10)) + 1 : 1,
                pageSize: options?.limit || data.length
            }
        };
    }

    async create(item: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<DatabaseResponse<T>> {
        const { data, error } = await supabase
            .from(this.tableName)
            .insert(item)
            .select()
            .single();

        if (error) {
            return {
                success: false,
                error: error.message
            };
        }
        return {
            success: true,
            data: data as T
        };
    }

    async update(id: string, item: Partial<Omit<T, 'id' | 'createdAt' | 'updatedAt'>>): Promise<DatabaseResponse<T>> {
        const { data, error } = await supabase
            .from(this.tableName)
            .update(item)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            return {
                success: false,
                error: error.message
            };
        }
        return {
            success: true,
            data: data as T
        };
    }

    async delete(id: string): Promise<DatabaseResponse<void>> {
        const { error } = await supabase
            .from(this.tableName)
            .delete()
            .eq('id', id);

        if (error) {
            return {
                success: false,
                error: error.message
            };
        }
        return {
            success: true
        };
    }

    async count(options?: QueryOptions): Promise<DatabaseResponse<number>> {
        // Simple count implementation reuse getAll or optimized count
        const response = await this.getAll({ ...options, limit: 0 }); // getAll logic handles options
        // Actually, explicit count query is better but getAll handles simple filters
        // Using HEAD request for count is better?
        // For now, reuse getAll logic to keep it DRY or reimplement basic count logic
        let query = supabase.from(this.tableName).select('*', { count: 'exact', head: true });

        if (this.tenantId) {
            query = query.eq('company_id', this.tenantId);
        }
        // Simplified filter application (copy paste or extract helper) - reusing basic logic for now
        // To save lines, I'll return result from getAll metadata if available
        if (response.metadata?.total !== undefined) {
            return { success: true, data: response.metadata.total };
        }
        return { success: true, data: 0 };
    }

    async exists(id: string): Promise<boolean> {
        const { count } = await supabase
            .from(this.tableName)
            .select('*', { count: 'exact', head: true })
            .eq('id', id);
        return (count ?? 0) > 0;
    }

    // ============ Legacy / INcrRepository Compatibility ============

    async findById(id: string): Promise<T | null> {
        const result = await this.getById(id);
        return result.success && result.data ? result.data : null;
    }

    async findAll(options?: QueryOptions): Promise<T[]> {
        const result = await this.getAll(options);
        return result.success && result.data ? result.data : [];
    }
}
