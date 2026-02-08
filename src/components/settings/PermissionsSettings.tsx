/**
 * Permissions Settings Component
 * مكون إعدادات الصلاحيات - نظام المصنع الشامل
 */

import React, { useState, useEffect } from 'react';
import {
    ShieldCheckIcon,
    PlusIcon,
    PencilIcon,
    TrashIcon,
    XMarkIcon,
    CheckIcon,
    ArrowPathIcon,
    UserGroupIcon,
    ChevronDownIcon,
    ChevronLeftIcon,
    BuildingOfficeIcon,
    BriefcaseIcon,
    Cog6ToothIcon
} from '@heroicons/react/24/outline';
import { supabase } from '../../config/supabase';
import { SettingsSkeleton } from '../common/LoadingStates';

interface Role {
    id: string;
    name: string;
    name_ar?: string;
    description_ar?: string;
    color: string;
    is_system: boolean;
    priority: number;
}

interface Department {
    id: string;
    name: string;
    code?: string;
}

interface JobTitle {
    id: string;
    name: string;
    department_id?: string;
}

interface DepartmentModule {
    department_id: string;
    module_code: string;
    is_enabled: boolean;
}

interface JobTitleRole {
    job_title_id: string;
    role_id: string;
}

// وحدات النظام
const SYSTEM_MODULES = [
    { code: 'ncr', label: 'عدم المطابقة', icon: '⚠️', description: 'تقارير عدم المطابقة والإجراءات التصحيحية' },
    { code: 'lab', label: 'المختبر', icon: '🧪', description: 'الاختبارات المعملية والنتائج' },
    { code: 'receiving', label: 'استلام المواد', icon: '📦', description: 'استلام وفحص المواد الخام' },
    { code: 'forms', label: 'النماذج', icon: '📋', description: 'نماذج الجودة والإنتاج' },
    { code: 'food_safety', label: 'سلامة الغذاء', icon: '🍽️', description: 'HACCP والمراقبة والنظافة' },
    { code: 'tasks', label: 'المهام', icon: '✅', description: 'المهام والتعيينات' },
    { code: 'reports', label: 'التقارير', icon: '📊', description: 'التقارير والإحصائيات' },
    { code: 'master_data', label: 'البيانات الرئيسية', icon: '🗃️', description: 'المواد والموردين والمنتجات' },
    { code: 'users', label: 'المستخدمين', icon: '👥', description: 'إدارة المستخدمين' },
    { code: 'settings', label: 'الإعدادات', icon: '⚙️', description: 'إعدادات النظام' }
];

