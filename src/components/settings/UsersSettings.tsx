/**
 * Users Settings Component
 * مكون إعدادات المستخدمين
 */

import React, { useState, useEffect } from 'react';
import {
    UserGroupIcon,
    PlusIcon,
    PencilIcon,
    TrashIcon,
    XMarkIcon,
    CheckIcon,
    ArrowPathIcon,
    MagnifyingGlassIcon,
    EnvelopeIcon,
    BuildingOfficeIcon,
    Cog6ToothIcon
} from '@heroicons/react/24/outline';
import { createClient } from '@supabase/supabase-js';
import { supabase, supabaseUrl, supabaseAnonKey } from '../../config/supabase';
import { TableSkeleton } from '../common/LoadingStates';

interface User {
    id: string;
    name: string;
    email: string;
    phone?: string;
    department?: string;
    department_id?: string;
    job_title_id?: string;
    title?: string;
    roles: string[];
    is_active: boolean;
    company_id?: string;
    created_at: string;
}

interface Department {
    id: string;
    name: string;
    name_en?: string;
    code?: string;
}

interface JobTitle {
    id: string;
    name: string;
    name_en?: string;
    department_id?: string;
    default_role_id?: string;
}

interface Role {
    id: string;
    name: string;
    name_ar?: string;
}

