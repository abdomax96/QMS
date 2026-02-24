/**
 * Progressive Loader Service
 * خدمة لتحميل البيانات بشكل تدريجي لتحسين الأداء
 * 
 * استراتيجية التحميل:
 * 1. Essential: بيانات المستخدم والصلاحيات (فوري - 50-100ms)
 * 2. Secondary: المجلدات والنماذج الحديثة (100-300ms)
 * 3. Lazy: باقي البيانات (عند الحاجة)
 */

import { supabase } from '../config/supabase';
import { logger } from '../utils/logger';

export interface ProgressiveLoadProgress {
    stage: 'essential' | 'secondary' | 'lazy' | 'complete';
    progress: number; // 0-100
    message: string;
}

export type ProgressCallback = (progress: ProgressiveLoadProgress) => void;

class ProgressiveLoaderService {
    private mapTemplateRow(row: any): any {
        return {
            ...row,
            folder_id: row.unified_folder_id || row.folder_id || null,
            archived: row.archived || false
        };
    }

    private mapInstanceRow(row: any): any {
        return {
            ...row,
            id: row.id,
            instance_id: row.id,
            folder_id: row.unified_folder_id || row.folder_id || null,
            template_version: row.template_version || '1.0',
            form_data: row.form_data || { report_date: '', sections: {} },
            archived: row.archived || false
        };
    }

