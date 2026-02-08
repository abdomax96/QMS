/**
 * FolderContentView Component
 * Displays forms and reports within a folder
 */

import React, { useEffect, useState } from 'react';
import {
    DocumentTextIcon,
    ClipboardDocumentCheckIcon,
    PlusIcon,
    EyeIcon,
    PencilIcon,
} from '@heroicons/react/24/outline';
import { useNavigate } from 'react-router-dom';
import { cn } from '../../utils';
import { supabase } from '../../config/supabase';

interface FolderContentViewProps {
    folderId: string;
    folderName: string;
    contentTypes: string[];
}

interface Template {
    id: string;
    name: string;
    description: string;
    version: number;
    created_at: string;
    created_by: string;
}

interface Instance {
    id: string;
    template_id: string;
    template_name: string;
    status: string;
    created_at: string;
    created_by: string;
}

const FolderContentView: React.FC<FolderContentViewProps> = ({
    folderId,
    folderName,
    contentTypes,
}) => {
    const navigate = useNavigate();
    const [templates, setTemplates] = useState<Template[]>([]);
    const [instances, setInstances] = useState<Instance[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'forms' | 'reports'>('forms');

    useEffect(() => {
        loadContent();
    }, [folderId]);

    const loadContent = async () => {
        setLoading(true);
        try {
            if (contentTypes.includes('forms')) {
                const { data: templatesData } = await supabase
                    .from('form_templates')
                    .select('*')
                    .eq('unified_folder_id', folderId)
                    .eq('archived', false)
                    .order('created_at', { ascending: false });

                setTemplates(templatesData || []);
            }

            if (contentTypes.includes('reports')) {
                const { data: instancesData } = await supabase
                    .from('form_instances')
                    .select(`
                        *,
                        template:template_id (name)
                    `)
                    .eq('unified_folder_id', folderId)
                    .eq('archived', false)
                    .order('created_at', { ascending: false });

                setInstances((instancesData || []).map(item => ({
                    ...item,
                    template_name: item.template?.name || 'Unknown',
                })));
            }
        } catch (error) {
            console.error('Error loading folder content:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateForm = () => {
        navigate(`/forms/new?folder=${folderId}`);
    };

    const handleCreateReport = () => {
        // Navigate to template selection for creating report
        navigate(`/forms&reports?folder=${folderId}&action=newReport`);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Tabs */}
            <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-700">
                {contentTypes.includes('forms') && (
                    <button
                        onClick={() => setActiveTab('forms')}
                        className={cn(
                            'px-4 py-2 border-b-2 font-medium text-sm transition-colors',
                            activeTab === 'forms'
                                ? 'border-primary-600 text-primary-600'
                                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        )}
                    >
                        <span className="flex items-center gap-2">
                            <DocumentTextIcon className="w-4 h-4" />
                            النماذج ({templates.length})
                        </span>
                    </button>
                )}
                {contentTypes.includes('reports') && (
                    <button
                        onClick={() => setActiveTab('reports')}
                        className={cn(
                            'px-4 py-2 border-b-2 font-medium text-sm transition-colors',
                            activeTab === 'reports'
                                ? 'border-primary-600 text-primary-600'
                                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        )}
                    >
                        <span className="flex items-center gap-2">
                            <ClipboardDocumentCheckIcon className="w-4 h-4" />
                            التقارير ({instances.length})
                        </span>
                    </button>
                )}
            </div>

            {/* Content */}
            {activeTab === 'forms' && (
                <div className="space-y-4">
                    {/* Create Button */}
                    <button
                        onClick={handleCreateForm}
                        className="w-full p-4 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-corporate-lg hover:border-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-all group"
                    >
                        <div className="flex items-center justify-center gap-2 text-slate-600 dark:text-slate-400 group-hover:text-primary-600 dark:group-hover:text-primary-400">
                            <PlusIcon className="w-5 h-5" />
                            <span className="font-medium">إنشاء نموذج جديد</span>
                        </div>
                    </button>

                    {/* Templates List */}
                    {templates.length === 0 ? (
                        <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                            <DocumentTextIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                            <p>لا توجد نماذج في هذا المجلد</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {templates.map((template) => (
                                <div
                                    key={template.id}
                                    className="bg-white dark:bg-slate-800 rounded-corporate-lg p-4 border border-slate-200 dark:border-slate-700 hover:shadow-lg transition-shadow"
                                >
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                            <DocumentTextIcon className="w-5 h-5 text-blue-500" />
                                            <h3 className="font-semibold text-slate-900 dark:text-white">
                                                {template.name}
                                            </h3>
                                        </div>
                                        <span className="text-xs text-slate-500 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded">
                                            v{template.version}
                                        </span>
                                    </div>

                                    {template.description && (
                                        <p className="text-sm text-slate-600 dark:text-slate-400 mb-3 line-clamp-2">
                                            {template.description}
                                        </p>
                                    )}

                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => navigate(`/forms/preview/${template.id}`)}
                                            className="flex-1 px-3 py-1.5 text-sm rounded-corporate bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors flex items-center justify-center gap-1"
                                        >
                                            <EyeIcon className="w-4 h-4" />
                                            معاينة
                                        </button>
                                        <button
                                            onClick={() => navigate(`/forms/edit/${template.id}`)}
                                            className="flex-1 px-3 py-1.5 text-sm rounded-corporate bg-primary-100 dark:bg-primary-900/50 text-primary-700 dark:text-primary-300 hover:bg-primary-200 dark:hover:bg-primary-900 transition-colors flex items-center justify-center gap-1"
                                        >
                                            <PencilIcon className="w-4 h-4" />
                                            تعديل
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'reports' && (
                <div className="space-y-4">
                    {/* Create Button */}
                    <button
                        onClick={handleCreateReport}
                        className="w-full p-4 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-corporate-lg hover:border-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-all group"
                    >
                        <div className="flex items-center justify-center gap-2 text-slate-600 dark:text-slate-400 group-hover:text-primary-600 dark:group-hover:text-primary-400">
                            <PlusIcon className="w-5 h-5" />
                            <span className="font-medium">إنشاء تقرير جديد</span>
                        </div>
                    </button>

                    {/* Instances List */}
                    {instances.length === 0 ? (
                        <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                            <ClipboardDocumentCheckIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                            <p>لا توجد تقارير في هذا المجلد</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {instances.map((instance) => (
                                <div
                                    key={instance.id}
                                    className="bg-white dark:bg-slate-800 rounded-corporate p-4 border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow cursor-pointer"
                                    onClick={() => navigate(`/reports/view/${instance.id}`)}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <ClipboardDocumentCheckIcon className="w-5 h-5 text-emerald-500" />
                                            <div>
                                                <h4 className="font-medium text-slate-900 dark:text-white">
                                                    {instance.template_name}
                                                </h4>
                                                <p className="text-xs text-slate-500">
                                                    {new Date(instance.created_at).toLocaleDateString('ar-SA')}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {instance.status === 'draft' && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        navigate(`/reports/edit/${instance.id}`);
                                                    }}
                                                    className="px-3 py-1 text-xs font-medium bg-primary-100 text-primary-700 hover:bg-primary-200 dark:bg-primary-900/40 dark:text-primary-300 dark:hover:bg-primary-900/60 rounded transition-colors flex items-center gap-1"
                                                >
                                                    <PencilIcon className="w-3 h-3" />
                                                    استكمال
                                                </button>
                                            )}
                                            <span className={cn(
                                                'px-2 py-1 rounded text-xs font-medium',
                                                instance.status === 'completed' && 'bg-green-100 text-green-700',
                                                instance.status === 'draft' && 'bg-yellow-100 text-yellow-700',
                                                instance.status === 'pending' && 'bg-blue-100 text-blue-700'
                                            )}>
                                                {instance.status}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default FolderContentView;