const UsersSettings: React.FC = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [jobTitles, setJobTitles] = useState<JobTitle[]>([]);
    const [roles, setRoles] = useState<Role[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [activeTab, setActiveTab] = useState<'users' | 'departments' | 'jobtitles'>('users');

    // User form
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        phone: '',
        department_id: '',
        job_title_id: '',
        roles: [] as string[],        // Role names for display
        roleIds: [] as string[],      // Role IDs for user_roles table
        is_active: true
    });

    // Department/Job Title form
    const [showDeptModal, setShowDeptModal] = useState(false);
    const [showJobTitleModal, setShowJobTitleModal] = useState(false);
    const [deptForm, setDeptForm] = useState({ name: '', name_en: '', code: '' });
    const [jobTitleForm, setJobTitleForm] = useState({ name: '', name_en: '', department_id: '' });
    const [editingDept, setEditingDept] = useState<Department | null>(null);
    const [editingJobTitle, setEditingJobTitle] = useState<JobTitle | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setIsLoading(true);
        try {
            // Parallelize all data fetching using Promise.allSettled for graceful error handling
            const [usersRes, deptsRes, jobsRes, rolesRes] = await Promise.allSettled([
                supabase.from('users').select('id, name, email, phone, department, department_id, job_title_id, title, roles, is_active, company_id, created_at').order('name').limit(500),
                supabase.from('departments').select('id, name, name_en, code, is_active').eq('is_active', true),
                supabase.from('job_titles').select('id, name, name_en, department_id, default_role_id, is_active').eq('is_active', true),
                supabase.from('roles').select('id, name, name_ar').eq('is_active', true)
            ]);

            // Process results - handle potential errors gracefully
            if (usersRes.status === 'fulfilled') {
                setUsers(usersRes.value.data || []);
            }
            if (deptsRes.status === 'fulfilled') {
                setDepartments(deptsRes.value.data || []);
            }
            if (jobsRes.status === 'fulfilled') {
                setJobTitles(jobsRes.value.data || []);
            }
            if (rolesRes.status === 'fulfilled') {
                setRoles(rolesRes.value.data || []);
            }
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const filteredUsers = users.filter(user =>
        user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const getJobTitlesForDepartment = (deptId: string) => {
        return jobTitles.filter(jt => jt.department_id === deptId || !jt.department_id);
    };

    const getDepartmentName = (deptId?: string) => {
        if (!deptId) return '-';
        return departments.find(d => d.id === deptId)?.name || '-';
    };

    const getJobTitleName = (jtId?: string) => {
        if (!jtId) return '-';
        return jobTitles.find(jt => jt.id === jtId)?.name || '-';
    };

    const handleOpenModal = async (user?: User) => {
        if (user) {
            setEditingUser(user);

            // Load user's roleIds from user_roles table
            const { data: userRolesData } = await supabase
                .from('user_roles')
                .select('role_id')
                .eq('user_id', user.id);
            const roleIds = userRolesData?.map(r => r.role_id) || [];

            setFormData({
                name: user.name || '',
                email: user.email || '',
                password: '',
                phone: user.phone || '',
                department_id: user.department_id || '',
                job_title_id: user.job_title_id || '',
                roles: user.roles || [],
                roleIds: roleIds,
                is_active: user.is_active
            });
        } else {
            setEditingUser(null);
            setFormData({
                name: '',
                email: '',
                password: '',
                phone: '',
                department_id: '',
                job_title_id: '',
                roles: [],
                roleIds: [],
                is_active: true
            });
        }
        setShowModal(true);
    };

    const handleSubmit = async () => {
        if (!formData.name || !formData.email) return;

        const dept = departments.find(d => d.id === formData.department_id);
        const jt = jobTitles.find(j => j.id === formData.job_title_id);

        try {
            let userId: string;

            if (editingUser) {
                userId = editingUser.id;
                await supabase
                    .from('users')
                    .update({
                        name: formData.name,
                        phone: formData.phone,
                        department_id: formData.department_id || null,
                        department: dept?.name || null,
                        job_title_id: formData.job_title_id || null,
                        title: jt?.name || null,
                        roles: formData.roles,
                        is_active: formData.is_active,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', editingUser.id);
            } else {
                if (!formData.password) {
                    alert('كلمة المرور مطلوبة للمستخدم الجديد');
                    return;
                }

                // 1. Create Auth User using separate client to avoid auto-login
                if (!supabaseUrl || !supabaseAnonKey) {
                    console.error('Supabase config missing');
                    return;
                }

                const tempClient = createClient(supabaseUrl, supabaseAnonKey, {
                    auth: {
                        persistSession: false,
                        autoRefreshToken: false,
                        detectSessionInUrl: false
                    }
                });

                const { data: authData, error: authError } = await tempClient.auth.signUp({
                    email: formData.email,
                    password: formData.password,
                    options: {
                        data: {
                            full_name: formData.name,
                        }
                    }
                });

                if (authError) {
                    alert('Error creating auth user: ' + authError.message);
                    return;
                }

                if (!authData.user) {
                    alert('Failed to create user');
                    return;
                }

                userId = authData.user.id;

                // 2. Create Public Profile linked to Auth ID
                const { error: profileError } = await supabase
                    .from('users')
                    .insert({
                        id: authData.user.id, // CRITICAL: Link to Auth ID
                        name: formData.name,
                        email: formData.email,
                        phone: formData.phone,
                        department_id: formData.department_id || null,
                        department: dept?.name || null,
                        job_title_id: formData.job_title_id || null,
                        title: jt?.name || null,
                        roles: formData.roles,
                        is_active: formData.is_active,
                        created_at: new Date().toISOString()
                    });

                if (profileError) {
                    console.error('Error creating profile:', profileError);
                    alert('Error creating profile: ' + profileError.message);
                    return;
                }
            }

            // 3. Sync user_roles table (CRITICAL for permissions to work)
            // First, delete existing roles for this user
            await supabase
                .from('user_roles')
                .delete()
                .eq('user_id', userId);

            // Then insert new roles
            if (formData.roleIds.length > 0) {
                const userRolesToInsert = formData.roleIds.map(roleId => ({
                    user_id: userId,
                    role_id: roleId,
                    created_at: new Date().toISOString()
                }));

                const { error: rolesError } = await supabase
                    .from('user_roles')
                    .insert(userRolesToInsert);

                if (rolesError) {
                    console.error('Error syncing user_roles:', rolesError);
                    // Don't fail the whole operation, just log
                }
            }

            setShowModal(false);
            loadData();
        } catch (error) {
            console.error('Error saving user:', error);
            alert('An unexpected error occurred');
        }
    };

    const handleToggleActive = async (user: User) => {
        try {
            await supabase
                .from('users')
                .update({ is_active: !user.is_active })
                .eq('id', user.id);
            loadData();
        } catch (error) {
            console.error('Error toggling user status:', error);
        }
    };

    const handleDelete = async (userId: string) => {
        if (!confirm('هل أنت متأكد من حذف هذا المستخدم؟')) return;

        try {
            await supabase.from('users').delete().eq('id', userId);
            loadData();
        } catch (error) {
            console.error('Error deleting user:', error);
        }
    };

    // Department CRUD
    const handleOpenDeptModal = (dept?: Department) => {
        if (dept) {
            setEditingDept(dept);
            setDeptForm({ name: dept.name, name_en: dept.name_en || '', code: dept.code || '' });
        } else {
            setEditingDept(null);
            setDeptForm({ name: '', name_en: '', code: '' });
        }
        setShowDeptModal(true);
    };

    const handleSaveDept = async () => {
        if (!deptForm.name) return;
        try {
            if (editingDept) {
                await supabase.from('departments').update(deptForm).eq('id', editingDept.id);
            } else {
                await supabase.from('departments').insert({ ...deptForm, is_active: true });
            }
            setShowDeptModal(false);
            loadData();
        } catch (error) {
            console.error('Error saving department:', error);
        }
    };

    const handleDeleteDept = async (id: string) => {
        if (!confirm('هل أنت متأكد من حذف هذا القسم؟')) return;
        try {
            await supabase.from('departments').update({ is_active: false }).eq('id', id);
            loadData();
        } catch (error) {
            console.error('Error deleting department:', error);
        }
    };

    // Job Title CRUD
    const handleOpenJobTitleModal = (jt?: JobTitle) => {
        if (jt) {
            setEditingJobTitle(jt);
            setJobTitleForm({ name: jt.name, name_en: jt.name_en || '', department_id: jt.department_id || '' });
        } else {
            setEditingJobTitle(null);
            setJobTitleForm({ name: '', name_en: '', department_id: '' });
        }
        setShowJobTitleModal(true);
    };

    const handleSaveJobTitle = async () => {
        if (!jobTitleForm.name) return;
        try {
            if (editingJobTitle) {
                await supabase.from('job_titles').update({
                    name: jobTitleForm.name,
                    name_en: jobTitleForm.name_en,
                    department_id: jobTitleForm.department_id || null
                }).eq('id', editingJobTitle.id);
            } else {
                await supabase.from('job_titles').insert({
                    name: jobTitleForm.name,
                    name_en: jobTitleForm.name_en,
                    department_id: jobTitleForm.department_id || null,
                    is_active: true
                });
            }
            setShowJobTitleModal(false);
            loadData();
        } catch (error) {
            console.error('Error saving job title:', error);
        }
    };

    const handleDeleteJobTitle = async (id: string) => {
        if (!confirm('هل أنت متأكد من حذف هذا المسمى الوظيفي؟')) return;
        try {
            await supabase.from('job_titles').update({ is_active: false }).eq('id', id);
            loadData();
        } catch (error) {
            console.error('Error deleting job title:', error);
        }
    };

    if (isLoading) {
        return <TableSkeleton />;
    }

    return (
        <div>
            {/* Sub Tabs */}
            <div className="flex gap-2 mb-6 border-b border-gray-200 dark:border-gray-700">
                <button
                    onClick={() => setActiveTab('users')}
                    className={`px-4 py-2 font-medium border-b-2 -mb-px ${activeTab === 'users' ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500'
                        }`}
                >
                    <UserGroupIcon className="w-5 h-5 inline ml-2" />
                    المستخدمين
                </button>
                <button
                    onClick={() => setActiveTab('departments')}
                    className={`px-4 py-2 font-medium border-b-2 -mb-px ${activeTab === 'departments' ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500'
                        }`}
                >
                    <BuildingOfficeIcon className="w-5 h-5 inline ml-2" />
                    الأقسام
                </button>
                <button
                    onClick={() => setActiveTab('jobtitles')}
                    className={`px-4 py-2 font-medium border-b-2 -mb-px ${activeTab === 'jobtitles' ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500'
                        }`}
                >
                    <Cog6ToothIcon className="w-5 h-5 inline ml-2" />
                    المسميات الوظيفية
                </button>
            </div>

            {/* Users Tab */}
            {activeTab === 'users' && (
                <>
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <UserGroupIcon className="w-6 h-6 text-primary-600" />
                                إدارة المستخدمين
                            </h2>
                            <p className="text-gray-500 text-sm">{users.length} مستخدم</p>
                        </div>
                        <div className="flex gap-3">
                            <div className="relative">
                                <MagnifyingGlassIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="بحث..."
                                    className="pl-4 pr-10 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700"
                                />
                            </div>
                            <button
                                onClick={() => handleOpenModal()}
                                className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                            >
                                <PlusIcon className="w-5 h-5" />
                                إضافة مستخدم
                            </button>
                        </div>
                    </div>

                    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                        <table className="w-full">
                            <thead className="bg-gray-50 dark:bg-gray-700/50">
                                <tr>
                                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">المستخدم</th>
                                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">القسم</th>
                                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">المسمى الوظيفي</th>
                                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">الأدوار</th>
                                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-500">الحالة</th>
                                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-500">إجراءات</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                {filteredUsers.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                                            لا يوجد مستخدمين
                                        </td>
                                    </tr>
                                ) : (
                                    filteredUsers.map(user => (
                                        <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                                                        {user.name?.charAt(0) || '?'}
                                                    </div>
                                                    <div>
                                                        <div className="font-medium text-gray-900 dark:text-white">{user.name || 'غير محدد'}</div>
                                                        <div className="text-sm text-gray-500 flex items-center gap-1">
                                                            <EnvelopeIcon className="w-3 h-3" />
                                                            {user.email}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                                                {getDepartmentName(user.department_id) || user.department || '-'}
                                            </td>
                                            <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                                                {getJobTitleName(user.job_title_id) || user.title || '-'}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex flex-wrap gap-1">
                                                    {user.roles && user.roles.length > 0 ? (
                                                        user.roles.map((role, i) => (
                                                            <span key={i} className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full">
                                                                {role}
                                                            </span>
                                                        ))
                                                    ) : (
                                                        <span className="text-gray-400 text-sm">-</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <button
                                                    onClick={() => handleToggleActive(user)}
                                                    className={`px-3 py-1 text-xs font-medium rounded-full ${user.is_active
                                                        ? 'bg-green-100 text-green-700'
                                                        : 'bg-red-100 text-red-700'
                                                        }`}
                                                >
                                                    {user.is_active ? 'نشط' : 'معطل'}
                                                </button>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center justify-center gap-1">
                                                    <button
                                                        onClick={() => handleOpenModal(user)}
                                                        className="p-1.5 text-blue-600 hover:bg-blue-100 rounded"
                                                    >
                                                        <PencilIcon className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(user.id)}
                                                        className="p-1.5 text-red-600 hover:bg-red-100 rounded"
                                                    >
                                                        <TrashIcon className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </>
            )}

            {/* Departments Tab */}
            {activeTab === 'departments' && (
                <>
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <BuildingOfficeIcon className="w-6 h-6 text-primary-600" />
                            إدارة الأقسام
                        </h2>
                        <button
                            onClick={() => handleOpenDeptModal()}
                            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                        >
                            <PlusIcon className="w-5 h-5" />
                            إضافة قسم
                        </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {departments.map(dept => (
                            <div key={dept.id} className="bg-gray-50 dark:bg-gray-700/30 rounded-xl p-4 flex items-center justify-between">
                                <div>
                                    <div className="font-medium text-gray-900 dark:text-white">{dept.name}</div>
                                    <div className="text-sm text-gray-500">{dept.name_en || dept.code || ''}</div>
                                </div>
                                <div className="flex gap-1">
                                    <button
                                        onClick={() => handleOpenDeptModal(dept)}
                                        className="p-1.5 text-blue-600 hover:bg-blue-100 rounded"
                                    >
                                        <PencilIcon className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => handleDeleteDept(dept.id)}
                                        className="p-1.5 text-red-600 hover:bg-red-100 rounded"
                                    >
                                        <TrashIcon className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}

            {/* Job Titles Tab */}
            {activeTab === 'jobtitles' && (
                <>
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <Cog6ToothIcon className="w-6 h-6 text-primary-600" />
                            إدارة المسميات الوظيفية
                        </h2>
                        <button
                            onClick={() => handleOpenJobTitleModal()}
                            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                        >
                            <PlusIcon className="w-5 h-5" />
                            إضافة مسمى وظيفي
                        </button>
                    </div>

                    {/* Group job titles by department */}
                    <div className="space-y-6">
                        {departments.map(dept => {
                            const deptJobTitles = jobTitles.filter(jt => jt.department_id === dept.id);
                            if (deptJobTitles.length === 0) return null;

                            return (
                                <div key={dept.id} className="bg-gray-50 dark:bg-gray-700/30 rounded-xl p-4">
                                    <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                        <BuildingOfficeIcon className="w-5 h-5 text-primary-600" />
                                        {dept.name}
                                        <span className="text-sm font-normal text-gray-500">({deptJobTitles.length})</span>
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                        {deptJobTitles.map(jt => (
                                            <div key={jt.id} className="bg-white dark:bg-gray-800 rounded-lg p-3 flex items-center justify-between border border-gray-200 dark:border-gray-600">
                                                <div>
                                                    <div className="font-medium text-gray-900 dark:text-white">{jt.name}</div>
                                                    {jt.name_en && <div className="text-xs text-gray-500">{jt.name_en}</div>}
                                                </div>
                                                <div className="flex gap-1">
                                                    <button
                                                        onClick={() => handleOpenJobTitleModal(jt)}
                                                        className="p-1.5 text-blue-600 hover:bg-blue-100 rounded"
                                                    >
                                                        <PencilIcon className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteJobTitle(jt.id)}
                                                        className="p-1.5 text-red-600 hover:bg-red-100 rounded"
                                                    >
                                                        <TrashIcon className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}

                        {/* Job titles without department */}
                        {jobTitles.filter(jt => !jt.department_id).length > 0 && (
                            <div className="bg-gray-50 dark:bg-gray-700/30 rounded-xl p-4">
                                <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                    <Cog6ToothIcon className="w-5 h-5 text-gray-500" />
                                    عام (كل الأقسام)
                                    <span className="text-sm font-normal text-gray-500">
                                        ({jobTitles.filter(jt => !jt.department_id).length})
                                    </span>
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {jobTitles.filter(jt => !jt.department_id).map(jt => (
                                        <div key={jt.id} className="bg-white dark:bg-gray-800 rounded-lg p-3 flex items-center justify-between border border-gray-200 dark:border-gray-600">
                                            <div>
                                                <div className="font-medium text-gray-900 dark:text-white">{jt.name}</div>
                                                {jt.name_en && <div className="text-xs text-gray-500">{jt.name_en}</div>}
                                            </div>
                                            <div className="flex gap-1">
                                                <button
                                                    onClick={() => handleOpenJobTitleModal(jt)}
                                                    className="p-1.5 text-blue-600 hover:bg-blue-100 rounded"
                                                >
                                                    <PencilIcon className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteJobTitle(jt.id)}
                                                    className="p-1.5 text-red-600 hover:bg-red-100 rounded"
                                                >
                                                    <TrashIcon className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {jobTitles.length === 0 && (
                            <div className="text-center py-8 text-gray-500">
                                لا توجد مسميات وظيفية. أضف مسميات جديدة أو شغّل سكربت SQL.
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* User Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-lg">
                        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                            <h3 className="text-lg font-bold">
                                {editingUser ? 'تعديل مستخدم' : 'إضافة مستخدم جديد'}
                            </h3>
                            <button onClick={() => setShowModal(false)}>
                                <XMarkIcon className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="p-4 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">الاسم *</label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">البريد الإلكتروني *</label>
                                    <input
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                                        disabled={!!editingUser}
                                    />
                                </div>
                                {!editingUser && (
                                    <div>
                                        <label className="block text-sm font-medium mb-1">كلمة المرور *</label>
                                        <input
                                            type="password"
                                            value={formData.password}
                                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                            className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                                            placeholder="*******"
                                        />
                                    </div>
                                )}
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">الهاتف</label>
                                <input
                                    type="tel"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">القسم</label>
                                    <select
                                        value={formData.department_id}
                                        onChange={(e) => setFormData({ ...formData, department_id: e.target.value, job_title_id: '' })}
                                        className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                                    >
                                        <option value="">-- اختر القسم --</option>
                                        {departments.map(dept => (
                                            <option key={dept.id} value={dept.id}>{dept.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">المسمى الوظيفي</label>
                                    <select
                                        value={formData.job_title_id}
                                        onChange={(e) => setFormData({ ...formData, job_title_id: e.target.value })}
                                        className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                                    >
                                        <option value="">-- اختر المسمى --</option>
                                        {getJobTitlesForDepartment(formData.department_id).map(jt => (
                                            <option key={jt.id} value={jt.id}>{jt.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">الأدوار</label>
                                <div className="flex flex-wrap gap-2">
                                    {roles.map(role => {
                                        const roleName = role.name_ar || role.name;
                                        const isSelected = formData.roleIds.includes(role.id);
                                        return (
                                            <button
                                                key={role.id}
                                                type="button"
                                                onClick={() => {
                                                    if (isSelected) {
                                                        setFormData({
                                                            ...formData,
                                                            roles: formData.roles.filter(r => r !== roleName),
                                                            roleIds: formData.roleIds.filter(id => id !== role.id)
                                                        });
                                                    } else {
                                                        setFormData({
                                                            ...formData,
                                                            roles: [...formData.roles, roleName],
                                                            roleIds: [...formData.roleIds, role.id]
                                                        });
                                                    }
                                                }}
                                                className={`px-3 py-1.5 rounded-lg text-sm ${isSelected
                                                    ? 'bg-primary-600 text-white'
                                                    : 'bg-gray-100 dark:bg-gray-700'
                                                    }`}
                                            >
                                                {roleName}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="is_active"
                                    checked={formData.is_active}
                                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                                    className="w-4 h-4 text-primary-600 rounded"
                                />
                                <label htmlFor="is_active" className="text-sm">مستخدم نشط</label>
                            </div>
                        </div>
                        <div className="flex gap-3 p-4 border-t border-gray-200 dark:border-gray-700">
                            <button
                                onClick={handleSubmit}
                                className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center justify-center gap-2"
                            >
                                <CheckIcon className="w-5 h-5" />
                                حفظ
                            </button>
                            <button
                                onClick={() => setShowModal(false)}
                                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg"
                            >
                                إلغاء
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Department Modal */}
            {showDeptModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-md">
                        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                            <h3 className="text-lg font-bold">
                                {editingDept ? 'تعديل قسم' : 'إضافة قسم جديد'}
                            </h3>
                            <button onClick={() => setShowDeptModal(false)}>
                                <XMarkIcon className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="p-4 space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">اسم القسم (عربي) *</label>
                                <input
                                    type="text"
                                    value={deptForm.name}
                                    onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">اسم القسم (إنجليزي)</label>
                                <input
                                    type="text"
                                    value={deptForm.name_en}
                                    onChange={(e) => setDeptForm({ ...deptForm, name_en: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">الرمز</label>
                                <input
                                    type="text"
                                    value={deptForm.code}
                                    onChange={(e) => setDeptForm({ ...deptForm, code: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                                    placeholder="QA"
                                />
                            </div>
                        </div>
                        <div className="flex gap-3 p-4 border-t border-gray-200 dark:border-gray-700">
                            <button onClick={handleSaveDept} className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg">
                                حفظ
                            </button>
                            <button onClick={() => setShowDeptModal(false)} className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg">
                                إلغاء
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Job Title Modal */}
            {showJobTitleModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-md">
                        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                            <h3 className="text-lg font-bold">
                                {editingJobTitle ? 'تعديل مسمى وظيفي' : 'إضافة مسمى وظيفي جديد'}
                            </h3>
                            <button onClick={() => setShowJobTitleModal(false)}>
                                <XMarkIcon className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="p-4 space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">المسمى الوظيفي (عربي) *</label>
                                <input
                                    type="text"
                                    value={jobTitleForm.name}
                                    onChange={(e) => setJobTitleForm({ ...jobTitleForm, name: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">المسمى الوظيفي (إنجليزي)</label>
                                <input
                                    type="text"
                                    value={jobTitleForm.name_en}
                                    onChange={(e) => setJobTitleForm({ ...jobTitleForm, name_en: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">القسم</label>
                                <select
                                    value={jobTitleForm.department_id}
                                    onChange={(e) => setJobTitleForm({ ...jobTitleForm, department_id: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                                >
                                    <option value="">-- عام (كل الأقسام) --</option>
                                    {departments.map(dept => (
                                        <option key={dept.id} value={dept.id}>{dept.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="flex gap-3 p-4 border-t border-gray-200 dark:border-gray-700">
                            <button onClick={handleSaveJobTitle} className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg">
                                حفظ
                            </button>
                            <button onClick={() => setShowJobTitleModal(false)} className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg">
                                إلغاء
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UsersSettings;
