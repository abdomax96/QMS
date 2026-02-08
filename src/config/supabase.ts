import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

// Export for direct REST API usage
export const supabaseUrl = SUPABASE_URL;
export const supabaseAnonKey = SUPABASE_ANON_KEY;

// Debug logging (only in development)
if (import.meta.env.DEV) {
    console.log('=== Supabase Configuration ===');
    console.log('VITE_SUPABASE_URL:', SUPABASE_URL ? '✓ Set' : '✗ NOT SET');
    console.log('VITE_SUPABASE_ANON_KEY:', SUPABASE_ANON_KEY ? '✓ Set' : '✗ NOT SET');
}

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

if (!isSupabaseConfigured) {
    console.warn('⚠️ Supabase is NOT configured. Please create .env.local with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, then restart the dev server.');
}

/**
 * Direct REST API helper for Supabase
 * Bypasses the Supabase JS client which may have issues
 */
export async function supabaseRestQuery<T = any>(
    table: string,
    options?: {
        select?: string;
        filters?: Record<string, string>;
        limit?: number;
        single?: boolean;
    }
): Promise<{ data: T[] | null; error: Error | null }> {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
        return { data: null, error: new Error('Supabase not configured') };
    }

    try {
        const params = new URLSearchParams();
        params.set('select', options?.select || '*');

        if (options?.limit) {
            params.set('limit', String(options.limit));
        }

        let url = `${SUPABASE_URL}/rest/v1/${table}?${params.toString()}`;

        // Add filters
        if (options?.filters) {
            for (const [key, value] of Object.entries(options.filters)) {
                url += `&${key}=eq.${encodeURIComponent(value)}`;
            }
        }

        const response = await fetch(url, {
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': options?.single ? 'return=representation' : ''
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            return { data: null, error: new Error(`HTTP ${response.status}: ${errorText}`) };
        }

        const data = await response.json();
        return { data, error: null };
    } catch (err) {
        return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
    }
}

let _supabase: SupabaseClient | any;

if (isSupabaseConfigured) {
    // Create Supabase client for non-SELECT operations
    _supabase = createClient(SUPABASE_URL as string, SUPABASE_ANON_KEY as string, {
        auth: {
            autoRefreshToken: true,
            persistSession: true,
            detectSessionInUrl: true
        },
        db: {
            schema: 'public'
        }
    });

    console.log('[Supabase] Client created successfully');
} else {
    // Minimal noop fallback
    const missingMsg = 'Supabase is not configured';

    const noopFrom = (_table: string) => ({
        select: async () => ({ data: null, error: new Error(missingMsg) }),
        upsert: async () => ({ error: new Error(missingMsg) }),
        delete: async () => ({ error: new Error(missingMsg) }),
        update: async () => ({ error: new Error(missingMsg) }),
        eq() { return this; },
        single: async () => ({ data: null, error: new Error(missingMsg) })
    });

    _supabase = {
        auth: {
            getSession: async () => ({ data: { session: null } }),
            onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => { } } } }),
            signInWithPassword: async () => ({ error: new Error(missingMsg) }),
            signUp: async () => ({ error: new Error(missingMsg) }),
            signOut: async () => ({ error: new Error(missingMsg) })
        },
        from: noopFrom,
        storage: {
            from: (_bucket: string) => ({
                upload: async () => ({ data: null, error: new Error(missingMsg) }),
                download: async () => ({ data: null, error: new Error(missingMsg) }),
                getPublicUrl: () => ({ data: { publicUrl: '' } }),
                remove: async () => ({ error: new Error(missingMsg) }),
                createSignedUrl: async () => ({ data: null, error: new Error(missingMsg) })
            })
        },
        channel: (_name: string) => ({
            on: () => ({ subscribe: () => ({}) }),
            subscribe: () => ({})
        }),
        removeChannel: () => { }
    };
}

export const supabase = _supabase;
export const supabaseAdmin = _supabase; // Note: Admin features require service role key, this is a client-side alias
export default supabase;


