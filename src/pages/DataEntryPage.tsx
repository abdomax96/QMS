import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
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
import { convertQuantity } from '../utils/unitConversion';
import { useSupabaseAuth } from '../hooks/useSupabaseAuth';
import { useFormCollaboration } from '../hooks/useFormCollaboration';
import type { FormTemplate, FormInstance } from '../types';
import FormRenderer, {
    type FormTableCellChange,
    type FormTableChangeMetadata,
} from '../components/forms/FormRenderer';
import CollaborationPanel, {
    type CollaborationActivityItem,
} from '../components/collaboration/CollaborationPanel';
import collaborationTelemetryService from '../services/collaborationTelemetryService';
import { foldersService } from '../services/supabaseService';
import { variableService } from '../services/variableService';
import { useTabsStore } from '../store/tabsStore';
import { useToastStore } from '../store/toastStore';
import {
    applyDocumentVariableBindingsToTemplate,
    buildDocumentVariableSnapshot,
    type DocumentVariableSnapshot,
} from '../utils/documentVariableBindings';

const REPORT_COLLAB_ENABLED = !['0', 'false'].includes(
    String(import.meta.env.VITE_REPORT_COLLAB_ENABLED ?? '1').toLowerCase()
);
const EDITABLE_REPORT_STATUSES = new Set(['draft', 'in_progress', 'rejected']);
const HYDRATION_FETCH_TIMEOUT_MS = 3500;
const HYDRATION_FETCH_MAX_ATTEMPTS = 1;
const HYDRATION_FETCH_RETRY_DELAY_MS = 500;
const HYDRATION_WAIT_FAILSAFE_MS = 7000;
const HYDRATION_AUTO_RETRY_MAX_ATTEMPTS = 4;
const HYDRATION_AUTO_RETRY_BASE_DELAY_MS = 1200;
const HYDRATION_AUTO_RETRY_MAX_DELAY_MS = 6000;
const REPORT_STATUS_LABELS: Record<string, string> = {
    draft: 'مسودة',
    in_progress: 'قيد التنفيذ',
    rejected: 'مرفوض',
    submitted: 'مرسل',
    approved: 'معتمد',
    under_review: 'قيد المراجعة',
    archived: 'مؤرشف',
};

type ChangeScope = 'cell' | 'table_notes' | 'basic_field' | 'section' | 'other';

interface InstanceChangeLogEntry {
    id: string;
    change_scope: ChangeScope;
    change_path: string[] | null;
    section_id: string | null;
    table_id: string | null;
    row_index: number | null;
    col_index: number | null;
    old_value: any;
    new_value: any;
    changed_by_name: string | null;
    changed_at: string | null;
}

const describeActivityScope = (
    scope: ChangeScope,
    sectionId?: string | null,
    tableId?: string | null,
    rowIndex?: number | null,
    colIndex?: number | null,
    changePath?: string[] | null
): string => {
    if (scope === 'cell') {
        const rowText = typeof rowIndex === 'number' ? rowIndex + 1 : '-';
        const colText = typeof colIndex === 'number' ? colIndex + 1 : '-';
        const isUuidLike =
            typeof tableId === 'string' &&
            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(tableId);
        const tableLabel = tableId && !isUuidLike ? tableId : 'الجدول';
        return `تعديل خلية في ${tableLabel} (صف ${rowText}، عمود ${colText})`;
    }

    if (scope === 'table_notes') {
        return `تعديل ملاحظات ${tableId || 'الجدول'}`;
    }

    if (scope === 'basic_field') {
        const fieldName = changePath?.[0] || 'حقل أساسي';
        return `تعديل الحقل ${fieldName}`;
    }

    if (scope === 'section') {
        const sectionName = sectionId || changePath?.[1] || 'قسم';
        return `تعديل في القسم ${sectionName}`;
    }

    return 'تعديل عام على التقرير';
};

interface ActivityCellTarget {
    sectionId: string;
    tableId: string;
    rowIndex: number;
    colIndex: number;
}

const extractCellTargetFromChangePath = (
    changePath?: string[] | null
): ActivityCellTarget | null => {
    if (!Array.isArray(changePath) || changePath.length < 7) {
        return null;
    }

    const [root, sectionId, tablesKey, tableId, dataKey, rowToken, colToken] = changePath;
    if (root !== 'sections' || tablesKey !== 'tables' || dataKey !== 'data') {
        return null;
    }

    const rowIndex = Number(rowToken);
    const colIndex = Number(colToken);

    if (
        !sectionId ||
        !tableId ||
        !Number.isInteger(rowIndex) ||
        !Number.isInteger(colIndex) ||
        rowIndex < 0 ||
        colIndex < 0
    ) {
        return null;
    }

    return {
        sectionId,
        tableId,
        rowIndex,
        colIndex,
    };
};

const extractCellTargetFromActivityItem = (
    item: CollaborationActivityItem
): ActivityCellTarget | null => {
    if (
        item.scope === 'cell' &&
        item.sectionId &&
        item.tableId &&
        typeof item.rowIndex === 'number' &&
        Number.isInteger(item.rowIndex) &&
        item.rowIndex >= 0 &&
        typeof item.colIndex === 'number' &&
        Number.isInteger(item.colIndex) &&
        item.colIndex >= 0
    ) {
        return {
            sectionId: item.sectionId,
            tableId: item.tableId,
            rowIndex: item.rowIndex,
            colIndex: item.colIndex,
        };
    }

    return extractCellTargetFromChangePath(item.changePath);
};

const escapeCssAttributeValue = (value: string): string => {
    if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') {
        return CSS.escape(value);
    }

    return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
};

const previewValue = (value: any): string => {
    if (value === null || value === undefined) {
        return 'null';
    }

    const asString =
        typeof value === 'string' ? value : JSON.stringify(value);
    const normalized = String(asString).replace(/\s+/g, ' ').trim();
    if (!normalized) {
        return '""';
    }

    return normalized.length > 44 ? `${normalized.slice(0, 41)}...` : normalized;
};

const formatValueDelta = (oldValue: any, newValue: any): string | undefined => {
    const oldPreview = previewValue(oldValue);
    const newPreview = previewValue(newValue);
    if (oldPreview === newPreview) {
        return undefined;
    }

    return `${oldPreview} -> ${newPreview}`;
};

const createSafeReportFormData = (input: any = {}) => {
    const source = input && typeof input === 'object' ? input : {};
    const sections =
        source.sections && typeof source.sections === 'object' ? source.sections : {};
    const tableNotes =
        source.table_notes && typeof source.table_notes === 'object' ? source.table_notes : {};
    const stoppedTimes =
        source.stopped_times && typeof source.stopped_times === 'object' ? source.stopped_times : {};
    const documentVariablesSnapshot =
        source.document_variables_snapshot && typeof source.document_variables_snapshot === 'object'
            ? source.document_variables_snapshot
            : undefined;

    return {
        ...source,
        report_date: typeof source.report_date === 'string' ? source.report_date : '',
        shift: typeof source.shift === 'string' && source.shift ? source.shift : 'A',
        shift_duration:
            typeof source.shift_duration === 'number' ? source.shift_duration : 8,
        sections,
        table_notes: tableNotes,
        stopped_times: stoppedTimes,
        document_variables_snapshot: documentVariablesSnapshot,
        document_variables_source_document_id:
            typeof source.document_variables_source_document_id === 'string'
                ? source.document_variables_source_document_id
                : null,
        document_variables_snapshot_at:
            typeof source.document_variables_snapshot_at === 'string'
                ? source.document_variables_snapshot_at
                : undefined,
    };
};