// صلاحيات كل وحدة
const MODULE_PERMISSIONS: Record<string, { code: string; label: string }[]> = {
    ncr: [
        { code: 'create', label: 'إنشاء تقرير' },
        { code: 'view_own', label: 'عرض تقاريري' },
        { code: 'view_dept', label: 'عرض تقارير القسم' },
        { code: 'view_all', label: 'عرض الكل' },
        { code: 'assign', label: 'تعيين مسؤول' },
        { code: 'root_cause', label: 'تحليل السبب' },
        { code: 'corrective_action', label: 'إجراء تصحيحي' },
        { code: 'preventive_action', label: 'إجراء وقائي' },
        { code: 'approve', label: 'موافقة' },
        { code: 'close', label: 'إغلاق' },
        { code: 'reopen', label: 'إعادة فتح' },
        { code: 'export', label: 'تصدير' }
    ],
    lab: [
        { code: 'request_test', label: 'طلب اختبار' },
        { code: 'view_requests', label: 'عرض الطلبات' },
        { code: 'assign_test', label: 'تعيين الاختبار' },
        { code: 'start_test', label: 'بدء الاختبار' },
        { code: 'enter_results', label: 'إدخال النتائج' },
        { code: 'approve_results', label: 'اعتماد النتائج' },
        { code: 'reject_results', label: 'رفض النتائج' },
        { code: 'view_coa', label: 'شهادة التحليل' },
        { code: 'manage_criteria', label: 'إدارة المعايير' },
        { code: 'manage_equipment', label: 'إدارة المعدات' }
    ],
    receiving: [
        { code: 'create', label: 'تسجيل استلام' },
        { code: 'view', label: 'عرض' },
        { code: 'inspect', label: 'فحص' },
        { code: 'approve', label: 'قبول' },
        { code: 'reject', label: 'رفض' },
        { code: 'hold', label: 'احتجاز' },
        { code: 'release', label: 'إفراج' }
    ],
    forms: [
        { code: 'create_template', label: 'إنشاء قالب' },
        { code: 'edit_template', label: 'تعديل القوالب' },
        { code: 'delete_template', label: 'حذف القوالب' },
        { code: 'fill_form', label: 'تعبئة النماذج' },
        { code: 'view_own', label: 'عرض نماذجي' },
        { code: 'view_all', label: 'عرض الكل' },
        { code: 'approve', label: 'اعتماد' },
        { code: 'export', label: 'تصدير' }
    ],
    food_safety: [
        { code: 'view_haccp', label: 'عرض HACCP' },
        { code: 'manage_haccp', label: 'إدارة HACCP' },
        { code: 'record_monitoring', label: 'تسجيل المراقبة' },
        { code: 'view_monitoring', label: 'عرض المراقبة' },
        { code: 'manage_sanitation', label: 'إدارة النظافة' },
        { code: 'record_cleaning', label: 'تسجيل التنظيف' },
        { code: 'pre_op_check', label: 'فحص ما قبل التشغيل' },
        { code: 'manage_allergens', label: 'إدارة المسببات' }
    ],
    tasks: [
        { code: 'create', label: 'إنشاء مهمة' },
        { code: 'view_own', label: 'عرض مهامي' },
        { code: 'view_dept', label: 'عرض مهام القسم' },
        { code: 'view_all', label: 'عرض الكل' },
        { code: 'assign', label: 'تعيين' },
        { code: 'complete', label: 'إتمام' },
        { code: 'verify', label: 'تحقق' },
        { code: 'delete', label: 'حذف' }
    ],
    reports: [
        { code: 'view_ncr', label: 'تقارير NCR' },
        { code: 'view_lab', label: 'تقارير المختبر' },
        { code: 'view_production', label: 'تقارير الإنتاج' },
        { code: 'view_performance', label: 'تقارير الأداء' },
        { code: 'export', label: 'تصدير' },
        { code: 'create_custom', label: 'تقارير مخصصة' }
    ],
    master_data: [
        { code: 'manage_materials', label: 'إدارة المواد' },
        { code: 'manage_suppliers', label: 'إدارة الموردين' },
        { code: 'approve_suppliers', label: 'اعتماد الموردين' },
        { code: 'manage_products', label: 'إدارة المنتجات' },
        { code: 'manage_lines', label: 'إدارة خطوط الإنتاج' }
    ],
    users: [
        { code: 'view', label: 'عرض' },
        { code: 'create', label: 'إضافة' },
        { code: 'edit', label: 'تعديل' },
        { code: 'delete', label: 'حذف' },
        { code: 'assign_roles', label: 'تعيين الأدوار' },
        { code: 'reset_password', label: 'إعادة كلمة المرور' }
    ],
    settings: [
        { code: 'view', label: 'عرض' },
        { code: 'edit_general', label: 'الإعدادات العامة' },
        { code: 'manage_departments', label: 'إدارة الأقسام' },
        { code: 'manage_permissions', label: 'إدارة الصلاحيات' },
        { code: 'manage_companies', label: 'إدارة الشركات' },
        { code: 'backup', label: 'النسخ الاحتياطي' }
    ]
};

const ROLE_COLORS = [
    '#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'
];

