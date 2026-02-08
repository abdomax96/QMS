import { useEffect, useState } from 'react';
import { supabase } from '../../config/supabase';
import { fetchSystemSettings } from '../../services/ncr/settingsService';

export interface AuthProfile {
    uid: string;
    email: string;
    name?: string;
    department?: string;
    roles?: string[];
    avatarUrl?: string;
}

export function useAuth() {
    const [profile, setProfile] = useState<AuthProfile | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Get initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session?.user) {
                loadUserProfile(session.user.id, session.user.email || '');
            } else {
                setProfile(null);
                setLoading(false);
            }
        });

        // Listen to auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
            if (!session?.user) {
                setProfile(null);
                setLoading(false);
                return;
            }
            await loadUserProfile(session.user.id, session.user.email || '');
        });

        return () => subscription.unsubscribe();
    }, []);

    const loadUserProfile = async (uid: string, email: string) => {
        try {
            // Try to pick avatar from auth metadata first
            let avatarFromAuth: string | undefined;
            const { data: sessionData } = await supabase.auth.getSession();
            avatarFromAuth = sessionData?.session?.user?.user_metadata?.avatar_url;

            const { data, error } = await supabase
                .from('users')
                .select('id, name, display_name, email, department, roles, department_id, job_title_id, is_active, avatar_url')
                .eq('id', uid)
                .single();

            if (error && error.code !== 'PGRST116') {
                console.error('Error loading user profile:', error);
            }

            if (data) {
                setProfile({
                    uid,
                    email,
                    name: data.name || data.display_name || '',
                    department: data.department,
                    roles: data.roles || [],
                    avatarUrl: data.avatar_url || avatarFromAuth
                });
            } else {
                setProfile({ uid, email, avatarUrl: avatarFromAuth });
            }
        } catch (err) {
            console.error('Failed to load user profile', err);
            setProfile({ uid, email });
        } finally {
            setLoading(false);
        }
    };

    const signIn = async (email: string, password: string) => {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
    };

    const signUp = async (email: string, password: string, name: string, department: string) => {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;

        if (data.user) {
            await supabase.from('users').insert({
                id: data.user.id,
                email: data.user.email,
                name: name,
                department: department,
                roles: [],
                created_at: new Date().toISOString()
            });
        }
    };

    const signOut = async () => {
        await supabase.auth.signOut();
        setProfile(null);
    };

    const [isQualityFlag, setIsQualityFlag] = useState<boolean>(false);

    useEffect(() => {
        // Guard: Don't fetch settings if user is not logged in
        if (!profile) {
            setIsQualityFlag(false);
            return;
        }

        let mounted = true;
        (async () => {
            try {
                const s = await fetchSystemSettings();
                if (!mounted) return;
                const byDept = !!profile && !!s.qualityDepartments && profile.department && s.qualityDepartments.includes(profile.department);
                const byRole = !!profile && ((profile.roles || []) as string[]).includes('quality');
                setIsQualityFlag(!!(byDept || byRole));
            } catch {
                const fallback = !!profile && (((profile.roles || []) as string[]).includes('quality') || (profile.department || '').toLowerCase().includes('quality') || (profile.department || '').includes('جودة'));
                setIsQualityFlag(!!fallback);
            }
        })();
        return () => {
            mounted = false;
        };
    }, [profile]);

    return { profile, loading, signIn, signUp, signOut, isQuality: isQualityFlag };
}

export default useAuth;
