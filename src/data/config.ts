/**
 * Database Configuration
 * Using Supabase (PostgreSQL) exclusively
 */

export type DatabaseType = 'supabase' | 'postgres';

export interface PostgresConfig {
    host: string;
    port: number;
    database: string;
    username: string;
    password: string;
    ssl?: boolean;
}

export interface DatabaseConfig {
    type: DatabaseType;
    postgres?: PostgresConfig;
}

/**
 * Get database configuration from environment variables
 */
export function getDatabaseConfig(): DatabaseConfig {
    const dbType = (import.meta.env.VITE_DB_TYPE as DatabaseType) || 'supabase';

    return {
        type: dbType,
        postgres: {
            host: import.meta.env.VITE_PG_HOST || 'localhost',
            port: parseInt(import.meta.env.VITE_PG_PORT || '5432', 10),
            database: import.meta.env.VITE_PG_DATABASE || 'quality_system',
            username: import.meta.env.VITE_PG_USERNAME || 'postgres',
            password: import.meta.env.VITE_PG_PASSWORD || '',
            ssl: import.meta.env.VITE_PG_SSL === 'true'
        }
    };
}

/**
 * Current database configuration
 */
export const dbConfig = getDatabaseConfig();

/**
 * Check if using Supabase
 */
export const isSupabase = () => dbConfig.type === 'supabase';

/**
 * Check if using PostgreSQL directly
 */
export const isPostgres = () => dbConfig.type === 'postgres';

export default dbConfig;
