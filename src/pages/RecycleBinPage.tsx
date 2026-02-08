import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    TrashIcon,
    ArrowPathIcon,
    ArrowUturnLeftIcon,
    ExclamationTriangleIcon,
    CheckCircleIcon,
    FolderIcon,
    DocumentTextIcon,
    ClipboardDocumentCheckIcon
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import recycleBinService, { type RecycleBinItem } from '../services/recycleBinService';
import { foldersService, templatesService, instancesService } from '../services/supabaseService';
import { useToastStore } from '../store/toastStore';
import { cn } from '../utils';
import type { Folder } from '../types';

const RecycleBinPage: React.FC = () => {
    const navigate = useNavigate();
    const { addToast } = useToastStore();
    const [items, setItems] = useState<RecycleBinItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
    const [processing, setProcessing] = useState(false);

    const loadItems = async () => {
        setLoading(true);
        try {
            const data = await recycleBinService.getRecycleBinItems();
            setItems(data);
        } catch (error) {
            console.error('Failed to load recycle bin:', error);
            addToast({ message: 'فشل تحميل سلة المحذوفات', type: 'error', title: 'خطأ' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadItems();
    }, []);

    const handleSelect = (id: string) => {
        const newSelected = new Set(selectedItems);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedItems(newSelected);
    };

    const handleSelectAll = () => {
        if (selectedItems.size === items.length) {
            setSelectedItems(new Set());
        } else {
            setSelectedItems(new Set(items.map(i => i.id)));
        }
    };

    const restoreItem = async (item: RecycleBinItem) => {
        try {
            // Helper to try restoring to original parent, fallback to root if missing
            const safeRestoreFolder = async (folderData: Folder) => {
                try {
                    await foldersService.saveFolder(folderData);
                } catch (err: any) {
                    // If error is possibly due to missing parent (FK violation), try restoring to root
                    if (folderData.parent_id) {
                        console.warn(`Restore to parent ${folderData.parent_id} failed, trying root.`, err);
                        const rootFolder = { ...folderData, parent_id: null, path: `/${folderData.name}` };
                        await foldersService.saveFolder(rootFolder);
                        addToast({ message: `تم استرجاع "${folderData.name}" إلى القائمة الرئيسية (المجلد الأب غير موجود)`, type: 'warning', title: 'تنبيه' });
                    } else {
                        throw err;
                    }
                }
            };

            // 1. Remove from Bin
            const removed = await recycleBinService.removeFromRecycleBin(item.id);
            if (!removed) throw new Error('Failed to remove from recycle bin');

            // 2. Restore to original location
            // We use the 'data' payload to recreate the item
            if (item.type === 'folder') {
                if (item.data.folder && item.data.contents) {
                    // 2.a Restore bundled folder (recursive restore)
                    await safeRestoreFolder(item.data.folder);

                    const { folders, templates, instances } = item.data.contents;

                    // Restore children folders
                    for (const f of folders) {
                        await foldersService.saveFolder(f);
                    }

                    // Restore templates
                    for (const t of templates) {
                        await templatesService.saveTemplate(t);
                    }

                    // Restore instances
                    for (const i of instances) {
                        const template = { id: i.template_id } as any;
                        await instancesService.saveInstance(i, template);
                    }
                } else {
                    // Legacy restore (single folder)
                    await safeRestoreFolder(item.data);
                }
            } else if (item.type === 'template') {
                await templatesService.saveTemplate(item.data);
            } else if (item.type === 'instance') {
                // Determine which folder to put it in? It uses folder_id from data
                // Need to ensure the template exists? 
                // We just save it. If template missing, it might have issues, but that's complex.
                // Assuming template exists or we don't care.
                const template = { id: item.data.template_id } as any; // Minimal template obj needed?
                // saveInstance might require full template for logging?
                // Let's optimize: saveInstance upserts.
                await instancesService.saveInstance(item.data, template); // Template might be needed for validation
            }

            addToast({ message: `تم استرجاع "${item.name}" بنجاح`, type: 'success', title: 'تمت العملية' });
            return true;
        } catch (error) {
            console.error('Restore failed:', error);
            addToast({ message: `فشل استرجاع "${item.name}"`, type: 'error', title: 'خطأ' });
            return false;
        }
    };

    const deleteItemForever = async (item: RecycleBinItem) => {
        try {
            const removed = await recycleBinService.permanentlyDeleteItem(item);
            return !!removed;
        } catch (error) {
            console.error('Delete failed:', error);
            addToast({ message: `فشل الحذف النهائي لـ "${item.name}"`, type: 'error', title: 'خطأ' });
            return false;
        }
    };

    const handleRestoreSelected = async () => {
        if (selectedItems.size === 0) return;
        if (!window.confirm(`هل أنت متأكد من استرجاع ${selectedItems.size} عنصر؟`)) return;

        setProcessing(true);
        let successCount = 0;

        for (const id of selectedItems) {
            const item = items.find(i => i.id === id);
            if (item) {
                if (await restoreItem(item)) successCount++;
            }
        }

        setProcessing(false);
        setSelectedItems(new Set());
        loadItems();
    };

    const handleDeleteSelected = async () => {
        if (selectedItems.size === 0) return;
        if (!window.confirm(`تحذير: هذا الإجراء لا يمكن التراجع عنه!\n\nهل أنت متأكد من حذف ${selectedItems.size} عنصر نهائياً؟`)) return;

        setProcessing(true);
        for (const id of selectedItems) {
            const item = items.find(i => i.id === id);
            if (item) {
                await deleteItemForever(item);
            }
        }
        setProcessing(false);
        setSelectedItems(new Set());
        loadItems();
        addToast({ message: 'تم الحذف النهائي بنجاح', type: 'success', title: 'تمت العملية' });
    };

    const handleEmptyBin = async () => {
        if (!window.confirm('هل أنت متأكد من إفراغ سلة المحذوفات بالكامل؟ لا يمكن التراجع عن هذا الإجراء.')) return;

        setProcessing(true);
        let failed = 0;
        for (const item of items) {
            const ok = await deleteItemForever(item);
            if (!ok) failed++;
        }

        setProcessing(false);
        if (failed === 0) {
            setItems([]);
            addToast({ message: 'تم إفراغ السلة بنجاح', type: 'success', title: 'تمت العملية' });
        } else {
            await loadItems();
            addToast({ message: 'حدث خطأ أثناء الإفراغ الكامل للسلة', type: 'error', title: 'خطأ' });
        }
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'folder': return <FolderIcon className="w-5 h-5 text-blue-500" />;
            case 'template': return <DocumentTextIcon className="w-5 h-5 text-green-500" />;
            case 'instance': return <ClipboardDocumentCheckIcon className="w-5 h-5 text-purple-500" />;
            default: return <DocumentTextIcon className="w-5 h-5 text-gray-500" />;
        }
    };

    return (
        <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900">
            {/* Header */}
            <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-red-100 dark:bg-red-900/20 rounded-xl">
                        <TrashIcon className="w-8 h-8 text-red-600 dark:text-red-400" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">سلة المحذوفات</h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400">إدارة العناصر المحذوفة</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate('/forms')}
                        className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        عودة
                    </button>
                    {items.length > 0 && (
                        <button
                            onClick={handleEmptyBin}
                            disabled={processing}
                            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2 disabled:opacity-50"
                        >
                            <TrashIcon className="w-5 h-5" />
                            <span>إفراغ السلة</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Toolbar */}
            {selectedItems.size > 0 && (
                <div className="bg-blue-50 dark:bg-blue-900/20 px-6 py-3 flex items-center justify-between border-b border-blue-100 dark:border-blue-800 animate-fade-in">
                    <span className="font-medium text-blue-700 dark:text-blue-300">
                        تم تحديد {selectedItems.size} عنصر
                    </span>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleRestoreSelected}
                            disabled={processing}
                            className="px-4 py-2 bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 rounded-lg border border-blue-200 dark:border-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors flex items-center gap-2"
                        >
                            <ArrowUturnLeftIcon className="w-5 h-5" />
                            <span>استرجاع المحدد</span>
                        </button>
                        <button
                            onClick={handleDeleteSelected}
                            disabled={processing}
                            className="px-4 py-2 bg-white dark:bg-gray-800 text-red-600 dark:text-red-400 rounded-lg border border-red-200 dark:border-red-700 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors flex items-center gap-2"
                        >
                            <TrashIcon className="w-5 h-5" />
                            <span>حذف نهائي</span>
                        </button>
                    </div>
                </div>
            )}

            {/* Content */}
            <div className="flex-1 overflow-auto p-6">
                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <ArrowPathIcon className="w-8 h-8 text-gray-400 animate-spin" />
                    </div>
                ) : items.length > 0 ? (
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                        <table className="w-full text-right">
                            <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 text-sm">
                                <tr>
                                    <th className="px-6 py-4 w-12 text-center">
                                        <input
                                            type="checkbox"
                                            checked={selectedItems.size === items.length && items.length > 0}
                                            onChange={handleSelectAll}
                                            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                                        />
                                    </th>
                                    <th className="px-6 py-4 font-medium">الاسم</th>
                                    <th className="px-6 py-4 font-medium">المسار الأصلي</th>
                                    <th className="px-6 py-4 font-medium">تاريخ الحذف</th>
                                    <th className="px-6 py-4 font-medium">حذف بواسطة</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {items.map((item) => (
                                    <tr
                                        key={item.id}
                                        className={cn(
                                            "hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer",
                                            selectedItems.has(item.id) && "bg-blue-50 dark:bg-blue-900/10"
                                        )}
                                        onClick={() => handleSelect(item.id)}
                                    >
                                        <td className="px-6 py-4 text-center" onClick={e => e.stopPropagation()}>
                                            <input
                                                type="checkbox"
                                                checked={selectedItems.has(item.id)}
                                                onChange={() => handleSelect(item.id)}
                                                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                                            />
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                {getIcon(item.type)}
                                                <span className="font-medium text-gray-900 dark:text-white">{item.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-gray-500 dark:text-gray-400 text-sm dir-ltr text-right">
                                            {item.originalPath}
                                        </td>
                                        <td className="px-6 py-4 text-gray-500 dark:text-gray-400 text-sm">
                                            {format(new Date(item.deletedAt), 'dd/MM/yyyy hh:mm a', { locale: ar })}
                                        </td>
                                        <td className="px-6 py-4 text-gray-500 dark:text-gray-400 text-sm">
                                            <span className="font-mono text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                                                {item.deletedBy ? `${item.deletedBy.substring(0, 8)}...` : 'Unknown'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-center p-12">
                        <div className="bg-gray-100 dark:bg-gray-800 p-6 rounded-full mb-4">
                            <CheckCircleIcon className="w-16 h-16 text-gray-400" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">سلة المحذوفات فارغة</h3>
                        <p className="text-gray-500 dark:text-gray-400 max-w-sm">
                            العناصر المحذوفة ستظهر هنا لمدة 30 يوماً قبل حذفها نهائياً.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default RecycleBinPage;
