/**
 * useFoldersWithIsolation Hook
 * Hook لتحميل المجلدات مع تطبيق عزل البيانات حسب القسم
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { foldersService } from '../services/supabaseService';
import { useModulePermissions } from './useModulePermissions';
import { useAuth } from './ncr/useAuth';
import { supabase } from '../config/supabase';
import type { Folder } from '../types';

export interface UseFoldersWithIsolationReturn {
    folders: Record<string, Folder>;
    loading: boolean;
    error: string | null;
    isolationMode: 'shared' | 'isolated' | 'hybrid';
    userDepartmentIds: string[];
    refresh: () => Promise<void>;
}

export function useFoldersWithIsolation(): UseFoldersWithIsolationReturn {
    const { profile } = useAuth();
    const { getIsolationMode, canSeeAllDepartments } = useModulePermissions();

    const [folders, setFolders] = useState<Record<string, Folder>>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [userDepartmentIds, setUserDepartmentIds] = useState<string[]>([]);

    const isolationMode = getIsolationMode('forms_reports');
    const canSeeAll = canSeeAllDepartments('forms_reports');

    // Use refs to store latest values without causing re-renders
    const isolationModeRef = useRef(isolationMode);
    const canSeeAllRef = useRef(canSeeAll);
    const userDepartmentIdsRef = useRef(userDepartmentIds);
    const loadingRef = useRef(false);

    // Keep refs in sync
    useEffect(() => {
        isolationModeRef.current = isolationMode;
        canSeeAllRef.current = canSeeAll;
        userDepartmentIdsRef.current = userDepartmentIds;
    }, [isolationMode, canSeeAll, userDepartmentIds]);

    // Load user departments - only once per user
    useEffect(() => {
        const loadUserDepartments = async () => {
            if (!profile?.uid) {
                setUserDepartmentIds([]);
                return;
            }

            try {
                const { data: depts } = await supabase
                    .from('user_departments')
                    .select('department_id')
                    .eq('user_id', profile.uid)
                    .eq('is_active', true);

                const ids = depts?.map(d => d.department_id) || [];
                console.log('[FoldersIsolation] User departments:', ids);
                setUserDepartmentIds(ids);
            } catch (err) {
                console.error('[FoldersIsolation] Error loading user departments:', err);
                setUserDepartmentIds([]);
            }
        };

        loadUserDepartments();
    }, [profile?.uid]);

    // Load folders - stable callback that reads from refs
    const loadFolders = useCallback(async () => {
        // Prevent duplicate calls
        if (loadingRef.current) {
            console.log('[FoldersIsolation] Already loading, skipping...');
            return;
        }

        loadingRef.current = true;
        setLoading(true);
        setError(null);

        try {
            const currentIsolationMode = isolationModeRef.current;
            const currentCanSeeAll = canSeeAllRef.current;
            const currentUserDeptIds = userDepartmentIdsRef.current;

            console.log('[FoldersIsolation] Loading folders...', {
                isolationMode: currentIsolationMode,
                canSeeAll: currentCanSeeAll,
                userDepartmentIds: currentUserDeptIds
            });

            // Load all folders in one call
            const allFolders = await foldersService.getAllFolders();
            let finalFolders: Record<string, Folder> = {};

            // Apply isolation filter if needed
            if (!currentCanSeeAll && currentIsolationMode === 'isolated' && currentUserDeptIds.length > 0) {
                Object.entries(allFolders).forEach(([id, folder]) => {
                    // Include folders belonging to user's department OR system folders (no dept)
                    if (!folder.department_id || currentUserDeptIds.includes(folder.department_id)) {
                        finalFolders[id] = folder;
                    }
                });
                console.log(`[FoldersIsolation] Filtered: ${Object.keys(finalFolders).length}/${Object.keys(allFolders).length} folders`);
            } else {
                finalFolders = allFolders;
                console.log(`[FoldersIsolation] No filter: ${Object.keys(finalFolders).length} folders`);
            }

            setFolders(finalFolders);
        } catch (err) {
            console.error('[FoldersIsolation] Error loading folders:', err);
            setError('فشل في تحميل المجلدات');
            setFolders({});
        }

        setLoading(false);
        loadingRef.current = false;
    }, []); // Empty deps - reads from refs

    // Load folders once when user is ready and deps are loaded
    const hasLoadedRef = useRef(false);

    useEffect(() => {
        // Only load once user departments are resolved
        if (profile?.uid && !hasLoadedRef.current && userDepartmentIds !== undefined) {
            hasLoadedRef.current = true;
            loadFolders();
        }
    }, [profile?.uid, userDepartmentIds, loadFolders]);

    return {
        folders,
        loading,
        error,
        isolationMode,
        userDepartmentIds,
        refresh: loadFolders
    };
}

export default useFoldersWithIsolation;

