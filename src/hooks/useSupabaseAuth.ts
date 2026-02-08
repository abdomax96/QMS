import { useRef } from 'react';
import { useAuthStore } from '../store/authStore';
import type { AuthProfile } from '../store/authStore';

// Re-export type for compatibility
export type { AuthProfile };

export function useSupabaseAuth() {
    // Subscribe to specific parts of the store to avoid unnecessary re-renders
    // or just use the whole store if granularity isn't critical yet
    const profile = useAuthStore(state => state.profile);
    const session = useAuthStore(state => state.session);
    const loading = useAuthStore(state => state.loading);
    const isQuality = useAuthStore(state => state.isQuality);
    const userDeleted = useAuthStore(state => state.userDeleted);

    // Actions are stable
    const signIn = useAuthStore(state => state.signIn);
    const signUp = useAuthStore(state => state.signUp);
    const signOut = useAuthStore(state => state.signOut);
    const updateProfileLocal = useAuthStore(state => state.updateProfileLocal);

    // No local state, no useEffects for logic here.
    // Logic is handled in the store.

    return {
        profile,
        loading,
        signIn,
        signUp,
        signOut,
        isQuality,
        session,
        updateProfileLocal,
        userDeleted
    };
}
