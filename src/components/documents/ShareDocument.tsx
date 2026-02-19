/**
 * Share Document Component
 * مكون مشاركة التقارير والنماذج مع الأقسام أو الأفراد
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
    ShareIcon,
    XMarkIcon,
    CheckIcon,
    BuildingOfficeIcon,
    UserIcon,
    ArrowPathIcon,
    TrashIcon,
    MagnifyingGlassIcon,
    ClockIcon,
    InformationCircleIcon,
} from '@heroicons/react/24/outline';
import { FormSkeleton, InlineLoading } from '../common/LoadingStates';
import { supabase } from '../../config/supabase';

// ==================== Types ====================
interface Department {
    id: string;
    name: string;
    name_ar?: string;
    code: string;
    color?: string;
}

interface User {
    id: string;
    name: string;
    email: string;
    department_id?: string;
}

interface DocumentShare {
    id: string;
    document_type: string;
    document_id: string;
    shared_by: string;
    shared_by_department_id?: string;
    shared_with_department_id?: string;
    shared_with_user_id?: string;
    permission_level: 'view' | 'edit' | 'full';
    expires_at?: string;
    note?: string;
    is_active: boolean;
    created_at: string;
    // Joined data
    department?: Department;
    user?: User;
}

interface ShareDocumentProps {
    documentId: string;
    documentType: 'form' | 'report' | 'folder';
    documentTitle: string;
    currentUserId: string;
    currentDepartmentId?: string;
    onClose: () => void;
    onShare?: (share: DocumentShare) => void;
}

// ==================== Permission Labels ====================
const PermissionLabels = {
    view: { en: 'View Only', ar: 'عرض فقط', color: '#6B7280' },
    edit: { en: 'Can Edit', ar: 'تعديل', color: '#3B82F6' },
    full: { en: 'Full Access', ar: 'وصول كامل', color: '#10B981' },
};

// ==================== Main Component ====================
const ShareDocument: React.FC<ShareDocumentProps> = ({
    documentId,
    documentType,
    documentTitle,
    currentUserId,
    currentDepartmentId,
    onClose,
    onShare,
}) => {
    const [departments, setDepartments] = useState<Department[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [existingShares, setExistingShares] = useState<DocumentShare[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Form state
    const [shareType, setShareType] = useState<'department' | 'user'>('department');
    const [selectedDeptId, setSelectedDeptId] = useState('');
    const [selectedUserId, setSelectedUserId] = useState('');
    const [permissionLevel, setPermissionLevel] = useState<'view' | 'edit' | 'full'>('view');
    const [expiresAt, setExpiresAt] = useState('');
    const [note, setNote] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    // Load data
    useEffect(() => {
        loadData();
    }, [documentId]);

    const loadData = async () => {
        setLoading(true);
        try {
            // Load departments
            const { data: depts } = await supabase
                .from('departments')
                .select('id, name, name_ar, code, color')
                .eq('active', true)
                .order('name');
            setDepartments(depts || []);

            // Load users
            const { data: usersData } = await supabase
                .from('users')
                .select('id, name, email, department_id')
                .eq('is_active', true)
                .order('name');
            setUsers(usersData || []);

            // Load existing shares
            const { data: shares } = await supabase
                .from('document_shares')
                .select('id, document_type, document_id, shared_by, shared_by_department_id, shared_with_department_id, shared_with_user_id, permission_level, expires_at, note, is_active, created_at')
                .eq('document_id', documentId)
                .eq('document_type', documentType)
                .eq('is_active', true);

            // Enrich with department/user data
            const enrichedShares = (shares || []).map(share => ({
                ...share,
                department: depts?.find(d => d.id === share.shared_with_department_id),
                user: usersData?.find(u => u.id === share.shared_with_user_id),
            }));
            setExistingShares(enrichedShares);
        } catch (err) {
            console.error('Error loading data:', err);
        }
        setLoading(false);
    };

    // Filter items based on search
    const filteredDepts = useMemo(() => {
        if (!searchQuery) return departments;
        const q = searchQuery.toLowerCase();
        return departments.filter(d =>
            d.name.toLowerCase().includes(q) ||
            d.name_ar?.includes(searchQuery) ||
            d.code.toLowerCase().includes(q)
        );
    }, [departments, searchQuery]);

    const filteredUsers = useMemo(() => {
        if (!searchQuery) return users;
        const q = searchQuery.toLowerCase();
        return users.filter(u =>
            u.name.toLowerCase().includes(q) ||
            u.email.toLowerCase().includes(q)
        );
    }, [users, searchQuery]);

    // Handle share
    const handleShare = async () => {
        if (shareType === 'department' && !selectedDeptId) {
            alert('الرجاء اختيار قسم');
            return;
        }
        if (shareType === 'user' && !selectedUserId) {
            alert('الرجاء اختيار مستخدم');
            return;
        }

        // Check if already shared
        const alreadyShared = existingShares.some(s =>
            (shareType === 'department' && s.shared_with_department_id === selectedDeptId) ||
            (shareType === 'user' && s.shared_with_user_id === selectedUserId)
        );
        if (alreadyShared) {
            alert('تم مشاركة هذا المستند مع هذا القسم/المستخدم مسبقاً');
            return;
        }

        setSaving(true);
        try {
            const shareData = {
                document_type: documentType,
                document_id: documentId,
                shared_by: currentUserId,
                shared_by_department_id: currentDepartmentId,
                shared_with_department_id: shareType === 'department' ? selectedDeptId : null,
                shared_with_user_id: shareType === 'user' ? selectedUserId : null,
                permission_level: permissionLevel,
                expires_at: expiresAt || null,
                note: note || null,
                is_active: true,
            };

            const { data, error } = await supabase
                .from('document_shares')
                .insert(shareData)
                .select()
                .single();

            if (error) throw error;

            // Reset form
            setSelectedDeptId('');
            setSelectedUserId('');
            setNote('');
            setExpiresAt('');
            setPermissionLevel('view');

            // Reload shares
            await loadData();

            if (onShare && data) {
                onShare(data);
            }
        } catch (err) {
            console.error('Error sharing:', err);
            alert('حدث خطأ أثناء المشاركة');
        }
        setSaving(false);
    };

    // Remove share
    const removeShare = async (shareId: string) => {
        if (!confirm('هل تريد إلغاء هذه المشاركة؟')) return;

        try {
            await supabase
                .from('document_shares')
                .update({ is_active: false })
                .eq('id', shareId);
            await loadData();
        } catch (err) {
            console.error('Error removing share:', err);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
            <div
                className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden"
                onClick={e => e.stopPropagation()}
                dir="rtl"
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-l from-primary-50 to-white dark:from-gray-800 dark:to-gray-900">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-900/50 flex items-center justify-center">
                            <ShareIcon className="w-5 h-5 text-primary-600" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">مشاركة المستند</h3>
                            <p className="text-sm text-gray-500 truncate max-w-xs">{documentTitle}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                        <XMarkIcon className="w-5 h-5" />
                    </button>
                </div>

                {loading ? (
                    <FormSkeleton />
                ) : (
                    <div className="overflow-y-auto max-h-[calc(90vh-140px)]">
                        {/* Share Form */}
                        <div className="p-4 space-y-4">
                            {/* Share Type Toggle */}
                            <div className="flex items-center gap-2 p-1 bg-gray-100 dark:bg-gray-700 rounded-xl">
                                <button
                                    onClick={() => setShareType('department')}
                                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-colors ${shareType === 'department'
                                        ? 'bg-white dark:bg-gray-600 shadow text-primary-600'
                                        : 'text-gray-600 dark:text-gray-400'
                                        }`}
                                >
                                    <BuildingOfficeIcon className="w-4 h-4" />
                                    مشاركة مع قسم
                                </button>
                                <button
                                    onClick={() => setShareType('user')}
                                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-colors ${shareType === 'user'
                                        ? 'bg-white dark:bg-gray-600 shadow text-primary-600'
                                        : 'text-gray-600 dark:text-gray-400'
                                        }`}
                                >
                                    <UserIcon className="w-4 h-4" />
                                    مشاركة مع فرد
                                </button>
                            </div>

                            {/* Search */}
                            <div className="relative">
                                <MagnifyingGlassIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder={shareType === 'department' ? 'بحث عن قسم...' : 'بحث عن مستخدم...'}
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    className="w-full pr-10 pl-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                                />
                            </div>

                            {/* Selection List */}
                            <div className="border border-gray-200 dark:border-gray-700 rounded-xl max-h-48 overflow-y-auto">
                                {shareType === 'department' ? (
                                    <div className="divide-y divide-gray-100 dark:divide-gray-700">
                                        {filteredDepts.map(dept => (
                                            <label
                                                key={dept.id}
                                                className={`flex items-center gap-3 p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 ${selectedDeptId === dept.id ? 'bg-primary-50 dark:bg-primary-900/20' : ''
                                                    }`}
                                            >
                                                <input
                                                    type="radio"
                                                    name="department"
                                                    checked={selectedDeptId === dept.id}
                                                    onChange={() => setSelectedDeptId(dept.id)}
                                                    className="text-primary-600"
                                                />
                                                <div
                                                    className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm"
                                                    style={{ backgroundColor: dept.color || '#6B7280' }}
                                                >
                                                    {dept.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <div className="font-medium text-gray-900 dark:text-white">
                                                        {dept.name_ar || dept.name}
                                                    </div>
                                                    <div className="text-xs text-gray-500">{dept.code}</div>
                                                </div>
                                            </label>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="divide-y divide-gray-100 dark:divide-gray-700">
                                        {filteredUsers.map(user => (
                                            <label
                                                key={user.id}
                                                className={`flex items-center gap-3 p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 ${selectedUserId === user.id ? 'bg-primary-50 dark:bg-primary-900/20' : ''
                                                    }`}
                                            >
                                                <input
                                                    type="radio"
                                                    name="user"
                                                    checked={selectedUserId === user.id}
                                                    onChange={() => setSelectedUserId(user.id)}
                                                    className="text-primary-600"
                                                />
                                                <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                                                    <UserIcon className="w-4 h-4 text-gray-500" />
                                                </div>
                                                <div>
                                                    <div className="font-medium text-gray-900 dark:text-white">{user.name}</div>
                                                    <div className="text-xs text-gray-500">{user.email}</div>
                                                </div>
                                            </label>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Permission Level */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    مستوى الصلاحية
                                </label>
                                <div className="flex gap-2">
                                    {Object.entries(PermissionLabels).map(([key, label]) => (
                                        <button
                                            key={key}
                                            onClick={() => setPermissionLevel(key as 'view' | 'edit' | 'full')}
                                            className={`flex-1 px-3 py-2 text-sm rounded-lg border-2 transition-colors ${permissionLevel === key
                                                ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30 text-primary-700'
                                                : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'
                                                }`}
                                        >
                                            {label.ar}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Expiry Date */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    تاريخ انتهاء المشاركة (اختياري)
                                </label>
                                <input
                                    type="date"
                                    value={expiresAt}
                                    onChange={e => setExpiresAt(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                                />
                            </div>

                            {/* Note */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    ملاحظة (اختياري)
                                </label>
                                <textarea
                                    value={note}
                                    onChange={e => setNote(e.target.value)}
                                    placeholder="أضف ملاحظة للمشاركة..."
                                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 resize-none"
                                    rows={2}
                                />
                            </div>

                            {/* Share Button */}
                            <button
                                onClick={handleShare}
                                disabled={saving || (!selectedDeptId && !selectedUserId)}
                                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary-600 text-white rounded-xl hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {saving ? (
                                    <InlineLoading text="جاري المشاركة..." />
                                ) : (
                                    <ShareIcon className="w-5 h-5" />
                                )}
                                مشاركة
                            </button>
                        </div>

                        {/* Existing Shares */}
                        {existingShares.length > 0 && (
                            <div className="border-t border-gray-200 dark:border-gray-700 p-4">
                                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                                    <InformationCircleIcon className="w-4 h-4" />
                                    المشاركات الحالية ({existingShares.length})
                                </h4>
                                <div className="space-y-2">
                                    {existingShares.map(share => (
                                        <div
                                            key={share.id}
                                            className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl"
                                        >
                                            <div className="flex items-center gap-3">
                                                {share.shared_with_department_id ? (
                                                    <>
                                                        <div
                                                            className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm"
                                                            style={{ backgroundColor: share.department?.color || '#6B7280' }}
                                                        >
                                                            <BuildingOfficeIcon className="w-4 h-4" />
                                                        </div>
                                                        <div>
                                                            <div className="font-medium text-gray-900 dark:text-white text-sm">
                                                                {share.department?.name_ar || share.department?.name || 'قسم'}
                                                            </div>
                                                            <div className="text-xs text-gray-500">
                                                                {PermissionLabels[share.permission_level]?.ar}
                                                            </div>
                                                        </div>
                                                    </>
                                                ) : (
                                                    <>
                                                        <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center">
                                                            <UserIcon className="w-4 h-4 text-gray-500" />
                                                        </div>
                                                        <div>
                                                            <div className="font-medium text-gray-900 dark:text-white text-sm">
                                                                {share.user?.name || 'مستخدم'}
                                                            </div>
                                                            <div className="text-xs text-gray-500">
                                                                {PermissionLabels[share.permission_level]?.ar}
                                                            </div>
                                                        </div>
                                                    </>
                                                )}
                                                {share.expires_at && (
                                                    <span className="flex items-center gap-1 text-xs text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">
                                                        <ClockIcon className="w-3 h-3" />
                                                        {new Date(share.expires_at).toLocaleDateString('ar')}
                                                    </span>
                                                )}
                                            </div>
                                            <button
                                                onClick={() => removeShare(share.id)}
                                                className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"
                                                title="إلغاء المشاركة"
                                            >
                                                <TrashIcon className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ShareDocument;











