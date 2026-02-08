/**
 * Module Distribution Component
 * توزيع الموديولز على الأقسام مع إعدادات عزل البيانات
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
    CubeIcon,
    BuildingOfficeIcon,
    CheckIcon,
    XMarkIcon,
    ArrowPathIcon,
    ShieldCheckIcon,
    ShareIcon,
    LockClosedIcon,
    LockOpenIcon,
    InformationCircleIcon,
    MagnifyingGlassIcon,
    Cog6ToothIcon,
    ExclamationTriangleIcon,
    DocumentTextIcon,
    ClipboardDocumentListIcon,
    BeakerIcon
} from '@heroicons/react/24/outline';
import { supabase } from '../../config/supabase';
import PermissionsDebug from '../debug/PermissionsDebug';
import { SettingsSkeleton } from '../common/LoadingStates';

// ==================== Types ====================
interface AppModule {
    id: string;
    code: string;
    name: string;
    name_ar: string;
    description?: string;
    description_ar?: string;
    icon: string;
    color: string;
    data_isolation_mode: 'shared' | 'isolated' | 'hybrid';
    supports_sharing: boolean;
    available_actions: string[];
    display_order: number;
}

interface Department {
    id: string;
    code: string;
    name: string;
    name_ar?: string;
    color?: string;
}

interface DepartmentModuleAccess {
    id: string;
    department_id: string;
    module_code: string;
    is_enabled: boolean;
    custom_isolation_mode?: 'shared' | 'isolated' | null;
    granted_actions: string[];
}

// ==================== Module Icon Mapping ====================
const ModuleIcons: Record<string, React.ReactNode> = {
    forms_reports: <DocumentTextIcon className="w-6 h-6" />,
    tasks: <ClipboardDocumentListIcon className="w-6 h-6" />,
    lab: <BeakerIcon className="w-6 h-6" />,
    ncr: <ExclamationTriangleIcon className="w-6 h-6" />,
    pallet_management: <CubeIcon className="w-6 h-6" />,
    access_management: <ShieldCheckIcon className="w-6 h-6" />,
};

// ==================== Action Labels ====================
const ActionLabels: Record<string, { en: string; ar: string }> = {
    view: { en: 'View', ar: 'عرض' },
    create: { en: 'Create', ar: 'إنشاء' },
    edit: { en: 'Edit', ar: 'تعديل' },
    delete: { en: 'Delete', ar: 'حذف' },
    approve: { en: 'Approve', ar: 'موافقة' },
    export: { en: 'Export', ar: 'تصدير' },
    print: { en: 'Print', ar: 'طباعة' },
    share: { en: 'Share', ar: 'مشاركة' },
    assign: { en: 'Assign', ar: 'تعيين' },
    complete: { en: 'Complete', ar: 'إكمال' },
    release: { en: 'Release', ar: 'إصدار' },
    review: { en: 'Review', ar: 'مراجعة' },
    investigate: { en: 'Investigate', ar: 'تحقيق' },
    decide: { en: 'Decide', ar: 'قرار' },
    close: { en: 'Close', ar: 'إغلاق' },
    hold_add: { en: 'Add Hold', ar: 'إضافة حجز' },
    hold_release: { en: 'Release Hold', ar: 'إفراج حجز' },
    manage_hold: { en: 'Manage Hold', ar: 'حجز' },
    release_hold: { en: 'Release Hold', ar: 'رفع الحجز' },
    dispose: { en: 'Dispose', ar: 'فرز/إتلاف' },
    load: { en: 'Load', ar: 'تحميل' },
    dispatch: { en: 'Dispatch', ar: 'شحن' },
    view_audit: { en: 'View Audit', ar: 'سجل التدقيق' },
};

// ==================== Loading Component ====================


// ==================== Main Component ====================
const ModuleDistribution: React.FC = () => {
    const [modules, setModules] = useState<AppModule[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [access, setAccess] = useState<DepartmentModuleAccess[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [selectedModule, setSelectedModule] = useState<AppModule | null>(null);
    const [searchDept, setSearchDept] = useState('');
    const [showSettings, setShowSettings] = useState(false);
    const [showDebug, setShowDebug] = useState(false);
    const [pendingChanges, setPendingChanges] = useState<Map<string, Partial<DepartmentModuleAccess>>>(new Map());

    // Load data
    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            // Load modules from app_modules table (or fallback to hardcoded)
            const { data: modulesData, error: modulesError } = await supabase
                .from('app_modules')
                .select('id, code, name, name_ar, description, description_ar, icon, color, data_isolation_mode, supports_sharing, available_actions, display_order, is_active')
                .eq('is_active', true)
                .order('display_order');

            // If table doesn't exist, use hardcoded modules
            const defaultModules: AppModule[] = [
                {
                    id: '1',
                    code: 'forms_reports',
                    name: 'Forms & Reports',
                    name_ar: 'النماذج والتقارير',
                    description: 'Document forms, checklists, and reports management',
                    description_ar: 'إدارة النماذج والقوائم والتقارير',
                    icon: 'DocumentText',
                    color: '#3B82F6',
                    data_isolation_mode: 'isolated',
                    supports_sharing: true,
                    available_actions: ['view', 'create', 'edit', 'delete', 'approve', 'export', 'print', 'share'],
                    display_order: 1,
                },
                {
                    id: '2',
                    code: 'tasks',
                    name: 'Tasks',
                    name_ar: 'المهام',
                    description: 'Task assignment and tracking system',
                    description_ar: 'نظام تعيين وتتبع المهام',
                    icon: 'ClipboardList',
                    color: '#10B981',
                    data_isolation_mode: 'isolated',
                    supports_sharing: false,
                    available_actions: ['view', 'create', 'edit', 'delete', 'assign', 'complete', 'export'],
                    display_order: 2,
                },
                {
                    id: '3',
                    code: 'lab',
                    name: 'Laboratory',
                    name_ar: 'المختبر',
                    description: 'Laboratory tests, samples, and analysis',
                    description_ar: 'الاختبارات المعملية والعينات والتحليلات',
                    icon: 'Beaker',
                    color: '#8B5CF6',
                    data_isolation_mode: 'isolated',
                    supports_sharing: false,
                    available_actions: ['view', 'create', 'edit', 'delete', 'approve', 'release', 'export', 'print'],
                    display_order: 3,
                },
                {
                    id: '4',
                    code: 'ncr',
                    name: 'NCR & Holds',
                    name_ar: 'NCR والمحتجزات',
                    description: 'Non-Conformance Reports and Hold management with workflow',
                    description_ar: 'تقارير عدم المطابقة وإدارة المحتجزات مع سير العمل',
                    icon: 'ExclamationTriangle',
                    color: '#EF4444',
                    data_isolation_mode: 'hybrid',
                    supports_sharing: false,
                    available_actions: ['view', 'create', 'edit', 'review', 'investigate', 'decide', 'close', 'hold_add', 'hold_release', 'export', 'print'],
                    display_order: 4,
                },
                {
                    id: '5',
                    code: 'pallet_management',
                    name: 'Pallet Management',
                    name_ar: 'إدارة البالتات',
                    description: 'Comprehensive pallet tracking and loading management system',
                    description_ar: 'نظام متكامل لتتبع وإدارة البالتات والتحميل',
                    icon: 'Package',
                    color: '#10B981',
                    data_isolation_mode: 'isolated',
                    supports_sharing: false,
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
                    display_order: 5,
                },
                {
                    id: '6',
                    code: 'access_management',
                    name: 'Access Management',
                    name_ar: 'إدارة الصلاحيات',
                    description: 'Manage system access, roles, and permission matrix',
                    description_ar: 'إدارة الوصول للنظام والأدوار ومصفوفة الصلاحيات',
                    icon: 'ShieldCheck',
                    color: '#6366F1',
                    data_isolation_mode: 'shared',
                    supports_sharing: false,
                    available_actions: ['view', 'edit'],
                    display_order: 6,
                },
            ];

            setModules(modulesError ? defaultModules : (modulesData || defaultModules));

            // Load departments
            const { data: deptsData } = await supabase
                .from('departments')
                .select('id, code, name, name_ar, color')
                .eq('active', true)
                .order('name');
            setDepartments(deptsData || []);

            // Load access data
            const { data: accessData } = await supabase
                .from('department_module_access')
                .select('id, department_id, module_code, is_enabled, custom_isolation_mode, granted_actions');
            setAccess(accessData || []);

            // Select first module
            if (!selectedModule && (modulesData?.length || defaultModules.length)) {
                setSelectedModule(modulesError ? defaultModules[0] : (modulesData?.[0] || null));
            }
        } catch (err) {
            console.error('Error loading data:', err);
        }
        setLoading(false);
    };

    // Filter departments
    const filteredDepts = useMemo(() => {
        if (!searchDept) return departments;
        const q = searchDept.toLowerCase();
        return departments.filter(d =>
            d.name.toLowerCase().includes(q) ||
            d.name_ar?.includes(searchDept) ||
            d.code.toLowerCase().includes(q)
        );
    }, [departments, searchDept]);

    // Get access for department + module
    const getAccess = (deptId: string, moduleCode: string): DepartmentModuleAccess | undefined => {
        // Check pending changes first
        const key = `${deptId}-${moduleCode}`;
        const pending = pendingChanges.get(key);
        const existing = access.find(a => a.department_id === deptId && a.module_code === moduleCode);

        if (pending) {
            return { ...existing, ...pending } as DepartmentModuleAccess;
        }
        return existing;
    };

    // Toggle department access to module
    const toggleDeptAccess = (deptId: string, moduleCode: string) => {
        const key = `${deptId}-${moduleCode}`;
        const current = getAccess(deptId, moduleCode);
        const newEnabled = !(current?.is_enabled ?? false);

        setPendingChanges(prev => {
            const next = new Map(prev);
            next.set(key, {
                ...(prev.get(key) || {}),
                department_id: deptId,
                module_code: moduleCode,
                is_enabled: newEnabled,
            });
            return next;
        });
    };

    // Toggle action for department
    const toggleAction = (deptId: string, moduleCode: string, action: string) => {
        const key = `${deptId}-${moduleCode}`;
        const current = getAccess(deptId, moduleCode);
        const currentActions = current?.granted_actions || ['view'];

        let newActions: string[];
        if (currentActions.includes(action)) {
            newActions = currentActions.filter(a => a !== action);
            // Always keep 'view' if any other action exists
            if (newActions.length === 0) newActions = ['view'];
        } else {
            newActions = [...currentActions, action];
            // If adding any action, ensure 'view' is included
            if (!newActions.includes('view')) newActions.unshift('view');
        }

        setPendingChanges(prev => {
            const next = new Map(prev);
            next.set(key, {
                ...(prev.get(key) || {}),
                department_id: deptId,
                module_code: moduleCode,
                granted_actions: newActions,
            });
            return next;
        });
    };

    // Set isolation mode for department
    const setIsolationMode = (deptId: string, moduleCode: string, mode: 'shared' | 'isolated' | null) => {
        const key = `${deptId}-${moduleCode}`;

        setPendingChanges(prev => {
            const next = new Map(prev);
            next.set(key, {
                ...(prev.get(key) || {}),
                department_id: deptId,
                module_code: moduleCode,
                custom_isolation_mode: mode,
            });
            return next;
        });
    };

    // Save all changes
    const saveChanges = async () => {
        if (pendingChanges.size === 0) return;

        console.log('[ModuleDistribution] Starting save with', pendingChanges.size, 'changes');
        setSaving(true);
        try {
            for (const [key, change] of pendingChanges.entries()) {
                console.log('[ModuleDistribution] Processing change:', key, change);

                const existing = access.find(
                    a => a.department_id === change.department_id && a.module_code === change.module_code
                );

                const updateData = {
                    department_id: change.department_id,
                    module_code: change.module_code,
                    stage_code: null,
                    is_enabled: change.is_enabled ?? existing?.is_enabled ?? true,
                    granted_actions: change.granted_actions ?? existing?.granted_actions ?? ['view'],
                    custom_isolation_mode: change.custom_isolation_mode ?? existing?.custom_isolation_mode ?? null,
                    updated_at: new Date().toISOString(),
                };

                console.log('[ModuleDistribution] Saving:', updateData);

                const { data: existingRow, error: lookupError } = await supabase
                    .from('department_module_access')
                    .select('id')
                    .eq('department_id', change.department_id)
                    .eq('module_code', change.module_code)
                    .is('stage_code', null)
                    .maybeSingle();

                if (lookupError) {
                    console.error('[ModuleDistribution] Lookup error:', lookupError);
                    throw lookupError;
                }

                if (existingRow?.id) {
                    const { error } = await supabase
                        .from('department_module_access')
                        .update(updateData)
                        .eq('id', existingRow.id);

                    if (error) {
                        console.error('[ModuleDistribution] Update error:', error);
                        throw error;
                    }
                } else {
                    const { error } = await supabase
                        .from('department_module_access')
                        .insert(updateData);

                    if (error) {
                        console.error('[ModuleDistribution] Insert error:', error);
                        throw error;
                    }
                }

                console.log('[ModuleDistribution] Save success for:', key);
            }

            console.log('[ModuleDistribution] All changes saved, refreshing data...');
            setPendingChanges(new Map());
            await loadData();

            // Trigger real-time permission refresh
            window.dispatchEvent(new Event('permissions-changed'));
            console.log('[ModuleDistribution] Save complete!');
        } catch (err) {
            console.error('[ModuleDistribution] Error saving:', err);
            alert('حدث خطأ أثناء الحفظ');
        }
        setSaving(false);
    };

    // Discard changes
    const discardChanges = () => {
        setPendingChanges(new Map());
    };

    // Enable all departments for module
    const enableAllDepts = (moduleCode: string) => {
        departments.forEach(dept => {
            const key = `${dept.id}-${moduleCode}`;
            setPendingChanges(prev => {
                const next = new Map(prev);
                next.set(key, {
                    ...(prev.get(key) || {}),
                    department_id: dept.id,
                    module_code: moduleCode,
                    is_enabled: true,
                    granted_actions: selectedModule?.available_actions || ['view'],
                });
                return next;
            });
        });
    };

    // Disable all departments for module
    const disableAllDepts = (moduleCode: string) => {
        departments.forEach(dept => {
            const key = `${dept.id}-${moduleCode}`;
            setPendingChanges(prev => {
                const next = new Map(prev);
                next.set(key, {
                    ...(prev.get(key) || {}),
                    department_id: dept.id,
                    module_code: moduleCode,
                    is_enabled: false,
                });
                return next;
            });
        });
    };

    if (loading) return <SettingsSkeleton />;

    return (
        <div className="h-full flex flex-col" dir="rtl">
            {/* Header with pending changes banner */}
            {pendingChanges.size > 0 && (
                <div className="flex-shrink-0 flex items-center justify-between gap-4 px-4 py-3 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800">
                    <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
                        <InformationCircleIcon className="w-5 h-5" />
                        <span className="text-sm font-medium">{pendingChanges.size} تغيير معلق</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={discardChanges}
                            className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                            تجاهل
                        </button>
                        <button
                            onClick={saveChanges}
                            disabled={saving}
                            className="px-4 py-1.5 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center gap-2"
                        >
                            {saving ? <ArrowPathIcon className="w-4 h-4 animate-spin" /> : <CheckIcon className="w-4 h-4" />}
                            حفظ التغييرات
                        </button>
                    </div>
                </div>
            )}

            {showDebug && <PermissionsDebug />}

            <div className="flex-1 flex overflow-hidden">
                {/* Left Panel: Modules List */}
                <div className="w-80 flex-shrink-0 border-l border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 overflow-y-auto">
                    <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                        <div className="flex items-center justify-between mb-1">
                            <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <CubeIcon className="w-5 h-5 text-primary-600" />
                                الموديولز
                            </h3>
                            <button
                                onClick={() => setShowDebug(!showDebug)}
                                className="text-gray-400 hover:text-amber-500 transition-colors"
                                title="تشخيص المشاكل"
                            >
                                <ExclamationTriangleIcon className="w-5 h-5" />
                            </button>
                        </div>
                        <p className="text-xs text-gray-500">اختر موديول لتوزيعه على الأقسام</p>
                    </div>

                    <div className="p-2 space-y-1">
                        {modules.map(mod => (
                            <button
                                key={mod.code}
                                onClick={() => setSelectedModule(mod)}
                                className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${selectedModule?.code === mod.code
                                    ? 'bg-white dark:bg-gray-800 shadow-md border-2 border-primary-500'
                                    : 'hover:bg-white dark:hover:bg-gray-800 border-2 border-transparent'
                                    }`}
                            >
                                <div
                                    className="w-10 h-10 rounded-lg flex items-center justify-center text-white"
                                    style={{ backgroundColor: mod.color }}
                                >
                                    {ModuleIcons[mod.code] || <CubeIcon className="w-5 h-5" />}
                                </div>
                                <div className="flex-1 text-right">
                                    <div className="font-semibold text-gray-900 dark:text-white text-sm">
                                        {mod.name_ar}
                                    </div>
                                    <div className="text-xs text-gray-500">{mod.name}</div>
                                </div>
                                <div className="flex flex-col items-center gap-1">
                                    {mod.data_isolation_mode === 'isolated' && (
                                        <span className="px-1.5 py-0.5 text-[10px] bg-blue-100 text-blue-700 rounded" title="بيانات معزولة">
                                            معزول
                                        </span>
                                    )}
                                    {mod.data_isolation_mode === 'shared' && (
                                        <span className="px-1.5 py-0.5 text-[10px] bg-green-100 text-green-700 rounded" title="بيانات مشتركة">
                                            مشترك
                                        </span>
                                    )}
                                    {mod.data_isolation_mode === 'hybrid' && (
                                        <span className="px-1.5 py-0.5 text-[10px] bg-purple-100 text-purple-700 rounded" title="صلاحيات حسب المرحلة">
                                            مختلط
                                        </span>
                                    )}
                                    {mod.supports_sharing && (
                                        <ShareIcon className="w-3 h-3 text-gray-400" title="يدعم المشاركة" />
                                    )}
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Right Panel: Department Access */}
                <div className="flex-1 flex flex-col overflow-hidden">
                    {selectedModule ? (
                        <>
                            {/* Module Header */}
                            <div className="flex-shrink-0 p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div
                                            className="w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-lg"
                                            style={{ backgroundColor: selectedModule.color }}
                                        >
                                            {ModuleIcons[selectedModule.code] || <CubeIcon className="w-6 h-6" />}
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                                                {selectedModule.name_ar}
                                            </h2>
                                            <p className="text-sm text-gray-500">{selectedModule.description_ar}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => enableAllDepts(selectedModule.code)}
                                            className="px-3 py-1.5 text-xs bg-green-100 text-green-700 rounded-lg hover:bg-green-200"
                                        >
                                            تفعيل الكل
                                        </button>
                                        <button
                                            onClick={() => disableAllDepts(selectedModule.code)}
                                            className="px-3 py-1.5 text-xs bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
                                        >
                                            تعطيل الكل
                                        </button>
                                        {/* Settings button removed - permissions now managed via Matrix */}
                                    </div>
                                </div>

                                {/* Module Info */}
                                <div className="mt-4 flex items-center gap-4 text-sm">
                                    <div className="flex items-center gap-1.5">
                                        {selectedModule.data_isolation_mode === 'isolated' ? (
                                            <>
                                                <LockClosedIcon className="w-4 h-4 text-blue-600" />
                                                <span className="text-gray-600 dark:text-gray-400">بيانات معزولة لكل قسم</span>
                                            </>
                                        ) : selectedModule.data_isolation_mode === 'shared' ? (
                                            <>
                                                <LockOpenIcon className="w-4 h-4 text-green-600" />
                                                <span className="text-gray-600 dark:text-gray-400">بيانات مشتركة بين الأقسام</span>
                                            </>
                                        ) : (
                                            <>
                                                <ShieldCheckIcon className="w-4 h-4 text-purple-600" />
                                                <span className="text-gray-600 dark:text-gray-400">صلاحيات حسب المرحلة (NCR)</span>
                                            </>
                                        )}
                                    </div>
                                    {selectedModule.supports_sharing && (
                                        <div className="flex items-center gap-1.5">
                                            <ShareIcon className="w-4 h-4 text-gray-500" />
                                            <span className="text-gray-600 dark:text-gray-400">يدعم مشاركة التقارير</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Search */}
                            <div className="flex-shrink-0 p-4 border-b border-gray-200 dark:border-gray-700">
                                <div className="relative">
                                    <MagnifyingGlassIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="بحث عن قسم..."
                                        value={searchDept}
                                        onChange={e => setSearchDept(e.target.value)}
                                        className="w-full pr-10 pl-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm"
                                    />
                                </div>
                            </div>

                            {/* Departments List */}
                            <div className="flex-1 overflow-y-auto p-4">
                                <div className="space-y-2">
                                    {filteredDepts.map(dept => {
                                        const deptAccess = getAccess(dept.id, selectedModule.code);
                                        const isEnabled = deptAccess?.is_enabled ?? false;
                                        const grantedActions = deptAccess?.granted_actions || ['view'];
                                        const isolationMode = deptAccess?.custom_isolation_mode || selectedModule.data_isolation_mode;

                                        return (
                                            <div
                                                key={dept.id}
                                                className={`rounded-xl border-2 transition-all ${isEnabled
                                                    ? 'border-primary-200 dark:border-primary-800 bg-white dark:bg-gray-800'
                                                    : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 opacity-60'
                                                    }`}
                                            >
                                                {/* Department Header */}
                                                <div className="flex items-center justify-between p-3">
                                                    <div className="flex items-center gap-3">
                                                        <div
                                                            className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold"
                                                            style={{ backgroundColor: dept.color || '#6B7280' }}
                                                        >
                                                            {dept.name.charAt(0)}
                                                        </div>
                                                        <div>
                                                            <div className="font-semibold text-gray-900 dark:text-white">
                                                                {dept.name_ar || dept.name}
                                                            </div>
                                                            <div className="text-xs text-gray-500">{dept.code}</div>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-3">
                                                        {/* Isolation Mode Toggle (only for non-hybrid modules) */}
                                                        {selectedModule.data_isolation_mode !== 'hybrid' && isEnabled && showSettings && (
                                                            <select
                                                                value={deptAccess?.custom_isolation_mode || ''}
                                                                onChange={e => setIsolationMode(
                                                                    dept.id,
                                                                    selectedModule.code,
                                                                    e.target.value as 'shared' | 'isolated' | null || null
                                                                )}
                                                                className="text-xs px-2 py-1 border rounded-lg bg-white dark:bg-gray-700"
                                                            >
                                                                <option value="">افتراضي ({selectedModule.data_isolation_mode === 'isolated' ? 'معزول' : 'مشترك'})</option>
                                                                <option value="isolated">معزول</option>
                                                                <option value="shared">مشترك</option>
                                                            </select>
                                                        )}

                                                        {/* Enable/Disable Toggle */}
                                                        <button
                                                            onClick={() => toggleDeptAccess(dept.id, selectedModule.code)}
                                                            className={`relative w-12 h-6 rounded-full transition-colors ${isEnabled
                                                                ? 'bg-primary-600'
                                                                : 'bg-gray-300 dark:bg-gray-600'
                                                                }`}
                                                        >
                                                            <div
                                                                className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${isEnabled ? 'right-1' : 'right-7'
                                                                    }`}
                                                            />
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Permissions section removed - now managed via Permissions Matrix */}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                            <CubeIcon className="w-16 h-16 mb-4 opacity-30" />
                            <p>اختر موديول من القائمة</p>
                        </div>
                    )}
                </div>
            </div>
        </div >
    );
};

export default ModuleDistribution;









