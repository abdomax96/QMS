/**
 * Recipe Version Service
 * خدمة إدارة إصدارات الوصفات
 */

import { supabase } from '../config/supabase';
import type {
    RecipeVersion,
    RecipeChangeLog,
    RecipeVersionSummary,
    RecipeVersionDiff,
    RecipeIngredient,
    MixingStep
} from '../types/recipe';

/**
 * خدمة إصدارات الوصفات
 */
export const recipeVersionService = {
    /**
     * الحصول على جميع إصدارات وصفة معينة
     */
    async getVersionsByRecipeId(recipeId: string): Promise<RecipeVersion[]> {
        const { data, error } = await supabase
            .from('recipe_versions')
            .select('*')
            .eq('recipe_id', recipeId)
            .order('version_number', { ascending: false });

        if (error) {
            console.error('Error fetching recipe versions:', error);
            throw error;
        }

        return data || [];
    },

    /**
     * الحصول على إصدار محدد
     */
    async getVersionById(versionId: string): Promise<RecipeVersion | null> {
        const { data, error } = await supabase
            .from('recipe_versions')
            .select('*')
            .eq('id', versionId)
            .single();

        if (error) {
            console.error('Error fetching version:', error);
            return null;
        }

        return data;
    },

    /**
     * الحصول على ملخص إصدارات الوصفة
     */
    async getVersionSummary(recipeId: string): Promise<RecipeVersionSummary | null> {
        const versions = await this.getVersionsByRecipeId(recipeId);

        if (versions.length === 0) return null;

        const currentVersion = versions.find(v => !v.effective_until) || versions[0];
        const totalDays = versions.reduce((sum, v) => sum + (v.duration_days || 0), 0);

        return {
            total_versions: versions.length,
            current_version: currentVersion.version_number,
            first_created: versions[versions.length - 1].created_at,
            last_updated: versions[0].created_at,
            total_duration_days: totalDays,
            versions
        };
    },

    /**
     * الحصول على سجل التغييرات
     */
    async getChangeLog(recipeId: string, limit: number = 50): Promise<RecipeChangeLog[]> {
        const { data, error } = await supabase
            .from('recipe_change_log')
            .select('*')
            .eq('recipe_id', recipeId)
            .order('changed_at', { ascending: false })
            .limit(limit);

        if (error) {
            console.error('Error fetching change log:', error);
            throw error;
        }

        return data || [];
    },

    /**
     * مقارنة بين إصدارين
     */
    async compareVersions(versionAId: string, versionBId: string): Promise<RecipeVersionDiff | null> {
        const [versionA, versionB] = await Promise.all([
            this.getVersionById(versionAId),
            this.getVersionById(versionBId)
        ]);

        if (!versionA || !versionB) {
            console.error('One or both versions not found');
            return null;
        }

        const changes: RecipeVersionDiff['changes'] = [];

        // مقارنة الاسم
        if (versionA.name !== versionB.name) {
            changes.push({
                field: 'name',
                label: 'اسم الوصفة',
                old_value: versionA.name,
                new_value: versionB.name,
                type: 'changed'
            });
        }

        // مقارنة الملاحظات
        if (versionA.notes !== versionB.notes) {
            changes.push({
                field: 'notes',
                label: 'ملاحظات',
                old_value: versionA.notes,
                new_value: versionB.notes,
                type: versionB.notes && !versionA.notes ? 'added' :
                    !versionB.notes && versionA.notes ? 'removed' : 'changed'
            });
        }

        // مقارنة المكونات
        const ingredientsDiff = this.compareIngredients(
            versionA.ingredients || [],
            versionB.ingredients || []
        );
        if (ingredientsDiff.length > 0) {
            changes.push({
                field: 'ingredients',
                label: 'المكونات',
                old_value: versionA.ingredients,
                new_value: versionB.ingredients,
                type: 'changed'
            });
        }

        // مقارنة خطوات الخلط
        const stepsDiff = this.compareMixingSteps(
            versionA.mixing_steps || [],
            versionB.mixing_steps || []
        );
        if (stepsDiff.length > 0) {
            changes.push({
                field: 'mixing_steps',
                label: 'خطوات الخلط',
                old_value: versionA.mixing_steps,
                new_value: versionB.mixing_steps,
                type: 'changed'
            });
        }

        return {
            version_a: versionA,
            version_b: versionB,
            changes
        };
    },

    /**
     * مقارنة المكونات
     */
    compareIngredients(oldIngredients: RecipeIngredient[], newIngredients: RecipeIngredient[]): string[] {
        const changes: string[] = [];

        const oldMap = new Map(oldIngredients.map(i => [i.ingredient_name, i]));
        const newMap = new Map(newIngredients.map(i => [i.ingredient_name, i]));

        // المكونات المضافة
        for (const [name] of newMap) {
            if (!oldMap.has(name)) {
                changes.push(`✅ أُضيف: ${name}`);
            }
        }

        // المكونات المحذوفة
        for (const [name] of oldMap) {
            if (!newMap.has(name)) {
                changes.push(`❌ حُذف: ${name}`);
            }
        }

        // المكونات المعدلة
        for (const [name, newIng] of newMap) {
            const oldIng = oldMap.get(name);
            if (oldIng) {
                if (oldIng.quantity !== newIng.quantity) {
                    changes.push(`📝 ${name}: الكمية ${oldIng.quantity} → ${newIng.quantity}`);
                }
                if (oldIng.unit !== newIng.unit) {
                    changes.push(`📝 ${name}: الوحدة ${oldIng.unit} → ${newIng.unit}`);
                }
            }
        }

        return changes;
    },

    /**
     * مقارنة خطوات الخلط
     */
    compareMixingSteps(oldSteps: MixingStep[], newSteps: MixingStep[]): string[] {
        const changes: string[] = [];

        if (oldSteps.length !== newSteps.length) {
            changes.push(`عدد الخطوات: ${oldSteps.length} → ${newSteps.length}`);
        }

        const minLen = Math.min(oldSteps.length, newSteps.length);
        for (let i = 0; i < minLen; i++) {
            if (oldSteps[i].title !== newSteps[i].title) {
                changes.push(`الخطوة ${i + 1}: ${oldSteps[i].title} → ${newSteps[i].title}`);
            }
        }

        return changes;
    },

    /**
     * استعادة إصدار سابق
     */
    async restoreVersion(recipeId: string, versionId: string, reason?: string): Promise<boolean> {
        try {
            const { data, error } = await supabase
                .rpc('restore_recipe_version', {
                    p_recipe_id: recipeId,
                    p_version_id: versionId,
                    p_reason: reason || 'استعادة إصدار سابق'
                });

            if (error) {
                console.error('Error restoring version:', error);
                throw error;
            }

            return true;
        } catch (err) {
            console.error('Failed to restore version:', err);
            return false;
        }
    },

    /**
     * حذف إصدار معين
     */
    async deleteVersion(versionId: string): Promise<boolean> {
        try {
            const { error } = await supabase
                .from('recipe_versions')
                .delete()
                .eq('id', versionId);

            if (error) {
                console.error('Error deleting version:', error);
                throw error;
            }

            return true;
        } catch (err) {
            console.error('Failed to delete version:', err);
            return false;
        }
    },

    /**
     * الحصول على الإصدار الحالي/النشط
     */
    async getCurrentVersion(recipeId: string): Promise<RecipeVersion | null> {
        const { data, error } = await supabase
            .from('recipe_versions')
            .select('*')
            .eq('recipe_id', recipeId)
            .is('effective_until', null)
            .single();

        if (error) {
            // Try getting the latest version
            const { data: latest } = await supabase
                .from('recipe_versions')
                .select('*')
                .eq('recipe_id', recipeId)
                .order('version_number', { ascending: false })
                .limit(1)
                .single();

            return latest || null;
        }

        return data;
    },

    /**
     * حساب مدة الإصدار بالأيام
     */
    calculateDuration(effectiveFrom: string, effectiveUntil?: string): number {
        const from = new Date(effectiveFrom);
        const until = effectiveUntil ? new Date(effectiveUntil) : new Date();
        const diffMs = until.getTime() - from.getTime();
        return Math.floor(diffMs / (1000 * 60 * 60 * 24));
    },

    /**
     * تنسيق نوع التغيير للعرض
     */
    formatChangeType(type: string): string {
        const labels: Record<string, string> = {
            'created': '🆕 إنشاء',
            'updated': '📝 تحديث',
            'ingredients_changed': '🧪 تغيير المكونات',
            'steps_changed': '📋 تغيير الخطوات',
            'restored': '🔄 استعادة'
        };
        return labels[type] || type;
    },

    /**
     * تنسيق الإجراء للعرض
     */
    formatAction(action: string): string {
        const labels: Record<string, string> = {
            'create': '➕ إنشاء',
            'update': '✏️ تعديل',
            'delete': '🗑️ حذف',
            'restore': '🔄 استعادة',
            'approve': '✅ موافقة',
            'reject': '❌ رفض'
        };
        return labels[action] || action;
    }
};

export default recipeVersionService;
