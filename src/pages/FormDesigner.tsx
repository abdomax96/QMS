import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
    ArrowLeftIcon,
    EyeIcon,
    CheckCircleIcon,
    Cog6ToothIcon,
} from '@heroicons/react/24/outline';
import useStore from '../store';
import { generateId } from '../utils';
import { usePrompt } from '../hooks/usePrompt';
import type { FormTemplate } from '../types';
import StaticTabs from '../components/forms/StaticTabs';
import BasicInfoTab from '../components/forms/tabs/BasicInfoTab';
import DocumentControlTab from '../components/forms/tabs/DocumentControlTab';
import BatchConfigTab from '../components/forms/tabs/BatchConfigTab';
import CustomVariablesTab from '../components/forms/tabs/CustomVariablesTab';
import SectionsTab from '../components/forms/tabs/SectionsTab';
import NotesTab from '../components/forms/tabs/NotesTab';
import SignaturesTab from '../components/forms/tabs/SignaturesTab';

interface TabConfig {
    id: string;
    label: string;
    icon: string;
}

const defaultTabs: TabConfig[] = [
    { id: 'basic', label: 'المعلومات الأساسية', icon: 'info' },
    { id: 'document', label: 'التحكم في الوثيقة', icon: 'document' },
    { id: 'batch', label: 'تكوين الدُفعات', icon: 'batch' },
    { id: 'variables', label: 'المتغيرات', icon: 'variable' },
    { id: 'sections', label: 'أقسام النموذج', icon: 'sections' },
    { id: 'notes', label: 'الملاحظات', icon: 'notes' },
    { id: 'signatures', label: 'التواقيع', icon: 'signature' },
];

