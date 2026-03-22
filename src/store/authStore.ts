
import { create } from 'zustand';
import { supabase, supabaseRestQuery } from '../config/supabase';
import type { Session, AuthChangeEvent, RealtimeChannel } from '@supabase/supabase-js';
import { fetchSystemSettings } from '../services/ncr/settingsService';
import { dataCache } from '../services/dataCache';
import { invalidatePermissionCache } from '../services/permissionService';

export const AUTH_STORE_READY_EVENT = 'qms:auth-store-ready';

export interface AuthProfile {
    uid: string;
    email: string;
    name?: string;
    department?: string;
    department_id?: string;
    roles?: string[];
    avatar_url?: string;
    phone?: string;
    title?: string;
}

interface AuthState {
    profile: AuthProfile | null;
    session: Session | null;
    loading: boolean;
    isQuality: boolean;
    userDeleted: boolean;
    initialized: boolean;

    // Actions
    signIn: (email: string, password: string) => Promise<void>;
    signUp: (email: string, password: string, name: string, department: string) => Promise<void>;
    signOut: () => Promise<void>;
    updateProfileLocal: (updates: Partial<AuthProfile>) => void;
    initialize: () => Promise<void>;
}

function emitAuthStoreReady(): void {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent(AUTH_STORE_READY_EVENT));
}

// Helper to add timeout to promises
async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, fallback: T): Promise<T> {
    return Promise.race([
        promise,
        new Promise<T>((resolve) => setTimeout(() => resolve(fallback), timeoutMs))
    ]);
}

