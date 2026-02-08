import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ArchiveBoxIcon,
    ArrowUturnLeftIcon,
    TrashIcon,
    FolderIcon,
    DocumentTextIcon,
    ClipboardDocumentCheckIcon,
    MagnifyingGlassIcon
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import useStore from '../store';
import { useToastStore } from '../store/toastStore';
import { cn } from '../utils';

const ArchivePage: React.FC = () => {
    const navigate = useNavigate();
    const {
        folders,
        formTemplates,
        formInstances,
        unarchiveFolder,
        unarchiveFormTemplate,
        unarchiveFormInstance,
        deleteFolder,
        deleteFormTemplate,
        deleteFormInstance
    } = useStore();

    const { addToast } = useToastStore();
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

    // Collect all archived items
    const archivedItems = useMemo(() => {
        const items: any[] = [];

        // Folders
        Object.values(folders).forEach(f => {
            if (f.archived) {
                items.push({
                    id: f.id,
                    type: 'folder',
                    name: f.name,
                    archivedAt: f.archived_at,
                    archivedBy: f.archived_by,
                    data: f
                });
            }
        });

        // Templates
        Object.values(formTemplates).forEach(t => {
            if (t.archived) {
                items.push({
                    id: t.id,
                    type: 'template',
                    name: t.name,
                    archivedAt: t.archived_at,
                    archivedBy: t.archived_by,
                    data: t
                });
            }
        });

        // Instances
        Object.values(formInstances).forEach(i => {
            if (i.archived) {
                items.push({
                    id: i.instance_id, // Use instance_id for instances
                    originalId: i.instance_id,
                    type: 'instance',
                    name: i.name || `${i.template_id} - ${i.created_at}`, // Fallback name
                    archivedAt: i.archived_at,
                    archivedBy: i.archived_by,
                    data: i
                });
            }
        });

        return items.sort((a, b) =>
            new Date(b.archivedAt || 0).getTime() - new Date(a.archivedAt || 0).getTime()
        );
    }, [folders, formTemplates, formInstances]);

    // Filter items
    const filteredItems = useMemo(() => {
        return archivedItems.filter(item =>
            item.name.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [archivedItems, searchQuery]);

    const handleSelectAll = () => {
        if (selectedItems.size === filteredItems.length) {
            setSelectedItems(new Set());
        } else {
            setSelectedItems(new Set(filteredItems.map(i => i.id)));
        }
    };

    const toggleSelection = (id: string) => {
        const newSelected = new Set(selectedItems);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedItems(newSelected);
    };

    const handleUnarchive = async (id: string, type: string) => {
        try {
            if (type === 'folder') unarchiveFolder(id);
            else if (type === 'template') unarchiveFormTemplate(id);
            else if (type === 'instance') unarchiveFormInstance(id);
            addToast({ message: 'تم استرجاع العنصر من الأرشيف', type: 'success', title: 'نجاح' });
            setSelectedItems(prev => {
                const next = new Set(prev);
                next.delete(id);
                return next;
            });
        } catch (error) {
            addToast({ message: 'فشل استرجاع العنصر', type: 'error', title: 'خطأ' });
        }
    };

    const handleDelete = async (id: string, type: string) => {
        if (!window.confirm('هل أنت متأكد من حذف هذا العنصر؟ سينقل إلى سلة المحذوفات.')) return;

        try {
            if (type === 'folder') deleteFolder(id);
            else if (type === 'template') deleteFormTemplate(id);
            else if (type === 'instance') deleteFormInstance(id);

            addToast({ message: 'تم نقل العنصر إلى سلة المحذوفات', type: 'success', title: 'نجاح' });
            setSelectedItems(prev => {
                const next = new Set(prev);
                next.delete(id);
                return next;
            });
        } catch (error) {
            addToast({ message: 'فشل حذف العنصر', type: 'error', title: 'خطأ' });
        }
    };

    const handleBulkUnarchive = () => {
        if (selectedItems.size === 0) return;
        selectedItems.forEach(id => {
            const item = archivedItems.find(i => i.id === id);
            if (item) handleUnarchive(id, item.type);
        });
        setSelectedItems(new Set());
    };

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900" dir="rtl">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                        <ArchiveBoxIcon className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">الأرشيف</h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            {filteredItems.length} عنصر مؤرشف
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative">
                        <MagnifyingGlassIcon className="w-5 h-5 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="بحث في الأرشيف..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-64 pl-4 pr-10 py-2 bg-slate-100 dark:bg-slate-700/50 border-none rounded-lg focus:ring-2 focus:ring-purple-500 transition-all text-sm"
                        />
                    </div>
                    {selectedItems.size > 0 && (
                        <button
                            onClick={handleBulkUnarchive}
                            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors text-sm font-medium shadow-sm"
                        >
                            <ArrowUturnLeftIcon className="w-4 h-4" />
                            استرجاع المحدد ({selectedItems.size})
                        </button>
                    )}
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-auto p-6">
                {filteredItems.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                        <ArchiveBoxIcon className="w-16 h-16 mb-4 opacity-50" />
                        <p className="text-lg">الأرشيف فارغ</p>
                    </div>
                ) : (
                    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                        <table className="w-full">
                            <thead className="bg-slate-50 dark:bg-slate-700/50 text-xs uppercase text-slate-500 font-medium">
                                <tr>
                                    <th className="px-4 py-3 w-12 text-center">
                                        <input
                                            type="checkbox"
                                            checked={selectedItems.size === filteredItems.length && filteredItems.length > 0}
                                            onChange={handleSelectAll}
                                            className="rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                                        />
                                    </th>
                                    <th className="px-4 py-3 text-right">الاسم</th>
                                    <th className="px-4 py-3 text-right">تاريخ الأرشفة</th>
                                    <th className="px-4 py-3 text-right">أرشف بواسطة</th>
                                    <th className="px-4 py-3 text-center">الإجراءات</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                {filteredItems.map(item => (
                                    <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors group">
                                        <td className="px-4 py-3 text-center">
                                            <input
                                                type="checkbox"
                                                checked={selectedItems.has(item.id)}
                                                onChange={() => toggleSelection(item.id)}
                                                className="rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                                            />
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-slate-100 dark:bg-slate-700 rounded-lg text-slate-500">
                                                    {item.type === 'folder' && <FolderIcon className="w-5 h-5 text-amber-500" />}
                                                    {item.type === 'template' && <DocumentTextIcon className="w-5 h-5 text-blue-500" />}
                                                    {item.type === 'instance' && <ClipboardDocumentCheckIcon className="w-5 h-5 text-green-500" />}
                                                </div>
                                                <span className="font-medium text-slate-900 dark:text-slate-100">{item.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-slate-500">
                                            {item.archivedAt ? format(new Date(item.archivedAt), 'dd/MM/yyyy HH:mm', { locale: ar }) : '-'}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-slate-500">
                                            {item.archivedBy || '-'}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => handleUnarchive(item.id, item.type)}
                                                    title="استرجاع"
                                                    className="p-1.5 text-slate-500 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/30 rounded-lg transition-colors"
                                                >
                                                    <ArrowUturnLeftIcon className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(item.id, item.type)}
                                                    title="حذف"
                                                    className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                                                >
                                                    <TrashIcon className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ArchivePage;