const PermissionsSettings: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'dept_modules' | 'job_roles' | 'role_perms'>('dept_modules');
    const [roles, setRoles] = useState<Role[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [jobTitles, setJobTitles] = useState<JobTitle[]>([]);
    const [deptModules, setDeptModules] = useState<DepartmentModule[]>([]);
    const [jobTitleRoles, setJobTitleRoles] = useState<JobTitleRole[]>([]);
    const [rolePermissions, setRolePermissions] = useState<Record<string, Set<string>>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [selectedRole, setSelectedRole] = useState<Role | null>(null);
    const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set(['ncr']));

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [rolesRes, deptsRes, jobsRes, deptModsRes, jobRolesRes, rolePermsRes] = await Promise.all([
                supabase.from('roles').select('id, name, name_ar, description_ar, color, is_system, priority, is_active').eq('is_active', true).order('priority'),
                supabase.from('departments').select('id, name, code, is_active').eq('active', true),
                supabase.from('job_titles').select('id, name, department_id, is_active').eq('active', true),
                supabase.from('department_module_access').select('department_id, module_code, is_enabled, granted_actions'),
                supabase.from('job_title_roles').select('job_title_id, role_id'),
                supabase.from('role_permissions').select('role_id, permission_code')
            ]);

            setRoles(rolesRes.data || []);
            setDepartments(deptsRes.data || []);
            setJobTitles(jobsRes.data || []);
            setDeptModules(deptModsRes.data || []);
            setJobTitleRoles(jobRolesRes.data || []);

            // Group permissions by role
            const grouped: Record<string, Set<string>> = {};
            (rolePermsRes.data || []).forEach((rp: { role_id: string; permission_code?: string }) => {
                if (!grouped[rp.role_id]) grouped[rp.role_id] = new Set();
                if (rp.permission_code) grouped[rp.role_id].add(rp.permission_code);
            });
            setRolePermissions(grouped);

            if (rolesRes.data && rolesRes.data.length > 0 && !selectedRole) {
                setSelectedRole(rolesRes.data[0]);
            }
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // Department Modules Functions
    const isDeptModuleEnabled = (deptId: string, moduleCode: string) => {
        return deptModules.some(dm => dm.department_id === deptId && dm.module_code === moduleCode && dm.is_enabled);
    };

    const toggleDeptModule = async (deptId: string, moduleCode: string) => {
        const existing = deptModules.find(dm => dm.department_id === deptId && dm.module_code === moduleCode);

        try {
            if (existing) {
                await supabase
                    .from('department_module_access')  // Changed from 'department_modules'
                    .update({ is_enabled: !existing.is_enabled, updated_at: new Date().toISOString() })
                    .eq('department_id', deptId)
                    .eq('module_code', moduleCode)
                    .is('stage_code', null);  // Only update module-level access
            } else {
                await supabase
                    .from('department_module_access')  // Changed from 'department_modules'
                    .insert({
                        department_id: deptId,
                        module_code: moduleCode,
                        is_enabled: true,
                        granted_actions: ['view']  // Default actions
                    });
            }
            loadData();
        } catch (error) {
            console.error('Error toggling department module:', error);
        }
    };

    // Job Title Roles Functions
    const getJobTitleRole = (jobTitleId: string): string | undefined => {
        const jtr = jobTitleRoles.find(j => j.job_title_id === jobTitleId);
        return jtr?.role_id;
    };

    const setJobTitleRole = async (jobTitleId: string, roleId: string) => {
        try {
            // Delete existing
            await supabase
                .from('job_title_roles')
                .delete()
                .eq('job_title_id', jobTitleId);

            // Insert new if not empty
            if (roleId) {
                await supabase
                    .from('job_title_roles')
                    .insert({ job_title_id: jobTitleId, role_id: roleId });
            }
            loadData();
        } catch (error) {
            console.error('Error setting job title role:', error);
        }
    };

    // Role Permissions Functions
    const hasPermission = (roleId: string, permCode: string): boolean => {
        return rolePermissions[roleId]?.has(permCode) || false;
    };

    const togglePermission = async (roleId: string, module: string, action: string) => {
        const permCode = `${module}.${action}`;
        const has = hasPermission(roleId, permCode);

        try {
            if (has) {
                await supabase
                    .from('role_permissions')
                    .delete()
                    .eq('role_id', roleId)
                    .eq('permission_code', permCode);
            } else {
                await supabase
                    .from('role_permissions')
                    .upsert({ role_id: roleId, permission_code: permCode }, { onConflict: 'role_id,permission_code' });
            }

            setRolePermissions(prev => {
                const newPerms = { ...prev };
                if (!newPerms[roleId]) newPerms[roleId] = new Set();
                if (has) {
                    newPerms[roleId].delete(permCode);
                } else {
                    newPerms[roleId].add(permCode);
                }
                return newPerms;
            });
        } catch (error) {
            console.error('Error toggling permission:', error);
        }
    };

    const grantAllForModule = async (roleId: string, module: string) => {
        const perms = MODULE_PERMISSIONS[module] || [];
        for (const perm of perms) {
            if (!hasPermission(roleId, `${module}.${perm.code}`)) {
                await togglePermission(roleId, module, perm.code);
            }
        }
    };

    const revokeAllForModule = async (roleId: string, module: string) => {
        const perms = MODULE_PERMISSIONS[module] || [];
        for (const perm of perms) {
            if (hasPermission(roleId, `${module}.${perm.code}`)) {
                await togglePermission(roleId, module, perm.code);
            }
        }
    };

    const toggleModule = (code: string) => {
        setExpandedModules(prev => {
            const n = new Set(prev);
            if (n.has(code)) n.delete(code);
            else n.add(code);
            return n;
        });
    };

    const getModuleStats = (roleId: string, module: string) => {
        const perms = MODULE_PERMISSIONS[module] || [];
        const granted = perms.filter(p => hasPermission(roleId, `${module}.${p.code}`)).length;
        return { granted, total: perms.length };
    };

    if (isLoading) {
        return <SettingsSkeleton />;
    }

    return (
        <div className="space-y-6">
            {/* Header & Tabs */}
            <div className="flex items-center justify-between flex-wrap gap-4">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <ShieldCheckIcon className="w-6 h-6 text-primary-600" />
                    نظام صلاحيات المصنع
                </h2>
                <div className="flex gap-2">
                    <button
                        onClick={() => setActiveTab('dept_modules')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${activeTab === 'dept_modules'
                            ? 'bg-primary-600 text-white'
                            : 'bg-gray-100 dark:bg-gray-700'
                            }`}
                    >
                        <BuildingOfficeIcon className="w-4 h-4" />
                        وحدات الأقسام
                    </button>
                    <button
                        onClick={() => setActiveTab('job_roles')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${activeTab === 'job_roles'
                            ? 'bg-primary-600 text-white'
                            : 'bg-gray-100 dark:bg-gray-700'
                            }`}
                    >
                        <BriefcaseIcon className="w-4 h-4" />
                        أدوار المسميات
                    </button>
                    <button
                        onClick={() => setActiveTab('role_perms')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${activeTab === 'role_perms'
                            ? 'bg-primary-600 text-white'
                            : 'bg-gray-100 dark:bg-gray-700'
                            }`}
                    >
                        <Cog6ToothIcon className="w-4 h-4" />
                        صلاحيات الأدوار
                    </button>
                </div>
            </div>

            {/* Tab 1: Department Modules */}
            {activeTab === 'dept_modules' && (
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-primary-600 to-purple-600 text-white">
                        <h3 className="font-bold flex items-center gap-2">
                            <BuildingOfficeIcon className="w-5 h-5" />
                            تحديد الوحدات المتاحة لكل قسم
                        </h3>
                        <p className="text-sm opacity-80">حدد الوحدات التي يمكن لكل قسم رؤيتها في الشريط الجانبي</p>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-gray-50 dark:bg-gray-700/50">
                                    <th className="px-4 py-3 text-right font-medium w-40">القسم</th>
                                    {SYSTEM_MODULES.map(m => (
                                        <th key={m.code} className="px-2 py-3 text-center font-medium text-sm">
                                            <div className="flex flex-col items-center gap-1">
                                                <span className="text-lg">{m.icon}</span>
                                                <span>{m.label}</span>
                                            </div>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {departments.map(dept => (
                                    <tr key={dept.id} className="border-t border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/30">
                                        <td className="px-4 py-3 font-medium">{dept.name}</td>
                                        {SYSTEM_MODULES.map(m => {
                                            const enabled = isDeptModuleEnabled(dept.id, m.code);
                                            return (
                                                <td key={m.code} className="px-2 py-3 text-center">
                                                    <button
                                                        onClick={() => toggleDeptModule(dept.id, m.code)}
                                                        className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${enabled
                                                            ? 'bg-green-500 text-white'
                                                            : 'bg-gray-200 dark:bg-gray-600 text-gray-400'
                                                            } hover:scale-110`}
                                                    >
                                                        {enabled ? <CheckIcon className="w-5 h-5" /> : <XMarkIcon className="w-5 h-5" />}
                                                    </button>
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Tab 2: Job Title Roles */}
            {activeTab === 'job_roles' && (
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-green-600 to-teal-600 text-white">
                        <h3 className="font-bold flex items-center gap-2">
                            <BriefcaseIcon className="w-5 h-5" />
                            ربط المسميات الوظيفية بالأدوار
                        </h3>
                        <p className="text-sm opacity-80">كل مسمى وظيفي يحصل تلقائياً على صلاحيات الدور المربوط به</p>
                    </div>
                    <div className="p-4 space-y-6">
                        {departments.map(dept => {
                            const deptJobs = jobTitles.filter(jt => jt.department_id === dept.id);
                            if (deptJobs.length === 0) return null;

                            return (
                                <div key={dept.id} className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                                    <div className="bg-gray-100 dark:bg-gray-700 px-4 py-2 font-bold flex items-center gap-2">
                                        <BuildingOfficeIcon className="w-5 h-5 text-primary-600" />
                                        {dept.name}
                                    </div>
                                    <div className="p-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                        {deptJobs.map(jt => {
                                            const currentRoleId = getJobTitleRole(jt.id);
                                            const currentRole = roles.find(r => r.id === currentRoleId);

                                            return (
                                                <div
                                                    key={jt.id}
                                                    className="p-3 rounded-lg border-2 transition-all"
                                                    style={{
                                                        borderColor: currentRole?.color || '#e5e7eb',
                                                        backgroundColor: currentRole ? `${currentRole.color}10` : undefined
                                                    }}
                                                >
                                                    <div className="font-medium mb-2">{jt.name}</div>
                                                    <select
                                                        value={currentRoleId || ''}
                                                        onChange={(e) => setJobTitleRole(jt.id, e.target.value)}
                                                        className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600"
                                                    >
                                                        <option value="">-- بدون دور --</option>
                                                        {roles.map(role => (
                                                            <option key={role.id} value={role.id}>
                                                                {role.name_ar || role.name}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Tab 3: Role Permissions */}
            {activeTab === 'role_perms' && (
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    {/* Roles List */}
                    <div className="space-y-2">
                        <h3 className="font-bold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                            <UserGroupIcon className="w-5 h-5" />
                            الأدوار
                        </h3>
                        {roles.map(role => (
                            <div
                                key={role.id}
                                onClick={() => setSelectedRole(role)}
                                className={`p-3 rounded-xl cursor-pointer transition-all ${selectedRole?.id === role.id
                                    ? 'ring-2 shadow-lg scale-[1.02]'
                                    : 'opacity-70 hover:opacity-100'
                                    }`}
                                style={{
                                    backgroundColor: selectedRole?.id === role.id ? role.color : `${role.color}20`,
                                    boxShadow: selectedRole?.id === role.id ? `0 0 0 2px ${role.color}` : undefined
                                }}
                            >
                                <div className="flex items-center gap-2">
                                    <div
                                        className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold"
                                        style={{ backgroundColor: role.color }}
                                    >
                                        {(role.name_ar || role.name).charAt(0)}
                                    </div>
                                    <span className={`font-medium ${selectedRole?.id === role.id ? 'text-white' : ''}`}>
                                        {role.name_ar || role.name}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Permissions Matrix */}
                    <div className="lg:col-span-3">
                        {selectedRole ? (
                            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                                <div
                                    className="p-4 text-white flex items-center gap-3"
                                    style={{ backgroundColor: selectedRole.color }}
                                >
                                    <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center text-xl font-bold">
                                        {(selectedRole.name_ar || selectedRole.name).charAt(0)}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-lg">{selectedRole.name_ar || selectedRole.name}</h3>
                                        {selectedRole.description_ar && (
                                            <p className="text-sm opacity-80">{selectedRole.description_ar}</p>
                                        )}
                                    </div>
                                </div>

                                <div className="p-4 space-y-2">
                                    {SYSTEM_MODULES.map(module => {
                                        const perms = MODULE_PERMISSIONS[module.code] || [];
                                        if (perms.length === 0) return null;

                                        const isExpanded = expandedModules.has(module.code);
                                        const stats = getModuleStats(selectedRole.id, module.code);
                                        const pct = Math.round((stats.granted / stats.total) * 100);

                                        return (
                                            <div key={module.code} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                                                <div
                                                    onClick={() => toggleModule(module.code)}
                                                    className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-xl">{module.icon}</span>
                                                        <div>
                                                            <span className="font-medium">{module.label}</span>
                                                            <div className="flex items-center gap-2 mt-1">
                                                                <div className="w-20 h-1.5 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                                                                    <div
                                                                        className="h-full bg-green-500"
                                                                        style={{ width: `${pct}%` }}
                                                                    />
                                                                </div>
                                                                <span className="text-xs text-gray-500">{stats.granted}/{stats.total}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); grantAllForModule(selectedRole.id, module.code); }}
                                                            className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200"
                                                        >
                                                            ✓ الكل
                                                        </button>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); revokeAllForModule(selectedRole.id, module.code); }}
                                                            className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
                                                        >
                                                            ✗ سحب
                                                        </button>
                                                        {isExpanded ? <ChevronDownIcon className="w-5 h-5" /> : <ChevronLeftIcon className="w-5 h-5" />}
                                                    </div>
                                                </div>

                                                {isExpanded && (
                                                    <div className="p-3 bg-gray-50 dark:bg-gray-700/30 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                                                        {perms.map(perm => {
                                                            const active = hasPermission(selectedRole.id, `${module.code}.${perm.code}`);
                                                            return (
                                                                <button
                                                                    key={perm.code}
                                                                    onClick={() => togglePermission(selectedRole.id, module.code, perm.code)}
                                                                    className={`p-2 rounded-lg text-sm flex items-center gap-2 transition-all ${active
                                                                        ? 'bg-green-500 text-white'
                                                                        : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600'
                                                                        } hover:scale-105`}
                                                                >
                                                                    {active ? <CheckIcon className="w-4 h-4" /> : <XMarkIcon className="w-4 h-4" />}
                                                                    {perm.label}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ) : (
                            <div className="bg-gray-50 dark:bg-gray-700/30 rounded-xl p-8 text-center text-gray-500">
                                اختر دوراً من القائمة
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default PermissionsSettings;