export const useAuthStore = create<AuthState>((set, get) => {
    // Refs for cleanup (kept outside store state to avoid re-renders)
    let realtimeChannel: RealtimeChannel | null = null;
    let authSubscription: { unsubscribe: () => void } | null = null;
    let setupInProgress = false;

    // Internal helper to load profile
    const loadUserProfile = async (uid: string, email: string) => {
        try {
            console.log('[AuthStore] Loading user profile for:', uid);
            const { data, error } = await withTimeout(
                supabase.from('users').select('*').eq('id', uid).single(),
                15000, // Increased timeout to 15s
                { data: null, error: { message: 'Timeout' } } as any
            );

            if (error) {
                console.warn('[AuthStore] Error loading user profile:', error.message);
                if (error.message === 'Timeout') {
                    // Don't clear profile on timeout if we already have one?
                    // But we might be strictly blocked.
                    // Fallback to minimal profile
                }
            }

            if (data) {
                console.log('[AuthStore] User data loaded successfully');
                const newProfile = {
                    uid,
                    email,
                    name: data.name || data.display_name || '',
                    department: data.department,
                    department_id: data.department_id,
                    roles: data.roles || [],
                    avatar_url: data.avatar_url,
                    phone: data.phone,
                    title: data.title
                };

                set({ profile: newProfile, loading: false });
                checkQualityAccess(newProfile);
            } else {
                console.warn('[AuthStore] No user data found for uid:', uid);
                set({ profile: { uid, email }, loading: false });
            }
        } catch (err) {
            console.error('[AuthStore] Failed to load user profile', err);
            set({ profile: { uid, email }, loading: false });
        }
    };

    const checkQualityAccess = async (profile: AuthProfile) => {
        try {
            const s = await fetchSystemSettings();
            const byDept = !!profile && !!s.qualityDepartments && profile.department && s.qualityDepartments.includes(profile.department);
            const byRole = !!profile && ((profile.roles || []) as string[]).includes('quality');
            set({ isQuality: !!(byDept || byRole) });
        } catch {
            const fallback = !!profile && (((profile.roles || []) as string[]).includes('quality') || (profile.department || '').toLowerCase().includes('quality') || (profile.department || '').includes('جودة'));
            set({ isQuality: !!fallback });
        }
    };

    const setupRealtimeUserWatch = (userId: string) => {
        if (realtimeChannel || setupInProgress) return;
        setupInProgress = true;

        const channelName = `user-session-${userId}`;
        console.log('[AuthStore] Setting up realtime watch:', channelName);

        realtimeChannel = supabase.channel(channelName)
            .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'users', filter: `id=eq.${userId}` },
                async () => {
                    console.warn('[AuthStore] User deleted via realtime');
                    await get().signOut();
                    set({ userDeleted: true });
                    window.location.href = '/login?reason=account_deleted';
                })
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'users', filter: `id=eq.${userId}` },
                async (payload) => {
                    const newData = payload.new as any;
                    if (newData && newData.is_active === false) {
                        console.warn('[AuthStore] User deactivated via realtime');
                        await get().signOut();
                        window.location.href = '/login?reason=account_deleted';
                    }
                    // Optional: could reload profile here if other fields changed
                })
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    console.log('[AuthStore] Realtime active');
                    setupInProgress = false;
                } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
                    console.warn('[AuthStore] Realtime failed');
                    setupInProgress = false;
                }
            });
    };

    return {
        profile: null,
        session: null,
        loading: true,
        isQuality: false,
        userDeleted: false,
        initialized: false,

        initialize: async () => {
            if (get().initialized) return;

            console.log('[AuthStore] Initializing...');

            // Wrap getSession with timeout so initialize() always completes promptly.
            // Without this, a slow Supabase response (>10s) causes ProtectedRoute to
            // fire its timeout while session is still null, wrongly redirecting
            // authenticated users to /login.
            let session: Session | null = null;
            try {
                const result = await withTimeout(
                    supabase.auth.getSession(),
                    8000, // 8s — safely under ProtectedRoute's 10s timeout
                    { data: { session: null } } as any
                );
                session = result?.data?.session ?? null;
            } catch {
                session = null;
            }

            // Update session state immediately after getSession() resolves.
            if (session?.user) {
                set({ session });
            } else {
                set({ session: null, profile: null, loading: false });
            }

            // Set up listener BEFORE marking initialized so no auth events are missed.
            const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
                console.log(`[AuthStore] 🔔 Auth event: ${event}`, {
                    hasSession: !!newSession,
                    userId: newSession?.user?.id,
                    expiresAt: newSession?.expires_at
                });

                const currentSession = get().session;

                // Only act if session actually changed validity or user
                if (!newSession && currentSession) {
                    // Logout
                    console.warn('[AuthStore] 🚪 Session ended - Logging out');
                    set({ session: null, profile: null, loading: false, isQuality: false });
                    if (realtimeChannel) { supabase.removeChannel(realtimeChannel); realtimeChannel = null; }
                } else if (newSession && (!currentSession || currentSession.user.id !== newSession.user.id)) {
                    // Login or user switch
                    console.log('[AuthStore] 👤 New user session detected');
                    set({ session: newSession, loading: true });
                    await loadUserProfile(newSession.user.id, newSession.user.email || '');
                    if (realtimeChannel) { supabase.removeChannel(realtimeChannel); realtimeChannel = null; }
                    setupRealtimeUserWatch(newSession.user.id);
                } else if (newSession) {
                    // Session refresh
                    if (event === 'TOKEN_REFRESHED') {
                        console.log('[AuthStore] 🔄 Token refreshed successfully');
                    }
                    set({ session: newSession });
                }
            });

            authSubscription = subscription;

            // Mark initialized NOW — session state is known and listener is active.
            // Profile loading below is intentionally decoupled: ProtectedRoute and
            // useSupabaseSync can proceed as soon as they see initialized=true.
            set({ initialized: true });
            emitAuthStoreReady();

            // Load profile in the background (after unblocking waiters).
            if (session?.user) {
                await loadUserProfile(session.user.id, session.user.email || '');
                setupRealtimeUserWatch(session.user.id);
            }
        },

        signIn: async (email, password) => {
            const { error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) throw error;
        },

        signUp: async (email, password, name, department) => {
            const { data, error } = await supabase.auth.signUp({ email, password });
            if (error) throw error;
            if (data.user) {
                await supabase.from('users').insert({
                    id: data.user.id,
                    email: data.user.email,
                    name,
                    department,
                    roles: [],
                    created_at: new Date().toISOString()
                });
            }
        },

        signOut: async () => {
            console.log('[AuthStore] 👋 signOut called');
            if (realtimeChannel) { supabase.removeChannel(realtimeChannel); realtimeChannel = null; }
            await supabase.auth.signOut();

            // Clear all caches to prevent stale data on next login
            dataCache.clear();
            invalidatePermissionCache();
            console.log('[AuthStore] All caches cleared on signOut');

            set({ session: null, profile: null, loading: false, isQuality: false });
        },

        updateProfileLocal: (updates) => {
            set(state => ({
                profile: state.profile ? { ...state.profile, ...updates } : null
            }));
        }
    };
});
