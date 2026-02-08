/**
 * Simple Permission Matrix
 * مصفوفة صلاحيات مبسطة - 4 موديولز × الأدوار × الإجراءات
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    ShieldCheckIcon,
    CheckIcon,
    XMarkIcon,
    ArrowPathIcon,
    MagnifyingGlassIcon,
    InformationCircleIcon,
    PencilIcon,
    DocumentTextIcon,
    ClipboardDocumentListIcon,
    BeakerIcon,
    ExclamationTriangleIcon,
    CubeIcon,
    ChevronDownIcon,
    ChevronRightIcon,
    TrashIcon,
    FolderOpenIcon,
} from '@heroicons/react/24/outline';
import { supabase } from '../../config/supabase';
import { SettingsSkeleton } from '../common/LoadingStates';
import { bustPermissionCache } from '../../services/unifiedPermissionService';
import { useModulePermissions } from '../../hooks/useModulePermissions';

// ==================== Types ====================
interface Role {
    id: string;
    name: string;
    name_ar?: string;
    code: string;
    color: string;
    is_system: boolean;
    category?: string;
}

interface AppModule {
    code: string;
    name: string;
    name_ar: string;
    color: string;
    icon: string;
    available_actions: string[];
    data_isolation_mode: string;
}

interface RoleModulePermission {
    id?: string;
    role_id: string;
    module_code: string;
    granted_actions: string[];
    can_see_all_departments: boolean;
}

// ==================== Constants ====================
const DEFAULT_MODULES: AppModule[] = [
    {
        code: 'forms_reports',
        name: 'Forms & Reports',
        name_ar: 'النماذج والتقارير',
        color: '#3B82F6',
        icon: 'DocumentText',
        available_actions: [
            'view', 'create', 'edit', 'delete', 'approve', 'export', 'print', 'share',
            // Workflow actions
            'submit', 'review_claim', 'review_approve', 'review_reject', 'review_edit', 'reopen', 'archive'
        ],
        data_isolation_mode: 'isolated',
    },
    {
        code: 'tasks',
        name: 'Tasks',
        name_ar: 'المهام',
        color: '#10B981',
        icon: 'ClipboardList',
        available_actions: ['view', 'create', 'edit', 'delete', 'assign', 'complete', 'export'],
        data_isolation_mode: 'isolated',
    },
    {
        code: 'lab',
        name: 'Laboratory',
        name_ar: 'المختبر',
        color: '#8B5CF6',
        icon: 'Beaker',
        available_actions: ['view', 'create', 'edit', 'delete', 'approve', 'release', 'export', 'print'],
        data_isolation_mode: 'isolated',
    },
    {
        code: 'ncr',
        name: 'NCR & Holds',
        name_ar: 'NCR والمحتجزات',
        color: '#EF4444',
        icon: 'ExclamationTriangle',
        available_actions: ['view', 'create', 'edit', 'review', 'investigate', 'decide', 'close', 'hold_add', 'hold_release', 'export', 'print'],
        data_isolation_mode: 'hybrid',
    },
    {
        code: 'pallet_management',
        name: 'Pallet Management',
        name_ar: 'إدارة البالتات',
        color: '#10B981',
        icon: 'Package',
        available_actions: [
            'view',
            'create',
            'edit',
            'delete',
            'manage_hold',
            'release_hold',
            'dispose',
            'load',
            'dispatch',
            'view_audit'
        ],
        data_isolation_mode: 'isolated',
    },
    {
        code: 'documents',
        name: 'Document Control',
        name_ar: 'التحكم بالوثائق',
        color: '#8B5CF6',
        icon: 'FolderOpen',
        available_actions: ['read', 'create', 'edit', 'delete', 'approve', 'obsolete', 'edit_after_approval', 'view_all_documents'],
        data_isolation_mode: 'department',
    },
    {
        code: 'access_management',
        name: 'Access Management',
        name_ar: 'إدارة الصلاحيات',
        color: '#6366F1',
        icon: 'ShieldCheck',
        available_actions: ['view', 'edit'],
        data_isolation_mode: 'shared',
    },
];

// Hide NCR from the general matrix GRID only to avoid duplicate management.
// Keep NCR available in module dropdown filters so NCR-stage tab can sync with it.
const GRID_EXCLUDED_MODULE_CODES = new Set(['ncr']);

const filterGridModules = (rows: AppModule[]): AppModule[] =>
    rows.filter(row => !GRID_EXCLUDED_MODULE_CODES.has(row.code));

const filterModuleOptions = (rows: AppModule[]): AppModule[] => rows;

const STORAGE_KEYS = {
    roleIds: 'simple_permission_matrix_selected_role_ids',
    moduleCodes: 'simple_permission_matrix_selected_module_codes',
} as const;

const readStoredArray = (key: string): string[] => {
    if (typeof window === 'undefined') return [];
    try {
        const raw = window.localStorage.getItem(key);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        return Array.from(new Set(parsed.filter((item): item is string => typeof item === 'string' && item.trim() !== '')));
    } catch {
        return [];
    }
};

const writeStoredArray = (key: string, values: string[]) => {
    if (typeof window === 'undefined') return;
    try {
        if (!values.length) {
            window.localStorage.removeItem(key);
            return;
        }
        window.localStorage.setItem(key, JSON.stringify(values));
    } catch {
        // Ignore storage write errors (private mode / quota)
    }
};

const ModuleIcons: Record<string, React.ReactNode> = {
    forms_reports: <DocumentTextIcon className="w-5 h-5" />,
    tasks: <ClipboardDocumentListIcon className="w-5 h-5" />,
    lab: <BeakerIcon className="w-5 h-5" />,
    ncr: <ExclamationTriangleIcon className="w-5 h-5" />,
    pallet_management: <CubeIcon className="w-5 h-5" />,
    documents: <FolderOpenIcon className="w-5 h-5" />,
    access_management: <ShieldCheckIcon className="w-5 h-5" />,
};

const ActionLabels: Record<string, { en: string; ar: string; color: string }> = {
    view: { en: 'View', ar: 'عرض', color: '#6B7280' },
    create: { en: 'Create', ar: 'إنشاء', color: '#10B981' },
    edit: { en: 'Edit', ar: 'تعديل', color: '#3B82F6' },
    delete: { en: 'Delete', ar: 'حذف', color: '#EF4444' },
    approve: { en: 'Approve', ar: 'موافقة', color: '#8B5CF6' },
    export: { en: 'Export', ar: 'تصدير', color: '#06B6D4' },
    print: { en: 'Print', ar: 'طباعة', color: '#6B7280' },
    share: { en: 'Share', ar: 'مشاركة', color: '#EC4899' },
    assign: { en: 'Assign', ar: 'تعيين', color: '#F59E0B' },
    complete: { en: 'Complete', ar: 'إكمال', color: '#10B981' },
    release: { en: 'Release', ar: 'إصدار', color: '#8B5CF6' },
    review: { en: 'Review', ar: 'مراجعة', color: '#F59E0B' },
    investigate: { en: 'Investigate', ar: 'تحقيق', color: '#8B5CF6' },
    decide: { en: 'Decide', ar: 'قرار', color: '#EC4899' },
    close: { en: 'Close', ar: 'إغلاق', color: '#10B981' },
    hold_add: { en: 'Add Hold', ar: 'إضافة حجز', color: '#EF4444' },
    hold_release: { en: 'Release Hold', ar: 'إفراج حجز', color: '#10B981' },
    manage_hold: { en: 'Manage Hold', ar: 'حجز', color: '#F59E0B' },
    release_hold: { en: 'Release Hold', ar: 'رفع الحجز', color: '#10B981' },
    dispose: { en: 'Dispose', ar: 'فرز/إتلاف', color: '#EF4444' },
    load: { en: 'Load', ar: 'تحميل', color: '#3B82F6' },
    dispatch: { en: 'Dispatch', ar: 'شحن', color: '#8B5CF6' },
    view_audit: { en: 'View Audit', ar: 'سجل التدقيق', color: '#6B7280' },
    // Report Workflow Actions
    submit: { en: 'Submit', ar: 'إرسال', color: '#3B82F6' },
    review_claim: { en: 'Claim', ar: 'استلام للمراجعة', color: '#F59E0B' },
    review_approve: { en: 'Approve', ar: 'اعتماد', color: '#10B981' },
    review_reject: { en: 'Reject', ar: 'رفض', color: '#EF4444' },
    review_edit: { en: 'Edit Review', ar: 'تعديل المراجعة', color: '#8B5CF6' },
    reopen: { en: 'Reopen', ar: 'إعادة فتح', color: '#F59E0B' },
    archive: { en: 'Archive', ar: 'أرشفة', color: '#6B7280' },
    // Document Control Actions
    read: { en: 'Read', ar: 'قراءة', color: '#6B7280' },
    obsolete: { en: 'Obsolete', ar: 'إلغاء', color: '#EF4444' },
    edit_after_approval: { en: 'Edit After Approval', ar: 'تحرير بعد الاعتماد', color: '#F97316' },
    view_all_documents: { en: 'View All Documents', ar: 'رؤية جميع الوثائق', color: '#06B6D4' },
};

// ==================== Loading ====================


// ==================== Main Component ====================
const SimplePermissionMatrix: React.FC = () => {
    const [roles, setRoles] = useState<Role[]>([]);
    const [modules, setModules] = useState<AppModule[]>(DEFAULT_MODULES);
    const [permissions, setPermissions] = useState<RoleModulePermission[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [searchRole, setSearchRole] = useState('');
    const [expandedModules, setExpandedModules] = useState<Set<string>>(
        new Set(['forms_reports', 'tasks', 'lab', 'documents', 'pallet_management'])
    );
    const [pendingChanges, setPendingChanges] = useState<Map<string, RoleModulePermission>>(new Map());

    // Permission check - can current user edit the matrix?
    const [canEditMatrix, setCanEditMatrix] = useState<boolean>(false);
    const [checkingPermission, setCheckingPermission] = useState<boolean>(true);

    // Role selection for filtered view
    const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>(() =>
        readStoredArray(STORAGE_KEYS.roleIds)
    );
    const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);

    // Module selection for filtered view
    const [selectedModuleCodes, setSelectedModuleCodes] = useState<string[]>(() =>
        readStoredArray(STORAGE_KEYS.moduleCodes)
    );
    const [moduleDropdownOpen, setModuleDropdownOpen] = useState(false);
    // Load data
    useEffect(() => {
        loadData();
        checkUserPermissions();
    }, []);

    // Use the dynamic permission hook
    const { canPerform, loading: permissionsLoading } = useModulePermissions();

    // Check if current user can edit the matrix based on 'access_management' module
    const checkUserPermissions = async () => {
        setCheckingPermission(true);
        try {
            // Check if user has 'edit' permission on 'access_management' module
            const canEdit = canPerform('access_management', 'edit');
            setCanEditMatrix(canEdit);
            console.log('[PermissionMatrix] User can edit matrix:', canEdit);
        } catch (err) {
            console.error('Error checking user permissions:', err);
            setCanEditMatrix(false);
        } finally {
            setCheckingPermission(false);
        }
    };

    // Re-check permissions when they finish loading
    useEffect(() => {
        if (!permissionsLoading) {
            checkUserPermissions();
        }
    }, [permissionsLoading, canPerform]);

    const loadData = async () => {
        setLoading(true);
        try {
            // Parallelize initial data load - all 4 queries can run concurrently
            const [deptRolesRes, rolesRes, modulesRes, permsRes] = await Promise.all([
                supabase.from('department_roles').select('role_id'),
                supabase.from('roles').select('id, name, name_ar, code, color, is_system, is_active, category, priority').eq('is_active', true).order('priority'),
                supabase.from('app_modules').select('code, name, name_ar, color, icon, available_actions, data_isolation_mode, is_active, display_order').eq('is_active', true).order('display_order'),
                supabase.from('role_module_permissions').select('id, role_id, module_code, granted_actions, can_see_all_departments')
            ]);

            // Use all active roles, not just those assigned to departments
            // This ensures we can configure permissions for any role
            setRoles(rolesRes.data || []);

            // Set modules (use data or keep defaults)
            if (!modulesRes.error && modulesRes.data?.length) {
                // Force add 'view_all_documents' to documents module if missing (Client-side fix)
                const fixedModules = modulesRes.data.map((m: any) => {
                    if (m.code === 'documents' && !m.available_actions.includes('view_all_documents')) {
                        return {
                            ...m,
                            available_actions: [...m.available_actions, 'view_all_documents']
                        };
                    }
                    return m;
                });
                setModules(fixedModules);
            }

            // Set permissions
            setPermissions(permsRes.data || []);
        } catch (err) {
            console.error('Error loading data:', err);
        }
        setLoading(false);
    };

    useEffect(() => {
        const allowed = new Set(modules.map(module => module.code));
        setSelectedModuleCodes(prev => prev.filter(code => allowed.has(code)));

        const allowedGrid = new Set(
            modules
                .filter(module => !GRID_EXCLUDED_MODULE_CODES.has(module.code))
                .map(module => module.code)
        );
        setExpandedModules(prev => new Set(Array.from(prev).filter(code => allowedGrid.has(code))));
    }, [modules]);

    useEffect(() => {
        // Avoid wiping stored role filters before roles are loaded from DB.
        if (loading || roles.length === 0) return;
        const allowedRoleIds = new Set(roles.map(role => role.id));
        setSelectedRoleIds(prev => prev.filter(roleId => allowedRoleIds.has(roleId)));
    }, [roles, loading]);

    useEffect(() => {
        writeStoredArray(STORAGE_KEYS.roleIds, selectedRoleIds);
    }, [selectedRoleIds]);

    useEffect(() => {
        writeStoredArray(STORAGE_KEYS.moduleCodes, selectedModuleCodes);
    }, [selectedModuleCodes]);

    // Filter roles based on search (for dropdown)
    const searchedRoles = useMemo(() => {
        if (!searchRole) return roles;
        const q = searchRole.toLowerCase();
        return roles.filter(r =>
            r.name.toLowerCase().includes(q) ||
            r.name_ar?.includes(searchRole) ||
            r.code.toLowerCase().includes(q)
        );
    }, [roles, searchRole]);

    // Display roles: show specific selected roles only
    const displayedRoles = useMemo(() => {
        if (selectedRoleIds.length === 0) return []; // Show NONE if none selected
        return roles.filter(r => selectedRoleIds.includes(r.id));
    }, [roles, selectedRoleIds]);

    // Toggle role selection
    const toggleRoleSelection = (roleId: string) => {
        setSelectedRoleIds(prev =>
            prev.includes(roleId)
                ? prev.filter(id => id !== roleId)
                : [...prev, roleId]
        );
    };

    // Clear all role selections
    const clearRoleSelection = () => {
        setSelectedRoleIds([]);
    };

    const moduleFilterOptions = useMemo(() => filterModuleOptions(modules), [modules]);

    // Display modules: show all if none selected, otherwise show only selected
    const displayedModules = useMemo(() => {
        if (selectedModuleCodes.length === 0) return moduleFilterOptions; // Show ALL if none selected
        return moduleFilterOptions.filter(m => selectedModuleCodes.includes(m.code));
    }, [moduleFilterOptions, selectedModuleCodes]);

    const gridModules = useMemo(() => filterGridModules(displayedModules), [displayedModules]);

    // Broadcast current dropdown filters so NCR stage-permissions panel can stay in sync.
    useEffect(() => {
        if (typeof window === 'undefined') return;
        window.dispatchEvent(new CustomEvent('permission-matrix-filter-changed', {
            detail: {
                selectedRoleIds,
                selectedModuleCodes,
            },
        }));
    }, [selectedRoleIds, selectedModuleCodes]);

    // Toggle module selection
    const toggleModuleSelection = (moduleCode: string) => {
        setSelectedModuleCodes(prev =>
            prev.includes(moduleCode)
                ? prev.filter(code => code !== moduleCode)
                : [...prev, moduleCode]
        );
    };

    // Clear all module selections
    const clearModuleSelection = () => {
        setSelectedModuleCodes([]);
    };

    // Get permission for role + module
    const getPermission = useCallback((roleId: string, moduleCode: string): RoleModulePermission => {
        const key = `${roleId}-${moduleCode}`;
        const pending = pendingChanges.get(key);
        if (pending) return pending;

        const existing = permissions.find(p => p.role_id === roleId && p.module_code === moduleCode);
        return existing || {
            role_id: roleId,
            module_code: moduleCode,
            granted_actions: [],
            can_see_all_departments: false,
        };
    }, [permissions, pendingChanges]);

    // Toggle action
    const toggleAction = (roleId: string, moduleCode: string, action: string) => {
        if (!isEditing) return;

        const key = `${roleId}-${moduleCode}`;
        const current = getPermission(roleId, moduleCode);
        const currentActions = current.granted_actions || [];

        let newActions: string[];
        if (currentActions.includes(action)) {
            newActions = currentActions.filter(a => a !== action);
        } else {
            newActions = [...currentActions, action];
            // Ensure 'view' is always included if any other action is granted
            if (action !== 'view' && !newActions.includes('view')) {
                newActions.unshift('view');
            }
        }

        setPendingChanges(prev => {
            const next = new Map(prev);
            next.set(key, {
                ...current,
                granted_actions: newActions,
            });
            return next;
        });
    };

    // Toggle all actions for a module
    const toggleAllActionsForModule = (roleId: string, moduleCode: string, grant: boolean) => {
        if (!isEditing) return;

        const key = `${roleId}-${moduleCode}`;
        const module = modules.find(m => m.code === moduleCode);
        const current = getPermission(roleId, moduleCode);

        setPendingChanges(prev => {
            const next = new Map(prev);
            next.set(key, {
                ...current,
                granted_actions: grant ? (module?.available_actions || ['view']) : [],
            });
            return next;
        });
    };

    // Toggle can see all departments
    const toggleSeeAllDepts = (roleId: string, moduleCode: string) => {
        if (!isEditing) return;

        const key = `${roleId}-${moduleCode}`;
        const current = getPermission(roleId, moduleCode);

        setPendingChanges(prev => {
            const next = new Map(prev);
            next.set(key, {
                ...current,
                can_see_all_departments: !current.can_see_all_departments,
            });
            return next;
        });
    };

    // Save changes
    const saveChanges = async () => {
        if (pendingChanges.size === 0) return;

        // Double-check permission before saving
        if (!canEditMatrix) {
            alert('❌ ليس لديك صلاحية لتعديل مصفوفة الصلاحيات\n\nفقط المستخدمون الذين لديهم دور المدير يمكنهم التعديل.');
            setIsEditing(false);
            setPendingChanges(new Map());
            return;
        }

        setSaving(true);
        try {
            for (const [key, change] of pendingChanges.entries()) {
                const existing = permissions.find(
                    p => p.role_id === change.role_id && p.module_code === change.module_code
                );

                if (existing?.id) {
                    const { error } = await supabase
                        .from('role_module_permissions')
                        .update({
                            granted_actions: change.granted_actions,
                            can_see_all_departments: change.can_see_all_departments,
                        })
                        .eq('id', existing.id);

                    if (error) {
                        throw error;
                    }
                } else if (change.granted_actions.length > 0) {
                    const { error } = await supabase
                        .from('role_module_permissions')
                        .insert({
                            role_id: change.role_id,
                            module_code: change.module_code,
                            granted_actions: change.granted_actions,
                            can_see_all_departments: change.can_see_all_departments,
                        });

                    if (error) {
                        throw error;
                    }
                }
            }

            setPendingChanges(new Map());
            setIsEditing(false);

            // Bust all permission caches to ensure fresh data
            bustPermissionCache();

            await loadData();

            // Success message
            alert('✅ تم حفظ التغييرات بنجاح!');
        } catch (err: any) {
            console.error('Error saving:', err);

            // Check if it's a permission error
            // Check if it's a permission error
            if (err?.code === '42501' || err?.message?.includes('permission') || err?.message?.includes('policy')) {
                alert('❌ خطأ في الصلاحيات\n\nليس لديك صلاحية لحفظ التغييرات.\nتحتاج إلى صلاحية "مصفوفة الصلاحيات" (تعديل) في موديول "إدارة الصلاحيات".\n\nيرجى التواصل مع مسؤول النظام.');
            } else if (err?.message?.includes('SAFETY LOCK')) {
                alert('🔒 حماية النظام\n\n' + err.message.replace('SAFETY LOCK:', ''));
            } else {
                alert('❌ حدث خطأ أثناء الحفظ\n\n' + (err?.message || 'خطأ غير معروف'));
            }
        }
        setSaving(false);
    };

    // Discard changes
    const discardChanges = () => {
        setPendingChanges(new Map());
        setIsEditing(false);
    };

    // Toggle module expansion
    const toggleModuleExpand = (code: string) => {
        setExpandedModules(prev => {
            const next = new Set(prev);
            if (next.has(code)) next.delete(code);
            else next.add(code);
            return next;
        });
    };

    if (loading) return <SettingsSkeleton />;

    return (
        <div className="flex flex-col bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden" style={{ height: 'calc(100vh - 280px)' }} dir="rtl">
            {/* Toolbar */}
            <div className="flex-shrink-0 flex flex-col gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                {/* Top row: Title and actions */}
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <ShieldCheckIcon className="w-6 h-6 text-primary-600" />
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white">مصفوفة الصلاحيات</h2>
                        <span className="text-sm text-gray-500">({displayedRoles.length} دور × {moduleFilterOptions.length} موديول)</span>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Edit/Save buttons */}
                        {!isEditing ? (
                            <button
                                onClick={() => {
                                    if (!canEditMatrix) {
                                        alert('❌ ليس لديك صلاحية للتعديل\n\nأنت بحاجة إلى صلاحية "تعديل" (Edit) في موديول "إدارة الصلاحيات" (Access Management).\n\nيرجى التواصل مع مدير النظام.');
                                        return;
                                    }
                                    setIsEditing(true);
                                }}
                                disabled={checkingPermission}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm ${canEditMatrix
                                    ? 'bg-primary-600 text-white hover:bg-primary-700'
                                    : 'bg-gray-400 text-gray-200 cursor-not-allowed'
                                    } ${checkingPermission ? 'opacity-50' : ''}`}
                                title={!canEditMatrix ? 'فقط المدراء يمكنهم التعديل' : 'تعديل الصلاحيات'}
                            >
                                <PencilIcon className="w-4 h-4" />
                                {checkingPermission ? 'جاري التحقق...' : 'تعديل'}
                            </button>
                        ) : (
                            <>
                                <button
                                    onClick={discardChanges}
                                    className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                                >
                                    إلغاء
                                </button>
                                <button
                                    onClick={saveChanges}
                                    disabled={saving || pendingChanges.size === 0}
                                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm disabled:opacity-50"
                                >
                                    {saving ? <ArrowPathIcon className="w-4 h-4 animate-spin" /> : <CheckIcon className="w-4 h-4" />}
                                    حفظ ({pendingChanges.size})
                                </button>
                            </>
                        )}
                    </div>
                </div>

                <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    تم نقل إدارة صلاحيات NCR إلى تبويب مستقل
                    {' '}
                    <span className="font-semibold">صلاحيات NCR حسب الدور والمرحلة</span>.
                </div>

                {/* Bottom row: Role selection */}
                <div className="flex items-center gap-3 flex-wrap">
                    {/* Role dropdown */}
                    <div className="relative">
                        <button
                            onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
                            className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm"
                        >
                            <span>اختر الأدوار للعرض</span>
                            <ChevronDownIcon className="w-4 h-4" />
                        </button>

                        {roleDropdownOpen && (
                            <>
                                {/* Backdrop */}
                                <div
                                    className="fixed inset-0 z-40"
                                    onClick={() => setRoleDropdownOpen(false)}
                                />
                                {/* Dropdown */}
                                <div className="absolute top-full right-0 mt-1 w-72 max-h-80 overflow-y-auto bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-50">
                                    {/* Search in dropdown */}
                                    <div className="sticky top-0 p-2 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                                        <div className="relative">
                                            <MagnifyingGlassIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                            <input
                                                type="text"
                                                placeholder="بحث..."
                                                value={searchRole}
                                                onChange={e => setSearchRole(e.target.value)}
                                                className="w-full pr-9 pl-3 py-1.5 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700"
                                                onClick={e => e.stopPropagation()}
                                            />
                                        </div>
                                    </div>
                                    {/* Role list */}
                                    <div className="p-1">
                                        {searchedRoles.map(role => (
                                            <button
                                                key={role.id}
                                                onClick={() => toggleRoleSelection(role.id)}
                                                className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors text-right ${selectedRoleIds.includes(role.id)
                                                    ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                                                    : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                                                    }`}
                                            >
                                                <div
                                                    className="w-3 h-3 rounded-full flex-shrink-0"
                                                    style={{ backgroundColor: role.color }}
                                                />
                                                <span className="flex-1">{role.name_ar || role.name}</span>
                                                {selectedRoleIds.includes(role.id) && (
                                                    <CheckIcon className="w-4 h-4 text-primary-600" />
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Selected roles chips */}
                    {selectedRoleIds.length > 0 && (
                        <>
                            <div className="flex items-center gap-2 flex-wrap">
                                {displayedRoles.map(role => (
                                    <span
                                        key={role.id}
                                        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full"
                                        style={{
                                            backgroundColor: `${role.color}20`,
                                            color: role.color,
                                            border: `1px solid ${role.color}40`
                                        }}
                                    >
                                        {role.name_ar || role.name}
                                        <button
                                            onClick={() => toggleRoleSelection(role.id)}
                                            className="hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full p-0.5"
                                        >
                                            <XMarkIcon className="w-3 h-3" />
                                        </button>
                                    </span>
                                ))}
                            </div>
                            <button
                                onClick={clearRoleSelection}
                                className="text-xs text-gray-500 hover:text-primary-500 underline"
                            >
                                مسح الفلتر
                            </button>
                        </>
                    )}

                    {/* Separator */}
                    {selectedRoleIds.length > 0 && <div className="w-px h-6 bg-gray-300 dark:bg-gray-600" />}

                    {/* Module dropdown */}
                    <div className="relative">
                        <button
                            onClick={() => setModuleDropdownOpen(!moduleDropdownOpen)}
                            className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm"
                        >
                            <span>اختر الموديولز</span>
                            <ChevronDownIcon className="w-4 h-4" />
                        </button>

                        {moduleDropdownOpen && (
                            <>
                                <div
                                    className="fixed inset-0 z-40"
                                    onClick={() => setModuleDropdownOpen(false)}
                                />
                                <div className="absolute top-full right-0 mt-1 w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-50">
                                    <div className="p-1">
                                        {moduleFilterOptions.map(module => (
                                            <button
                                                key={module.code}
                                                onClick={() => toggleModuleSelection(module.code)}
                                                className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors text-right ${selectedModuleCodes.includes(module.code)
                                                    ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                                                    : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                                                    }`}
                                            >
                                                <div
                                                    className="w-6 h-6 rounded flex items-center justify-center text-white flex-shrink-0"
                                                    style={{ backgroundColor: module.color }}
                                                >
                                                    {ModuleIcons[module.code]}
                                                </div>
                                                <span className="flex-1">{module.name_ar}</span>
                                                {selectedModuleCodes.includes(module.code) && (
                                                    <CheckIcon className="w-4 h-4 text-primary-600" />
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Selected modules chips */}
                    {selectedModuleCodes.length > 0 && (
                        <>
                            <div className="flex items-center gap-2 flex-wrap">
                                {displayedModules.map(module => (
                                    <span
                                        key={module.code}
                                        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full"
                                        style={{
                                            backgroundColor: `${module.color}20`,
                                            color: module.color,
                                            border: `1px solid ${module.color}40`
                                        }}
                                    >
                                        {module.name_ar}
                                        <button
                                            onClick={() => toggleModuleSelection(module.code)}
                                            className="hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full p-0.5"
                                        >
                                            <XMarkIcon className="w-3 h-3" />
                                        </button>
                                    </span>
                                ))}
                            </div>
                            <button
                                onClick={clearModuleSelection}
                                className="text-xs text-gray-500 hover:text-red-500 underline"
                            >
                                إزالة
                            </button>
                        </>
                    )}

                    {/* Helper text */}
                    {(selectedRoleIds.length === 0 || selectedModuleCodes.length === 0) && (
                        <span className="text-xs text-gray-500">← اختر الأدوار والموديولز للعرض</span>
                    )}
                </div>
            </div>

            {/* Edit Mode Banner */}
            {isEditing && (
                <div className="flex-shrink-0 flex items-center gap-2 px-4 py-2 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800">
                    <InformationCircleIcon className="w-5 h-5 text-amber-600" />
                    <span className="text-sm text-amber-700 dark:text-amber-300">
                        <strong>وضع التعديل:</strong> انقر على الخلايا لتفعيل/تعطيل الصلاحيات
                    </span>
                </div>
            )}

            {displayedRoles.length === 0 && (
                <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
                    <ShieldCheckIcon className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-4" />
                    <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        لا توجد أدوار
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md">
                        أضف أدوار من خلال تنفيذ ملف SQL للأدوار أو من الهيكل التنظيمي
                    </p>
                </div>
            )}

            {displayedRoles.length > 0 && gridModules.length === 0 && (
                <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
                    <ExclamationTriangleIcon className="w-12 h-12 text-amber-500 mb-4" />
                    <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        تم إخفاء تكرار NCR من المصفوفة
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md">
                        موديول `NCR` يُدار من جدول
                        {' '}
                        <span className="font-semibold">صلاحيات NCR حسب الدور والمرحلة</span>
                        {' '}
                        فقط.
                    </p>
                </div>
            )}

            {displayedRoles.length > 0 && gridModules.length > 0 && (
                <div className="flex-1 overflow-auto">
                    <table className="w-full border-collapse">
                        <thead className="sticky top-0 z-20 bg-white dark:bg-gray-900">
                            <tr>
                                <th className="sticky right-0 z-30 bg-gray-100 dark:bg-gray-800 px-4 py-3 text-right border-b border-l border-gray-200 dark:border-gray-700 min-w-[200px]">
                                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">الموديول / الدور</span>
                                </th>
                                {displayedRoles.length === 0 ? (
                                    <th className="px-4 py-8 text-center text-gray-400 font-normal italic w-full bg-gray-50 dark:bg-gray-800/50">
                                        ← اختر دوراً واحداً على الأقل من القائمة أعلاه للعرض
                                    </th>
                                ) : (
                                    displayedRoles.map(role => (
                                        <th
                                            key={role.id}
                                            className="px-3 py-3 text-center border-b border-l border-gray-200 dark:border-gray-700 min-w-[120px]"
                                            style={{ borderTopColor: role.color, borderTopWidth: '3px' }}
                                        >
                                            <div className="flex flex-col items-center gap-1">
                                                <span className="text-xs font-bold text-gray-900 dark:text-white">
                                                    {role.name_ar || role.name}
                                                </span>
                                                <span className="text-[10px] text-gray-500">{role.code}</span>
                                            </div>
                                        </th>
                                    ))
                                )}
                            </tr>
                        </thead>
                        <tbody>
                            {displayedRoles.length > 0 && gridModules.map((module, moduleIdx) => (
                                <React.Fragment key={module.code}>
                                    {/* Module Header Row */}
                                    <tr className="bg-gray-50 dark:bg-gray-800/50">
                                        <td
                                            className="sticky right-0 z-10 bg-gray-50 dark:bg-gray-800/50 px-4 py-2 border-b border-l border-gray-200 dark:border-gray-700 cursor-pointer"
                                            onClick={() => toggleModuleExpand(module.code)}
                                        >
                                            <div className="flex items-center gap-3">
                                                {expandedModules.has(module.code) ? (
                                                    <ChevronDownIcon className="w-4 h-4 text-gray-500" />
                                                ) : (
                                                    <ChevronRightIcon className="w-4 h-4 text-gray-500" />
                                                )}
                                                <div
                                                    className="w-8 h-8 rounded-lg flex items-center justify-center text-white"
                                                    style={{ backgroundColor: module.color }}
                                                >
                                                    {ModuleIcons[module.code]}
                                                </div>
                                                <div>
                                                    <div className="font-semibold text-gray-900 dark:text-white text-sm">
                                                        {module.name_ar}
                                                    </div>
                                                    <div className="text-xs text-gray-500">{module.name}</div>
                                                </div>
                                            </div>
                                        </td>
                                        {displayedRoles.map(role => {
                                            const perm = getPermission(role.id, module.code);
                                            const hasAny = perm.granted_actions.length > 0;
                                            const hasAll = perm.granted_actions.length === module.available_actions.length;

                                            return (
                                                <td
                                                    key={`${module.code}-${role.id}-header`}
                                                    className="px-3 py-2 text-center border-b border-l border-gray-200 dark:border-gray-700"
                                                >
                                                    {isEditing ? (
                                                        <button
                                                            onClick={() => toggleAllActionsForModule(role.id, module.code, !hasAll)}
                                                            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${hasAll
                                                                ? 'bg-green-500 text-white'
                                                                : hasAny
                                                                    ? 'bg-yellow-100 text-yellow-700 border border-yellow-300'
                                                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-400'
                                                                }`}
                                                            title={hasAll ? 'إزالة الكل' : 'تفعيل الكل'}
                                                        >
                                                            {hasAll ? (
                                                                <CheckIcon className="w-4 h-4" />
                                                            ) : hasAny ? (
                                                                <span className="text-xs font-bold">{perm.granted_actions.length}</span>
                                                            ) : (
                                                                <XMarkIcon className="w-4 h-4" />
                                                            )}
                                                        </button>
                                                    ) : (
                                                        <div
                                                            className={`w-8 h-8 rounded-lg flex items-center justify-center mx-auto ${hasAll
                                                                ? 'bg-green-100 text-green-700'
                                                                : hasAny
                                                                    ? 'bg-yellow-100 text-yellow-700'
                                                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-400'
                                                                }`}
                                                        >
                                                            {hasAll ? (
                                                                <CheckIcon className="w-4 h-4" />
                                                            ) : hasAny ? (
                                                                <span className="text-xs font-bold">{perm.granted_actions.length}</span>
                                                            ) : (
                                                                <XMarkIcon className="w-4 h-4" />
                                                            )}
                                                        </div>
                                                    )}
                                                </td>
                                            );
                                        })}
                                    </tr>

                                    {/* Action Rows (when expanded) */}
                                    {expandedModules.has(module.code) && module.available_actions.map((action, actionIdx) => (
                                        <tr
                                            key={`${module.code}-${action}`}
                                            className={actionIdx % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50/50 dark:bg-gray-800/30'}
                                        >
                                            <td className="sticky right-0 z-10 bg-inherit px-4 py-1.5 border-b border-l border-gray-200 dark:border-gray-700">
                                                <div className="flex items-center gap-2 pr-12">
                                                    <div
                                                        className="w-2 h-2 rounded-full"
                                                        style={{ backgroundColor: ActionLabels[action]?.color || '#6B7280' }}
                                                    />
                                                    <span className="text-sm text-gray-600 dark:text-gray-400">
                                                        {ActionLabels[action]?.ar || action}
                                                    </span>
                                                </div>
                                            </td>
                                            {displayedRoles.map(role => {
                                                const perm = getPermission(role.id, module.code);
                                                const isGranted = perm.granted_actions.includes(action);

                                                return (
                                                    <td
                                                        key={`${module.code}-${action}-${role.id}`}
                                                        className="px-3 py-1.5 text-center border-b border-l border-gray-200 dark:border-gray-700"
                                                    >
                                                        <button
                                                            onClick={() => toggleAction(role.id, module.code, action)}
                                                            disabled={!isEditing}
                                                            className={`w-6 h-6 rounded flex items-center justify-center transition-all mx-auto ${isGranted
                                                                ? 'bg-green-500 text-white'
                                                                : 'bg-gray-200 dark:bg-gray-700 text-gray-400'
                                                                } ${isEditing ? 'cursor-pointer hover:scale-110' : 'cursor-default'}`}
                                                        >
                                                            {isGranted ? (
                                                                <CheckIcon className="w-3.5 h-3.5" />
                                                            ) : (
                                                                <XMarkIcon className="w-3.5 h-3.5" />
                                                            )}
                                                        </button>
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    ))}
                                </React.Fragment>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Legend - only show when roles and modules selected */}
            {displayedRoles.length > 0 && gridModules.length > 0 && (
                <div className="flex-shrink-0 flex items-center justify-between gap-4 px-4 py-2 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-xs">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1.5">
                            <div className="w-5 h-5 rounded bg-green-500 flex items-center justify-center text-white">
                                <CheckIcon className="w-3 h-3" />
                            </div>
                            <span className="text-gray-600 dark:text-gray-400">مُفعّل</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className="w-5 h-5 rounded bg-yellow-100 border border-yellow-300 flex items-center justify-center text-yellow-700">
                                <span className="text-[10px] font-bold">3</span>
                            </div>
                            <span className="text-gray-600 dark:text-gray-400">جزئي</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className="w-5 h-5 rounded bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-400">
                                <XMarkIcon className="w-3 h-3" />
                            </div>
                            <span className="text-gray-600 dark:text-gray-400">مُعطّل</span>
                        </div>
                    </div>
                    <span className="text-gray-500">انقر على اسم الموديول للتوسيع/الطي</span>
                </div>
            )}
        </div>
    );
};

export default SimplePermissionMatrix;









