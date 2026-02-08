import { supabase } from '../../config/supabase';
import type { UserProfile } from '../../types/ncr';

/**
 * Lookup a user's display name by email.
 */
const nameCache = new Map<string, string | null>();

export async function getUserNameByEmail(email: string): Promise<string | null> {
    if (!email) return null;
    const key = email.toLowerCase();
    if (nameCache.has(key)) return nameCache.get(key) || null;

    try {
        const { data, error } = await supabase
            .from('users')
            .select('name, display_name')
            .eq('email', email)
            .single();

        if (error || !data) {
            nameCache.set(key, null);
            return null;
        }

        const name = (data.name || data.display_name || null) as string | null;
        nameCache.set(key, name);
        return name;
    } catch (err) {
        console.error('getUserNameByEmail failed', err);
        nameCache.set(key, null);
        return null;
    }
}

export function clearUserNameCache() {
    nameCache.clear();
}

let cachedAllUsers: UserProfile[] | null = null;

export async function getAllUserProfiles(): Promise<UserProfile[]> {
    if (cachedAllUsers) return cachedAllUsers;
    try {
        const { data, error } = await supabase
            .from('users')
            .select('name, display_name, email, title');

        if (error) {
            console.error('getAllUserProfiles failed', error);
            return [];
        }

        const results: UserProfile[] = (data || []).map((d: any) => ({
            name: (d.name || d.display_name || d.email || 'Unknown') as string,
            title: d.title as string | undefined
        }));
        cachedAllUsers = results;
        return results;
    } catch (err) {
        console.error('getAllUserProfiles failed', err);
        return [];
    }
}

export function clearAllUsersCache() {
    cachedAllUsers = null;
}
