import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeftIcon,
    DocumentArrowDownIcon,
    CloudArrowUpIcon,
    PaperAirplaneIcon,
    ExclamationCircleIcon,
} from '@heroicons/react/24/outline';
import { usePrompt } from '../hooks/usePrompt';
import useStore from '../store';
import { cn, generateId, debounce } from '../utils';
import { useSupabaseAuth } from '../hooks/useSupabaseAuth';
import type { FormTemplate, FormInstance } from '../types';
import FormRenderer from '../components/forms/FormRenderer';
import { foldersService } from '../services/supabaseService';
import { useTabsStore } from '../store/tabsStore';

// Wrapper to force remount when ID changes (preventing state leakage between tabs)
const DataEntryPage: React.FC = () => {
    const { templateId, instanceId } = useParams<{ templateId?: string; instanceId?: string }>();
    // Use a unique key based on the form ID to ensure complete state reset
    const key = instanceId || templateId || 'new';
    return <DataEntryPageContent key={key} />;
};

const DataEntryPageContent: React.FC = () => {
    const { templateId, instanceId } = useParams<{ templateId?: string; instanceId?: string }>();
    const navigate = useNavigate();
    // ... rest of component ...
    const {
        formTemplates,
        formInstances,
        addFormInstance,
        updateFormInstance,
        updateFormTemplate,
        user,
    } = useStore();

    // Tabs Store Integration
    const {
        tabs,
        activeTabId,
        updateTabState,
        markDirty,
        updateTabTitle,
        getTabByFormId,
        getActiveTab,
        pushUndo,
        undo: undoTab,
        redo: redoTab,
        canUndo,
        canRedo
    } = useTabsStore();

    // Use Supabase Auth for real user ID (UUID)
    const { profile } = useSupabaseAuth();

    const [isSaving, setIsSaving] = useState(false);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);
    const [activeSection, setActiveSection] = useState<string | null>(null);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);

    // Version tracking for race condition prevention
    const saveVersionRef = useRef(0);

    // Get template ID
    const actualTemplateId = templateId || (instanceId ? formInstances[instanceId]?.template_id : null);

    // State for loaded template (full template from database)
    const [loadedTemplate, setLoadedTemplate] = useState<FormTemplate | null>(null);

    // Get template from store first, fallback to loaded template
    const storeTemplate = actualTemplateId ? formTemplates[actualTemplateId] : null;

    // Use loaded template if it has sections, otherwise use store template
    const template = (loadedTemplate && Object.keys(loadedTemplate.sections || {}).length > 0)
        ? loadedTemplate
        : storeTemplate;

    // ✅ FIX: Load full template from database if store template lacks sections
    useEffect(() => {
        const fetchFullTemplate = async () => {
            if (!actualTemplateId) return;

            // Check if store template already has sections
            const storeT = formTemplates[actualTemplateId];
            if (storeT && Object.keys(storeT.sections || {}).length > 0) {
                console.log('📋 [DataEntry] Template already has sections in store:', Object.keys(storeT.sections).length);
                setLoadedTemplate(storeT);
                return;
            }

            console.log('🔄 [DataEntry] Loading full template from database:', actualTemplateId);
            try {
                const { templatesService } = await import('../services/supabaseService');
                const fullTemplate = await templatesService.getTemplate(actualTemplateId);

                if (fullTemplate) {
                    console.log('✅ [DataEntry] Full template loaded:', fullTemplate.name);
                    console.log('  - Sections count:', Object.keys(fullTemplate.sections || {}).length);
                    setLoadedTemplate(fullTemplate);

                    // Also update the store for future use
                    updateFormTemplate(actualTemplateId, fullTemplate);
                }
            } catch (error) {
                console.error('❌ [DataEntry] Error loading template:', error);
            }
        };

        fetchFullTemplate();
    }, [actualTemplateId, formTemplates, updateFormTemplate]);

    const existingInstance = instanceId ? formInstances[instanceId] : null;

    // Generate batch number based on template configuration
    const generateBatchNumber = (tmpl: FormTemplate, reportDate?: string): string => {
        const config = tmpl.batch_configuration;
        if (!config) return '';

        const date = reportDate ? new Date(reportDate) : new Date();
        const separator = config.separator || '';

        // Date components with custom ordering
        const dateOrder = config.date_order || ['year', 'month', 'day'];
        const dateParts: string[] = [];

        for (const part of dateOrder) {
            if (part === 'year' && config.year_format && config.year_format !== 'none') {
                const year = config.year_format === 'YY'
                    ? date.getFullYear().toString().slice(-2)
                    : date.getFullYear().toString();
                dateParts.push(year);
            } else if (part === 'month') {
                let month = '';
                if (config.month_format === 'letter') {
                    month = String.fromCharCode(65 + date.getMonth());
                } else if (config.month_format === 'MM') {
                    month = String(date.getMonth() + 1).padStart(2, '0');
                } else {
                    month = String(date.getMonth() + 1);
                }
                dateParts.push(month);
            } else if (part === 'day') {
                const day = config.day_format === 'DD'
                    ? String(date.getDate()).padStart(2, '0')
                    : String(date.getDate());
                dateParts.push(day);
            }
        }

        const dateStr = dateParts.join(separator);

        // Sequential number
        let seqNumber = '';
        if (config.auto_increment && config.current_number !== undefined) {
            const padding = config.padding || 3;
            seqNumber = String(config.current_number).padStart(padding, '0');
        }

        // Component ordering
        const componentOrder = config.component_order || ['code', 'date', 'number'];
        const orderedParts: string[] = [];

        // Prefix always comes first
        if (config.prefix) orderedParts.push(config.prefix);

        // Add components in custom order
        for (const comp of componentOrder) {
            if (comp === 'code' && config.batch_code) orderedParts.push(config.batch_code);
            if (comp === 'date' && dateStr) orderedParts.push(dateStr);
            if (comp === 'number' && seqNumber) orderedParts.push(seqNumber);
        }

        // Suffix always comes last
        if (config.suffix) orderedParts.push(config.suffix);

        return orderedParts.join(separator);
    };

    // Initialize form data state
    const [formData, setFormData] = useState<FormInstance>(() => {
        // 1. Try to load from active tab state first
        if (activeTabId) {
            const activeTab = getActiveTab();
            // Verify tab matches current form
            const currentFormId = instanceId || templateId;
            if (activeTab && activeTab.state && activeTab.formId === currentFormId) {
                console.log('🔄 Loading state from Tab:', activeTabId);
                return activeTab.state as FormInstance;
            }
        }

        // 2. Fallback to standard loading logic
        if (existingInstance) {
            return existingInstance;
        }

        // Generate batch number from template config
        const batchNumber = template ? generateBatchNumber(template) : '';

        // Create new instance
        return {
            instance_id: generateId(),
            template_id: templateId || '',
            template_version: String(template?.version || 1),
            folder_id: null, // Will be set by Smart Filing on first save
            status: 'draft',
            created_at: new Date().toISOString(),
            created_by: profile?.uid || '',
            form_data: {
                report_date: new Date().toISOString().split('T')[0],
                shift: 'A',
                shift_duration: 8,
                batch_number: batchNumber,
                sections: {},
            },
            signatures: [],
            attachments: [],
        };
    });

    // Validated Tab Syncing
    useEffect(() => {
        if (!activeTabId) return;

        const activeTab = getActiveTab();
        const currentFormId = instanceId || templateId;

        // Only sync if the active tab corresponds to THIS form
        if (activeTab && activeTab.formId === currentFormId) {
            // Update tab state with current formData
            updateTabState(activeTabId, formData);
        }
    }, [formData, activeTabId, instanceId, templateId, getActiveTab, updateTabState]);

    // Sync Dirty Status to Tab
    useEffect(() => {
        if (!activeTabId) return;

        const activeTab = getActiveTab();
        const currentFormId = instanceId || templateId;

        if (activeTab && activeTab.formId === currentFormId) {
            markDirty(activeTabId, hasUnsavedChanges);
        }
    }, [hasUnsavedChanges, activeTabId, instanceId, templateId, getActiveTab, markDirty]);

    // Track if this is the initial mount
    const isInitialMount = React.useRef(true);

    // Sync form data when existingInstance loads/changes from Supabase
    // This effect handles CHANGES to existingInstance
    useEffect(() => {
        if (existingInstance && existingInstance.instance_id !== formData.instance_id) {
            console.log('🔄 Syncing formData with existingInstance (ID changed):', existingInstance.instance_id);
            console.log('  - Previous instance_id:', formData.instance_id);
            console.log('  - New instance_id:', existingInstance.instance_id);
            setFormData(existingInstance);
        }
    }, [existingInstance, formData.instance_id]);

    // IMPORTANT: Also sync on mount if editing existing instance
    // This handles the case where existingInstance is already loaded when component mounts
    useEffect(() => {
        if (instanceId && existingInstance && existingInstance.form_data && isInitialMount.current) {
            console.log('🔄 Initial sync on mount with existingInstance:', existingInstance.instance_id);
            console.log('  - Has form_data:', !!existingInstance.form_data);
            console.log('  - Sections count:', Object.keys(existingInstance.form_data.sections || {}).length);
            setFormData(existingInstance);
            isInitialMount.current = false; // Mark that we've done the initial sync
        }
    }, [instanceId, existingInstance]); // Run when either changes

    // Track if this instance has been saved before
    const [hasBeenSaved, setHasBeenSaved] = useState(!!existingInstance);

    // Update hasBeenSaved when existingInstance changes
    useEffect(() => {
        if (existingInstance) {
            setHasBeenSaved(true);
        }
    }, [existingInstance]);

    // ✅ FIX: Regenerate batch number when template updates (e.g. after loading full template)
    // This ensures we have the latest sequence number/config even if initial state used cached template
    useEffect(() => {
        if (template && !existingInstance && formData.status === 'draft') {
            const currentBatchNum = formData.form_data.batch_number;
            const newBatchNum = generateBatchNumber(template, formData.form_data.report_date);

            if (currentBatchNum !== newBatchNum) {
                console.log('🔄 Regenerating batch number with fresh template config');
                setFormData(prev => ({
                    ...prev,
                    form_data: {
                        ...prev.form_data,
                        batch_number: newBatchNum
                    }
                }));
            }
        }
    }, [template, existingInstance]); // Intentionally omitting formData to avoid loops, only trigger on template update

    // Auto-save with debounce and version tracking for race condition prevention
    const autoSave = useCallback(
        debounce(async (data: FormInstance, versionAtCallTime: number) => {
            console.log('💾 Auto-saving instance:', data.instance_id, 'version:', versionAtCallTime);
            console.log('  - hasBeenSaved:', hasBeenSaved);
            console.log('  - existingInstance exists:', !!existingInstance);
            console.log('  - Status:', data.status);

            setIsSaving(true);
            setSaveError(null); // Clear previous error on new attempt

            try {
                if (hasBeenSaved || existingInstance) {
                    // ✅ FIX: Check current database status before updating
                    // This prevents INVALID_TRANSITION errors when status changed externally
                    const { supabase } = await import('../config/supabase');
                    const { data: dbRecord } = await supabase
                        .from('form_instances')
                        .select('status')
                        .eq('id', data.instance_id)
                        .single();

                    if (dbRecord && dbRecord.status !== 'draft') {
                        console.log('  ⚠️ Skipping auto-save: Report status changed to', dbRecord.status);
                        // Update local state to match database
                        setFormData(prev => ({ ...prev, status: dbRecord.status }));
                        return; // Don't save - status changed externally
                    }

                    // Update existing instance
                    console.log('  ➡️ Updating existing instance');
                    await updateFormInstance(data.instance_id, data);
                } else {
                    // First save - add new instance
                    console.log('  ➡️ Adding new instance');

                    // ✅ FIX: Apply Smart Filing on first auto-save to ensure folder_id is set
                    let dataToSave = { ...data };
                    if (!dataToSave.folder_id && template) {
                        console.log('  📁 Applying Smart Filing for new instance...');
                        const folderId = await runSmartFiling(dataToSave);
                        if (folderId) {
                            dataToSave.folder_id = folderId;
                            // ✅ FIX: Update local state so subsequent saves/submits include the folder_id
                            setFormData(prev => ({ ...prev, folder_id: folderId }));
                            console.log('  ✅ Smart Filing assigned folder:', folderId);
                        }
                    }

                    await addFormInstance(dataToSave);
                    setHasBeenSaved(true);
                }
                setLastSaved(new Date());

                // Only clear unsaved changes if no newer changes have occurred
                // This prevents race condition where user edits during debounce delay
                if (versionAtCallTime === saveVersionRef.current) {
                    setHasUnsavedChanges(false);
                    console.log('  ✅ Auto-save completed, changes cleared');
                } else {
                    console.log('  ⚠️ Auto-save completed, but newer changes exist (version mismatch)');
                }
            } catch (error: any) {
                console.error('❌ Auto-save failed:', error);
                setSaveError(error.message || 'فشل الحفظ التلقائي');
                // Keep hasUnsavedChanges true so navigation guard works
            } finally {
                setIsSaving(false);
            }
        }, 2000),
        [existingInstance, hasBeenSaved, updateFormInstance, addFormInstance]
    );

    // Trigger auto-save on form data change
    useEffect(() => {
        if (formData.status === 'draft') {
            // Pass current version to track race conditions
            autoSave(formData, saveVersionRef.current);
        }
        return () => {
            autoSave.cancel();
        };
    }, [formData, autoSave]);

    // Set initial active section
    useEffect(() => {
        if (template && !activeSection) {
            const sections = Object.values(template.sections || {}).sort((a, b) => a.order - b.order);
            if (sections.length > 0) {
                setActiveSection(sections[0].id);
            }
        }
    }, [template, activeSection]);

    // Helper to push current state to history before changing
    const pushToHistory = (currentState: FormInstance) => {
        if (activeTabId) {
            pushUndo(activeTabId, currentState);
        }
    };

    const undo = useCallback(() => {
        if (!activeTabId || !canUndo(activeTabId)) return;

        // Safety check: ensure active tab matches current form
        const currentFormId = instanceId || templateId;
        const tab = getActiveTab();
        if (tab?.formId !== currentFormId) return;

        const previousState = undoTab(activeTabId);
        if (previousState) {
            console.log('↩️ Undo performed');
            setFormData(previousState);
        }
    }, [activeTabId, canUndo, undoTab, instanceId, templateId, getActiveTab]);

    const redo = useCallback(() => {
        if (!activeTabId || !canRedo(activeTabId)) return;

        // Safety check: ensure active tab matches current form
        const currentFormId = instanceId || templateId;
        const tab = getActiveTab();
        if (tab?.formId !== currentFormId) return;

        const nextState = redoTab(activeTabId);
        if (nextState) {
            console.log('↪️ Redo performed');
            setFormData(nextState);
        }
    }, [activeTabId, canRedo, redoTab, instanceId, templateId, getActiveTab]);

    const handleFormDataChange = (sectionId: string, tableId: string, data: any[][]) => {
        console.log('📝 Form data changed:', { sectionId, tableId, rowCount: data.length });

        // Push current state to history before update
        pushToHistory(formData);
        setHasUnsavedChanges(true);
        saveVersionRef.current++; // Increment version for race condition tracking

        setFormData(prev => ({
            ...prev,
            form_data: {
                ...prev.form_data,
                sections: {
                    ...prev.form_data.sections,
                    [sectionId]: {
                        ...prev.form_data.sections[sectionId],
                        tables: {
                            ...(prev.form_data.sections[sectionId]?.tables || {}),
                            [tableId]: {
                                ...(prev.form_data.sections[sectionId]?.tables?.[tableId] || {}),
                                data
                            },
                        },
                    },
                },
            },
        }));
    };

    const handleTableNotesChange = (sectionId: string, tableId: string, notes: string) => {
        setHasUnsavedChanges(true);
        saveVersionRef.current++; // Increment version for race condition tracking

        setFormData(prev => ({
            ...prev,
            form_data: {
                ...prev.form_data,
                sections: {
                    ...prev.form_data.sections,
                    [sectionId]: {
                        ...prev.form_data.sections[sectionId],
                        tables: {
                            ...(prev.form_data.sections[sectionId]?.tables || {}),
                            [tableId]: {
                                ...(prev.form_data.sections[sectionId]?.tables?.[tableId] || {}),
                                notes,
                            },
                        },
                    },
                },
                table_notes: {
                    ...(prev.form_data.table_notes || {}),
                    [tableId]: notes,
                },
            },
        }));
    };

    const handleBasicInfoChange = (field: string, value: any) => {
        pushToHistory(formData);
        setHasUnsavedChanges(true);
        saveVersionRef.current++; // Increment version for race condition tracking

        setFormData(prev => {
            const newFormData = {
                ...prev,
                form_data: {
                    ...prev.form_data,
                    [field]: value,
                },
            };

            // Regenerate batch number when date changes
            if (field === 'report_date' && template) {
                newFormData.form_data.batch_number = generateBatchNumber(template, value);
            }

            return newFormData;
        });
    };

    // Use the dedicated service for smart filing
    const runSmartFiling = async (instanceData: FormInstance): Promise<string | null> => {
        try {
            return await import('../services/smartFilingService').then(m =>
                m.smartFilingService.applySmartFiling(instanceData, template!, profile)
            );
        } catch (error: any) {
            alert(`تحذير: حدث خطأ في إنشاء هيكل المجلدات:\n${error.message || 'خطأ غير معروف'}\n\nسيتم حفظ التقرير بدون تنظيمه في المجلدات.`);
            return null;
        }
    };


    const handleSubmit = async () => {
        if (!window.confirm('هل أنت متأكد من إرسال التقرير؟ لن تتمكن من التعديل بعد الإرسال.')) {
            return;
        }

        // Cancel any pending auto-saves
        autoSave.cancel();

        setIsSaving(true);
        try {
            const updatedData = {
                ...formData,
                status: 'submitted' as const,
                submitted_at: new Date().toISOString(),
                submitted_by: profile?.uid || undefined,
            };

            // ✅ FIX: Ensure folder_id from existingInstance is used if missing in local state
            if (!updatedData.folder_id && existingInstance?.folder_id) {
                console.log('  🔄 Using folder_id from existingInstance:', existingInstance.folder_id);
                updatedData.folder_id = existingInstance.folder_id;
            }

            if (existingInstance) {
                // For existing instances, update folder if not set
                if (!updatedData.folder_id) {
                    const folderId = await runSmartFiling(updatedData);
                    if (folderId) {
                        updatedData.folder_id = folderId;
                        // Update local state too
                        setFormData(prev => ({ ...prev, folder_id: folderId }));
                    }
                }
                await updateFormInstance(formData.instance_id, updatedData);
            } else {
                // For new instances, always apply Smart Filing
                const folderId = await runSmartFiling(updatedData);
                if (folderId) {
                    updatedData.folder_id = folderId;
                    setFormData(prev => ({ ...prev, folder_id: folderId }));
                }

                await addFormInstance(updatedData);

                // Increment batch
                if (template?.batch_configuration?.auto_increment && template.id) {
                    const currentNumber = template.batch_configuration.current_number || 0;
                    updateFormTemplate(template.id, {
                        batch_configuration: {
                            ...template.batch_configuration,
                            current_number: currentNumber + 1,
                        },
                    });
                }
            }

            setHasUnsavedChanges(false);

            // ✅ FIX: Close the current "Editor" tab before navigating to "Viewer"
            // This prevents race conditions where the TabBar tries to re-focus the editor state
            if (activeTabId) {
                const { closeTab } = useTabsStore.getState();
                // force=true (ignore dirty check since we saved), autoSwitch=false (we are navigating away manually)
                closeTab(activeTabId, true, false);
            }

            navigate(`/reports/view/${formData.instance_id}`, { replace: true });
        } catch (error) {
            console.error('Submit failed:', error);
            alert('حدث خطأ أثناء الإرسال');
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveDraft = async () => {
        setIsSaving(true);
        setSaveError(null); // Clear previous error
        try {
            const dataToSave = { ...formData };

            if (existingInstance) {
                await updateFormInstance(formData.instance_id, dataToSave);
            } else {
                // For new drafts, apply Smart Filing to save in correct folder
                if (!dataToSave.folder_id) {
                    const folderId = await runSmartFiling(dataToSave);
                    if (folderId) {
                        dataToSave.folder_id = folderId;
                        // Update local state with the folder_id
                        setFormData(prev => ({ ...prev, folder_id: folderId }));
                    }
                }
                await addFormInstance(dataToSave);
            }
            setLastSaved(new Date());
            setHasUnsavedChanges(false); // Clear dirty flag on SUCCESS
        } catch (error: any) {
            console.error('Save failed:', error);
            setSaveError(error.message || 'فشل الحفظ');
            alert('فشل الحفظ: يرجى التحقق من الاتصال');
        } finally {
            setIsSaving(false);
        }
    };

    // Navigation guard
    usePrompt(
        'هل أنت متأكد من المغادرة؟ لديك تغييرات غير محفوظة. سيتم فقدان البيانات إذا تابعت.',
        hasUnsavedChanges && !isSaving
    );

    // Warn before leaving page with unsaved changes (Browser refresh/close)
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

    // Handle back navigation with unsaved changes confirmation
    const handleBack = () => {
        if (hasUnsavedChanges) {
            if (window.confirm('لديك تغييرات غير محفوظة. هل تريد المغادرة بدون حفظ؟')) {
                navigate(-1);
            }
        } else {
            navigate(-1);
        }
    };

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Ignore if active element is an input or textarea to avoid conflicts (except for special keys)
            // But we WANT to intercept Ctrl+Z/Y/S

            if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
                e.preventDefault();
                if (e.shiftKey) {
                    redo();
                } else {
                    undo();
                }
            } else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
                e.preventDefault();
                redo();
            } else if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                handleSaveDraft();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [undo, redo, handleSaveDraft]);

    if (!template) {
        return (
            <div className="h-full flex items-center justify-center">
                <div className="text-center">
                    <p className="text-gray-500 dark:text-gray-400 mb-4">لم يتم العثور على النموذج</p>
                    <button
                        onClick={() => navigate(-1)}
                        className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                    >
                        العودة
                    </button>
                </div>
            </div>
        );
    }

    const sections = Object.values(template.sections || {}).sort((a, b) => a.order - b.order);
    const currentSection = sections.find(s => s.id === activeSection);

    return (
        <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900">
            {/* Header */}
            <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={handleBack}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                        >
                            <ArrowLeftIcon className="w-5 h-5" />
                        </button>
                        <div>
                            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                                {template.name}
                            </h1>
                            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                                <span>الإصدار {template.version}</span>
                                {saveError && (
                                    <>
                                        <span>•</span>
                                        <span className="flex items-center gap-1 text-red-600 dark:text-red-400">
                                            <ExclamationCircleIcon className="w-4 h-4" />
                                            خطأ في الحفظ
                                        </span>
                                    </>
                                )}
                                {!saveError && lastSaved && (
                                    <>
                                        <span>•</span>
                                        <span className="flex items-center gap-1">
                                            <CloudArrowUpIcon className="w-4 h-4" />
                                            آخر حفظ: {lastSaved.toLocaleTimeString('ar-EG')}
                                        </span>
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
                            onClick={handleSaveDraft}
                            disabled={isSaving}
                            className="flex items-center gap-2 px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                        >
                            <DocumentArrowDownIcon className="w-5 h-5" />
                            حفظ كمسودة
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={isSaving}
                            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                        >
                            <PaperAirplaneIcon className="w-5 h-5" />
                            إرسال التقرير
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex overflow-hidden">
                {/* Section Navigation */}
                <div className="w-64 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 overflow-y-auto">
                    <div className="p-4">
                        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
                            الأقسام
                        </h3>
                        <div className="space-y-1">
                            {sections.map((section, sectionIndex) => (
                                <button
                                    key={section.id || `section-${sectionIndex}`}
                                    onClick={() => setActiveSection(section.id)}
                                    className={cn(
                                        'w-full text-right px-3 py-2 rounded-lg text-sm transition-colors',
                                        activeSection === section.id
                                            ? 'bg-primary-50 dark:bg-primary-900 text-primary-700 dark:text-primary-300 font-medium'
                                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                                    )}
                                >
                                    {section.name}
                                </button>
                            ))}

                            {/* Quality Criteria Sidebar Item */}
                            {template.quality_criteria && template.quality_criteria.length > 0 && (
                                <button
                                    onClick={() => setActiveSection('quality_criteria')}
                                    className={cn(
                                        'w-full text-right px-3 py-2 rounded-lg text-sm transition-colors mt-2 border-t border-gray-100 dark:border-gray-700 pt-3',
                                        activeSection === 'quality_criteria'
                                            ? 'bg-primary-50 dark:bg-primary-900 text-primary-700 dark:text-primary-300 font-medium'
                                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                                    )}
                                >
                                    معايير الجودة والقبول
                                </button>
                            )}

                            {/* Template Notes Sidebar Item */}
                            {template.notes && (
                                <button
                                    onClick={() => setActiveSection('template_notes')}
                                    className={cn(
                                        'w-full text-right px-3 py-2 rounded-lg text-sm transition-colors mt-1',
                                        activeSection === 'template_notes'
                                            ? 'bg-primary-50 dark:bg-primary-900 text-primary-700 dark:text-primary-300 font-medium'
                                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                                    )}
                                >
                                    ملاحظات هامة
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Basic Info */}
                    <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
                            معلومات التقرير
                        </h3>
                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                                    التاريخ
                                </label>
                                <input
                                    type="date"
                                    value={formData.form_data.report_date}
                                    onChange={(e) => handleBasicInfoChange('report_date', e.target.value)}
                                    className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                                    الوردية
                                </label>
                                <select
                                    value={formData.form_data.shift || 'A'}
                                    onChange={(e) => handleBasicInfoChange('shift', e.target.value)}
                                    className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700"
                                >
                                    <option value="A">الوردية A</option>
                                    <option value="B">الوردية B</option>
                                    {/* Only show Shift C if duration is 8 hours (or not set, defaulting to 8) */}
                                    {(!formData.form_data.shift_duration || formData.form_data.shift_duration === 8) && (
                                        <option value="C">الوردية C</option>
                                    )}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                                    عدد ساعات الوردية
                                </label>
                                <select
                                    value={formData.form_data.shift_duration || 8}
                                    onChange={(e) => {
                                        const newDuration = parseInt(e.target.value);
                                        // If switching to 12 hours and current shift is C, reset to A
                                        if (newDuration === 12 && formData.form_data.shift === 'C') {
                                            handleBasicInfoChange('shift', 'A');
                                        }
                                        handleBasicInfoChange('shift_duration', newDuration);
                                    }}
                                    className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700"
                                >
                                    <option value={8}>8 ساعات</option>
                                    <option value={12}>12 ساعة</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                                    بداية الفحص
                                </label>
                                <input
                                    type="time"
                                    value={formData.form_data.inspection_start_time || '08:00'}
                                    onChange={(e) => handleBasicInfoChange('inspection_start_time', e.target.value)}
                                    className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700"
                                />
                            </div>
                            {/* Hide batch number for data-collection type */}
                            {template.type !== 'data-collection' && (
                                <div>
                                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                                        رقم الدُفعة
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.form_data.batch_number || ''}
                                        readOnly
                                        className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 bg-gray-100 dark:bg-gray-600 cursor-not-allowed"
                                        title="يتم توليد رقم الدُفعة تلقائياً بناءً على إعدادات النموذج"
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Form Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {activeSection === 'quality_criteria' ? (
                        <div className="space-y-6">
                            <div className="flex items-center gap-2 mb-4">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                    معايير الجودة والقبول
                                </h3>
                                <span className="text-sm text-gray-500 dark:text-gray-400">
                                    - مرجع المواصفات القياسية
                                </span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {template.quality_criteria?.map((criteria, index) => (
                                    <div key={criteria.id || index} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-gray-800">
                                        <div className={cn(
                                            "px-4 py-2 font-bold text-sm border-b border-gray-200 dark:border-gray-700",
                                            criteria.color || 'bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white'
                                        )}>
                                            {criteria.title}
                                        </div>
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="bg-gray-50 dark:bg-gray-900 text-gray-500 dark:text-gray-400">
                                                    <th className="border-b border-gray-200 dark:border-gray-700 px-3 py-2 text-right font-medium">المعلمة</th>
                                                    <th className="border-b border-gray-200 dark:border-gray-700 px-3 py-2 text-center font-medium">المواصفة</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {criteria.items.map((item, itemIndex) => (
                                                    <tr key={itemIndex} className="border-b border-gray-100 dark:border-gray-700 last:border-0">
                                                        <td className="px-3 py-2 text-gray-700 dark:text-gray-300">{item.parameter}</td>
                                                        <td className="px-3 py-2 text-center font-mono text-gray-600 dark:text-gray-400 text-xs bg-gray-50/50 dark:bg-gray-800/50" dir="ltr">{item.specification}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                        <div className="px-3 py-2 text-xs bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
                                            <span className="font-bold text-gray-700 dark:text-gray-300">معيار القبول:</span> <span className="text-gray-600 dark:text-gray-400">{criteria.acceptance}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : activeSection === 'template_notes' ? (
                        <div className="space-y-6">
                            <div className="flex items-center gap-2 mb-4">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                    ملاحظات هامة
                                </h3>
                                <span className="text-sm text-gray-500 dark:text-gray-400">
                                    - تعليمات وتنبيهات
                                </span>
                            </div>

                            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800/50 rounded-lg p-6">
                                <div
                                    className="prose prose-sm max-w-none dark:prose-invert text-gray-800 dark:text-gray-200"
                                    dangerouslySetInnerHTML={{ __html: template.notes || '' }}
                                />
                            </div>
                        </div>
                    ) : currentSection ? (
                        <FormRenderer
                            section={currentSection}
                            formData={formData.form_data.sections[currentSection.id]}
                            onChange={(tableId, data) => handleFormDataChange(currentSection.id, tableId, data)}
                            onTableNotesChange={(tableId, notes) => handleTableNotesChange(currentSection.id, tableId, notes)}
                            tableNotes={formData.form_data.table_notes || {}}
                            onStoppedTimesChange={(groupId, stoppedTimes) => {
                                setFormData(prev => ({
                                    ...prev,
                                    form_data: {
                                        ...prev.form_data,
                                        stopped_times: {
                                            ...(prev.form_data.stopped_times || {}),
                                            [groupId]: stoppedTimes,
                                        },
                                    },
                                }));
                            }}
                            stoppedTimesByGroup={formData.form_data.stopped_times || {}}
                            template={template}
                            inspectionStartTime={formData.form_data.inspection_start_time || '08:00'}
                            shiftDuration={formData.form_data.shift_duration || 8}
                        />
                    ) : (
                        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                            اختر قسماً للبدء
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DataEntryPage;
