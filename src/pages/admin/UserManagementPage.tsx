/**
 * User Management Page
 * صفحة دليل المستخدمين + دليل الموظفين
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
    UserGroupIcon,
    PlusIcon,
    XMarkIcon,
    CheckIcon,
    ArrowPathIcon,
    TrashIcon,
    PencilSquareIcon,
    UserPlusIcon,
    LinkIcon
} from '@heroicons/react/24/outline';
import { createClient } from '@supabase/supabase-js';
import { supabase, supabaseUrl, supabaseAnonKey } from '../../config/supabase';

interface Role {
    id: string;
    name: string;
    name_ar?: string;
    color?: string;
}

interface Department {
    id: string;
    name: string;
    name_ar?: string;
}

interface Employee {
    id: string;
    employee_code: string;
    name: string;
    email: string | null;
    department_id: string | null;
    default_role_id: string | null;
    account_user_id: string | null;
    is_active: boolean;
    departments?: {
        name?: string;
        name_ar?: string;
    } | null;
    roles?: {
        name?: string;
        name_ar?: string;
        color?: string;
    } | null;
    resolved_account_user_id?: string | null;
}

interface DepartmentRoleLink {
    department_id: string;
    role_id: string;
}

const EMPTY_EMPLOYEE_FORM = {
    employee_code: '',
    name: '',
    email: '',
    department_id: '',
    default_role_id: '',
    is_active: true
};

const INITIAL_PASSWORD = '123456';

const UserManagementPage: React.FC = () => {
    const [roles, setRoles] = useState<Role[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [departmentRoles, setDepartmentRoles] = useState<DepartmentRoleLink[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);
    const [employeeSearchQuery, setEmployeeSearchQuery] = useState('');
    const [employeesError, setEmployeesError] = useState<string | null>(null);

    const [showEmployeeModal, setShowEmployeeModal] = useState(false);
    const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
    const [employeeForm, setEmployeeForm] = useState(EMPTY_EMPLOYEE_FORM);
    const [employeeSaving, setEmployeeSaving] = useState(false);
    const [accountActionEmployeeId, setAccountActionEmployeeId] = useState<string | null>(null);

    const getCurrentUserId = useCallback(async (): Promise<string | null> => {
        const { data } = await supabase.auth.getUser();
        return data?.user?.id ?? null;
    }, []);

    const loadData = useCallback(async () => {
        setLoading(true);
        setEmployeesError(null);

        try {
            const [usersRes, rolesRes, departmentsRes, departmentRolesRes, employeesRes] = await Promise.all([
                supabase.from('users').select('id, email, name').order('name'),
                supabase.from('roles').select('id, name, name_ar, color').eq('is_active', true),
                supabase
                    .from('departments')
                    .select('id, name, name_ar')
                    .eq('is_active', true)
                    .order('name'),
                supabase.from('department_roles').select('department_id, role_id'),
                supabase
                    .from('company_employees')
                    .select(`
                        id,
                        employee_code,
                        name,
                        email,
                        department_id,
                        default_role_id,
                        account_user_id,
                        is_active,
                        departments(name, name_ar),
                        roles(name, name_ar, color)
                    `)
                    .order('name')
            ]);

            if (rolesRes.error) throw rolesRes.error;
            if (usersRes.error) throw usersRes.error;
            if (departmentsRes.error) throw departmentsRes.error;
            if (departmentRolesRes.error) throw departmentRolesRes.error;

            if (employeesRes.error) {
                setEmployeesError(employeesRes.error.message);
            }

            const rolesData: Role[] = rolesRes.data || [];
            const usersData: any[] = usersRes.data || [];
            const departmentsData: Department[] = departmentsRes.data || [];
            const departmentRoleLinksData: DepartmentRoleLink[] = departmentRolesRes.data || [];
            const employeesData: Employee[] = (employeesRes.data as Employee[]) || [];

            const accountByEmail = new Map<string, string>();
            usersData.forEach((u: any) => {
                if (u.email) {
                    accountByEmail.set(String(u.email).toLowerCase(), u.id);
                }
            });

            const hydratedEmployees = employeesData.map((employee) => {
                const fromEmail = employee.email ? accountByEmail.get(employee.email.toLowerCase()) : null;
                return {
                    ...employee,
                    resolved_account_user_id: employee.account_user_id || fromEmail || null
                };
            });

            setRoles(rolesData);
            setDepartments(departmentsData);
            setDepartmentRoles(departmentRoleLinksData);
            setEmployees(hydratedEmployees);
        } catch (error) {
            console.error('Error loading user management data:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const availableRolesForSelectedDepartment = employeeForm.department_id
        ? roles.filter((role) =>
            departmentRoles.some(
                (link) =>
                    link.department_id === employeeForm.department_id &&
                    link.role_id === role.id
            )
        )
        : roles;

    useEffect(() => {
        if (!employeeForm.department_id || !employeeForm.default_role_id) return;

        const allowedRoleIds = new Set(
            departmentRoles
                .filter((link) => link.department_id === employeeForm.department_id)
                .map((link) => link.role_id)
        );

        if (!allowedRoleIds.has(employeeForm.default_role_id)) {
            setEmployeeForm((prev) => ({ ...prev, default_role_id: '' }));
        }
    }, [employeeForm.department_id, employeeForm.default_role_id, departmentRoles]);

    const openEmployeeModal = (employee?: Employee) => {
        if (employee) {
            setEditingEmployee(employee);
            setEmployeeForm({
                employee_code: employee.employee_code || '',
                name: employee.name || '',
                email: employee.email || '',
                department_id: employee.department_id || '',
                default_role_id: employee.default_role_id || '',
                is_active: employee.is_active
            });
        } else {
            setEditingEmployee(null);
            setEmployeeForm(EMPTY_EMPLOYEE_FORM);
        }

        setShowEmployeeModal(true);
    };

    const saveEmployee = async () => {
        if (!employeeForm.employee_code.trim() || !employeeForm.name.trim()) {
            alert('كود الموظف والاسم مطلوبان');
            return;
        }

        setEmployeeSaving(true);

        try {
            const actorId = await getCurrentUserId();
            const payload = {
                employee_code: employeeForm.employee_code.trim(),
                name: employeeForm.name.trim(),
                email: employeeForm.email.trim() ? employeeForm.email.trim() : null,
                department_id: employeeForm.department_id || null,
                default_role_id: employeeForm.default_role_id || null,
                is_active: employeeForm.is_active,
                updated_by: actorId
            };

            if (editingEmployee) {
                const { error } = await supabase
                    .from('company_employees')
                    .update(payload)
                    .eq('id', editingEmployee.id);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('company_employees')
                    .insert({ ...payload, created_by: actorId });
                if (error) throw error;
            }

            setShowEmployeeModal(false);
            await loadData();
        } catch (error: any) {
            console.error('Error saving employee:', error);
            alert(error?.message || 'فشل حفظ بيانات الموظف');
        } finally {
            setEmployeeSaving(false);
        }
    };

    const deleteEmployee = async (employee: Employee) => {
        const confirmed = window.confirm(`هل تريد حذف الموظف "${employee.name}"؟`);
        if (!confirmed) return;

        try {
            const { error } = await supabase
                .from('company_employees')
                .delete()
                .eq('id', employee.id);
            if (error) throw error;
            await loadData();
        } catch (error: any) {
            console.error('Error deleting employee:', error);
            alert(error?.message || 'فشل حذف الموظف');
        }
    };

    const ensureUserRole = async (userId: string, roleId: string) => {
        const { data: existingRole, error: existingRoleError } = await supabase
            .from('user_roles')
            .select('id')
            .eq('user_id', userId)
            .eq('role_id', roleId)
            .maybeSingle();

        if (existingRoleError && existingRoleError.code !== 'PGRST116') {
            throw existingRoleError;
        }

        if (!existingRole) {
            const { error: insertRoleError } = await supabase
                .from('user_roles')
                .insert({
                    user_id: userId,
                    role_id: roleId,
                    assigned_at: new Date().toISOString()
                });
            if (insertRoleError) throw insertRoleError;
        }
    };

    const syncUserProfileFromEmployee = async (userId: string, employee: Employee) => {
        const selectedDepartment = departments.find((d) => d.id === employee.department_id);

        const { error } = await supabase
            .from('users')
            .upsert({
                id: userId,
                name: employee.name,
                email: employee.email,
                department_id: employee.department_id,
                department: selectedDepartment?.name || null,
                is_active: employee.is_active,
                updated_at: new Date().toISOString()
            }, {
                onConflict: 'id'
            });
        if (error) throw error;
    };

    const linkEmployeeAccount = async (employeeId: string, accountUserId: string, defaultRoleId: string | null) => {
        const actorId = await getCurrentUserId();

        const { error: linkError } = await supabase
            .from('company_employees')
            .update({ account_user_id: accountUserId, updated_by: actorId })
            .eq('id', employeeId);
        if (linkError) throw linkError;

        if (defaultRoleId) {
            await ensureUserRole(accountUserId, defaultRoleId);
        }
    };

    const createAccountForEmployee = async (employee: Employee) => {
        if (!employee.email) {
            alert('لا يمكن إنشاء حساب بدون بريد إلكتروني للموظف');
            return;
        }

        const normalizedEmail = employee.email.trim().toLowerCase();
        setAccountActionEmployeeId(employee.id);

        try {
            const { data: existingProfiles } = await supabase
                .from('users')
                .select('id, email')
                .eq('email', employee.email)
                .limit(1);

            if (existingProfiles && existingProfiles.length > 0) {
                const existingUserId = existingProfiles[0].id;
                await syncUserProfileFromEmployee(existingUserId, employee);
                await linkEmployeeAccount(employee.id, existingUserId, employee.default_role_id);
                await loadData();
                return;
            }

            if (!supabaseUrl || !supabaseAnonKey) {
                throw new Error('Supabase configuration missing');
            }

            const tempClient = createClient(supabaseUrl, supabaseAnonKey, {
                auth: {
                    persistSession: false,
                    autoRefreshToken: false,
                    detectSessionInUrl: false
                }
            });

            const { data: authData, error: authError } = await tempClient.auth.signUp({
                email: normalizedEmail,
                password: INITIAL_PASSWORD,
                options: { data: { full_name: employee.name } }
            });

            if (authError) {
                const errMessage = String(authError.message || '').toLowerCase();
                const alreadyExists = errMessage.includes('already') || errMessage.includes('registered');
                if (!alreadyExists) throw authError;

                const { data: fallbackProfiles } = await supabase
                    .from('users')
                    .select('id, email')
                    .eq('email', normalizedEmail)
                    .limit(1);

                if (!fallbackProfiles || fallbackProfiles.length === 0) {
                    throw authError;
                }

                const existingUserId = fallbackProfiles[0].id;
                await syncUserProfileFromEmployee(existingUserId, employee);
                await linkEmployeeAccount(employee.id, existingUserId, employee.default_role_id);
                await loadData();
                return;
            }

            const newUserId = authData.user?.id;
            if (!newUserId) throw new Error('Account was not created correctly');

            await syncUserProfileFromEmployee(newUserId, employee);
            await linkEmployeeAccount(employee.id, newUserId, employee.default_role_id);
            await loadData();
            alert('تم إنشاء الحساب. كلمة المرور الابتدائية: 123456');
        } catch (error: any) {
            console.error('Error creating employee account:', error);
            alert(error?.message || 'فشل إنشاء الحساب');
        } finally {
            setAccountActionEmployeeId(null);
        }
    };

    const linkExistingResolvedAccount = async (employee: Employee) => {
        if (!employee.resolved_account_user_id) return;

        setAccountActionEmployeeId(employee.id);
        try {
            await linkEmployeeAccount(
                employee.id,
                employee.resolved_account_user_id,
                employee.default_role_id
            );
            await loadData();
        } catch (error: any) {
            console.error('Error linking existing account:', error);
            alert(error?.message || 'فشل ربط الحساب الموجود');
        } finally {
            setAccountActionEmployeeId(null);
        }
    };

    const filteredEmployees = employees.filter((employee) => {
        const q = employeeSearchQuery.toLowerCase();
        return (
            (employee.name || '').toLowerCase().includes(q) ||
            (employee.employee_code || '').toLowerCase().includes(q) ||
            (employee.email || '').toLowerCase().includes(q)
        );
    });

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <ArrowPathIcon className="w-8 h-8 animate-spin text-primary-600" />
            </div>
        );
    }

    return (
        <div className="p-6 h-full overflow-y-auto" dir="rtl">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <UserGroupIcon className="w-8 h-8 text-primary-600" />
                    دليل المستخدمين
                </h1>
                <p className="text-gray-500 mt-1">دليل الموظفين + إنشاء وربط الحسابات</p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div>
                        <h2 className="font-semibold text-gray-900 dark:text-white">دليل الموظفين</h2>
                        <p className="text-xs text-gray-500 mt-1">زر إنشاء الحساب ينشئ كلمة مرور ابتدائية: 123456</p>
                    </div>

                    <div className="flex items-center gap-2">
                        <input
                            type="text"
                            placeholder="بحث بالاسم/الكود/البريد..."
                            value={employeeSearchQuery}
                            onChange={(e) => setEmployeeSearchQuery(e.target.value)}
                            className="w-72 max-w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white text-sm"
                        />
                        <button
                            onClick={() => openEmployeeModal()}
                            className="px-3 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 inline-flex items-center gap-1"
                        >
                            <PlusIcon className="w-4 h-4" />
                            إضافة موظف
                        </button>
                    </div>
                </div>

                {employeesError && (
                    <div className="m-4 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-sm">
                        تعذر تحميل دليل الموظفين. طبّق Migration الجديدة أولًا.
                        <div className="mt-1 text-xs opacity-80">{employeesError}</div>
                    </div>
                )}

                {!employeesError && (
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 dark:bg-gray-700">
                            <tr>
                                <th className="p-3 text-right">الكود</th>
                                <th className="p-3 text-right">الاسم</th>
                                <th className="p-3 text-right">القسم</th>
                                <th className="p-3 text-right">الدور</th>
                                <th className="p-3 text-right">الحساب</th>
                                <th className="p-3 text-center">إجراءات</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {filteredEmployees.map((employee) => {
                                const hasAccount = Boolean(employee.resolved_account_user_id);
                                const needsLink = Boolean(!employee.account_user_id && employee.resolved_account_user_id);
                                const canCreateAccount = Boolean(!hasAccount && employee.email);

                                return (
                                    <tr key={employee.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                        <td className="p-3 font-mono text-xs">{employee.employee_code}</td>
                                        <td className="p-3">
                                            <div className="font-medium text-gray-900 dark:text-white">{employee.name}</div>
                                            <div className="text-xs text-gray-500">{employee.email || 'بدون بريد إلكتروني'}</div>
                                        </td>
                                        <td className="p-3">{employee.departments?.name_ar || employee.departments?.name || '-'}</td>
                                        <td className="p-3">{employee.roles?.name_ar || employee.roles?.name || '-'}</td>
                                        <td className="p-3">
                                            {hasAccount ? (
                                                <span className="px-2 py-1 text-xs rounded bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">لديه حساب</span>
                                            ) : (
                                                <span className="px-2 py-1 text-xs rounded bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300">بدون حساب</span>
                                            )}
                                        </td>
                                        <td className="p-3">
                                            <div className="flex items-center justify-center gap-1 flex-wrap">
                                                {needsLink && (
                                                    <button
                                                        onClick={() => linkExistingResolvedAccount(employee)}
                                                        disabled={accountActionEmployeeId === employee.id}
                                                        className="px-2 py-1 text-xs rounded bg-blue-100 text-blue-700 hover:bg-blue-200 inline-flex items-center gap-1 disabled:opacity-50"
                                                    >
                                                        {accountActionEmployeeId === employee.id ? <ArrowPathIcon className="w-3 h-3 animate-spin" /> : <LinkIcon className="w-3 h-3" />}
                                                        ربط
                                                    </button>
                                                )}
                                                {canCreateAccount && (
                                                    <button
                                                        onClick={() => createAccountForEmployee(employee)}
                                                        disabled={accountActionEmployeeId === employee.id}
                                                        className="px-2 py-1 text-xs rounded bg-emerald-100 text-emerald-700 hover:bg-emerald-200 inline-flex items-center gap-1 disabled:opacity-50"
                                                    >
                                                        {accountActionEmployeeId === employee.id ? <ArrowPathIcon className="w-3 h-3 animate-spin" /> : <UserPlusIcon className="w-3 h-3" />}
                                                        إنشاء حساب
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => openEmployeeModal(employee)}
                                                    className="px-2 py-1 text-xs rounded bg-gray-100 text-gray-700 hover:bg-gray-200 inline-flex items-center gap-1"
                                                >
                                                    <PencilSquareIcon className="w-3 h-3" />
                                                    تعديل
                                                </button>
                                                <button
                                                    onClick={() => deleteEmployee(employee)}
                                                    className="px-2 py-1 text-xs rounded bg-red-100 text-red-700 hover:bg-red-200 inline-flex items-center gap-1"
                                                >
                                                    <TrashIcon className="w-3 h-3" />
                                                    حذف
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>

            {showEmployeeModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-xl p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                                {editingEmployee ? 'تعديل موظف' : 'إضافة موظف'}
                            </h3>
                            <button onClick={() => setShowEmployeeModal(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
                                <XMarkIcon className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <input
                                type="text"
                                value={employeeForm.employee_code}
                                onChange={(e) => setEmployeeForm((f) => ({ ...f, employee_code: e.target.value }))}
                                placeholder="كود الموظف"
                                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                            />
                            <input
                                type="text"
                                value={employeeForm.name}
                                onChange={(e) => setEmployeeForm((f) => ({ ...f, name: e.target.value }))}
                                placeholder="اسم الموظف"
                                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                            />
                            <input
                                type="email"
                                value={employeeForm.email}
                                onChange={(e) => setEmployeeForm((f) => ({ ...f, email: e.target.value }))}
                                placeholder="البريد الإلكتروني"
                                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                            />
                            <select
                                value={employeeForm.department_id}
                                onChange={(e) => {
                                    const nextDepartmentId = e.target.value;

                                    setEmployeeForm((prev) => {
                                        const nextForm = { ...prev, department_id: nextDepartmentId };

                                        if (!prev.default_role_id || !nextDepartmentId) {
                                            return nextForm;
                                        }

                                        const isRoleAllowed = departmentRoles.some(
                                            (link) =>
                                                link.department_id === nextDepartmentId &&
                                                link.role_id === prev.default_role_id
                                        );

                                        if (!isRoleAllowed) {
                                            nextForm.default_role_id = '';
                                        }

                                        return nextForm;
                                    });
                                }}
                                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                            >
                                <option value="">بدون قسم</option>
                                {departments.map((department) => (
                                    <option key={department.id} value={department.id}>
                                        {department.name_ar || department.name}
                                    </option>
                                ))}
                            </select>
                            <select
                                value={employeeForm.default_role_id}
                                onChange={(e) => setEmployeeForm((f) => ({ ...f, default_role_id: e.target.value }))}
                                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                            >
                                <option value="">بدون دور افتراضي</option>
                                {availableRolesForSelectedDepartment.map((role) => (
                                    <option key={role.id} value={role.id}>
                                        {role.name_ar || role.name}
                                    </option>
                                ))}
                            </select>
                            {employeeForm.department_id && availableRolesForSelectedDepartment.length === 0 && (
                                <p className="text-xs text-amber-700 dark:text-amber-400 md:col-span-2">
                                    لا توجد أدوار مرتبطة بهذا القسم حاليًا.
                                </p>
                            )}
                            <label className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                                <input
                                    type="checkbox"
                                    checked={employeeForm.is_active}
                                    onChange={(e) => setEmployeeForm((f) => ({ ...f, is_active: e.target.checked }))}
                                    className="rounded border-gray-300"
                                />
                                موظف نشط
                            </label>
                        </div>

                        <div className="flex justify-end gap-2 mt-6">
                            <button onClick={() => setShowEmployeeModal(false)} className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                                إلغاء
                            </button>
                            <button
                                onClick={saveEmployee}
                                disabled={employeeSaving}
                                className="px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center gap-2"
                            >
                                {employeeSaving ? <ArrowPathIcon className="w-4 h-4 animate-spin" /> : <CheckIcon className="w-4 h-4" />}
                                حفظ
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserManagementPage;