    /**
     * المرحلة 1: تحميل البيانات الأساسية (Essential)
     * - بروفايل المستخدم
     * - الصلاحيات
     * - الوحدات النشطة
     */
    async loadEssentials(onProgress?: ProgressCallback): Promise<{
        userProfile: any;
        userPermissions: any;
        activeModules: any[];
    }> {
        try {
            onProgress?.({
                stage: 'essential',
                progress: 10,
                message: 'جاري تحميل بيانات المستخدم...'
            });

            // جلب المستخدم الحالي
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                throw new Error('No authenticated user');
            }

            onProgress?.({
                stage: 'essential',
                progress: 40,
                message: 'جاري تحميل الملف الشخصي والصلاحيات...'
            });

            const userProfilePromise = supabase
                .from('users')
                .select('id, email, name, department_id') // ROOT FIX: Use department_id, remove is_deleted
                .eq('id', user.id)
                .single();

            const userRolesPromise = supabase
                .from('user_roles')
                .select('role_id') // ROOT FIX: Correct column name
                .eq('user_id', user.id);

            const permissionsPromise = supabase
                .rpc('get_user_module_permissions', { user_uuid: user.id }) // ROOT FIX: Correct parameter
                .then(({ data, error }) => {
                    if (error) {
                        logger.warn('[ProgressiveLoader] RPC access failed, using fallback:', error);
                        return [];
                    }
                    return data || [];
                })
                .catch((rpcError) => {
                    logger.warn('[ProgressiveLoader] RPC access failed, using fallback:', rpcError);
                    return [];
                });

            onProgress?.({
                stage: 'essential',
                progress: 70,
                message: 'جاري مزامنة صلاحيات الوحدات...'
            });

            const [
                { data: userProfile, error: userProfileError },
                { data: userRoles, error: userRolesError },
                permissions,
            ] = await Promise.all([
                userProfilePromise,
                userRolesPromise,
                permissionsPromise,
            ]);

            if (userProfileError) {
                logger.warn('[ProgressiveLoader] Failed to load user profile essentials:', userProfileError);
            }

            if (userRolesError) {
                logger.warn('[ProgressiveLoader] Failed to load user roles essentials:', userRolesError);
            }

            const roleCodes = userRoles?.map(r => r.role_id) || [];

            onProgress?.({
                stage: 'essential',
                progress: 100,
                message: 'تم تحميل البيانات الأساسية'
            });

            return {
                userProfile,
                userPermissions: {
                    roles: roleCodes,
                    modules: permissions || []
                },
                activeModules: permissions || []
            };
        } catch (error) {
            logger.error('[ProgressiveLoader] Error loading essentials:', error);
            throw error;
        }
    }

    /**
     * المرحلة 2: تحميل البيانات الثانوية (Secondary)
     * - المجلدات الرئيسية
     * - آخر 10 نماذج
     * - آخر 20 تقرير
     */
    async loadSecondary(onProgress?: ProgressCallback): Promise<{
        folders: Record<string, any>;
        recentTemplates: Record<string, any>;
        recentInstances: Record<string, any>;
    }> {
        try {
            onProgress?.({
                stage: 'secondary',
                progress: 10,
                message: 'جاري تحميل المجلدات...'
            });

            // تحميل المجلدات الرئيسية فقط (root folders)
            // ROOT FIX: Use unified_folders table and 'archived' column
            const { data: foldersData } = await supabase
                .from('unified_folders')
                .select('*')
                .is('parent_id', null)
                .eq('archived', false) // ROOT FIX: Correct column name
                .order('name');

            const folders: Record<string, any> = {};
            foldersData?.forEach(folder => {
                folders[folder.id] = folder;
            });

            onProgress?.({
                stage: 'secondary',
                progress: 40,
                message: 'جاري تحميل النماذج الحديثة...'
            });

            // تحميل آخر 10 نماذج فقط
            // ROOT FIX: Use 'archived' column
            const { data: templatesData } = await supabase
                .from('form_templates')
                .select('id, name, folder_id, unified_folder_id, version, created_at, updated_at, archived')
                .eq('archived', false) // ROOT FIX: Correct filter
                .order('updated_at', { ascending: false })
                .limit(10);

            const recentTemplates: Record<string, any> = {};
            templatesData?.forEach(template => {
                // Map unified_folder_id to folder_id for frontend compatibility
                const effectiveFolderId = template.unified_folder_id || template.folder_id;
                recentTemplates[template.id] = { ...template, folder_id: effectiveFolderId };
            });

            onProgress?.({
                stage: 'secondary',
                progress: 70,
                message: 'جاري تحميل التقارير الحديثة...'
            });

            // تحميل آخر 20 تقرير فقط
            // ROOT FIX: Use 'archived' column and 'id'
            const { data: instancesData } = await supabase
                .from('form_instances')
                .select('id, template_id, folder_id, unified_folder_id, status, created_at, updated_at, created_by, archived')
                .eq('archived', false) // ROOT FIX: Correct filter
                .order('updated_at', { ascending: false })
                .limit(20);

            const recentInstances: Record<string, any> = {};
            instancesData?.forEach(instance => {
                // Map 'id' -> 'instance_id' and unified_folder_id -> folder_id
                const effectiveFolderId = instance.unified_folder_id || instance.folder_id;
                recentInstances[instance.id] = {
                    ...instance,
                    instance_id: instance.id,
                    folder_id: effectiveFolderId
                };
            });

            onProgress?.({
                stage: 'secondary',
                progress: 100,
                message: 'تم تحميل البيانات الثانوية'
            });

            return {
                folders,
                recentTemplates,
                recentInstances
            };
        } catch (error) {
            logger.error('[ProgressiveLoader] Error loading secondary:', error);
            throw error;
        }
    }

    /**
     * تحميل المجلدات الفرعية عند الحاجة (Lazy Loading)
     */
    async loadFolderChildren(parentId: string): Promise<any[]> {
        try {
            const { data } = await supabase
                .from('unified_folders') // ROOT FIX: Use unified_folders
                .select('*')
                .eq('parent_id', parentId)
                .eq('archived', false) // ROOT FIX: Use archived
                .order('name');

            return data || [];
        } catch (error) {
            logger.error(`[ProgressiveLoader] Error loading folder children for ${parentId}:`, error);
            return [];
        }
    }

    /**
     * تحميل نماذج مجلد معين عند الحاجة
     */
    async loadFolderTemplates(folderId: string | null, page: number = 1, limit: number = 20): Promise<{
        data: any[];
        hasMore: boolean;
        total: number;
    }> {
        try {
            const from = (page - 1) * limit;
            const to = from + limit - 1;

            let countQuery = supabase
                .from('form_templates')
                .select('*', { count: 'exact', head: true })
                .eq('archived', false);

            if (folderId) {
                countQuery = countQuery.or(`unified_folder_id.eq.${folderId},folder_id.eq.${folderId}`);
            } else {
                countQuery = countQuery.or('unified_folder_id.is.null,folder_id.is.null');
            }

            const { count } = await countQuery;

            let pageQuery = supabase
                .from('form_templates')
                .select('*')
                .eq('archived', false) // ROOT FIX: Use archived
                .order('updated_at', { ascending: false })
                .range(from, to);

            if (folderId) {
                pageQuery = pageQuery.or(`unified_folder_id.eq.${folderId},folder_id.eq.${folderId}`);
            } else {
                pageQuery = pageQuery.or('unified_folder_id.is.null,folder_id.is.null');
            }

            const { data } = await pageQuery;

            return {
                data: (data || []).map((row) => this.mapTemplateRow(row)),
                hasMore: (count || 0) > (page * limit),
                total: count || 0
            };
        } catch (error) {
            logger.error(`[ProgressiveLoader] Error loading templates for folder ${folderId || '__root__'}:`, error);
            return { data: [], hasMore: false, total: 0 };
        }
    }

    /**
     * تحميل تقارير مجلد معين عند الحاجة
     */
    async loadFolderInstances(folderId: string | null, page: number = 1, limit: number = 20): Promise<{
        data: any[];
        hasMore: boolean;
        total: number;
    }> {
        try {
            const from = (page - 1) * limit;
            const to = from + limit - 1;

            let countQuery = supabase
                .from('form_instances')
                .select('*', { count: 'exact', head: true })
                .eq('archived', false);

            if (folderId) {
                countQuery = countQuery.or(`unified_folder_id.eq.${folderId},folder_id.eq.${folderId}`);
            } else {
                countQuery = countQuery.or('unified_folder_id.is.null,folder_id.is.null');
            }

            const { count } = await countQuery;

            let pageQuery = supabase
                .from('form_instances')
                .select('*')
                .eq('archived', false)
                .order('updated_at', { ascending: false })
                .range(from, to);

            if (folderId) {
                pageQuery = pageQuery.or(`unified_folder_id.eq.${folderId},folder_id.eq.${folderId}`);
            } else {
                pageQuery = pageQuery.or('unified_folder_id.is.null,folder_id.is.null');
            }

            const { data } = await pageQuery;

            return {
                data: (data || []).map((row) => this.mapInstanceRow(row)),
                hasMore: (count || 0) > (page * limit),
                total: count || 0
            };
        } catch (error) {
            logger.error(`[ProgressiveLoader] Error loading instances for folder ${folderId || '__root__'}:`, error);
            return { data: [], hasMore: false, total: 0 };
        }
    }

    /**
     * تحميل تقارير نموذج معين عند الحاجة
     */
    async loadTemplateInstances(templateId: string, page: number = 1, limit: number = 20): Promise<{
        data: any[];
        hasMore: boolean;
        total: number;
    }> {
        try {
            const from = (page - 1) * limit;
            const to = from + limit - 1;

            // جلب العدد الكلي
            const { count } = await supabase
                .from('form_instances')
                .select('*', { count: 'exact', head: true })
                .eq('template_id', templateId)
                .eq('archived', false); // ROOT FIX: Use archived

            // جلب الصفحة المطلوبة
            const { data } = await supabase
                .from('form_instances')
                .select('*')
                .eq('template_id', templateId)
                .eq('archived', false) // ROOT FIX: Use archived
                .order('updated_at', { ascending: false })
                .range(from, to);

            return {
                data: (data || []).map((row) => this.mapInstanceRow(row)),
                hasMore: (count || 0) > (page * limit),
                total: count || 0
            };
        } catch (error) {
            logger.error(`[ProgressiveLoader] Error loading instances for template ${templateId}:`, error);
            return { data: [], hasMore: false, total: 0 };
        }
    }

    /**
     * البحث في النماذج مع pagination
     */
    async searchTemplates(query: string, page: number = 1, limit: number = 20): Promise<{
        data: any[];
        hasMore: boolean;
        total: number;
    }> {
        try {
            const from = (page - 1) * limit;
            const to = from + limit - 1;

            // جلب العدد الكلي
            const { count } = await supabase
                .from('form_templates')
                .select('*', { count: 'exact', head: true })
                .ilike('name', `%${query}%`)
                .eq('archived', false); // ROOT FIX: Use archived

            // جلب الصفحة المطلوبة
            const { data } = await supabase
                .from('form_templates')
                .select('*')
                .ilike('name', `%${query}%`)
                .eq('archived', false) // ROOT FIX: Use archived
                .order('updated_at', { ascending: false })
                .range(from, to);

            return {
                data: data || [],
                hasMore: (count || 0) > (page * limit),
                total: count || 0
            };
        } catch (error) {
            logger.error(`[ProgressiveLoader] Error searching templates:`, error);
            return { data: [], hasMore: false, total: 0 };
        }
    }
}

// Export singleton instance
export const progressiveLoader = new ProgressiveLoaderService();
export default progressiveLoader;