const normalizeFormInstanceForEditing = (instance: FormInstance): FormInstance => ({
    ...instance,
    form_data: createSafeReportFormData(instance?.form_data),
});

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
    const location = useLocation();
    // ... rest of component ...
    const {
        formTemplates,
        formInstances,
        addFormInstance,
        updateFormInstance,
        updateFormTemplate,
        syncInstance,
        currentFolderId,
        user,
    } = useStore();

    // Tabs Store Integration
    const {
        tabs,
        activeTabId,
        openTab,
        updateTabState,
        markDirty,
        getActiveTab,
        pushUndo,
        undo: undoTab,
        redo: redoTab,
        canUndo,
        canRedo
    } = useTabsStore();

    // Use Supabase Auth for real user ID (UUID)
    const { profile, session, loading: authLoading } = useSupabaseAuth();
    const authUserId = profile?.uid || session?.user?.id || '';
    const addToast = useToastStore((state) => state.addToast);
    const duplicateReportWarningRef = useRef<string | null>(null);

    const [isSaving, setIsSaving] = useState(false);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);
    const [activeSection, setActiveSection] = useState<string | null>(null);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [isMobile, setIsMobile] = useState(false);
    const [tabsCollaborationSlot, setTabsCollaborationSlot] = useState<HTMLElement | null>(null);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const mediaQuery = window.matchMedia('(max-width: 1023px)');
        const updateViewport = () => setIsMobile(mediaQuery.matches);

        updateViewport();
        if (mediaQuery.addEventListener) {
            mediaQuery.addEventListener('change', updateViewport);
        } else {
            mediaQuery.addListener(updateViewport);
        }

        return () => {
            if (mediaQuery.removeEventListener) {
                mediaQuery.removeEventListener('change', updateViewport);
            } else {
                mediaQuery.removeListener(updateViewport);
            }
        };
    }, []);

    useEffect(() => {
        if (typeof document === 'undefined') {
            return;
        }

        setTabsCollaborationSlot(document.getElementById('tabs-collaboration-slot'));
    }, []);

    // Version tracking for race condition prevention
    const saveVersionRef = useRef(0);
    const [hydratedTemplateId, setHydratedTemplateId] = useState<string | null>(null);

    // Get template ID
    const actualTemplateId =
        templateId || hydratedTemplateId || (instanceId ? formInstances[instanceId]?.template_id : null);
    const activeSectionStorageKey = useMemo(() => {
        if (instanceId) return `qms:data-entry:active-section:instance:${instanceId}`;
        if (templateId) return `qms:data-entry:active-section:template:${templateId}`;
        if (actualTemplateId) return `qms:data-entry:active-section:template:${actualTemplateId}`;
        return null;
    }, [actualTemplateId, instanceId, templateId]);

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
    const entryPath = instanceId
        ? `/reports/edit/${instanceId}`
        : templateId
            ? `/reports/new/${templateId}`
            : null;
    const entryTabTitle = useMemo(() => {
        if (instanceId) {
            if (existingInstance?.name) return existingInstance.name;
            if (template?.name) return `مسودة - ${template.name}`;
            return 'تعديل مسودة';
        }

        if (templateId) {
            if (template?.name) return `تقرير جديد - ${template.name}`;
            return 'تقرير جديد';
        }

        return 'تقرير';
    }, [instanceId, templateId, template?.name, existingInstance?.name]);

    // Ensure Data Entry routes always have a visible tab (especially draft edit flow).
    useEffect(() => {
        if (!entryPath) {
            return;
        }

        const formIdForTab = instanceId || templateId;
        if (!formIdForTab) {
            return;
        }

        const folderIdFromQuery =
            new URLSearchParams(location.search).get('folderId') ||
            new URLSearchParams(location.search).get('folder');

        const returnPath =
            existingInstance?.folder_id
                ? `/forms&reports/${existingInstance.folder_id}`
                : folderIdFromQuery
                    ? `/forms&reports/${folderIdFromQuery}`
                    : currentFolderId
                        ? `/forms&reports/${currentFolderId}`
                        : '/forms&reports';

        openTab('instance', formIdForTab, entryTabTitle, entryPath, returnPath);
    }, [
        currentFolderId,
        entryPath,
        entryTabTitle,
        existingInstance?.folder_id,
        instanceId,
        location.pathname,
        location.search,
        openTab,
        templateId,
    ]);

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
                return normalizeFormInstanceForEditing(activeTab.state as FormInstance);
            }
        }

        // 2. Fallback to standard loading logic
        if (existingInstance) {
            return normalizeFormInstanceForEditing(existingInstance);
        }

        // Generate batch number from template config
        const batchNumber = template ? generateBatchNumber(template) : '';

        // Create new instance
        return {
            instance_id: instanceId || generateId(),
            template_id: actualTemplateId || templateId || '',
            template_version: String(template?.version || 1),
            folder_id: null, // Will be set by Smart Filing on first save
            status: 'draft',
            created_at: new Date().toISOString(),
            created_by: authUserId || '',
            form_data: {
                report_date: new Date().toISOString().split('T')[0],
                shift: 'A',
                shift_duration: 8,
                batch_number: batchNumber,
                sections: {},
                document_variables_snapshot: undefined,
                document_variables_source_document_id: null,
                document_variables_snapshot_at: undefined,
            },
            signatures: [],
            attachments: [],
        };
    });

    const safeFormData = useMemo(
        () => createSafeReportFormData(formData.form_data),
        [formData.form_data]
    );
    const documentVariableSnapshot = useMemo(() => {
        const snapshot = safeFormData.document_variables_snapshot;
        if (!snapshot || typeof snapshot !== 'object') {
            return undefined;
        }
        return snapshot as DocumentVariableSnapshot;
    }, [safeFormData.document_variables_snapshot]);
    const templateForRendering = useMemo(() => {
        if (!template) return template;
        if (!documentVariableSnapshot || Object.keys(documentVariableSnapshot).length === 0) {
            return template;
        }

        return applyDocumentVariableBindingsToTemplate(template, documentVariableSnapshot);
    }, [documentVariableSnapshot, template]);
    const latestFormDataRef = useRef(formData);
    const lastSaveToastAtRef = useRef(0);

    useEffect(() => {
        latestFormDataRef.current = formData;
    }, [formData]);

    useEffect(() => {
        if (!activeSectionStorageKey || typeof window === 'undefined') return;

        const savedSection = window.sessionStorage.getItem(activeSectionStorageKey);
        if (savedSection) {
            setActiveSection(savedSection);
        }
    }, [activeSectionStorageKey]);

    useEffect(() => {
        if (!activeSectionStorageKey || !activeSection || typeof window === 'undefined') return;
        window.sessionStorage.setItem(activeSectionStorageKey, activeSection);
    }, [activeSection, activeSectionStorageKey]);

    const notifySaveSuccess = useCallback(() => {
        const now = Date.now();
        if (now - lastSaveToastAtRef.current < 1200) {
            return;
        }

        lastSaveToastAtRef.current = now;
        addToast({
            type: 'success',
            message: 'تم حفظ التعديلات',
            duration: 1600,
        });
    }, [addToast]);

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

    const isEditingExistingInstance = Boolean(instanceId);
    const lastSnapshotProductIdRef = useRef<string | null>(null);
    const hasLocalFullInstanceSnapshot = Boolean(
        isEditingExistingInstance && existingInstance && (existingInstance as any).form_data != null
    );
    const didHydrateLatestInstanceRef = useRef(false);
    const [hydrationError, setHydrationError] = useState<string | null>(null);
    const [hydrateRetryNonce, setHydrateRetryNonce] = useState(0);
    const [hydrationAutoRetryCount, setHydrationAutoRetryCount] = useState(0);
    const [hydrationCanAutoRetry, setHydrationCanAutoRetry] = useState(true);
    const [hasHydratedExistingInstance, setHasHydratedExistingInstance] = useState(
        !isEditingExistingInstance || hasLocalFullInstanceSnapshot
    );

    useEffect(() => {
        if (isEditingExistingInstance) {
            return;
        }

        const productId = template?.basic_info?.product_id || null;
        if (!productId) {
            return;
        }

        const existingSnapshot = safeFormData.document_variables_snapshot;
        if (existingSnapshot && Object.keys(existingSnapshot).length > 0) {
            lastSnapshotProductIdRef.current = productId;
            return;
        }

        if (lastSnapshotProductIdRef.current === productId) {
            return;
        }
        lastSnapshotProductIdRef.current = productId;

        let cancelled = false;
        const captureSnapshot = async () => {
            try {
                const context = await variableService.getDocumentVariablesContextByProduct(productId);
                if (cancelled) return;

                const snapshot = buildDocumentVariableSnapshot(
                    (context.variables || []).map((variable) => ({
                        name: variable.name,
                        value: variable.value,
                    }))
                );

                setFormData((prev) => {
                    const prevSafe = createSafeReportFormData(prev.form_data);
                    const prevSnapshot = prevSafe.document_variables_snapshot;
                    if (prevSnapshot && Object.keys(prevSnapshot).length > 0) {
                        return prev;
                    }

                    return {
                        ...prev,
                        form_data: {
                            ...prevSafe,
                            document_variables_snapshot: snapshot,
                            document_variables_source_document_id: context.sourceDocumentId || null,
                            document_variables_snapshot_at: new Date().toISOString(),
                        },
                    };
                });
            } catch (error) {
                console.error('[DataEntry] Failed to capture document variable snapshot:', error);
                lastSnapshotProductIdRef.current = null;
            }
        };

        void captureSnapshot();
        return () => {
            cancelled = true;
        };
    }, [
        isEditingExistingInstance,
        safeFormData.document_variables_snapshot,
        template?.basic_info?.product_id,
    ]);

    // Sync instance snapshot from store before the first local edit.
    // This covers same-ID updates that arrive after initial mount.
    useEffect(() => {
        if (!existingInstance) {
            return;
        }

        // Progressive loader may provide lightweight rows without form_data.
        // Never let partial snapshots overwrite editor state.
        if (instanceId && (existingInstance as any).form_data == null) {
            return;
        }

        // Don't overwrite local unsaved edits.
        if (saveVersionRef.current > 0 || hasUnsavedChanges) {
            return;
        }

        const normalized = normalizeFormInstanceForEditing(existingInstance);
        setFormData((prev) => {
            const sameId = prev.instance_id === normalized.instance_id;
            const sameStatus = prev.status === normalized.status;
            const sameFormData =
                JSON.stringify(createSafeReportFormData(prev.form_data)) ===
                JSON.stringify(createSafeReportFormData(normalized.form_data));

            return sameId && sameStatus && sameFormData ? prev : normalized;
        });
    }, [existingInstance, hasUnsavedChanges, instanceId]);

    const requestHydrationRetry = useCallback(
        (options?: { preserveAutoRetryCount?: boolean; clearError?: boolean }) => {
            if (!instanceId) {
                return;
            }

            didHydrateLatestInstanceRef.current = false;
            if (options?.clearError ?? true) {
                setHydrationError(null);
            }
            setHydrationCanAutoRetry(true);
            setHasHydratedExistingInstance(false);
            if (!options?.preserveAutoRetryCount) {
                setHydrationAutoRetryCount(0);
            }
            setHydrateRetryNonce((prev) => prev + 1);
        },
        [instanceId]
    );

    // Always hydrate from the latest server snapshot on page open.
    // This avoids stale local store data after hard refresh.
    useEffect(() => {
        if (!instanceId) {
            setHasHydratedExistingInstance(true);
            setHydrationError(null);
            return;
        }

        const hasLocalSnapshot = hasLocalFullInstanceSnapshot;
        if (hasLocalSnapshot) {
            setHasHydratedExistingInstance(true);
        }

        if (didHydrateLatestInstanceRef.current) {
            return;
        }

        didHydrateLatestInstanceRef.current = true;
        let isCancelled = false;
        let hydratedSuccessfully = false;
        if (!hasLocalSnapshot) {
            setHasHydratedExistingInstance(false);
        }
        setHydrationCanAutoRetry(true);

        const hydrateLatestFromServer = async () => {
            try {
                const { instancesService } = await import('../services/supabaseService');
                type HydrationFetchResult =
                    | { kind: 'data'; value: FormInstance | null }
                    | { kind: 'timeout' };

                const fetchWithTimeout = async (): Promise<HydrationFetchResult> =>
                    await Promise.race([
                        instancesService
                            .getInstance(instanceId, { throwOnError: true })
                            .then((value) => ({ kind: 'data', value } as const)),
                        new Promise<HydrationFetchResult>((resolve) => {
                            window.setTimeout(() => resolve({ kind: 'timeout' }), HYDRATION_FETCH_TIMEOUT_MS);
                        }),
                    ]);

                let latest: FormInstance | null = null;
                let reachedTimeout = false;
                let missingSnapshot = false;
                for (let attempt = 1; attempt <= HYDRATION_FETCH_MAX_ATTEMPTS; attempt++) {
                    const result = await fetchWithTimeout();
                    if (result.kind === 'data' && result.value) {
                        latest = result.value;
                        break;
                    }

                    if (result.kind === 'timeout') {
                        reachedTimeout = true;
                    } else {
                        missingSnapshot = true;
                        break;
                    }

                    if (attempt < HYDRATION_FETCH_MAX_ATTEMPTS) {
                        await new Promise<void>((resolve) => {
                            window.setTimeout(() => resolve(), HYDRATION_FETCH_RETRY_DELAY_MS);
                        });
                    }
                }

                if (isCancelled) {
                    return;
                }

                if (!latest) {
                    const message = hasLocalSnapshot
                        ? 'تعذر جلب أحدث نسخة من الخادم. تم عرض آخر نسخة متاحة محلياً.'
                        : missingSnapshot
                            ? 'تعذر فتح التقرير. قد لا تملك صلاحية الوصول أو أن التقرير غير موجود.'
                            : 'تأخر تحميل التقرير من الخادم. سيتم إعادة المحاولة تلقائيًا.';
                    setHydrationError(message);
                    setSaveError(message);
                    setHydrationCanAutoRetry(reachedTimeout && !missingSnapshot);
                    if (!hasLocalSnapshot) {
                        // Pause retry loop for fatal "missing/forbidden" cases.
                        didHydrateLatestInstanceRef.current = !reachedTimeout || missingSnapshot;
                    }
                    return;
                }

                // Do not overwrite local edits if user already started typing.
                if (saveVersionRef.current > 0) {
                    hydratedSuccessfully = true;
                    return;
                }

                const normalized = normalizeFormInstanceForEditing(latest);
                setFormData(normalized);
                setHasBeenSaved(true);
                setHydratedTemplateId(latest.template_id || null);
                syncInstance(normalized);
                setSaveError(null);
                setHydrationError(null);
                setHydrationCanAutoRetry(true);
                setHydrationAutoRetryCount(0);
                hydratedSuccessfully = true;
            } catch (error) {
                console.warn('[DataEntry] Failed to hydrate latest instance on mount:', error);
                if (isCancelled) {
                    return;
                }

                const errorMessage = String((error as any)?.message || '').toLowerCase();
                const isPermissionOrAuthError =
                    errorMessage.includes('permission') ||
                    errorMessage.includes('forbidden') ||
                    errorMessage.includes('not allowed') ||
                    errorMessage.includes('not authorized') ||
                    errorMessage.includes('auth') ||
                    errorMessage.includes('jwt') ||
                    errorMessage.includes('rls');

                const message = hasLocalSnapshot
                    ? 'تعذر جلب أحدث نسخة من الخادم. تم عرض آخر نسخة متاحة محلياً.'
                    : isPermissionOrAuthError
                        ? 'تعذر فتح التقرير بسبب الصلاحيات. تأكد من صلاحية العرض/التحرير لهذا القسم.'
                        : 'تعذر تحميل أحدث نسخة من التقرير من الخادم. سيتم إعادة المحاولة تلقائياً.';
                setHydrationError(message);
                setSaveError(message);
                setHydrationCanAutoRetry(!isPermissionOrAuthError);
                if (!hasLocalSnapshot) {
                    didHydrateLatestInstanceRef.current = isPermissionOrAuthError;
                }
            } finally {
                if (!isCancelled && (hydratedSuccessfully || hasLocalSnapshot)) {
                    setHasHydratedExistingInstance(true);
                }
            }
        };

        void hydrateLatestFromServer();

        return () => {
            isCancelled = true;
            // Avoid deadlock: if this run was interrupted before completion,
            // allow the next render/effect run to start hydration again.
            if (!hydratedSuccessfully && !hasLocalSnapshot) {
                didHydrateLatestInstanceRef.current = false;
            }
        };
    }, [hasLocalFullInstanceSnapshot, hydrateRetryNonce, instanceId, syncInstance]);

    // Auto-retry hydration when no local snapshot exists and initial fetch fails.
    useEffect(() => {
        if (
            !instanceId ||
            hasHydratedExistingInstance ||
            !hydrationError ||
            !hydrationCanAutoRetry
        ) {
            return;
        }

        if (hydrationAutoRetryCount >= HYDRATION_AUTO_RETRY_MAX_ATTEMPTS) {
            return;
        }

        const retryDelay = Math.min(
            HYDRATION_AUTO_RETRY_BASE_DELAY_MS * Math.pow(2, hydrationAutoRetryCount),
            HYDRATION_AUTO_RETRY_MAX_DELAY_MS
        );

        const retryTimer = window.setTimeout(() => {
            setHydrationAutoRetryCount((prev) => prev + 1);
            requestHydrationRetry({ preserveAutoRetryCount: true, clearError: false });
        }, retryDelay);

        return () => {
            window.clearTimeout(retryTimer);
        };
    }, [
        hasHydratedExistingInstance,
        hydrationAutoRetryCount,
        hydrationCanAutoRetry,
        hydrationError,
        instanceId,
        requestHydrationRetry,
    ]);

    // Failsafe: never allow endless spinner on hydration.
    useEffect(() => {
        if (
            !instanceId ||
            hasHydratedExistingInstance ||
            hydrationError ||
            !hydrationCanAutoRetry
        ) {
            return;
        }

        const timerId = window.setTimeout(() => {
            const message = 'تأخر تحميل أحدث نسخة من التقرير. سيتم إعادة المحاولة تلقائيًا.';
            setHydrationError(message);
            setSaveError((prev) => prev || message);
            didHydrateLatestInstanceRef.current = false;
        }, HYDRATION_WAIT_FAILSAFE_MS);

        return () => {
            window.clearTimeout(timerId);
        };
    }, [hasHydratedExistingInstance, hydrationCanAutoRetry, hydrationError, instanceId]);

    // Track if this instance has been saved before
    const [hasBeenSaved, setHasBeenSaved] = useState(Boolean(instanceId || existingInstance));

    // Update hasBeenSaved when existingInstance changes
    useEffect(() => {
        if (existingInstance) {
            setHasBeenSaved(true);
        }
    }, [existingInstance]);

    const hydrationAutoRetryExhausted =
        hydrationAutoRetryCount >= HYDRATION_AUTO_RETRY_MAX_ATTEMPTS;
    const hydrationNextRetryDelaySeconds = Math.ceil(
        Math.min(
            HYDRATION_AUTO_RETRY_BASE_DELAY_MS * Math.pow(2, hydrationAutoRetryCount),
            HYDRATION_AUTO_RETRY_MAX_DELAY_MS
        ) / 1000
    );

    const isReportEditable = EDITABLE_REPORT_STATUSES.has(formData.status);

    const collaborationEnabled = Boolean(
        REPORT_COLLAB_ENABLED &&
        formData.instance_id &&
        (isEditingExistingInstance || hasBeenSaved || existingInstance) &&
        (!instanceId || hasHydratedExistingInstance) &&
        !authLoading &&
        isReportEditable
    );
    const shouldPersistThroughCollabPatches =
        collaborationEnabled && Boolean(isEditingExistingInstance || hasBeenSaved || existingInstance);

    const {
        isConnected: isCollaborationConnected,
        connectionStatus: collaborationConnectionStatus,
        reconnectAttempt: collaborationReconnectAttempt,
        activeUsers: collaborationUsers,
        recentChanges,
        recentPatches,
        broadcastCellChange,
        applyAndBroadcastPatch,
        getInstanceChangeLog,
        reconnectNow: reconnectCollaboration,
        error: collaborationError,
    } = useFormCollaboration(formData.instance_id, {
        enabled: collaborationEnabled,
        showNotifications: true,
    });

    useEffect(() => {
        if (!collaborationEnabled || collaborationConnectionStatus !== 'offline') {
            return;
        }

        const timerId = window.setTimeout(() => {
            reconnectCollaboration();
        }, 1200);

        return () => {
            window.clearTimeout(timerId);
        };
    }, [collaborationConnectionStatus, collaborationEnabled, reconnectCollaboration]);

    const lastAppliedRemoteChangeRef = useRef<string | null>(null);
    const lastAppliedRemotePatchRef = useRef<string | null>(null);
    const [externalCellHighlight, setExternalCellHighlight] = useState<{
        sectionId: string;
        tableId: string;
        rowIndex: number;
        colIndex: number;
        changedAt: string;
    } | null>(null);
    const [collaborationConflict, setCollaborationConflict] = useState<{
        message: string;
        at: string;
    } | null>(null);
    const [isResolvingConflict, setIsResolvingConflict] = useState(false);
    const activityNavigationTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
    const conflictSyncInFlightRef = useRef(false);
    const [instanceChangeLog, setInstanceChangeLog] = useState<InstanceChangeLogEntry[]>([]);

    useEffect(() => {
        let isCancelled = false;

        if (!collaborationEnabled) {
            setInstanceChangeLog([]);
            return () => {
                isCancelled = true;
            };
        }

        if (!isCollaborationConnected) {
            return () => {
                isCancelled = true;
            };
        }

        const loadInstanceChangeLog = async () => {
            const rows = await getInstanceChangeLog(60, 0);
            if (isCancelled) {
                return;
            }
            setInstanceChangeLog(Array.isArray(rows) ? (rows as InstanceChangeLogEntry[]) : []);
        };

        void loadInstanceChangeLog();

        return () => {
            isCancelled = true;
        };
    }, [collaborationEnabled, formData.instance_id, getInstanceChangeLog, isCollaborationConnected]);

    const collaborationActivityItems = useMemo<CollaborationActivityItem[]>(() => {
        const items: CollaborationActivityItem[] = [];

        recentChanges.forEach((change) => {
            items.push({
                id: `live-cell:${change.changedBy}:${change.changedAt}:${change.sectionId}:${change.tableId}:${change.rowIndex}:${change.colIndex}`,
                changedByName: change.changedByName || 'مستخدم غير معروف',
                changedAt: change.changedAt || new Date().toISOString(),
                scope: 'cell',
                description: describeActivityScope(
                    'cell',
                    change.sectionId,
                    change.tableId,
                    change.rowIndex,
                    change.colIndex
                ),
                details: formatValueDelta(change.oldValue, change.newValue),
                sectionId: change.sectionId,
                tableId: change.tableId,
                rowIndex: change.rowIndex,
                colIndex: change.colIndex,
                changePath: [
                    'sections',
                    change.sectionId,
                    'tables',
                    change.tableId,
                    'data',
                    String(change.rowIndex),
                    String(change.colIndex),
                ],
            });
        });

        recentPatches.forEach((patch) => {
            const patchScope = (patch.changeScope || 'other') as ChangeScope;
            items.push({
                id: `live-patch:${patch.changedBy}:${patch.changedAt}:${patchScope}:${(patch.changePath || []).join('.')}`,
                changedByName: patch.changedByName || 'مستخدم غير معروف',
                changedAt: patch.changedAt || new Date().toISOString(),
                scope: patchScope,
                description: describeActivityScope(
                    patchScope,
                    patch.sectionId || null,
                    patch.tableId || null,
                    patch.rowIndex ?? null,
                    patch.colIndex ?? null,
                    patch.changePath
                ),
                details: formatValueDelta(patch.oldValue, patch.newValue),
                sectionId: patch.sectionId ?? null,
                tableId: patch.tableId ?? null,
                rowIndex: patch.rowIndex ?? null,
                colIndex: patch.colIndex ?? null,
                changePath: patch.changePath ?? null,
            });
        });

        instanceChangeLog.forEach((entry) => {
            const scope = (entry.change_scope || 'other') as ChangeScope;
            items.push({
                id: `history:${entry.id}`,
                changedByName: entry.changed_by_name || 'مستخدم غير معروف',
                changedAt: entry.changed_at || new Date().toISOString(),
                scope,
                description: describeActivityScope(
                    scope,
                    entry.section_id,
                    entry.table_id,
                    entry.row_index,
                    entry.col_index,
                    entry.change_path
                ),
                details: formatValueDelta(entry.old_value, entry.new_value),
                sectionId: entry.section_id,
                tableId: entry.table_id,
                rowIndex: entry.row_index,
                colIndex: entry.col_index,
                changePath: entry.change_path,
            });
        });

        const deduped = new Map<string, CollaborationActivityItem>();
        items.forEach((item) => {
            const signature = `${item.changedAt}|${item.changedByName}|${item.description}`;
            if (!deduped.has(signature)) {
                deduped.set(signature, item);
            }
        });

        return Array.from(deduped.values())
            .sort(
                (left, right) =>
                    new Date(right.changedAt).getTime() - new Date(left.changedAt).getTime()
            )
            .slice(0, 18);
    }, [instanceChangeLog, recentChanges, recentPatches]);

    useEffect(() => {
        return () => {
            if (activityNavigationTimerRef.current) {
                clearTimeout(activityNavigationTimerRef.current);
                activityNavigationTimerRef.current = undefined;
            }
        };
    }, []);

    const focusCellByLocation = useCallback(
        (target: ActivityCellTarget): boolean => {
            if (typeof document === 'undefined') {
                return false;
            }

            const tableId = escapeCssAttributeValue(target.tableId);
            const baseSelector = `[data-table-id="${tableId}"][data-row-index="${target.rowIndex}"][data-col-index="${target.colIndex}"]`;
            const cellElement =
                document.querySelector<HTMLElement>(`input${baseSelector}`) ||
                document.querySelector<HTMLElement>(`select${baseSelector}`) ||
                document.querySelector<HTMLElement>(`textarea${baseSelector}`);

            if (!cellElement) {
                return false;
            }

            cellElement.scrollIntoView({
                behavior: 'smooth',
                block: 'center',
                inline: 'nearest',
            });
            cellElement.focus({ preventScroll: true });
            return true;
        },
        []
    );

    const navigateToActivityChange = useCallback(
        (item: CollaborationActivityItem) => {
            const target = extractCellTargetFromActivityItem(item);
            if (!target) {
                return;
            }

            if (!templateForRendering?.sections?.[target.sectionId]) {
                return;
            }

            setActiveSection(target.sectionId);
            setExternalCellHighlight({
                sectionId: target.sectionId,
                tableId: target.tableId,
                rowIndex: target.rowIndex,
                colIndex: target.colIndex,
                changedAt: item.changedAt || new Date().toISOString(),
            });

            if (activityNavigationTimerRef.current) {
                clearTimeout(activityNavigationTimerRef.current);
            }

            let attempts = 0;
            const maxAttempts = 8;
            const tryFocus = () => {
                attempts += 1;
                const hasFocused = focusCellByLocation(target);
                if (hasFocused || attempts >= maxAttempts) {
                    activityNavigationTimerRef.current = undefined;
                    return;
                }

                activityNavigationTimerRef.current = setTimeout(tryFocus, 90);
            };

            activityNavigationTimerRef.current = setTimeout(tryFocus, 0);
        },
        [focusCellByLocation, templateForRendering]
    );

    const CELL_BROADCAST_DEBOUNCE_MS = 120;
    const pendingCellBroadcastsRef = useRef<
        Map<string, {
            sectionId: string;
            tableId: string;
            rowIndex: number;
            colIndex: number;
            oldValue: any;
            newValue: any;
        }>
    >(new Map());
    const cellBroadcastTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

    const refreshReportStatusFromServer = useCallback(async () => {
        if (!formData.instance_id || !(isEditingExistingInstance || hasBeenSaved || existingInstance)) {
            return;
        }

        try {
            const { supabase } = await import('../config/supabase');
            const { data, error } = await supabase
                .from('form_instances')
                .select('status')
                .eq('id', formData.instance_id)
                .single();

            if (error || !data?.status) {
                return;
            }

            const latestStatus = String(data.status);
            setFormData((prev) =>
                prev.status === latestStatus
                    ? prev
                    : {
                          ...prev,
                          status: latestStatus as FormInstance['status'],
                      }
            );
        } catch (error) {
            console.warn('[DataEntry] Failed to refresh report status:', error);
        }
    }, [existingInstance, formData.instance_id, hasBeenSaved, isEditingExistingInstance]);

    useEffect(() => {
        if (!formData.instance_id || !(isEditingExistingInstance || hasBeenSaved || existingInstance)) {
            return;
        }

        void refreshReportStatusFromServer();

        const intervalId = window.setInterval(() => {
            void refreshReportStatusFromServer();
        }, 15000);

        const handleWindowFocus = () => {
            void refreshReportStatusFromServer();
        };

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                void refreshReportStatusFromServer();
            }
        };

        window.addEventListener('focus', handleWindowFocus);
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            window.clearInterval(intervalId);
            window.removeEventListener('focus', handleWindowFocus);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [
        existingInstance,
        formData.instance_id,
        hasBeenSaved,
        isEditingExistingInstance,
        refreshReportStatusFromServer,
    ]);

    const syncLatestReportFromServer = useCallback(
        async ({
            requireConfirmation = false,
            trigger = 'manual',
        }: {
            requireConfirmation?: boolean;
            trigger?: 'manual' | 'auto';
        } = {}): Promise<boolean> => {
            if (!formData.instance_id) {
                return false;
            }

            if (conflictSyncInFlightRef.current) {
                return false;
            }

            if (requireConfirmation) {
                const confirmed = window.confirm(
                    'سيتم استبدال البيانات الحالية بآخر نسخة محفوظة من الخادم. هل تريد المتابعة؟'
                );
                if (!confirmed) {
                    return false;
                }
            }

            conflictSyncInFlightRef.current = true;
            setIsResolvingConflict(true);

            try {
                const { instancesService } = await import('../services/supabaseService');
                const latest = await instancesService.getInstance(formData.instance_id);
                if (!latest) {
                    setCollaborationConflict({
                        message: 'تعذر تحميل أحدث نسخة تلقائياً. استخدم زر "تحديث من الخادم".',
                        at: new Date().toISOString(),
                    });
                    setSaveError('تعذر تحميل أحدث نسخة من التقرير من الخادم');
                    return false;
                }

                setFormData(normalizeFormInstanceForEditing(latest));
                setHasUnsavedChanges(false);
                setCollaborationConflict(null);
                setSaveError(null);
                setLastSaved(new Date());

                collaborationTelemetryService.log({
                    level: 'info',
                    event: 'manual_reload_after_conflict',
                    message:
                        trigger === 'auto'
                            ? 'Automatic reload after collaboration conflict'
                            : 'User reloaded report after conflict',
                    instanceId: formData.instance_id,
                    userId: profile?.uid,
                    details: {
                        trigger,
                    },
                });

                return true;
            } catch (error) {
                console.error('[DataEntry] Failed to resolve conflict by reload:', error);
                const failureMessage =
                    trigger === 'auto'
                        ? 'حدث تعارض ولم تنجح المزامنة التلقائية. استخدم زر "تحديث من الخادم".'
                        : 'فشل تحميل أحدث نسخة من الخادم';
                setCollaborationConflict({
                    message: failureMessage,
                    at: new Date().toISOString(),
                });
                setSaveError(failureMessage);
                return false;
            } finally {
                conflictSyncInFlightRef.current = false;
                setIsResolvingConflict(false);
            }
        },
        [formData.instance_id, profile?.uid]
    );

    const reportCollaborationIssue = useCallback(
        (conflict: boolean, message?: string, details?: Record<string, any>) => {
            if (conflict) {
                const conflictMessage = message || 'VERSION_CONFLICT';
                setCollaborationConflict({
                    message:
                        'تم اكتشاف تعارض تعديل. لم يتم استبدال بياناتك المحلية. راجع التعديلات ثم استخدم "تحديث من الخادم" عند الحاجة.',
                    at: new Date().toISOString(),
                });
                setSaveError(
                    'تم اكتشاف تعارض تعديل. لم يتم حذف بياناتك المحلية، ويمكنك المتابعة أو التحديث من الخادم.'
                );
                collaborationTelemetryService.log({
                    level: 'warn',
                    event: 'conflict_detected',
                    message: 'Collaboration conflict reported to UI',
                    instanceId: formData.instance_id,
                    userId: profile?.uid,
                    details: {
                        conflictMessage,
                        ...(details || {}),
                    },
                });
                return;
            }

            const issueMessage = message || 'فشل مزامنة التعديل التعاوني';

            if (issueMessage === 'REPORT_NOT_EDITABLE') {
                setSaveError('تم قفل التقرير في حالة غير قابلة للتعديل. سيتم تحديث الحالة تلقائياً.');
                void refreshReportStatusFromServer();
                return;
            }

            setSaveError(issueMessage);
            collaborationTelemetryService.log({
                level: 'error',
                event: 'broadcast_failed',
                message: 'Collaboration issue reported to UI',
                instanceId: formData.instance_id,
                userId: profile?.uid,
                details: {
                    issueMessage,
                    ...(details || {}),
                },
            });
        },
        [formData.instance_id, profile?.uid, refreshReportStatusFromServer]
    );

    const persistDraftSnapshotFallback = useCallback(async (): Promise<boolean> => {
        const snapshot = latestFormDataRef.current;
        if (!snapshot?.instance_id || !isReportEditable) {
            return false;
        }

        try {
            if (isEditingExistingInstance || hasBeenSaved || existingInstance) {
                await updateFormInstance(snapshot.instance_id, snapshot);
            } else {
                await addFormInstance(snapshot);
                setHasBeenSaved(true);
            }

            collaborationTelemetryService.log({
                level: 'warn',
                event: 'broadcast_failed',
                message: 'Saved full report snapshot after realtime patch failure',
                instanceId: snapshot.instance_id,
                userId: profile?.uid,
            });

            return true;
        } catch (error) {
            console.error('[DataEntry] Fallback snapshot save failed:', error);
            collaborationTelemetryService.log({
                level: 'error',
                event: 'broadcast_failed',
                message: 'Failed to persist full report snapshot after patch failure',
                instanceId: snapshot.instance_id,
                userId: profile?.uid,
                details: {
                    error: error instanceof Error ? error.message : String(error),
                },
            });
            return false;
        }
    }, [
        addFormInstance,
        existingInstance,
        hasBeenSaved,
        isEditingExistingInstance,
        isReportEditable,
        profile?.uid,
        updateFormInstance,
    ]);

    const resolveConflictByReload = useCallback(async () => {
        await syncLatestReportFromServer({
            requireConfirmation: true,
            trigger: 'manual',
        });
    }, [syncLatestReportFromServer]);

    // ✅ FIX: Regenerate batch number when template updates (e.g. after loading full template)
    // This ensures we have the latest sequence number/config even if initial state used cached template
    useEffect(() => {
        if (template && !existingInstance && formData.status === 'draft') {
            const currentBatchNum = safeFormData.batch_number;
            const newBatchNum = generateBatchNumber(template, safeFormData.report_date);

            if (currentBatchNum !== newBatchNum) {
                console.log('🔄 Regenerating batch number with fresh template config');
                setFormData(prev => ({
                    ...prev,
                    form_data: {
                        ...createSafeReportFormData(prev.form_data),
                        batch_number: newBatchNum
                    }
                }));
            }
        }
    }, [template, existingInstance, formData.status, safeFormData.batch_number, safeFormData.report_date]);

    // Auto-save with debounce and version tracking for race condition prevention
    const autoSave = useCallback(
        debounce(async (data: FormInstance, versionAtCallTime: number) => {
            console.log('💾 Auto-saving instance:', data.instance_id, 'version:', versionAtCallTime);
            console.log('  - isEditingExistingInstance:', isEditingExistingInstance);
            console.log('  - hasBeenSaved:', hasBeenSaved);
            console.log('  - existingInstance exists:', !!existingInstance);
            console.log('  - Status:', data.status);

            setIsSaving(true);
            setSaveError(null); // Clear previous error on new attempt

            try {
                if (isEditingExistingInstance || hasBeenSaved || existingInstance) {
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
                    const dataToSave = { ...data };
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

                    const duplicates = await findDuplicateReportsForInstance(dataToSave);
                    if (duplicates.length > 0) {
                        const duplicateKey = buildDuplicateCheckKey(dataToSave);
                        if (duplicateReportWarningRef.current !== duplicateKey) {
                            duplicateReportWarningRef.current = duplicateKey;
                            warnDuplicateReports(dataToSave, duplicates);
                        }
                        setSaveError('تم اكتشاف تقرير مشابه بنفس التاريخ والوردية. يرجى الحفظ اليدوي بعد التأكيد.');
                        return;
                    }

                    await addFormInstance(dataToSave);
                    if (dataToSave.name) {
                        setFormData(prev => ({ ...prev, name: dataToSave.name }));
                    }
                    setHasBeenSaved(true);
                }
                setLastSaved(new Date());
                notifySaveSuccess();

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
        [
            addFormInstance,
            existingInstance,
            hasBeenSaved,
            isEditingExistingInstance,
            notifySaveSuccess,
            updateFormInstance,
        ]
    );

    // Trigger auto-save on form data change
    useEffect(() => {
        if (!hasUnsavedChanges) {
            return;
        }

        if (instanceId && !hasHydratedExistingInstance) {
            return;
        }

        if (formData.status === 'draft' && !shouldPersistThroughCollabPatches) {
            // Pass current version to track race conditions
            autoSave(formData, saveVersionRef.current);
        }
        return () => {
            autoSave.cancel();
        };
    }, [
        autoSave,
        formData,
        hasHydratedExistingInstance,
        hasUnsavedChanges,
        instanceId,
        shouldPersistThroughCollabPatches,
    ]);

    // Set initial active section
    useEffect(() => {
        if (!templateForRendering) return;

        const sortedSections = Object.values(templateForRendering.sections || {}).sort((a, b) => a.order - b.order);
        const validSectionIds = new Set<string>(sortedSections.map((section) => section.id));

        if (templateForRendering.quality_criteria && templateForRendering.quality_criteria.length > 0) {
            validSectionIds.add('quality_criteria');
        }

        if (templateForRendering.notes) {
            validSectionIds.add('template_notes');
        }

        if (activeSection && validSectionIds.has(activeSection)) {
            return;
        }

        const fallbackSection =
            sortedSections[0]?.id ||
            (validSectionIds.has('quality_criteria')
                ? 'quality_criteria'
                : validSectionIds.has('template_notes')
                    ? 'template_notes'
                    : null);

        if (fallbackSection) {
            setActiveSection(fallbackSection);
        }
    }, [templateForRendering, activeSection]);

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
            setFormData(normalizeFormInstanceForEditing(previousState));
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
            setFormData(normalizeFormInstanceForEditing(nextState));
        }
    }, [activeTabId, canRedo, redoTab, instanceId, templateId, getActiveTab]);

    useEffect(() => {
        if (!recentChanges.length || !profile?.uid) {
            return;
        }

        const latest = recentChanges[0];
        if (!latest || latest.changedBy === profile.uid) {
            return;
        }

        const remoteKey = [
            latest.changedBy,
            latest.changedAt,
            latest.sectionId,
            latest.tableId,
            latest.rowIndex,
            latest.colIndex,
        ].join(':');

        if (lastAppliedRemoteChangeRef.current === remoteKey) {
            return;
        }

        lastAppliedRemoteChangeRef.current = remoteKey;

        setFormData((prev) => {
            const prevSafeFormData = createSafeReportFormData(prev.form_data);
            const nextSections = { ...prevSafeFormData.sections };
            const section = nextSections[latest.sectionId] || { tables: {} as Record<string, { data: any[][]; notes?: string }> };
            const tableEntry = section.tables[latest.tableId] || { data: [] as any[][] };
            const tableData = Array.isArray(tableEntry.data) ? tableEntry.data.map((row) => [...row]) : [];

            while (tableData.length <= latest.rowIndex) {
                tableData.push([]);
            }

            const targetRow = Array.isArray(tableData[latest.rowIndex]) ? [...tableData[latest.rowIndex]] : [];
            targetRow[latest.colIndex] = latest.newValue;
            tableData[latest.rowIndex] = targetRow;

            nextSections[latest.sectionId] = {
                ...section,
                tables: {
                    ...section.tables,
                    [latest.tableId]: {
                        ...tableEntry,
                        data: tableData,
                    },
                },
            };

            return {
                ...prev,
                form_data: {
                    ...prevSafeFormData,
                    sections: nextSections,
                },
            };
        });

        setExternalCellHighlight({
            sectionId: latest.sectionId,
            tableId: latest.tableId,
            rowIndex: latest.rowIndex,
            colIndex: latest.colIndex,
            changedAt: latest.changedAt || new Date().toISOString(),
        });
    }, [recentChanges, profile?.uid]);

    const applyPathUpdate = (source: any, path: string[], value: any): any => {
        const isNumeric = (segment: string) => /^\d+$/.test(segment);
        const cloneRoot = Array.isArray(source) ? [...source] : { ...(source || {}) };
        let srcCursor: any = source || {};
        let dstCursor: any = cloneRoot;

        for (let index = 0; index < path.length - 1; index++) {
            const segment = path[index];
            const key: any = isNumeric(segment) ? Number(segment) : segment;
            const srcNext = srcCursor?.[key];
            const nextSegment = path[index + 1];

            let dstNext: any;
            if (Array.isArray(srcNext)) {
                dstNext = [...srcNext];
            } else if (srcNext && typeof srcNext === 'object') {
                dstNext = { ...srcNext };
            } else {
                dstNext = isNumeric(nextSegment) ? [] : {};
            }

            dstCursor[key] = dstNext;
            srcCursor = srcNext;
            dstCursor = dstNext;
        }

        const lastSegment = path[path.length - 1];
        const lastKey: any = isNumeric(lastSegment) ? Number(lastSegment) : lastSegment;
        dstCursor[lastKey] = value;

        return cloneRoot;
    };

    useEffect(() => {
        if (!recentPatches.length || !profile?.uid) {
            return;
        }

        const latestPatch = recentPatches[0];
        if (!latestPatch || latestPatch.changedBy === profile.uid) {
            return;
        }

        const patchKey = [
            latestPatch.changedBy,
            latestPatch.changedAt,
            latestPatch.changeScope,
            ...(latestPatch.changePath || []),
        ].join(':');

        if (lastAppliedRemotePatchRef.current === patchKey) {
            return;
        }

        lastAppliedRemotePatchRef.current = patchKey;

        if (latestPatch.changeScope === 'cell') {
            return;
        }

        setFormData((prev) => {
            const nextFormData = applyPathUpdate(
                prev.form_data || {},
                latestPatch.changePath,
                latestPatch.newValue
            );

            if (latestPatch.changeScope === 'table_notes' && latestPatch.tableId) {
                nextFormData.table_notes = {
                    ...(nextFormData.table_notes || {}),
                    [latestPatch.tableId]: latestPatch.newValue,
                };
            }

            return {
                ...prev,
                form_data: nextFormData,
            };
        });
    }, [recentPatches, profile?.uid]);

    const MAX_CELL_PATCHES_PER_ACTION = 30;

    const areValuesEqual = (left: any, right: any) =>
        JSON.stringify(left) === JSON.stringify(right);

    const detectCellDeltas = (previousData: any[][], nextData: any[][]): FormTableCellChange[] => {
        const deltas: FormTableCellChange[] = [];
        const maxRows = Math.max(previousData.length, nextData.length);
        for (let rowIndex = 0; rowIndex < maxRows; rowIndex++) {
            const previousRow = previousData[rowIndex] || [];
            const nextRow = nextData[rowIndex] || [];
            const maxCols = Math.max(previousRow.length, nextRow.length);

            for (let colIndex = 0; colIndex < maxCols; colIndex++) {
                const oldValue = previousRow[colIndex];
                const newValue = nextRow[colIndex];
                if (!areValuesEqual(oldValue, newValue)) {
                    deltas.push({ rowIndex, colIndex, oldValue, newValue });
                }
            }
        }

        return deltas;
    };

    const flushPendingCellBroadcasts = useCallback(async () => {
        if (cellBroadcastTimerRef.current) {
            clearTimeout(cellBroadcastTimerRef.current);
            cellBroadcastTimerRef.current = undefined;
        }

        if (!collaborationEnabled) {
            pendingCellBroadcastsRef.current.clear();
            return;
        }

        const pending = Array.from(pendingCellBroadcastsRef.current.values());
        if (pending.length === 0) {
            return;
        }

        setIsSaving(true);
        setSaveError(null);
        pendingCellBroadcastsRef.current.clear();

        try {
            const failures: Array<
                | { type: 'rejected'; error: unknown }
                | { type: 'result'; result: Awaited<ReturnType<typeof broadcastCellChange>> }
            > = [];

            for (const delta of pending) {
                try {
                    const result = await broadcastCellChange({
                        sectionId: delta.sectionId,
                        tableId: delta.tableId,
                        rowIndex: delta.rowIndex,
                        colIndex: delta.colIndex,
                        oldValue: delta.oldValue,
                        newValue: delta.newValue,
                    });

                    if (!result.success) {
                        failures.push({ type: 'result', result });
                    }
                } catch (error) {
                    failures.push({ type: 'rejected', error });
                }
            }

            if (failures.length === 0) {
                setHasUnsavedChanges(false);
                setLastSaved(new Date());
                setSaveError(null);
                notifySaveSuccess();
                return;
            }

            const conflictFailure = failures.find(
                (entry): entry is { type: 'result'; result: Awaited<ReturnType<typeof broadcastCellChange>> } =>
                    entry.type === 'result' && entry.result.conflict
            );

            if (conflictFailure) {
                reportCollaborationIssue(true, conflictFailure.result.message, {
                    failedCount: failures.length,
                    rejectedCount: failures.filter((entry) => entry.type === 'rejected').length,
                });
                return;
            }

            const recoveredViaSnapshot = await persistDraftSnapshotFallback();
            if (recoveredViaSnapshot) {
                setHasUnsavedChanges(false);
                setLastSaved(new Date());
                setSaveError(null);
                notifySaveSuccess();
                return;
            }

            const rejectedCount = failures.filter((entry) => entry.type === 'rejected').length;
            if (rejectedCount > 0) {
                reportCollaborationIssue(false, 'فشل بث تعديل مباشر، تحقق من الاتصال', {
                    failedCount: failures.length,
                    rejectedCount,
                });
                return;
            }

            const firstResultFailure = failures.find(
                (entry): entry is { type: 'result'; result: Awaited<ReturnType<typeof broadcastCellChange>> } =>
                    entry.type === 'result'
            );

            reportCollaborationIssue(false, firstResultFailure?.result.message, {
                failedCount: failures.length,
            });
        } finally {
            setIsSaving(false);
        }
    }, [
        broadcastCellChange,
        collaborationEnabled,
        notifySaveSuccess,
        persistDraftSnapshotFallback,
        reportCollaborationIssue,
    ]);

    const queueCellBroadcasts = useCallback(
        (sectionId: string, tableId: string, deltas: FormTableCellChange[]) => {
            if (!collaborationEnabled || deltas.length === 0) {
                return;
            }

            const pendingMap = pendingCellBroadcastsRef.current;
            deltas.forEach((delta) => {
                const key = `${sectionId}:${tableId}:${delta.rowIndex}:${delta.colIndex}`;
                const existing = pendingMap.get(key);

                if (!existing) {
                    pendingMap.set(key, {
                        sectionId,
                        tableId,
                        rowIndex: delta.rowIndex,
                        colIndex: delta.colIndex,
                        oldValue: delta.oldValue,
                        newValue: delta.newValue,
                    });
                    return;
                }

                existing.newValue = delta.newValue;
            });

            if (cellBroadcastTimerRef.current) {
                clearTimeout(cellBroadcastTimerRef.current);
            }
            cellBroadcastTimerRef.current = setTimeout(() => {
                void flushPendingCellBroadcasts();
            }, CELL_BROADCAST_DEBOUNCE_MS);
        },
        [collaborationEnabled, flushPendingCellBroadcasts]
    );

    useEffect(() => {
        return () => {
            if (cellBroadcastTimerRef.current) {
                clearTimeout(cellBroadcastTimerRef.current);
                cellBroadcastTimerRef.current = undefined;
            }
            pendingCellBroadcastsRef.current.clear();
        };
    }, []);

    useEffect(() => {
        if (collaborationEnabled) {
            return;
        }

        setIsSaving(false);
        if (cellBroadcastTimerRef.current) {
            clearTimeout(cellBroadcastTimerRef.current);
            cellBroadcastTimerRef.current = undefined;
        }
        pendingCellBroadcastsRef.current.clear();
    }, [collaborationEnabled]);

    useEffect(() => {
        if (!collaborationEnabled) {
            return;
        }

        const flushPendingChanges = () => {
            void flushPendingCellBroadcasts();
        };

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'hidden') {
                flushPendingChanges();
            }
        };

        window.addEventListener('pagehide', flushPendingChanges);
        window.addEventListener('beforeunload', flushPendingChanges);
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            window.removeEventListener('pagehide', flushPendingChanges);
            window.removeEventListener('beforeunload', flushPendingChanges);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [collaborationEnabled, flushPendingCellBroadcasts]);

    const handleFormDataChange = (
        sectionId: string,
        tableId: string,
        data: any[][],
        metadata?: FormTableChangeMetadata
    ) => {
        if (!isReportEditable) {
            setSaveError('التقرير في حالة غير قابلة للتعديل حالياً.');
            return;
        }

        console.log('📝 Form data changed:', { sectionId, tableId, rowCount: data.length });

        const previousData =
            safeFormData.sections?.[sectionId]?.tables?.[tableId]?.data || [];

        const metadataDeltas = (metadata?.changes || []).filter((change) =>
            !areValuesEqual(change.oldValue, change.newValue)
        );
        const deltas =
            metadataDeltas.length > 0
                ? metadataDeltas
                : detectCellDeltas(previousData, data);

        // Push current state to history before update
        pushToHistory(formData);
        setHasUnsavedChanges(true);
        saveVersionRef.current++; // Increment version for race condition tracking

        setFormData(prev => ({
            ...prev,
            form_data: {
                ...createSafeReportFormData(prev.form_data),
                sections: {
                    ...(createSafeReportFormData(prev.form_data).sections || {}),
                    [sectionId]: {
                        ...createSafeReportFormData(prev.form_data).sections?.[sectionId],
                        tables: {
                            ...(createSafeReportFormData(prev.form_data).sections?.[sectionId]?.tables || {}),
                            [tableId]: {
                                ...(createSafeReportFormData(prev.form_data).sections?.[sectionId]?.tables?.[tableId] || {}),
                                data
                            },
                        },
                    },
                },
            },
        }));

        if (!collaborationEnabled || deltas.length === 0) {
            return;
        }

        if (deltas.length > MAX_CELL_PATCHES_PER_ACTION) {
            setIsSaving(true);
            void applyAndBroadcastPatch({
                changeScope: 'section',
                changePath: ['sections', sectionId, 'tables', tableId, 'data'],
                oldValue: previousData,
                newValue: data,
                sectionId,
                tableId,
                source: 'bulk_editor',
            }).then(async (result) => {
                if (!result.success) {
                    if (!result.conflict) {
                        const recoveredViaSnapshot = await persistDraftSnapshotFallback();
                        if (recoveredViaSnapshot) {
                            setHasUnsavedChanges(false);
                            setLastSaved(new Date());
                            setSaveError(null);
                            notifySaveSuccess();
                            return;
                        }
                    }
                    reportCollaborationIssue(result.conflict, result.message);
                    return;
                }
                setHasUnsavedChanges(false);
                setLastSaved(new Date());
                setSaveError(null);
                notifySaveSuccess();
            }).catch((error) => {
                reportCollaborationIssue(false, error instanceof Error ? error.message : String(error));
            }).finally(() => {
                setIsSaving(false);
            });
            return;
        }

        setIsSaving(true);
        queueCellBroadcasts(sectionId, tableId, deltas);
    };

    const handleTableNotesChange = (sectionId: string, tableId: string, notes: string) => {
        if (!isReportEditable) {
            setSaveError('التقرير في حالة غير قابلة للتعديل حالياً.');
            return;
        }

        const previousNotes =
            safeFormData.sections?.[sectionId]?.tables?.[tableId]?.notes || '';

        setHasUnsavedChanges(true);
        saveVersionRef.current++; // Increment version for race condition tracking

        setFormData(prev => ({
            ...prev,
            form_data: {
                ...createSafeReportFormData(prev.form_data),
                sections: {
                    ...(createSafeReportFormData(prev.form_data).sections || {}),
                    [sectionId]: {
                        ...createSafeReportFormData(prev.form_data).sections?.[sectionId],
                        tables: {
                            ...(createSafeReportFormData(prev.form_data).sections?.[sectionId]?.tables || {}),
                            [tableId]: {
                                ...(createSafeReportFormData(prev.form_data).sections?.[sectionId]?.tables?.[tableId] || {}),
                                notes,
                            },
                        },
                    },
                },
                table_notes: {
                    ...(createSafeReportFormData(prev.form_data).table_notes || {}),
                    [tableId]: notes,
                },
            },
        }));

        if (collaborationEnabled && previousNotes !== notes) {
            setIsSaving(true);
            void applyAndBroadcastPatch({
                changeScope: 'table_notes',
                changePath: ['sections', sectionId, 'tables', tableId, 'notes'],
                oldValue: previousNotes,
                newValue: notes,
                sectionId,
                tableId,
                source: 'editor',
            }).then(async (result) => {
                if (!result.success) {
                    if (!result.conflict) {
                        const recoveredViaSnapshot = await persistDraftSnapshotFallback();
                        if (recoveredViaSnapshot) {
                            setHasUnsavedChanges(false);
                            setLastSaved(new Date());
                            setSaveError(null);
                            notifySaveSuccess();
                            return;
                        }
                    }
                    reportCollaborationIssue(result.conflict, result.message);
                    return;
                }
                setHasUnsavedChanges(false);
                setLastSaved(new Date());
                setSaveError(null);
                notifySaveSuccess();
            }).catch((error) => {
                reportCollaborationIssue(false, error instanceof Error ? error.message : String(error));
            }).finally(() => {
                setIsSaving(false);
            });
        }
    };

    const handleBasicInfoChange = (field: string, value: any) => {
        if (!isReportEditable) {
            setSaveError('التقرير في حالة غير قابلة للتعديل حالياً.');
            return;
        }

        const previousValue = (safeFormData as any)?.[field];

        pushToHistory(formData);
        setHasUnsavedChanges(true);
        saveVersionRef.current++; // Increment version for race condition tracking

        setFormData(prev => {
            const prevSafeFormData = createSafeReportFormData(prev.form_data);
            const newFormData = {
                ...prev,
                form_data: {
                    ...prevSafeFormData,
                    [field]: value,
                },
            };

            // Regenerate batch number when date changes
            if (field === 'report_date' && template) {
                newFormData.form_data.batch_number = generateBatchNumber(template, value);
            }

            return newFormData;
        });

        if (collaborationEnabled && JSON.stringify(previousValue) !== JSON.stringify(value)) {
            setIsSaving(true);
            void applyAndBroadcastPatch({
                changeScope: 'basic_field',
                changePath: [field],
                oldValue: previousValue,
                newValue: value,
                source: 'editor',
            }).then(async (result) => {
                if (!result.success) {
                    if (!result.conflict) {
                        const recoveredViaSnapshot = await persistDraftSnapshotFallback();
                        if (recoveredViaSnapshot) {
                            setHasUnsavedChanges(false);
                            setLastSaved(new Date());
                            setSaveError(null);
                            notifySaveSuccess();
                            return;
                        }
                    }
                    reportCollaborationIssue(result.conflict, result.message);
                    return;
                }
                setHasUnsavedChanges(false);
                setLastSaved(new Date());
                setSaveError(null);
                notifySaveSuccess();
            }).catch((error) => {
                reportCollaborationIssue(false, error instanceof Error ? error.message : String(error));
            }).finally(() => {
                setIsSaving(false);
            });
        }
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

    const buildDuplicateCheckKey = useCallback((instanceData: FormInstance) => {
        const safeData = createSafeReportFormData(instanceData.form_data);
        return [
            instanceData.template_id || '',
            instanceData.folder_id || 'root',
            safeData.report_date || '',
            safeData.shift || 'A',
        ].join('|');
    }, []);

    const findDuplicateReportsForInstance = useCallback(async (instanceData: FormInstance) => {
        const safeData = createSafeReportFormData(instanceData.form_data);
        if (!instanceData.template_id || !safeData.report_date) {
            return [];
        }

        try {
            const { instancesService } = await import('../services/supabaseService');
            return await instancesService.findDuplicateReportsByDetails({
                templateId: instanceData.template_id,
                folderId: instanceData.folder_id || null,
                reportDate: safeData.report_date,
                shift: safeData.shift || 'A',
                excludeInstanceId: instanceData.instance_id,
            });
        } catch (error) {
            console.warn('[DataEntry] Duplicate report check failed:', error);
            return [];
        }
    }, []);

    const warnDuplicateReports = useCallback(
        (instanceData: FormInstance, duplicates: Array<{ id: string; name: string | null }>) => {
            const safeData = createSafeReportFormData(instanceData.form_data);
            const duplicateName = duplicates[0]?.name || 'تقرير موجود مسبقاً';
            addToast({
                type: 'warning',
                title: 'تحذير: تقرير مكرر',
                message: `يوجد تقرير بنفس التاريخ (${safeData.report_date || '-'}) والوردية (${safeData.shift || 'A'}) في نفس المجلد. مثال: ${duplicateName}`,
                duration: 6000,
            });
        },
        [addToast]
    );

    const validateRecipeTraceabilityForSubmit = useCallback(
        (templateToValidate: FormTemplate | null | undefined, formDataToValidate: any): string | null => {
            if (!templateToValidate) {
                return null;
            }

            const sections = Object.values(templateToValidate.sections || {});
            if (sections.length === 0) {
                return null;
            }

            const toPositive = (value: unknown): number | null => {
                if (typeof value === 'number' && Number.isFinite(value) && value > 0) return value;
                if (typeof value === 'string' && value.trim()) {
                    const parsed = Number(value);
                    if (Number.isFinite(parsed) && parsed > 0) return parsed;
                }
                return null;
            };

            const normalizeUnit = (value: unknown): string => String(value || '').trim();

            for (const section of sections) {
                const recipeTables = (section.tables || []).filter((table) => table.type === 'recipe-traceability');
                if (recipeTables.length === 0) continue;

                for (const table of recipeTables) {
                    const rows = formDataToValidate?.sections?.[section.id]?.tables?.[table.id]?.data;
                    if (!Array.isArray(rows)) continue;

                    for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
                        const row = rows[rowIndex];
                        if (!Array.isArray(row)) continue;

                        const ingredientName = String(row[0] || `الخامة ${rowIndex + 1}`);
                        const recipeQty = toPositive(row[1]) ?? 0;
                        const recipeUnit = normalizeUnit(row[2]);
                        const doughCount = toPositive(row[4]) ?? 1;
                        const requiredQty = recipeQty * doughCount;
                        if (requiredQty <= 0) continue;

                        const batches = Array.isArray(row[3]) ? row[3] : [];
                        const selectedBatches = batches.filter((batch: any) =>
                            batch &&
                            typeof batch === 'object' &&
                            String(batch.receivingId || batch.receiving_id || '').trim().length > 0
                        );

                        if (selectedBatches.length === 0) {
                            return `يرجى اختيار باتش للخامة "${ingredientName}" في جدول "${table.name || table.id}".`;
                        }

                        let usedTotalInRecipeUnit = 0;
                        for (const batch of selectedBatches) {
                            const usedQty = toPositive(batch.usedQuantity ?? batch.used_quantity);
                            if (!usedQty) continue;

                            const usedUnit = normalizeUnit(batch.usedUnit || batch.used_unit || batch.unit);
                            if (!recipeUnit || !usedUnit || recipeUnit === usedUnit) {
                                usedTotalInRecipeUnit += usedQty;
                                continue;
                            }

                            const converted = convertQuantity(usedQty, usedUnit, recipeUnit);
                            if (converted === null) {
                                return `تعذر تحويل وحدة استهلاك الخامة "${ingredientName}" من ${usedUnit} إلى ${recipeUnit}.`;
                            }
                            usedTotalInRecipeUnit += converted;
                        }

                        if (usedTotalInRecipeUnit + 0.000001 < requiredQty) {
                            return `الكمية غير كافية للخامة "${ingredientName}" في جدول "${table.name || table.id}". المطلوب ${requiredQty.toFixed(3)} ${recipeUnit || ''}.`;
                        }
                    }
                }
            }

            return null;
        },
        []
    );


    const handleSubmit = async () => {
        if (!isReportEditable) {
            await refreshReportStatusFromServer();
            setSaveError('لا يمكن إرسال أو تعديل التقرير لأنه في حالة غير قابلة للتحرير.');
            return;
        }

        const submitValidationError = validateRecipeTraceabilityForSubmit(
            templateForRendering || template,
            createSafeReportFormData(formData.form_data)
        );
        if (submitValidationError) {
            setSaveError(submitValidationError);
            alert(submitValidationError);
            return;
        }

        if (!window.confirm('هل أنت متأكد من إرسال التقرير؟ لن تتمكن من التعديل بعد الإرسال.')) {
            return;
        }

        await flushPendingCellBroadcasts();

        // Cancel any pending auto-saves
        autoSave.cancel();

        setIsSaving(true);
        try {
            const updatedData = {
                ...formData,
                status: 'submitted' as const,
                submitted_at: new Date().toISOString(),
                submitted_by: authUserId || undefined,
            };

            // ✅ FIX: Ensure folder_id from existingInstance is used if missing in local state
            if (!updatedData.folder_id && existingInstance?.folder_id) {
                console.log('  🔄 Using folder_id from existingInstance:', existingInstance.folder_id);
                updatedData.folder_id = existingInstance.folder_id;
            }

            if (isEditingExistingInstance || existingInstance) {
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

                const duplicates = await findDuplicateReportsForInstance(updatedData);
                if (duplicates.length > 0) {
                    const proceed = window.confirm(
                        `تحذير: يوجد تقرير بنفس التاريخ والوردية داخل نفس المجلد.\n\n` +
                        `عدد التقارير المشابهة: ${duplicates.length}\n` +
                        `مثال: ${duplicates[0]?.name || 'تقرير موجود'}\n\n` +
                        `هل تريد المتابعة وإنشاء تقرير جديد؟`
                    );

                    if (!proceed) {
                        warnDuplicateReports(updatedData, duplicates);
                        return;
                    }
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
        if (!isReportEditable) {
            await refreshReportStatusFromServer();
            setSaveError('لا يمكن الحفظ لأن التقرير في حالة غير قابلة للتحرير.');
            return;
        }

        setIsSaving(true);
        setSaveError(null); // Clear previous error
        try {
            await flushPendingCellBroadcasts();

            const dataToSave = { ...formData };

            if (isEditingExistingInstance || existingInstance) {
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

                const duplicates = await findDuplicateReportsForInstance(dataToSave);
                if (duplicates.length > 0) {
                    const proceed = window.confirm(
                        `تحذير: يوجد تقرير بنفس التاريخ والوردية داخل نفس المجلد.\n\n` +
                        `عدد التقارير المشابهة: ${duplicates.length}\n` +
                        `مثال: ${duplicates[0]?.name || 'تقرير موجود'}\n\n` +
                        `هل تريد المتابعة وحفظ مسودة جديدة؟`
                    );

                    if (!proceed) {
                        warnDuplicateReports(dataToSave, duplicates);
                        return;
                    }
                }

                await addFormInstance(dataToSave);
                if (dataToSave.name) {
                    setFormData(prev => ({ ...prev, name: dataToSave.name }));
                }
            }
            setLastSaved(new Date());
            notifySaveSuccess();
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
        const activeTab = getActiveTab();
        const tabReturnPath = activeTab?.path === location.pathname ? activeTab.returnPath : undefined;
        const folderIdFromQuery =
            new URLSearchParams(location.search).get('folderId') ||
            new URLSearchParams(location.search).get('folder');

        const returnPath = (() => {
            if (tabReturnPath) {
                if (tabReturnPath === '/folders') return '/forms&reports';
                if (tabReturnPath.startsWith('/folders/')) {
                    return tabReturnPath.replace('/folders/', '/forms&reports/');
                }
                return tabReturnPath;
            }
            if (formData.folder_id) return `/forms&reports/${formData.folder_id}`;
            if (existingInstance?.folder_id) return `/forms&reports/${existingInstance.folder_id}`;
            if (folderIdFromQuery) return `/forms&reports/${folderIdFromQuery}`;
            if (currentFolderId) return `/forms&reports/${currentFolderId}`;
            return '/forms&reports';
        })();

        if (hasUnsavedChanges) {
            if (window.confirm('لديك تغييرات غير محفوظة. هل تريد المغادرة بدون حفظ؟')) {
                navigate(returnPath);
            }
        } else {
            navigate(returnPath);
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

    if (instanceId && !hasHydratedExistingInstance) {
        return (
            <div className="h-full flex items-center justify-center">
                <div className="text-center">
                    {hydrationError ? (
                        <>
                            <p className="text-red-600 dark:text-red-400 mb-2">{hydrationError}</p>
                            {hydrationCanAutoRetry && !hydrationAutoRetryExhausted && (
                                <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                                    جاري إعادة المحاولة تلقائيًا خلال {hydrationNextRetryDelaySeconds} ثانية...
                                </p>
                            )}
                            <button
                                onClick={() => requestHydrationRetry()}
                                className="px-3 py-1.5 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                            >
                                إعادة المحاولة الآن
                            </button>
                        </>
                    ) : (
                        <>
                            <p className="text-gray-500 dark:text-gray-400 mb-1">جاري تحميل أحدث نسخة من التقرير...</p>
                            <p className="text-xs text-gray-400 dark:text-gray-500">يرجى الانتظار</p>
                        </>
                    )}
                </div>
            </div>
        );
    }

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

    const sections = Object.values(templateForRendering?.sections || {}).sort((a, b) => a.order - b.order);
    const currentSection = sections.find(s => s.id === activeSection);
    const collaborationPanel = (
        <CollaborationPanel
            activeUsers={collaborationUsers}
            isConnected={isCollaborationConnected}
            connectionStatus={collaborationConnectionStatus}
            reconnectAttempt={collaborationReconnectAttempt}
            onReconnect={reconnectCollaboration}
            activityItems={collaborationActivityItems}
            onActivityItemClick={navigateToActivityChange}
            className="w-fit max-w-none px-0 pt-1 pb-1"
        />
    );

    return (
        <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900">
            {tabsCollaborationSlot && createPortal(collaborationPanel, tabsCollaborationSlot)}

            {/* Header */}
            <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-3 sm:px-6 py-3 sm:py-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex items-center gap-2 sm:gap-4 min-w-0">
                        <button
                            onClick={handleBack}
                            className="p-1.5 sm:p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                        >
                            <ArrowLeftIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                        </button>
                        <div className="min-w-0">
                            <h1 className="text-base sm:text-xl font-bold text-gray-900 dark:text-white truncate">
                                {templateForRendering?.name}
                            </h1>
                            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                                <span>الإصدار {templateForRendering?.version}</span>
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

                    <div className="flex w-full lg:w-auto flex-wrap items-center gap-2 sm:gap-3">
                        <button
                            onClick={handleSaveDraft}
                            disabled={isSaving || !isReportEditable}
                            className="flex-1 sm:flex-none justify-center flex items-center gap-2 px-3 sm:px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <DocumentArrowDownIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                            حفظ كمسودة
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={isSaving || !isReportEditable}
                            className="flex-1 sm:flex-none justify-center flex items-center gap-2 px-3 sm:px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                        >
                            <PaperAirplaneIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                            إرسال التقرير
                        </button>
                    </div>
                </div>

                {!REPORT_COLLAB_ENABLED && (
                    <div className="mt-3 rounded-lg border border-blue-300/80 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20 px-3 py-2 text-xs sm:text-sm text-blue-800 dark:text-blue-200">
                        التعاون الفوري للتقارير متوقف حاليًا عبر إعداد البيئة `VITE_REPORT_COLLAB_ENABLED`.
                    </div>
                )}

                {!isReportEditable && (
                    <div className="mt-3 rounded-lg border border-slate-300/80 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/30 px-3 py-2 text-xs sm:text-sm text-slate-700 dark:text-slate-200">
                        التقرير في وضع القراءة فقط. الحالة الحالية:
                        {' '}
                        <span className="font-semibold">
                            {REPORT_STATUS_LABELS[formData.status] || formData.status}
                        </span>
                        .
                    </div>
                )}

                {collaborationConnectionStatus !== 'connected' && collaborationEnabled && (
                    <div className="mt-3 rounded-lg border border-amber-300/80 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 text-xs sm:text-sm text-amber-800 dark:text-amber-200 flex flex-wrap items-center gap-2">
                        <span>
                            {collaborationConnectionStatus === 'connecting'
                                ? 'جاري الاتصال بنظام التعاون الفوري...'
                                : collaborationConnectionStatus === 'reconnecting'
                                    ? `انقطع الاتصال، إعادة المحاولة (#${collaborationReconnectAttempt})...`
                                    : 'التعاون الفوري غير متصل حالياً، قد تتأخر مزامنة التعديلات.'}
                        </span>
                        {collaborationError?.message && (
                            <span className="w-full text-[11px] sm:text-xs text-amber-900/90 dark:text-amber-100/90">
                                السبب: {collaborationError.message}
                            </span>
                        )}
                        <button
                            type="button"
                            onClick={reconnectCollaboration}
                            className="px-2 py-1 rounded border border-amber-400/70 dark:border-amber-600 text-amber-800 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors"
                        >
                            إعادة المحاولة الآن
                        </button>
                    </div>
                )}

                {collaborationConflict && (
                    <div className="mt-3 rounded-lg border border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20 px-3 py-2 text-xs sm:text-sm text-red-700 dark:text-red-200">
                        <div className="flex flex-wrap items-center gap-2 justify-between">
                            <span>
                                {collaborationConflict.message ||
                                    'تم اكتشاف تعارض تعديل. يوصى بتحميل أحدث نسخة من التقرير قبل المتابعة.'}
                            </span>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={resolveConflictByReload}
                                    disabled={isResolvingConflict}
                                    className="px-2 py-1 rounded border border-red-400/70 dark:border-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors disabled:opacity-60"
                                >
                                    {isResolvingConflict ? 'جاري التحديث...' : 'تحديث من الخادم'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setCollaborationConflict(null)}
                                    className="px-2 py-1 rounded border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                >
                                    إخفاء
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Main Content */}
            <div className="flex-1 flex overflow-hidden">
                {/* Section Navigation */}
                {!isMobile && (
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
                            {templateForRendering?.quality_criteria && templateForRendering.quality_criteria.length > 0 && (
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
                            {templateForRendering?.notes && (
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
                        <div className="mb-3">
                            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                معلومات التقرير
                            </h3>
                        </div>
                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                                    التاريخ
                                </label>
                                <input
                                    type="date"
                                    value={safeFormData.report_date || ''}
                                    disabled={!isReportEditable}
                                    onChange={(e) => handleBasicInfoChange('report_date', e.target.value)}
                                    className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                                    الوردية
                                </label>
                                <select
                                    value={safeFormData.shift || 'A'}
                                    disabled={!isReportEditable}
                                    onChange={(e) => handleBasicInfoChange('shift', e.target.value)}
                                    className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700"
                                >
                                    <option value="A">الوردية A</option>
                                    <option value="B">الوردية B</option>
                                    {/* Only show Shift C if duration is 8 hours (or not set, defaulting to 8) */}
                                    {(!safeFormData.shift_duration || safeFormData.shift_duration === 8) && (
                                        <option value="C">الوردية C</option>
                                    )}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                                    عدد ساعات الوردية
                                </label>
                                <select
                                    value={safeFormData.shift_duration || 8}
                                    disabled={!isReportEditable}
                                    onChange={(e) => {
                                        const newDuration = parseInt(e.target.value);
                                        // If switching to 12 hours and current shift is C, reset to A
                                        if (newDuration === 12 && safeFormData.shift === 'C') {
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
                                    value={safeFormData.inspection_start_time || '08:00'}
                                    disabled={!isReportEditable}
                                    onChange={(e) => handleBasicInfoChange('inspection_start_time', e.target.value)}
                                    className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700"
                                />
                            </div>
                            {/* Hide batch number for data-collection type */}
                            {templateForRendering?.type !== 'data-collection' && (
                                <div>
                                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                                        رقم الدُفعة
                                    </label>
                                    <input
                                        type="text"
                                        value={safeFormData.batch_number || ''}
                                        readOnly
                                        className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 bg-gray-100 dark:bg-gray-600 cursor-not-allowed"
                                        title="يتم توليد رقم الدُفعة تلقائياً بناءً على إعدادات النموذج"
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                )}

                {/* Form Content */}
                <div className="flex-1 overflow-y-auto p-3 sm:p-6">
                    {isMobile && (
                        <div className="mb-4 space-y-3">
                            <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3">
                                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                                    الأقسام
                                </h3>
                                <div className="flex gap-2 overflow-x-auto pb-1">
                                    {sections.map((section, sectionIndex) => (
                                        <button
                                            key={section.id || `section-mobile-${sectionIndex}`}
                                            onClick={() => setActiveSection(section.id)}
                                            className={cn(
                                                "whitespace-nowrap px-3 py-1.5 rounded-full text-xs transition-colors border",
                                                activeSection === section.id
                                                    ? "bg-primary-600 text-white border-primary-600"
                                                    : "bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300"
                                            )}
                                        >
                                            {section.name}
                                        </button>
                                    ))}
                                    {templateForRendering?.quality_criteria && templateForRendering.quality_criteria.length > 0 && (
                                        <button
                                            onClick={() => setActiveSection('quality_criteria')}
                                            className={cn(
                                                "whitespace-nowrap px-3 py-1.5 rounded-full text-xs transition-colors border",
                                                activeSection === 'quality_criteria'
                                                    ? "bg-primary-600 text-white border-primary-600"
                                                    : "bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300"
                                            )}
                                        >
                                            معايير الجودة
                                        </button>
                                    )}
                                    {templateForRendering?.notes && (
                                        <button
                                            onClick={() => setActiveSection('template_notes')}
                                            className={cn(
                                                "whitespace-nowrap px-3 py-1.5 rounded-full text-xs transition-colors border",
                                                activeSection === 'template_notes'
                                                    ? "bg-primary-600 text-white border-primary-600"
                                                    : "bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300"
                                            )}
                                        >
                                            ملاحظات هامة
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3">
                                <div className="mb-3">
                                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                                        معلومات التقرير
                                    </h3>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                                            التاريخ
                                        </label>
                                        <input
                                            type="date"
                                            value={safeFormData.report_date || ''}
                                            disabled={!isReportEditable}
                                            onChange={(e) => handleBasicInfoChange('report_date', e.target.value)}
                                            className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                                            الوردية
                                        </label>
                                        <select
                                            value={safeFormData.shift || 'A'}
                                            disabled={!isReportEditable}
                                            onChange={(e) => handleBasicInfoChange('shift', e.target.value)}
                                            className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700"
                                        >
                                            <option value="A">الوردية A</option>
                                            <option value="B">الوردية B</option>
                                            {(!safeFormData.shift_duration || safeFormData.shift_duration === 8) && (
                                                <option value="C">الوردية C</option>
                                            )}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                                            عدد ساعات الوردية
                                        </label>
                                        <select
                                            value={safeFormData.shift_duration || 8}
                                            disabled={!isReportEditable}
                                            onChange={(e) => {
                                                const newDuration = parseInt(e.target.value);
                                                if (newDuration === 12 && safeFormData.shift === 'C') {
                                                    handleBasicInfoChange('shift', 'A');
                                                }
                                                handleBasicInfoChange('shift_duration', newDuration);
                                            }}
                                            className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700"
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
                                            value={safeFormData.inspection_start_time || '08:00'}
                                            disabled={!isReportEditable}
                                            onChange={(e) => handleBasicInfoChange('inspection_start_time', e.target.value)}
                                            className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700"
                                        />
                                    </div>
                                    {templateForRendering?.type !== 'data-collection' && (
                                        <div className="sm:col-span-2">
                                            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                                                رقم الدُفعة
                                            </label>
                                            <input
                                                type="text"
                                                value={safeFormData.batch_number || ''}
                                                readOnly
                                                className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 bg-gray-100 dark:bg-gray-600 cursor-not-allowed"
                                                title="يتم توليد رقم الدُفعة تلقائياً بناءً على إعدادات النموذج"
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                    {activeSection === 'quality_criteria' ? (
                        <div className="space-y-6">
                            <div className="flex flex-wrap items-center gap-2 mb-4">
                                <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
                                    معايير الجودة والقبول
                                </h3>
                                <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                                    - مرجع المواصفات القياسية
                                </span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {templateForRendering?.quality_criteria?.map((criteria, index) => (
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
                            <div className="flex flex-wrap items-center gap-2 mb-4">
                                <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
                                    ملاحظات هامة
                                </h3>
                                <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                                    - تعليمات وتنبيهات
                                </span>
                            </div>

                            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800/50 rounded-lg p-3 sm:p-6">
                                <div
                                    className="prose prose-sm max-w-none dark:prose-invert text-gray-800 dark:text-gray-200"
                                    dangerouslySetInnerHTML={{ __html: templateForRendering?.notes || '' }}
                                />
                            </div>
                        </div>
                    ) : currentSection ? (
                        <FormRenderer
                            section={currentSection}
                            formData={safeFormData.sections?.[currentSection.id] || { tables: {} }}
                            onChange={(tableId, data, metadata) =>
                                handleFormDataChange(currentSection.id, tableId, data, metadata)
                            }
                            onTableNotesChange={(tableId, notes) => handleTableNotesChange(currentSection.id, tableId, notes)}
                            tableNotes={safeFormData.table_notes || {}}
                            externalChangeSignal={externalCellHighlight}
                            readOnly={!isReportEditable}
                            onStoppedTimesChange={(groupId, stoppedTimes) => {
                                setFormData(prev => ({
                                    ...prev,
                                    form_data: {
                                        ...createSafeReportFormData(prev.form_data),
                                        stopped_times: {
                                            ...(createSafeReportFormData(prev.form_data).stopped_times || {}),
                                            [groupId]: stoppedTimes,
                                        },
                                    },
                                }));
                            }}
                            stoppedTimesByGroup={safeFormData.stopped_times || {}}
                            boundGlobalVariables={documentVariableSnapshot}
                            template={templateForRendering || template}
                            inspectionStartTime={safeFormData.inspection_start_time || '08:00'}
                            shiftDuration={safeFormData.shift_duration || 8}
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
