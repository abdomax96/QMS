/**
 * User Types - أنواع المستخدمين
 * تعريفات TypeScript لنظام إدارة المستخدمين
 */

import type { SystemRoleCode as UserRole } from './permission';

// ============ Interfaces ============

/**
 * User - المستخدم الكامل
 */
export interface User {
    id: string;
    email: string;
    name: string;
    title?: string;
    department?: string;
    phone?: string;
    avatar_url?: string;
    roles: UserRole[];
    is_active: boolean;
    created_at: string;
    updated_at?: string;
    last_sign_in_at?: string;
}

/**
 * CreateUserInput - بيانات إنشاء مستخدم جديد
 */
export interface CreateUserInput {
    email: string;
    password: string;
    name: string;
    title?: string;
    department?: string;
    phone?: string;
    roles?: UserRole[];
}

/**
 * UpdateUserInput - بيانات تحديث مستخدم
 */
export interface UpdateUserInput {
    name?: string;
    title?: string;
    department?: string;
    phone?: string;
    roles?: UserRole[];
    is_active?: boolean;
    avatar_url?: string;
}

/**
 * UserFormState - حالة نموذج المستخدم
 */
export interface UserFormState {
    email: string;
    password: string;
    confirmPassword: string;
    name: string;
    title: string;
    department: string;
    phone: string;
    role: UserRole | '';
}

/**
 * Initial form state
 */
export const INITIAL_USER_FORM: UserFormState = {
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    title: '',
    department: '',
    phone: '',
    role: ''
};

/**
 * UserFilter - فلتر المستخدمين
 */
export interface UserFilter {
    search?: string;
    department?: string;
    role?: UserRole;
    isActive?: boolean;
}

/**
 * UserStats - إحصائيات المستخدمين
 */
export interface UserStats {
    total: number;
    active: number;
    inactive: number;
    byRole: Record<UserRole, number>;
    byDepartment: Record<string, number>;
}

/**
 * فلترة المستخدمين بناءً على الفلتر
 */
export function filterUsers(users: User[], filter: UserFilter): User[] {
    return users.filter(user => {
        // البحث بالاسم أو البريد
        if (filter.search) {
            const search = filter.search.toLowerCase();
            const matchesName = user.name?.toLowerCase().includes(search);
            const matchesEmail = user.email?.toLowerCase().includes(search);
            if (!matchesName && !matchesEmail) return false;
        }

        // فلترة بالقسم
        if (filter.department && user.department !== filter.department) {
            return false;
        }

        // فلترة بالدور
        if (filter.role && !user.roles?.includes(filter.role)) {
            return false;
        }

        // فلترة بحالة التفعيل
        if (filter.isActive !== undefined && user.is_active !== filter.isActive) {
            return false;
        }

        return true;
    });
}

/**
 * حساب إحصائيات المستخدمين
 */
export function calculateUserStats(users: User[]): UserStats {
    const stats: UserStats = {
        total: users.length,
        active: 0,
        inactive: 0,
        byRole: {} as Record<UserRole, number>,
        byDepartment: {}
    };

    users.forEach(user => {
        // حالة التفعيل
        if (user.is_active) {
            stats.active++;
        } else {
            stats.inactive++;
        }

        // الأدوار
        user.roles?.forEach(role => {
            stats.byRole[role] = (stats.byRole[role] || 0) + 1;
        });

        // الأقسام
        if (user.department) {
            stats.byDepartment[user.department] = (stats.byDepartment[user.department] || 0) + 1;
        }
    });

    return stats;
}
