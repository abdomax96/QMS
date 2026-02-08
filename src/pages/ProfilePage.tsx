/**
 * User Profile Page
 * Display and edit user profile information based on logged-in email
 * Includes profile picture upload to Supabase Storage
 */

import React, { useState, useEffect, useRef } from 'react';
import {
    UserCircleIcon,
    EnvelopeIcon,
    BuildingOfficeIcon,
    ShieldCheckIcon,
    PencilIcon,
    CameraIcon,
    CheckIcon,
    XMarkIcon,
    PhoneIcon,
    BriefcaseIcon,
    PhotoIcon,
    TrashIcon
} from '@heroicons/react/24/outline';
import { useSupabaseAuth } from '../hooks/useSupabaseAuth';
import { supabase } from '../config/supabase';
import { FullPageLoading, StatsCardsSkeleton, SkeletonBase, InlineLoading } from '../components/common/LoadingStates';

const ProfilePage: React.FC = () => {
    const { profile, loading: authLoading, updateProfileLocal } = useSupabaseAuth();
    const [isEditing, setIsEditing] = useState(false);
    const [editData, setEditData] = useState<{
        name: string;
        phone: string;
        department_id: string; // Changed from department to department_id
        role_id: string;
    }>({
        name: '',
        phone: '',
        department_id: '',
        role_id: ''
    });
    const [isSaving, setIsSaving] = useState(false);
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    // Profile picture state
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
    const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Departments and roles for dropdowns
    const [departments, setDepartments] = useState<{ id: string; name: string; name_ar: string }[]>([]);
    const [roles, setRoles] = useState<{ id: string; name: string; name_ar: string; color: string; code?: string }[]>([]);

    // User statistics state
    const [taskStats, setTaskStats] = useState<{
        total: number;
        completed: number;
        pending: number;
        completionRate: number;
        isLoading: boolean;
    }>({
        total: 0,
        completed: 0,
        pending: 0,
        completionRate: 0,
        isLoading: true
    });

    // Initialize edit data and avatar when profile loads
    useEffect(() => {
        if (profile) {
            setEditData({
                name: profile.name || '',
                phone: profile.phone || '',
                department_id: profile.department_id || '',
                role_id: profile.roles?.[0] || ''
            });
            // Load avatar URL from profile
            if (profile.avatar_url) {
                setAvatarUrl(profile.avatar_url);
            }
        }
    }, [profile]);

    // Fetch departments and roles for dropdowns
    useEffect(() => {
        const fetchDropdownData = async () => {
            try {
                // Fetch departments
                const { data: deptData } = await supabase
                    .from('departments')
                    .select('id, name, name_ar')
                    .eq('is_active', true)
                    .order('name_ar');
                setDepartments(deptData || []);

                // Fetch roles
                const { data: rolesData } = await supabase
                    .from('roles')
                    .select('id, name, name_ar, color, code')
                    .eq('is_active', true)
                    .order('priority');
                setRoles(rolesData || []);
            } catch (error) {
                console.error('Error fetching dropdown data:', error);
            }
        };

        fetchDropdownData();
    }, []);

    // Fetch user task statistics
    useEffect(() => {
        const fetchStats = async () => {
            if (!profile?.uid) return;

            try {
                // Import the service dynamically to avoid circular dependencies if any, 
                // but standard import is fine. Using standard import at top of file is better 
                // but for this replacement chunk I will assume I need to add the import or use the service.
                // Assuming I will add the import in a separate chunk or if I can use it here.
                // Wait, I need to add the import first. I'll use the existing supabase client if possible 
                // or just import the service function. 

                // Let's use the service we saw earlier: getUserTaskStats
                const { getUserTaskStats } = await import('../services/taskService');

                const stats = await getUserTaskStats(profile.uid);

                if (stats && stats.length > 0) {
                    const userStat = stats[0];
                    setTaskStats({
                        total: userStat.total_tasks,
                        completed: userStat.completed_tasks,
                        pending: userStat.pending_tasks + userStat.in_progress_tasks,
                        completionRate: userStat.completion_rate,
                        isLoading: false
                    });
                } else {
                    // Fallback if no stats found (user has no tasks)
                    setTaskStats({
                        total: 0,
                        completed: 0,
                        pending: 0,
                        completionRate: 0,
                        isLoading: false
                    });
                }
            } catch (error) {
                console.error('Error fetching user stats:', error);
                setTaskStats(prev => ({ ...prev, isLoading: false }));
            }
        };

        fetchStats();
    }, [profile?.uid]);

    const handleSave = async () => {
        if (!profile?.uid) return;

        setIsSaving(true);
        setFeedback(null);

        try {
            // Update user data in Supabase
            const { error } = await supabase
                .from('users')
                .update({
                    name: editData.name,
                    phone: editData.phone,
                    department_id: editData.department_id || null,
                    updated_at: new Date().toISOString()
                })
                .eq('id', profile.uid);

            if (error) throw error;

            // Note: Role changes are managed by admins in Access Management, not here

            // Update profile locally for immediate UI update
            const selectedDept = departments.find(d => d.id === editData.department_id);
            updateProfileLocal({
                name: editData.name,
                phone: editData.phone,
                department: selectedDept?.name_ar || selectedDept?.name || '',
                department_id: editData.department_id
            });

            setFeedback({ type: 'success', message: 'تم حفظ التغييرات بنجاح' });
            setIsEditing(false);

            // Clear feedback after 3 seconds
            setTimeout(() => setFeedback(null), 3000);
        } catch (error: any) {
            console.error('Error saving profile:', error);
            setFeedback({ type: 'error', message: error.message || 'حدث خطأ أثناء الحفظ' });
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancel = () => {
        // Reset to original values
        if (profile) {
            setEditData({
                name: profile.name || '',
                phone: profile.phone || '',
                department_id: profile.department_id || '',
                role_id: profile.roles?.[0] || ''
            });
        }
        setIsEditing(false);
    };

    // Handle avatar upload
    const handleAvatarClick = () => {
        fileInputRef.current?.click();
    };

    const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !profile?.uid) return;

        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            setFeedback({ type: 'error', message: 'يجب اختيار صورة بصيغة JPG, PNG, GIF أو WebP' });
            return;
        }

        // Validate file size (max 5MB)
        const maxSize = 5 * 1024 * 1024; // 5MB
        if (file.size > maxSize) {
            setFeedback({ type: 'error', message: 'حجم الصورة يجب أن يكون أقل من 5 ميجابايت' });
            return;
        }

        setIsUploadingAvatar(true);
        setFeedback(null);

        try {
            // Generate unique file name
            const fileExt = file.name.split('.').pop();
            const fileName = `${profile.uid}-${Date.now()}.${fileExt}`;
            const filePath = `avatars/${fileName}`;

            // Delete old avatar if exists
            if (avatarUrl) {
                const oldPath = avatarUrl.split('/').slice(-2).join('/');
                await supabase.storage.from('profiles').remove([oldPath]);
            }

            // Upload new avatar to Supabase Storage
            const { error: uploadError } = await supabase.storage
                .from('profiles')
                .upload(filePath, file, {
                    cacheControl: '3600',
                    upsert: true
                });

            if (uploadError) throw uploadError;

            // Get public URL
            const { data: urlData } = supabase.storage
                .from('profiles')
                .getPublicUrl(filePath);

            const newAvatarUrl = urlData.publicUrl;

            // Update user record with new avatar URL
            const { error: updateError } = await supabase
                .from('users')
                .update({
                    avatar_url: newAvatarUrl,
                    updated_at: new Date().toISOString()
                })
                .eq('id', profile.uid);

            if (updateError) throw updateError;

            // Update local state
            setAvatarUrl(newAvatarUrl);
            // Update profile locally for immediate header update
            updateProfileLocal({ avatar_url: newAvatarUrl });
            setFeedback({ type: 'success', message: 'تم تحديث صورة البروفايل بنجاح' });

            // Clear feedback after 3 seconds
            setTimeout(() => setFeedback(null), 3000);
        } catch (error: any) {
            console.error('Error uploading avatar:', error);
            setFeedback({ type: 'error', message: error.message || 'حدث خطأ أثناء رفع الصورة' });
        } finally {
            setIsUploadingAvatar(false);
            // Reset file input
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    // Handle avatar removal
    const handleRemoveAvatar = async () => {
        if (!profile?.uid || !avatarUrl) return;

        const confirmed = window.confirm('هل أنت متأكد من حذف صورة البروفايل؟');
        if (!confirmed) return;

        setIsUploadingAvatar(true);
        setFeedback(null);

        try {
            // Extract file path from URL
            const urlParts = avatarUrl.split('/');
            const filePath = `avatars/${urlParts[urlParts.length - 1]}`;

            // Delete from storage
            const { error: deleteError } = await supabase.storage
                .from('profiles')
                .remove([filePath]);

            if (deleteError) {
                console.warn('Error deleting file from storage:', deleteError);
                // Continue anyway to remove URL from database
            }

            // Update user record to remove avatar URL
            const { error: updateError } = await supabase
                .from('users')
                .update({
                    avatar_url: null,
                    updated_at: new Date().toISOString()
                })
                .eq('id', profile.uid);

            if (updateError) throw updateError;

            // Update local state
            setAvatarUrl(null);
            // Update profile locally for immediate header update
            updateProfileLocal({ avatar_url: undefined });
            setFeedback({ type: 'success', message: 'تم حذف صورة البروفايل' });

            // Clear feedback after 3 seconds
            setTimeout(() => setFeedback(null), 3000);
        } catch (error: any) {
            console.error('Error removing avatar:', error);
            setFeedback({ type: 'error', message: error.message || 'حدث خطأ أثناء حذف الصورة' });
        } finally {
            setIsUploadingAvatar(false);
        }
    };

    // Loading state
    if (authLoading) {
        if (authLoading) {
            return <FullPageLoading />;
        }
    }

    // Not logged in
    if (!profile) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <p className="text-gray-600 dark:text-gray-400">يجب تسجيل الدخول لعرض الملف الشخصي</p>
                </div>
            </div>
        );
    }

    const userInitials = (profile.name || 'مستخدم')
        .split(' ')
        .map((n: string) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);

    const roleLabels: Record<string, string> = {
        admin: 'مدير النظام',
        manager: 'مشرف',
        quality: 'مسؤول الجودة',
        employee: 'موظف',
        viewer: 'مشاهد'
    };

    // Get the first role for display
    const primaryRole = profile.roles?.[0] || 'employee';

    // Helper to get department name by ID
    const getDepartmentName = () => {
        if (profile.department_id) {
            const dept = departments.find(d => d.id === profile.department_id);
            if (dept) return dept.name_ar || dept.name;
        }
        return profile.department || 'غير محدد';
    };

    // Helper to get role name by code (profile.roles now contains role codes from RPC)
    const getRoleName = () => {
        if (primaryRole) {
            // First try to match by code (new RPC returns codes)
            const roleByCode = roles.find(r => r.code === primaryRole);
            if (roleByCode) return roleByCode.name_ar || roleByCode.name;

            // Fallback: try to match by id (for backward compatibility)
            const roleById = roles.find(r => r.id === primaryRole);
            if (roleById) return roleById.name_ar || roleById.name;
        }
        return roleLabels[primaryRole] || 'غير محدد';
    };

    return (
        <div className="p-6 max-w-4xl mx-auto">
            {/* Hidden file input for avatar upload */}
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleAvatarChange}
                accept="image/jpeg,image/png,image/gif,image/webp"
                className="hidden"
            />

            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">الملف الشخصي</h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">إدارة معلوماتك الشخصية</p>
            </div>

            {/* Feedback Message */}
            {feedback && (
                <div className={`mb-6 p-4 rounded-lg ${feedback.type === 'success'
                    ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800'
                    : 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
                    }`}>
                    {feedback.message}
                </div>
            )}

            {/* Profile Card */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                {/* Banner */}
                <div className="h-32 bg-gradient-to-r from-primary-500 via-purple-500 to-pink-500"></div>

                {/* Profile Info */}
                <div className="px-6 pb-6">
                    {/* Avatar */}
                    <div className="relative -mt-16 mb-4 w-fit">
                        <div className="w-32 h-32 rounded-full border-4 border-white dark:border-gray-800 bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center text-white text-4xl font-bold shadow-lg overflow-hidden">
                            {isUploadingAvatar ? (
                                <div className="w-full h-full flex items-center justify-center bg-gray-800/50">
                                    <SkeletonBase className="w-8 h-8 rounded-full" />
                                </div>
                            ) : avatarUrl ? (
                                <img
                                    src={avatarUrl}
                                    alt={profile.name || 'Avatar'}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                        // If image fails to load, show initials
                                        (e.target as HTMLImageElement).style.display = 'none';
                                    }}
                                />
                            ) : (
                                userInitials
                            )}
                        </div>

                        {/* Avatar Action Buttons */}
                        <div className="absolute bottom-0 right-0 flex gap-1">
                            {/* Upload Button */}
                            <button
                                onClick={handleAvatarClick}
                                disabled={isUploadingAvatar}
                                className="p-2 bg-white dark:bg-gray-700 rounded-full shadow-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
                                title="تغيير الصورة"
                            >
                                {avatarUrl ? (
                                    <PencilIcon className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                                ) : (
                                    <CameraIcon className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                                )}
                            </button>

                            {/* Remove Button (only show if avatar exists) */}
                            {avatarUrl && !isUploadingAvatar && (
                                <button
                                    onClick={handleRemoveAvatar}
                                    className="p-2 bg-red-500 hover:bg-red-600 rounded-full shadow-lg transition-colors"
                                    title="حذف الصورة"
                                >
                                    <TrashIcon className="w-4 h-4 text-white" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Avatar Upload Hint */}
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                        <PhotoIcon className="w-4 h-4 inline-block ml-1" />
                        اضغط على أيقونة الكاميرا لتحديث صورة البروفايل (JPG, PNG, GIF - حد أقصى 5MB)
                    </p>

                    {/* Name & Role */}
                    <div className="flex items-start justify-between mb-6">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                                {profile.name || 'مستخدم'}
                            </h2>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="inline-flex items-center gap-1 px-3 py-1 bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 rounded-full text-sm font-medium">
                                    <ShieldCheckIcon className="w-4 h-4" />
                                    {getRoleName()}
                                </span>
                                <span className="text-gray-500 dark:text-gray-400 text-sm">
                                    {getDepartmentName()}
                                </span>
                            </div>
                        </div>
                        <button
                            onClick={() => setIsEditing(!isEditing)}
                            className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                        >
                            <PencilIcon className="w-4 h-4" />
                            تعديل
                        </button>
                    </div>

                    {/* Info Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Name */}
                        <div className="space-y-2">
                            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                                <UserCircleIcon className="w-4 h-4" />
                                الاسم الكامل
                            </label>
                            {isEditing ? (
                                <input
                                    type="text"
                                    value={editData.name}
                                    onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                                />
                            ) : (
                                <p className="text-gray-900 dark:text-white px-4 py-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                    {profile.name || 'غير محدد'}
                                </p>
                            )}
                        </div>

                        {/* Email (read-only) */}
                        <div className="space-y-2">
                            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                                <EnvelopeIcon className="w-4 h-4" />
                                البريد الإلكتروني
                            </label>
                            <p className="text-gray-900 dark:text-white px-4 py-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg" dir="ltr">
                                {profile.email || 'غير محدد'}
                            </p>
                            {isEditing && (
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    البريد الإلكتروني غير قابل للتغيير
                                </p>
                            )}
                        </div>

                        {/* Department (read-only - managed by admins) */}
                        <div className="space-y-2">
                            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                                <BuildingOfficeIcon className="w-4 h-4" />
                                القسم
                            </label>
                            <p className="text-gray-900 dark:text-white px-4 py-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                {getDepartmentName()}
                            </p>
                            {isEditing && (
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    يتم تغيير القسم من قبل المديرين فقط في "إدارة الوصول"
                                </p>
                            )}
                        </div>

                        {/* Role (read-only - managed by admins) */}
                        <div className="space-y-2">
                            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                                <ShieldCheckIcon className="w-4 h-4" />
                                الدور
                            </label>
                            <p className="text-gray-900 dark:text-white px-4 py-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                {getRoleName()}
                            </p>
                            {isEditing && (
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    يتم تغيير الدور من قبل المديرين فقط في "إدارة الوصول"
                                </p>
                            )}
                        </div>

                        {/* Phone */}
                        <div className="space-y-2">
                            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                                <PhoneIcon className="w-4 h-4" />
                                رقم الهاتف
                            </label>
                            {isEditing ? (
                                <input
                                    type="tel"
                                    value={editData.phone}
                                    onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                                    dir="ltr"
                                    placeholder="+966 5XX XXX XXXX"
                                />
                            ) : (
                                <p className="text-gray-900 dark:text-white px-4 py-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg" dir="ltr">
                                    {profile.phone || 'غير محدد'}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Edit Actions */}
                    {isEditing && (
                        <div className="flex items-center justify-end gap-3 mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                            <button
                                onClick={handleCancel}
                                className="flex items-center gap-2 px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                            >
                                <XMarkIcon className="w-4 h-4" />
                                إلغاء
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={isSaving}
                                className="flex items-center gap-2 px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
                            >
                                {isSaving ? (
                                    <InlineLoading text="جاري الحفظ..." className="text-white" />
                                ) : (
                                    <>
                                        <CheckIcon className="w-4 h-4" />
                                        حفظ التغييرات
                                    </>
                                )}
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Stats */}
            {taskStats.isLoading ? (
                <div className="mt-6">
                    <StatsCardsSkeleton />
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 text-center">
                        <div className="text-2xl font-bold text-primary-600">{taskStats.total}</div>
                        <div className="text-sm text-gray-500">إجمالي المهام</div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 text-center">
                        <div className="text-2xl font-bold text-green-600">{taskStats.completed}</div>
                        <div className="text-sm text-gray-500">مهام مكتملة</div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 text-center">
                        <div className="text-2xl font-bold text-yellow-600">{taskStats.pending}</div>
                        <div className="text-sm text-gray-500">قيد التنفيذ</div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 text-center">
                        <div className="text-2xl font-bold text-purple-600">%{taskStats.completionRate}</div>
                        <div className="text-sm text-gray-500">نسبة الإنجاز</div>
                    </div>
                </div>
            )}
        </div>
    );
};


export default ProfilePage;