const FormDesigner: React.FC = () => {
    const { templateId } = useParams<{ templateId?: string }>();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const folderIdFromUrl = searchParams.get('folderId') || searchParams.get('folder');
    const tabFromUrl = searchParams.get('tab');
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [isDirty, setIsDirty] = useState(false);

    const {
        formTemplates,
        addFormTemplate,
        updateFormTemplate,
        currentFolderId
    } = useStore();

    // Use folder ID from URL if available, otherwise use current folder from store
    // Convert empty string to null for UUID field
    const targetFolderId = folderIdFromUrl || currentFolderId || null;

    // Initialize activeTab from URL or default to 'basic'
    const [activeTab, setActiveTabState] = useState(() => {
        const validTabs = defaultTabs.map(t => t.id);
        return tabFromUrl && validTabs.includes(tabFromUrl) ? tabFromUrl : 'basic';
    });
    const [isSaving, setIsSaving] = useState(false);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);

    // Update activeTab and URL together
    const setActiveTab = (tabId: string) => {
        setActiveTabState(tabId);
        const newParams = new URLSearchParams(searchParams);
        newParams.set('tab', tabId);
        setSearchParams(newParams, { replace: true });
    };

    // Initialize template state
    const [template, setTemplate] = useState<FormTemplate>(() => {
        if (templateId && formTemplates[templateId]) {
            return formTemplates[templateId];
        }
        return {
            id: generateId(),
            name: 'نموذج جديد',
            version: 1,
            created_at: new Date().toISOString(),
            type: 'quality-control',
            folder_id: targetFolderId,
            unified_folder_id: targetFolderId, // Add unified_folder_id support
            template_type_config: {
                id: 'quality-control',
                name: 'مراقبة جودة منتجات',
                description: 'نموذج لمراقبة جودة المنتجات',
                icon: '✓',
                color: '#10b981',
                default_sections: ['inspection', 'measurements'],
                available_tools: [],
                required_properties: ['batch_number', 'date'],
                optional_properties: ['operator', 'shift']
            },
            custom_properties: {},
            basic_info: {
                standard_weight: 0,
                shelf_life_months: 12,
                cartons_per_pallet: 0,
                packs_per_box: 0,
                boxes_per_carton: 0,
                empty_box_weight: 0,
                empty_carton_weight: 0,
                aql_level: '1.0%',
            },
            document_control: {
                doc_code: '',
                issue_no: '01',
                review_no: '00',
                issue_date: new Date().toISOString().split('T')[0],
                review_date: '',
            },
            batch_configuration: {
                batch_code: '',
                day_format: 'DD',
                month_format: 'letter',
            },
            custom_variables: [],
            sections: {},
            quality_criteria: [],
            notes: '',
            signatures: [],
        };
    });

    // Filter tabs based on template type - hide batch config for data-collection type
    const tabs = defaultTabs.filter(tab => {
        if (tab.id === 'batch' && template?.type === 'data-collection') {
            return false;
        }
        return true;
    });



    // ✅ FIX: Single useEffect that properly loads full template from database
    // This avoids race conditions between store sync and database fetch
    const [isTemplateLoaded, setIsTemplateLoaded] = useState(false);

    useEffect(() => {
        const loadFullTemplate = async () => {
            if (!templateId) {
                setIsTemplateLoaded(true);
                return;
            }

            // Check if store already has full data (sections with content)
            const storeTemplate = formTemplates[templateId];
            const storeHasSections = storeTemplate && Object.keys(storeTemplate.sections || {}).length > 0;

            if (storeHasSections) {
                console.log('📋 Template already has full data in store:', storeTemplate.name);
                console.log('  - Sections count:', Object.keys(storeTemplate.sections || {}).length);
                setTemplate(storeTemplate);
                setIsTemplateLoaded(true);
                return;
            }

            // Fetch full template from database
            console.log('🔄 Loading full template from database:', templateId);
            try {
                const { templatesService } = await import('../services/supabaseService');
                const fullTemplate = await templatesService.getTemplate(templateId);

                if (fullTemplate) {
                    console.log('✅ Full template loaded:', fullTemplate.name);
                    console.log('  - Sections count:', Object.keys(fullTemplate.sections || {}).length);

                    // Update local state
                    setTemplate(fullTemplate);

                    // ✅ FIX: Also update the store so it has full data
                    // This prevents the old useEffect from overwriting our data
                    updateFormTemplate(templateId, fullTemplate);

                    setIsTemplateLoaded(true);
                } else {
                    // Template not found in database, use store version or create new
                    if (storeTemplate) {
                        setTemplate(storeTemplate);
                    }
                    setIsTemplateLoaded(true);
                }
            } catch (error) {
                console.error('❌ Error loading full template:', error);
                // Fallback to store template if available
                if (storeTemplate) {
                    setTemplate(storeTemplate);
                }
                setIsTemplateLoaded(true);
            }
        };

        loadFullTemplate();
    }, [templateId]); // Only depend on templateId, not formTemplates to avoid re-fetching


    // Auto-save effect with debouncing
    useEffect(() => {
        if (!isDirty || !hasUnsavedChanges) return; // Skip if no changes

        const autoSaveTimer = setTimeout(async () => {
            console.log('🔄 Auto-saving...');
            await handleSave();
            setIsDirty(false); // Reset after successful auto-save
        }, 30000); // Auto-save every 30 seconds

        return () => clearTimeout(autoSaveTimer);
    }, [isDirty]); // Re-run only when isDirty changes

    const handleSave = async () => {
        console.log('💾 Saving template:', template.id);
        console.log('  - Sections count:', Object.keys(template.sections || {}).length);

        // Check for duplicate names in same folder
        const duplicateTemplate = Object.values(formTemplates).find(t =>
            t.id !== template.id &&
            t.folder_id === template.folder_id &&
            t.name.trim() === template.name.trim() &&
            !t.archived
        );

        if (duplicateTemplate) {
            alert('يوجد نموذج بنفس الاسم في هذا المجلد. يرجى اختيار اسم مختلف.');
            return;
        }

        if (!template.name.trim()) {
            alert('يرجى إدخال اسم النموذج');
            return;
        }

        // ⚠️ Validate folder selection - templates must be in a folder to appear in the list
        if (!template.folder_id && !template.unified_folder_id) {
            alert('⚠️ يجب اختيار مجلد لحفظ النموذج فيه.\n\nالنماذج بدون مجلد لن تظهر في القائمة.\nيرجى الرجوع واختيار مجلد أولاً.');
            return;
        }

        setIsSaving(true);
        try {
            // ✅ Check session before saving to prevent silent failures
            const { supabase } = await import('../config/supabase');
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                alert('انتهت صلاحية الجلسة. يرجى تسجيل الدخول مرة أخرى.');
                window.location.href = '/login';
                return;
            }

            // ✅ FIX: Add await to ensure completion before updating state
            if (templateId && formTemplates[templateId]) {
                await updateFormTemplate(templateId, template);
            } else {
                await addFormTemplate(template);
            }

            // ✅ Only update state after successful save
            setLastSaved(new Date());
            setHasUnsavedChanges(false);
            setIsDirty(false);

            console.log('✅ Template saved successfully');

        } catch (error) {
            // ✅ Now this will actually catch errors from the async operations
            console.error('❌ Error saving template:', error);

            // ✅ Show user-friendly error message
            const errorMessage = error instanceof Error ? error.message : 'حدث خطأ غير متوقع';
            alert(`فشل الحفظ: ${errorMessage}\n\nيرجى المحاولة مرة أخرى.`);

            // Keep hasUnsavedChanges = true so user can retry

        } finally {
            setIsSaving(false);
        }
    };

    const handleBack = () => {
        if (hasUnsavedChanges) {
            if (window.confirm('لديك تغييرات غير محفوظة. هل تريد المغادرة بدون حفظ؟')) {
                navigate('/forms&reports');
            }
        } else {
            navigate('/forms&reports');
        }
    };

    // ✅ NEW: Save and exit function
    const handleSaveAndExit = async () => {
        try {
            await handleSave();
            // Only navigate if save was successful (no error thrown)
            navigate('/forms&reports');
        } catch (error) {
            // Error already handled in handleSave
            // Stay on page for user to retry
        }
    };

    // Warn before leaving page with unsaved changes
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (hasUnsavedChanges) {
                e.preventDefault();
                e.returnValue = '';
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [hasUnsavedChanges]);

    const handleTemplateChange = (updates: Partial<FormTemplate>) => {
        setTemplate(prev => ({ ...prev, ...updates }));
        setHasUnsavedChanges(true);
        setIsDirty(true); // Mark as dirty for auto-save
    };

    // Navigation guard - blocks sidebar and internal navigation with unsaved changes
    usePrompt(
        'لديك تغييرات غير محفوظة. هل تريد المغادرة بدون حفظ؟',
        hasUnsavedChanges && !isSaving
    );

    const renderTabContent = () => {
        switch (activeTab) {
            case 'basic':
                return (
                    <BasicInfoTab
                        template={template}
                        onChange={handleTemplateChange}
                    />
                );
            case 'document':
                return (
                    <DocumentControlTab
                        template={template}
                        onChange={handleTemplateChange}
                    />
                );
            case 'batch':
                return (
                    <BatchConfigTab
                        template={template}
                        onChange={handleTemplateChange}
                    />
                );
            case 'variables':
                return (
                    <CustomVariablesTab
                        template={template}
                        onChange={handleTemplateChange}
                    />
                );
            case 'sections':
                return (
                    <SectionsTab
                        template={template}
                        onChange={handleTemplateChange}
                    />
                );
            case 'notes':
                return (
                    <NotesTab
                        template={template}
                        onChange={handleTemplateChange}
                    />
                );
            case 'signatures':
                return (
                    <SignaturesTab
                        template={template}
                        onChange={handleTemplateChange}
                    />
                );
            default:
                return null;
        }
    };

    return (
        <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900">
            {/* Header */}
            <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                        <button
                            onClick={handleBack}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg flex-shrink-0"
                        >
                            <ArrowLeftIcon className="w-5 h-5" />
                        </button>
                        <div className="flex-1 min-w-0 overflow-hidden">
                            <input
                                type="text"
                                value={template.name}
                                onChange={(e) => handleTemplateChange({ name: e.target.value })}
                                className="text-xl font-bold bg-transparent border-none focus:ring-0 p-0 text-gray-900 dark:text-white w-full truncate"
                                placeholder="اسم النموذج"
                                title={template.name}
                            />
                            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                                <span>الإصدار {template.version}</span>
                                {lastSaved && (
                                    <>
                                        <span>•</span>
                                        <span>آخر حفظ: {lastSaved.toLocaleTimeString('ar-EG')}</span>
                                    </>
                                )}
                                {isSaving && (
                                    <>
                                        <span>•</span>
                                        <span className="text-primary-600">جاري الحفظ...</span>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => navigate(`/forms/preview/${template.id}`)}
                            className="flex items-center gap-2 px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                        >
                            <EyeIcon className="w-5 h-5" />
                            معاينة
                        </button>
                        <button
                            onClick={() => handleSave()}
                            disabled={isSaving}
                            className="flex items-center gap-2 px-4 py-2 border border-primary-600 text-primary-600 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-900/20 disabled:opacity-50"
                        >
                            {isSaving ? (
                                <Cog6ToothIcon className="w-5 h-5 animate-spin" />
                            ) : (
                                <CheckCircleIcon className="w-5 h-5" />
                            )}
                            حفظ
                        </button>
                        <button
                            onClick={handleSaveAndExit}
                            disabled={isSaving}
                            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
                        >
                            {isSaving ? (
                                <Cog6ToothIcon className="w-5 h-5 animate-spin" />
                            ) : (
                                <CheckCircleIcon className="w-5 h-5" />
                            )}
                            حفظ والعودة
                        </button>
                    </div>
                </div>
            </div>

            {/* Tabs - Fixed position, no drag-and-drop */}
            <StaticTabs
                tabs={tabs}
                activeTab={activeTab}
                onTabChange={setActiveTab}
            />

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
                <div className="max-w-4xl mx-auto">
                    {renderTabContent()}
                </div>
            </div>
        </div>
    );
};

export default FormDesigner;
