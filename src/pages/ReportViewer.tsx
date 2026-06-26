import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
    ArrowLeftIcon,
    DocumentArrowDownIcon,
    PrinterIcon,
    CheckCircleIcon,
    XCircleIcon,
    ClockIcon,
} from '@heroicons/react/24/outline';
import useStore from '../store';
import { useCompanyStore } from '../store/companyStore';
import { useAppSettingsStore } from '../store/appSettingsStore';
import { cn, calculateStats, useDateFormat } from '../utils';
import type { Table, ReportStatus } from '../types';
import { getRecipesByProduct } from '../services/recipeService';
import type { Recipe } from '../types/recipe';
import { ReportStatusBadge } from '../components/reports';
import { useTabsStore } from '../store/tabsStore';
import { formatMaterialDateForDisplay } from '../utils/materialReceivingDate';
import {
    applyDocumentVariableBindingsToTemplate,
    isVariableToken,
    resolveDocumentVariableDisplayValue,
} from '../utils/documentVariableBindings';
import {
    buildSideHeaderRenderModel,
    expandSideHeaderRowsToMatrix,
    getCustomBoldColumnSeparatorsForRendering,
    getCustomBoldRowSeparatorsForRendering,
    getCustomColumnsForRendering,
    getCustomGridSettingsForRendering,
    getCustomHeaderRowsForRendering,
    getCustomSideHeaderLabelsForRendering,
    getCustomSideHeaderRowsForRendering,
    getCustomSideHeaderTargetsForRendering,
    getCustomLayoutForRendering,
    resolveCustomCellDisplayValue,
    resolveCustomCellType,
} from '../utils/customTableV2';
import { FORMS_REPORTS_HOME, formsReportsTemplateReportsPath } from '../constants/formsReportsRoutes';

const ReportViewer: React.FC = () => {
    const { templateId, instanceId } = useParams<{ templateId?: string; instanceId?: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    const { formTemplates, formInstances, syncInstance } = useStore();
    const { getActiveTab } = useTabsStore();
    const { selectedCompany } = useCompanyStore();
    const { logoUrl, logoScale } = useAppSettingsStore();
    const { formatDate } = useDateFormat();

    // ✅ FIX: Load instance from database to ensure fresh data
    const [loadedInstance, setLoadedInstance] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isMobile, setIsMobile] = useState(false);
    const [isPrintMode, setIsPrintMode] = useState(false);
    const MOBILE_TIME_COLUMNS_PER_VIEW = 2;
    const MOBILE_CUSTOM_COLUMNS_PER_VIEW = 2;
    const [mobileColumnStartByTable, setMobileColumnStartByTable] = useState<Record<string, number>>({});

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
        if (typeof window === 'undefined') return;

        const handleBeforePrint = () => setIsPrintMode(true);
        const handleAfterPrint = () => setIsPrintMode(false);

        window.addEventListener('beforeprint', handleBeforePrint);
        window.addEventListener('afterprint', handleAfterPrint);

        return () => {
            window.removeEventListener('beforeprint', handleBeforePrint);
            window.removeEventListener('afterprint', handleAfterPrint);
        };
    }, []);

    useEffect(() => {
        if (typeof document === 'undefined') return;
        document.body.classList.add('report-preview-active');
        return () => {
            document.body.classList.remove('report-preview-active');
        };
    }, []);

    useEffect(() => {
        const loadInstanceFromDB = async () => {
            if (!instanceId) {
                setIsLoading(false);
                return;
            }

            // ✅ ALWAYS load from database first to ensure fresh data
            console.log('🔄 [ReportViewer] Loading instance from database:', instanceId);
            setIsLoading(true);

            try {
                const { instancesService } = await import('../services/supabaseService');
                const dbInstance = await instancesService.getInstance(instanceId);
                if (dbInstance) {
                    console.log('✅ [ReportViewer] Instance loaded from DB:', dbInstance.instance_id);
                    console.log('   - Has sections:', dbInstance.form_data?.sections ? Object.keys(dbInstance.form_data.sections).length : 0);
                    setLoadedInstance(dbInstance);
                    // Sync to store for future use
                    syncInstance(dbInstance);
                } else {
                    // Fallback to store if DB returns nothing
                    const storeInstance = formInstances[instanceId];
                    if (storeInstance) {
                        console.log('📋 [ReportViewer] Using fallback from store:', instanceId);
                        setLoadedInstance(storeInstance);
                    }
                }
            } catch (error) {
                console.error('❌ [ReportViewer] Failed to load instance:', error);
                // Fallback to store on error
                const storeInstance = formInstances[instanceId];
                if (storeInstance) {
                    setLoadedInstance(storeInstance);
                }
            } finally {
                setIsLoading(false);
            }
        };

        loadInstanceFromDB();
    }, [instanceId]);

    // Get template and instance - use loaded instance from DB
    const instance = loadedInstance || (instanceId ? formInstances[instanceId] : null);
    const storeTemplate = templateId
        ? formTemplates[templateId]
        : instance
            ? formTemplates[instance.template_id]
            : null;

    // ✅ FIX: Load full template from database (store may not have sections due to progressive loader)
    const [loadedTemplate, setLoadedTemplate] = useState<any>(null);

    useEffect(() => {
        const loadTemplateFromDB = async () => {
            const actualTemplateId = templateId || instance?.template_id;
            if (!actualTemplateId) return;

            // Check if store template has sections
            if (storeTemplate?.sections && Object.keys(storeTemplate.sections).length > 0) {
                console.log('📋 [ReportViewer] Template has sections in store:', Object.keys(storeTemplate.sections).length);
                setLoadedTemplate(storeTemplate);
                return;
            }

            // Load from database
            console.log('🔄 [ReportViewer] Loading full template from database:', actualTemplateId);
            try {
                const { templatesService } = await import('../services/supabaseService');
                const dbTemplate = await templatesService.getTemplate(actualTemplateId);
                if (dbTemplate) {
                    console.log('✅ [ReportViewer] Template loaded from DB with sections:', Object.keys(dbTemplate.sections || {}).length);
                    setLoadedTemplate(dbTemplate);
                }
            } catch (error) {
                console.error('❌ [ReportViewer] Failed to load template:', error);
            }
        };

        loadTemplateFromDB();
    }, [templateId, instance?.template_id, storeTemplate]);

    // Use loaded template or fallback to store
    const template = loadedTemplate || storeTemplate;
    const formData = instance?.form_data || {};
    const documentVariableSnapshot = useMemo(() => {
        const snapshot = formData?.document_variables_snapshot;
        if (!snapshot || typeof snapshot !== 'object') return undefined;
        return snapshot as Record<string, string | number>;
    }, [formData?.document_variables_snapshot]);
    const templateForRendering = useMemo(() => {
        if (!template) return template;
        if (!documentVariableSnapshot || Object.keys(documentVariableSnapshot).length === 0) return template;
        return applyDocumentVariableBindingsToTemplate(template, documentVariableSnapshot);
    }, [documentVariableSnapshot, template]);
    const resolveVariableDisplayValue = (rawValue: unknown): unknown => {
        if (!documentVariableSnapshot || Object.keys(documentVariableSnapshot).length === 0) {
            return rawValue;
        }
        return resolveDocumentVariableDisplayValue(rawValue, documentVariableSnapshot);
    };
    const resolveVariableNumericValue = (rawValue: unknown): number | undefined => {
        const resolved = resolveVariableDisplayValue(rawValue);
        const parsed = Number(resolved);
        return Number.isFinite(parsed) ? parsed : undefined;
    };
    const hasResolvedVariableDisplayValue = (value: unknown): boolean =>
        value !== undefined &&
        value !== null &&
        value !== '' &&
        !(typeof value === 'string' && isVariableToken(value));

    // State for recipe data - moved here to fix hooks order
    const [previewRecipes, setPreviewRecipes] = useState<Recipe[]>([]);

    const waitForReportImagesToLoad = async () => {
        if (typeof document === 'undefined') return;

        const scope = document.querySelector('.report-print-root') || document.body;
        const images = Array.from(scope.querySelectorAll('img')) as HTMLImageElement[];
        const pendingImages = images.filter((img) => !img.complete || img.naturalWidth === 0);

        if (pendingImages.length === 0) return;

        await Promise.race([
            Promise.all(
                pendingImages.map(
                    (img) =>
                        new Promise<void>((resolve) => {
                            const done = () => resolve();
                            img.addEventListener('load', done, { once: true });
                            img.addEventListener('error', done, { once: true });
                        })
                )
            ),
            new Promise<void>((resolve) => {
                window.setTimeout(resolve, 2000);
            }),
        ]);
    };

    // Load ALL recipes based on product_id
    useEffect(() => {
        const productId = templateForRendering?.basic_info?.product_id;
        if (productId) {
            getRecipesByProduct(productId).then(recipes => {
                console.log('📋 Loaded', recipes.length, 'recipes for product:', productId);
                setPreviewRecipes(recipes);
            }).catch(err => {
                console.error('Failed to load recipes:', err);
            });
            return;
        }

        setPreviewRecipes([]);
    }, [templateForRendering?.basic_info?.product_id]);

    const triggerFullA4Print = async () => {
        setIsPrintMode(true);
        if (typeof window === 'undefined') return;

        // Wait for React render so print always captures full A4 layout.
        await new Promise<void>((resolve) => {
            window.requestAnimationFrame(() => {
                window.requestAnimationFrame(() => resolve());
            });
        });

        // Ensure image cells and signatures are loaded before opening print dialog.
        await waitForReportImagesToLoad();
        window.print();
    };

    const handlePrint = () => {
        void triggerFullA4Print();
    };

    const handleExportPDF = () => {
        // Browser PDF export uses the same full A4 print layout.
        void triggerFullA4Print();
    };

    const handleBack = () => {
        const activeTab = getActiveTab();
        const tabReturnPath = activeTab?.path === location.pathname ? activeTab.returnPath : undefined;

        const returnPath = (() => {
            if (tabReturnPath) {
                if (
                    tabReturnPath === '/folders' ||
                    tabReturnPath.startsWith('/folders/') ||
                    tabReturnPath === '/forms&reports' ||
                    tabReturnPath.startsWith('/forms&reports/')
                ) {
                    return instance?.template_id
                        ? formsReportsTemplateReportsPath(instance.template_id)
                        : FORMS_REPORTS_HOME;
                }
                return tabReturnPath;
            }
            return instance?.template_id
                ? formsReportsTemplateReportsPath(instance.template_id)
                : FORMS_REPORTS_HOME;
        })();

        navigate(returnPath);
    };

    if (!templateForRendering) {
        return (
            <div className="h-full flex items-center justify-center">
                <div className="text-center">
                    <p className="text-gray-500 dark:text-gray-400 mb-4">لم يتم العثور على النموذج</p>
                    <button
                        onClick={handleBack}
                        className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                    >
                        العودة
                    </button>
                </div>
            </div>
        );
    }

    const sections = Object.values(templateForRendering.sections || {}).sort((a: any, b: any) => a.order - b.order);

    // Debug: Log section ID matching
    console.log('📊 [ReportViewer] Debug - Template sections:', sections.map((s: any) => s.id));
    console.log('📊 [ReportViewer] Debug - FormData sections:', formData?.sections ? Object.keys(formData.sections) : 'N/A');
    console.log('📊 [ReportViewer] Debug - Instance:', instance?.instance_id, 'has form_data:', !!instance?.form_data);

    // previewRecipes hooks moved to top to fix React hooks order error


    // Helper function to generate time headers based on inspection interval
    const generateTimeHeaders = (startTime: string, durationHours: number, intervalMinutes: number): string[] => {
        const headers: string[] = [];

        // Validate inputs
        if (!startTime || typeof startTime !== 'string' || !startTime.includes(':')) {
            startTime = '08:00';
        }
        if (!durationHours || durationHours <= 0) {
            durationHours = 8;
        }
        if (!intervalMinutes || intervalMinutes <= 0) {
            intervalMinutes = 30;
        }

        const [startHour, startMinute] = startTime.split(':').map(Number);
        const totalMinutes = durationHours * 60;
        const columnsCount = Math.floor(totalMinutes / intervalMinutes);

        for (let i = 0; i < columnsCount; i++) {
            const minutesFromStart = i * intervalMinutes;
            const totalMins = startHour * 60 + startMinute + minutesFromStart;
            const hour = Math.floor(totalMins / 60) % 24;
            const minute = totalMins % 60;
            headers.push(`${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`);
        }

        return headers;
    };

    const toPositiveInt = (value: unknown): number | null => {
        const parsed = Number(value);
        if (!Number.isFinite(parsed)) return null;
        const normalized = Math.floor(parsed);
        return normalized > 0 ? normalized : null;
    };

    const getUnitDisplayLabel = (unit: unknown): string => {
        const normalized = String(unit ?? '').trim();
        if (!normalized || normalized === '-') return '-';

        const unitMap: Record<string, string> = {
            kg: 'كجم',
            g: 'جم',
            mg: 'مجم',
            l: 'لتر',
            ml: 'مل',
        };

        return unitMap[normalized.toLowerCase()] || normalized;
    };

    const resolveSampleSize = (table: Table, fallback = 20): number => {
        const explicitSampleSize = toPositiveInt((table as any)?.sample_size ?? (table as any)?.sampleSize);
        if (explicitSampleSize !== null) return explicitSampleSize;

        const legacyRows = toPositiveInt((table as any)?.rows);
        if (legacyRows !== null) return legacyRows;

        return fallback;
    };

    const getVisibleColumnIndexes = (tableId: string, totalColumns: number, windowSize: number): number[] => {
        if (totalColumns <= 0) return [];
        const safeWindowSize = Math.max(1, windowSize);

        if (isPrintMode || !isMobile || totalColumns <= safeWindowSize) {
            return Array.from({ length: totalColumns }, (_, index) => index);
        }

        const maxStart = Math.max(0, totalColumns - safeWindowSize);
        const requestedStart = mobileColumnStartByTable[tableId] ?? 0;
        const start = Math.min(Math.max(0, requestedStart), maxStart);

        return Array.from({ length: safeWindowSize }, (_, offset) => start + offset);
    };

    const shiftMobileColumnWindow = (
        tableId: string,
        totalColumns: number,
        windowSize: number,
        direction: 'prev' | 'next'
    ) => {
        const safeWindowSize = Math.max(1, windowSize);
        if (totalColumns <= safeWindowSize) return;

        setMobileColumnStartByTable((previous) => {
            const maxStart = Math.max(0, totalColumns - safeWindowSize);
            const current = Math.min(Math.max(0, previous[tableId] ?? 0), maxStart);
            const next =
                direction === 'next'
                    ? Math.min(maxStart, current + safeWindowSize)
                    : Math.max(0, current - safeWindowSize);

            if (next === current) return previous;

            return {
                ...previous,
                [tableId]: next,
            };
        });
    };

    const renderMobileColumnPager = (params: {
        tableId: string;
        totalColumns: number;
        visibleIndexes: number[];
        windowSize: number;
        labels: string[];
        className?: string;
    }) => {
        const { tableId, totalColumns, visibleIndexes, windowSize, labels, className } = params;

        if (!isMobile || totalColumns <= visibleIndexes.length) {
            return null;
        }

        const firstVisibleIndex = visibleIndexes[0] ?? 0;
        const lastVisibleIndex = visibleIndexes[visibleIndexes.length - 1] ?? 0;

        return (
            <div className={cn(
                'print:hidden flex items-center justify-between gap-2 rounded-lg border border-gray-200 px-2 py-1.5 bg-gray-50',
                className
            )}>
                <button
                    type="button"
                    onClick={() => shiftMobileColumnWindow(tableId, totalColumns, windowSize, 'prev')}
                    disabled={firstVisibleIndex === 0}
                    className={cn(
                        'px-2 py-1 text-xs rounded-md border transition-colors',
                        firstVisibleIndex === 0
                            ? 'text-gray-400 border-gray-200 cursor-not-allowed'
                            : 'text-gray-700 border-gray-300 hover:bg-gray-100'
                    )}
                >
                    السابق
                </button>
                <div className="text-center leading-tight">
                    <div className="text-[11px] font-medium text-gray-700">
                        الأعمدة {firstVisibleIndex + 1}-{lastVisibleIndex + 1} من {totalColumns}
                    </div>
                    <div className="text-[11px] text-gray-500">
                        {(labels[firstVisibleIndex] ?? `#${firstVisibleIndex + 1}`)} - {(labels[lastVisibleIndex] ?? `#${lastVisibleIndex + 1}`)}
                    </div>
                </div>
                <button
                    type="button"
                    onClick={() => shiftMobileColumnWindow(tableId, totalColumns, windowSize, 'next')}
                    disabled={lastVisibleIndex >= totalColumns - 1}
                    className={cn(
                        'px-2 py-1 text-xs rounded-md border transition-colors',
                        lastVisibleIndex >= totalColumns - 1
                            ? 'text-gray-400 border-gray-200 cursor-not-allowed'
                            : 'text-gray-700 border-gray-300 hover:bg-gray-100'
                    )}
                >
                    التالي
                </button>
            </div>
        );
    };

    const getStatusInfo = (status?: string) => {
        switch (status) {
            case 'approved':
                return {
                    label: 'معتمد',
                    icon: <CheckCircleIcon className="w-5 h-5" />,
                    color: 'text-green-700 bg-green-50 border-green-200',
                    stamp: 'APPROVED',
                    stampColor: 'text-green-600 border-green-600',
                };
            case 'rejected':
                return {
                    label: 'مرفوض',
                    icon: <XCircleIcon className="w-5 h-5" />,
                    color: 'text-red-700 bg-red-50 border-red-200',
                    stamp: 'REJECTED',
                    stampColor: 'text-red-600 border-red-600',
                };
            case 'submitted':
                return {
                    label: 'مُرسل للمراجعة',
                    icon: <ClockIcon className="w-5 h-5" />,
                    color: 'text-blue-700 bg-blue-50 border-blue-200',
                    stamp: 'PENDING',
                    stampColor: 'text-blue-600 border-blue-600',
                };
            default:
                return {
                    label: 'مسودة',
                    icon: <ClockIcon className="w-5 h-5" />,
                    color: 'text-gray-700 bg-gray-50 border-gray-200',
                    stamp: 'DRAFT',
                    stampColor: 'text-gray-400 border-gray-400',
                };
        }
    };

    // Smart cell style helper: Adapts font size and wrapping based on content length
    const getSmartCellStyle = (value: any): { fontSize: string; className: string } => {
        const text = String(value || '').trim();
        const length = text.length;

        if (length === 0 || value === undefined || value === null || value === '') {
            return { fontSize: '', className: '' };
        } else if (length <= 5) {
            // Very short: normal size, no wrap
            return {
                fontSize: '', // Use parent default
                className: 'whitespace-nowrap'
            };
        } else if (length <= 12) {
            // Medium: slightly smaller, no wrap
            return {
                fontSize: '9px',
                className: 'whitespace-nowrap'
            };
        } else if (length <= 25) {
            // Long: smaller size, allow wrap
            return {
                fontSize: '8px',
                className: 'whitespace-normal break-words'
            };
        } else {
            // Very long: smallest size, multi-line with tight leading
            return {
                fontSize: '7px',
                className: 'whitespace-normal break-words leading-tight'
            };
        }
    };

    const renderTable = (table: Table, tableData: any[][] = []) => {
        // Get inspection time settings from form data
        const inspectionStartTime = formData?.inspection_start_time || '08:00';
        const shiftDuration = formData?.shift_duration || 8;
        const intervalMinutes = table.inspection_period || 30;

        // Generate time headers for parameters table
        const timeHeaders = generateTimeHeaders(inspectionStartTime, shiftDuration, intervalMinutes);

        const normalizeImageCell = (val: unknown): string[] => {
            let images: string[] = [];
            if (Array.isArray(val)) {
                images = val.filter((item): item is string => typeof item === 'string');
            } else if (typeof val === 'string') {
                if (val.trim().startsWith('[')) {
                    try {
                        const parsed = JSON.parse(val);
                        if (Array.isArray(parsed)) {
                            images = parsed.filter((item): item is string => typeof item === 'string');
                        } else {
                            images = [val];
                        }
                    } catch (_e) {
                        images = [val];
                    }
                } else {
                    images = [val];
                }
            }
            return images.filter((img) => img && img.length > 10);
        };

        const renderReadonlyCellValue = (col: any, val: unknown, compact = false) => {
            const resolvedValue = resolveVariableDisplayValue(val);
            if (col.type === 'image') {
                const images = normalizeImageCell(resolvedValue);
                if (images.length === 0) {
                    return <span className="text-gray-400">-</span>;
                }
                return (
                    <div className="flex flex-col gap-1 w-full">
                        {images.map((img: string, idx: number) => (
                            <div key={idx} className="w-full relative pt-[12.5%] border border-gray-100 rounded overflow-hidden bg-white">
                                <img
                                    src={img}
                                    alt="Item"
                                    className="absolute top-0 left-0 w-full h-full object-cover"
                                />
                            </div>
                        ))}
                    </div>
                );
            }

            if (col.type === 'long-text') {
                return (
                    <div className={cn('whitespace-pre-wrap text-right', compact ? 'text-xs' : 'text-sm')}>
                        {resolvedValue !== undefined && resolvedValue !== '' ? String(resolvedValue) : '-'}
                    </div>
                );
            }

            if (col.type === 'boolean-check') {
                const isTrue = resolvedValue === true || resolvedValue === 'true' || resolvedValue === 'checked' || resolvedValue === 'مقبول';
                const isFalse = resolvedValue === false || resolvedValue === 'false' || resolvedValue === 'unchecked' || resolvedValue === 'مرفوض';
                return isTrue ? (
                    <span className="text-green-600 text-lg font-bold">✓</span>
                ) : isFalse ? (
                    <span className="text-red-600 text-lg font-bold">✗</span>
                ) : (
                    <span className="text-gray-400">-</span>
                );
            }

            if (col.type === 'boolean-yesno') {
                const isTrue = resolvedValue === true || resolvedValue === 'true' || resolvedValue === 'yes' || resolvedValue === 'نعم';
                const isFalse = resolvedValue === false || resolvedValue === 'false' || resolvedValue === 'no' || resolvedValue === 'لا';
                return (
                    <span className={compact ? 'text-xs' : 'text-sm'}>
                        {isTrue ? 'نعم' : isFalse ? 'لا' : '-'}
                    </span>
                );
            }

            const cellStyle = getSmartCellStyle(resolvedValue);
            return (
                <span
                    className={cn(
                        compact ? 'text-xs' : '',
                        cellStyle.className
                    )}
                    style={cellStyle.fontSize ? { fontSize: cellStyle.fontSize } : undefined}
                >
                    {resolvedValue !== undefined && resolvedValue !== '' ? String(resolvedValue) : '-'}
                </span>
            );
        };

        const getColumnAlignClass = (align?: 'right' | 'center' | 'left') => {
            if (align === 'left') return 'text-left';
            if (align === 'right') return 'text-right';
            return 'text-center';
        };

        const customColumns = getCustomColumnsForRendering(table);
        const customGridSettings = getCustomGridSettingsForRendering(table);
        const customLayoutSettings = getCustomLayoutForRendering(table);

        const normalizeCustomHeaderRows = (sourceTable: Table) => {
            const rawRows = getCustomHeaderRowsForRendering(sourceTable);
            return rawRows
                .filter((row) => Array.isArray(row) && row.length > 0)
                .map((row) =>
                    row.map((cell: any) => ({
                        label: cell?.label ?? '',
                        col_span: Math.max(1, Number(cell?.col_span ?? cell?.colSpan ?? 1) || 1),
                        row_span: Math.max(1, Number(cell?.row_span ?? cell?.rowSpan ?? 1) || 1),
                        align: (cell?.align as 'right' | 'center' | 'left') || 'center',
                        background_color: cell?.background_color,
                        text_color: cell?.text_color,
                        class_name: cell?.class_name,
                    }))
                );
        };

        const customHeaderRows = normalizeCustomHeaderRows(table);
        const customSideHeaderRows = getCustomSideHeaderRowsForRendering(table);
        const showTopHeader = customLayoutSettings.topHeader !== false;
        const customMeta = (table.schema_v2?.meta as Record<string, unknown>) || {};
        const useCustomTimeHeader = Boolean(customMeta.time_header_enabled);
        const customIntervalMinutes = Math.max(1, Number(table.inspection_period || 30));
        const generatedCustomTimeHeaders = useCustomTimeHeader
            ? generateTimeHeaders(inspectionStartTime, shiftDuration, customIntervalMinutes)
            : [];
        const getCustomColumnLabel = (colIndex: number) =>
            generatedCustomTimeHeaders[colIndex] || customColumns[colIndex]?.label || `#${colIndex + 1}`;
        const hasCustomHeaderRows = showTopHeader && customHeaderRows.length > 0 && !useCustomTimeHeader;
        const hasSideHeaderConfig = customLayoutSettings.sideHeader && customSideHeaderRows.length > 0;
        const showRowNumbers = customGridSettings.showRowNumbers !== false;
        const rowHeaderLabel = customGridSettings.rowHeaderLabel || '#';
        const getResolvedCustomCellValue = (
            rows: any[][],
            rowIndex: number,
            colIndex: number,
            column: any
        ) =>
            resolveVariableDisplayValue(
                resolveCustomCellDisplayValue(
                    table,
                    rows,
                    rowIndex,
                    colIndex,
                    column.type || 'text',
                    column
                ).value
            );

        if (table.type === 'parameters') {
            // Apply data fallback: check flat formData.tables if tableData is empty
            const finalTableData = (tableData && tableData.length > 0)
                ? tableData
                : formData?.tables?.[table.id]?.data || [];

            const parameters = table.parameters || [];
            const columnsCount = timeHeaders.length || table.rows || 10;
            const displayColumns = timeHeaders.length || Math.min(columnsCount, 10);
            const visibleTimeIndexes = getVisibleColumnIndexes(table.id, displayColumns, MOBILE_TIME_COLUMNS_PER_VIEW);
            const timeColumnLabels = timeHeaders.length > 0
                ? timeHeaders
                : Array.from({ length: displayColumns }, (_, index) => `${index + 1}`);
            const showStatsAsColumns = !isMobile || isPrintMode;
            const showAvgColumn = Boolean(table.features?.show_avg) && showStatsAsColumns;
            const showStdColumn = Boolean(table.features?.show_std) && showStatsAsColumns;
            return (
                <div className="space-y-2 print:space-y-0">
                    {renderMobileColumnPager({
                        tableId: table.id,
                        totalColumns: displayColumns,
                        visibleIndexes: visibleTimeIndexes,
                        windowSize: MOBILE_TIME_COLUMNS_PER_VIEW,
                        labels: timeColumnLabels,
                    })}
                    <div className="overflow-x-hidden print-table-container">
                        <table
                            className="w-full border-collapse text-xs print:text-[10px]"
                            style={{
                                tableLayout: 'auto',
                            }}
                        >
                            <colgroup>
                                {/* Parameter name - responsive width */}
                                <col style={{ minWidth: '80px', width: '18%' }} />
                                {/* Limits - responsive width */}
                                <col style={{ minWidth: '50px', width: '8%' }} />
                                {/* Data columns - flexible with constraints */}
                                {visibleTimeIndexes.map((colIndex) => (
                                    <col key={colIndex} style={{ minWidth: '8mm', maxWidth: '50mm' }} />
                                ))}
                                {/* AVG/STD - fixed small width */}
                                {showAvgColumn && <col style={{ width: '6%', minWidth: '40px' }} />}
                                {showStdColumn && <col style={{ width: '6%', minWidth: '40px' }} />}
                            </colgroup>
                            <thead>
                                <tr className="bg-gray-800 text-white print:bg-gray-800">
                                    <th className="border border-gray-400 px-2 py-1.5 text-right font-bold">
                                        المعلمة
                                    </th>
                                    <th className="border border-gray-400 px-2 py-1.5 text-center font-bold">
                                        الحدود
                                    </th>
                                    {visibleTimeIndexes.map((colIndex) => (
                                        <th
                                            key={colIndex}
                                            className="border border-gray-400 px-0.5 py-1 text-center font-bold text-[9px] print:text-[7px]"
                                        >
                                            {timeColumnLabels[colIndex] ?? colIndex + 1}
                                        </th>
                                    ))}
                                    {showAvgColumn && (
                                        <th className="border border-gray-400 px-1 py-1.5 text-center font-bold bg-blue-700 print:w-[6%]">
                                            المتوسط
                                        </th>
                                    )}
                                    {showStdColumn && (
                                        <th className="border border-gray-400 px-1 py-1.5 text-center font-bold bg-purple-700 print:w-[6%]">
                                            STD
                                        </th>
                                    )}
                                </tr>
                            </thead>
                            <tbody>
                                {parameters.map((param, paramIndex) => {
                                    const rowData = finalTableData?.[paramIndex] || [];
                                    const numericValues = rowData.filter((v) => typeof v === 'number' && !isNaN(v));
                                    const stats = calculateStats(numericValues);
                                    const isCritical = param.critical_level === 'ccp' || param.critical_level === 'oprp';
                                    const resolvedParamMin = resolveVariableDisplayValue(param.min);
                                    const resolvedParamMax = resolveVariableDisplayValue(param.max);
                                    const resolvedParamLimits = resolveVariableDisplayValue(param.limits);
                                    const resolvedParamMinNumber = resolveVariableNumericValue(param.min);
                                    const resolvedParamMaxNumber = resolveVariableNumericValue(param.max);
                                    const hasMin = hasResolvedVariableDisplayValue(resolvedParamMin);
                                    const hasMax = hasResolvedVariableDisplayValue(resolvedParamMax);
                                    const hasLimits = hasResolvedVariableDisplayValue(resolvedParamLimits);
                                    const limitsText = hasMin && hasMax
                                        ? `${resolvedParamMin}-${resolvedParamMax}`
                                        : hasMin
                                            ? `>= ${resolvedParamMin}`
                                            : hasMax
                                                ? `<= ${resolvedParamMax}`
                                                : hasLimits
                                                    ? String(resolvedParamLimits)
                                                    : '-';

                                    return (
                                        <tr key={paramIndex} className={cn(
                                            paramIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50',
                                            isCritical && 'bg-yellow-50'
                                        )}>
                                            <td className={cn(
                                                "border border-gray-400 px-2 py-1 font-medium text-right",
                                                isCritical && "border-r-4 border-r-red-500"
                                            )}>
                                                <div className="flex items-center justify-between gap-1">
                                                    <span>{param.name}</span>
                                                    {param.unit && (
                                                        <span className="text-gray-500 text-[10px]">({param.unit})</span>
                                                    )}
                                                </div>
                                                {isMobile && !isPrintMode && (table.features?.show_avg || table.features?.show_std) && (
                                                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                                                        {table.features?.show_avg && (
                                                            <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                                                                AVG
                                                                <span dir="ltr">{numericValues.length > 0 ? stats.avg.toFixed(2) : '-'}</span>
                                                            </span>
                                                        )}
                                                        {table.features?.show_std && (
                                                            <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-semibold text-purple-700">
                                                                STD
                                                                <span dir="ltr">{numericValues.length > 1 ? stats.std.toFixed(2) : '-'}</span>
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                                {isCritical && (
                                                    <span className="text-[9px] text-red-600 font-bold">
                                                        {param.critical_level === 'ccp' ? 'CCP' : 'OPRP'}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="border border-gray-400 px-1 py-1 text-center text-gray-700 font-mono text-[10px]">
                                                {limitsText}
                                            </td>
                                            {visibleTimeIndexes.map((colIndex) => {
                                                const value = rowData[colIndex];
                                                const resolvedValue = resolveVariableDisplayValue(value);
                                                const numericValue = resolveVariableNumericValue(resolvedValue);
                                                const isValid =
                                                    resolvedParamMinNumber !== undefined &&
                                                        resolvedParamMaxNumber !== undefined &&
                                                        numericValue !== undefined
                                                        ? numericValue >= resolvedParamMinNumber && numericValue <= resolvedParamMaxNumber
                                                        : true;

                                                // Get smart styling based on content length
                                                const cellStyle = getSmartCellStyle(resolvedValue);

                                                return (
                                                    <td
                                                        key={colIndex}
                                                        className={cn(
                                                            'border border-gray-400 px-1 py-0.5 text-center font-mono',
                                                            'print:break-words print:overflow-wrap-anywhere',
                                                            !isValid && 'bg-red-200 text-red-800 font-bold',
                                                            (value === undefined || value === null || value === '') && 'text-gray-300',
                                                            cellStyle.className
                                                        )}
                                                        style={cellStyle.fontSize ? { fontSize: cellStyle.fontSize } : undefined}
                                                    >
                                                        {resolvedValue !== undefined && resolvedValue !== null && resolvedValue !== '' ? String(resolvedValue) : '-'}
                                                    </td>
                                                );
                                            })}
                                            {showAvgColumn && (
                                                <td className="border border-gray-400 px-1 py-1 text-center font-bold bg-blue-50 font-mono">
                                                    {numericValues.length > 0 ? stats.avg.toFixed(2) : '-'}
                                                </td>
                                            )}
                                            {showStdColumn && (
                                                <td className="border border-gray-400 px-1 py-1 text-center font-bold bg-purple-50 font-mono">
                                                    {numericValues.length > 1 ? stats.std.toFixed(2) : '-'}
                                                </td>
                                            )}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            );
        }

        if (table.type === 'checklist') {
            const items = table.items || [];
            return (
                <div className="space-y-2">
                    {isMobile && (
                        <div className="space-y-2 print:hidden">
                            {items.map((item, index) => {
                                const status = tableData?.[index]?.[0];
                                const notes = tableData?.[index]?.[1] || '';
                                const statusText = status === 'ok' ? 'مطابق' : status === 'not_ok' ? 'غير مطابق' : status === 'na' ? 'غير منطبق' : '-';

                                return (
                                    <div
                                        key={index}
                                        className={cn(
                                            'rounded-lg border px-3 py-2 bg-white',
                                            status === 'not_ok' ? 'border-red-300 bg-red-50' : 'border-gray-200'
                                        )}
                                    >
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="text-[11px] font-semibold text-gray-500">#{index + 1}</span>
                                            <span className={cn(
                                                'rounded-full px-2 py-0.5 text-[11px] font-bold',
                                                status === 'ok' && 'bg-green-100 text-green-700',
                                                status === 'not_ok' && 'bg-red-100 text-red-700',
                                                status === 'na' && 'bg-gray-100 text-gray-600',
                                                !status && 'bg-gray-100 text-gray-500'
                                            )}>
                                                {statusText}
                                            </span>
                                        </div>
                                        <p className="mt-1 text-sm font-medium text-gray-900 leading-snug text-right">
                                            {item.text}
                                            {item.required && <span className="text-red-500 mr-1">*</span>}
                                        </p>
                                        <p className="mt-2 text-xs text-gray-600 text-right">
                                            <span className="font-semibold text-gray-700">ملاحظات: </span>
                                            {notes || '-'}
                                        </p>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                    <div className={cn('overflow-x-hidden print-table-container', isMobile && 'hidden print:block')}>
                        <table className="w-full border-collapse text-xs print:text-[12px]">
                            <thead>
                                <tr className="bg-gray-800 text-white">
                                    <th className="border border-gray-400 px-2 py-1.5 text-center w-10">#</th>
                                    <th className="border border-gray-400 px-2 py-1.5 text-right">البند</th>
                                    <th className="border border-gray-400 px-2 py-1.5 text-center w-20">الحالة</th>
                                    <th className="border border-gray-400 px-2 py-1.5 text-center w-32">ملاحظات</th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map((item, index) => {
                                    const status = tableData?.[index]?.[0];
                                    const notes = tableData?.[index]?.[1] || '';

                                    return (
                                        <tr key={index} className={cn(
                                            index % 2 === 0 ? 'bg-white' : 'bg-gray-50',
                                            status === 'not_ok' && 'bg-red-50'
                                        )}>
                                            <td className="border border-gray-400 px-2 py-1 text-center text-gray-500">
                                                {index + 1}
                                            </td>
                                            <td className="border border-gray-400 px-2 py-1 text-right">
                                                {item.text}
                                                {item.required && <span className="text-red-500 mr-1">*</span>}
                                            </td>
                                            <td className={cn(
                                                "border border-gray-400 px-2 py-1 text-center font-bold",
                                                status === 'ok' && 'text-green-700',
                                                status === 'not_ok' && 'text-red-700',
                                                status === 'na' && 'text-gray-500'
                                            )}>
                                                {status === 'ok' ? '✓' : status === 'not_ok' ? '✗' : status === 'na' ? 'N/A' : '-'}
                                            </td>
                                            <td className="border border-gray-400 px-2 py-1 text-center text-gray-600 text-[10px]">
                                                {notes || '-'}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            );
        }

        if (table.type === 'recipe') {
            const ingredients = table.ingredients || [];
            return (
                <div className="space-y-2">
                    {isMobile && (
                        <div className="space-y-2 print:hidden">
                            {ingredients.map((ingredient, index) => {
                                const actualQuantity = tableData?.[index]?.[0];
                                const hasDeviation = actualQuantity && Math.abs(actualQuantity - ingredient.quantity) > ingredient.quantity * 0.05;

                                return (
                                    <div key={index} className={cn(
                                        'rounded-lg border px-3 py-2 bg-white',
                                        hasDeviation ? 'border-yellow-300 bg-yellow-50' : 'border-gray-200'
                                    )}>
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="text-[11px] font-semibold text-gray-500">#{index + 1}</span>
                                            <span className="text-[11px] text-gray-500">{ingredient.unit || '-'}</span>
                                        </div>
                                        <p className="mt-1 text-sm font-semibold text-right text-gray-900">{ingredient.ingredient}</p>
                                        <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                                            <div className="rounded border border-gray-200 bg-gray-50 px-2 py-1 text-center">
                                                <div className="text-gray-500">الكمية القياسية</div>
                                                <div className="font-mono font-semibold text-gray-900">{ingredient.quantity ?? '-'}</div>
                                            </div>
                                            <div className={cn(
                                                'rounded border px-2 py-1 text-center',
                                                hasDeviation ? 'border-yellow-300 bg-yellow-100' : 'border-gray-200 bg-gray-50'
                                            )}>
                                                <div className="text-gray-500">الكمية الفعلية</div>
                                                <div className="font-mono font-semibold text-gray-900">{actualQuantity ?? '-'}</div>
                                            </div>
                                        </div>
                                        <div className="mt-2 text-xs text-gray-600 text-right">
                                            <span className="font-semibold text-gray-700">النسبة: </span>
                                            {ingredient.percentage !== undefined ? `${ingredient.percentage}%` : '-'}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                    <div className={cn('overflow-x-hidden print-table-container', isMobile && 'hidden print:block')}>
                        <table className="w-full border-collapse text-xs print:text-[12px]">
                            <thead>
                                <tr className="bg-gray-800 text-white">
                                    <th className="border border-gray-400 px-2 py-1.5 text-center w-10">#</th>
                                    <th className="border border-gray-400 px-2 py-1.5 text-right">المكون</th>
                                    <th className="border border-gray-400 px-2 py-1.5 text-center w-24">الكمية</th>
                                    <th className="border border-gray-400 px-2 py-1.5 text-center w-16">الوحدة</th>
                                    <th className="border border-gray-400 px-2 py-1.5 text-center w-16">النسبة %</th>
                                    <th className="border border-gray-400 px-2 py-1.5 text-center w-24">الكمية الفعلية</th>
                                </tr>
                            </thead>
                            <tbody>
                                {ingredients.map((ingredient, index) => {
                                    const actualQuantity = tableData?.[index]?.[0];

                                    return (
                                        <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                            <td className="border border-gray-400 px-2 py-1 text-center text-gray-500">
                                                {index + 1}
                                            </td>
                                            <td className="border border-gray-400 px-2 py-1 text-right font-medium">
                                                {ingredient.ingredient}
                                            </td>
                                            <td className="border border-gray-400 px-2 py-1 text-center font-mono">
                                                {ingredient.quantity}
                                            </td>
                                            <td className="border border-gray-400 px-2 py-1 text-center">
                                                {ingredient.unit}
                                            </td>
                                            <td className="border border-gray-400 px-2 py-1 text-center font-mono">
                                                {ingredient.percentage !== undefined ? `${ingredient.percentage}%` : '-'}
                                            </td>
                                            <td className={cn(
                                                "border border-gray-400 px-2 py-1 text-center font-mono",
                                                actualQuantity && Math.abs(actualQuantity - ingredient.quantity) > ingredient.quantity * 0.05 && 'bg-yellow-100'
                                            )}>
                                                {actualQuantity !== undefined ? actualQuantity : '-'}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            );
        }

        if (table.type === 'sample' || (table as any).type === 'samples') {
            const sampleSize = resolveSampleSize(table, 20);
            const columnsCount = timeHeaders.length;
            const dataRows = tableData || [];
            const visibleTimeIndexes = getVisibleColumnIndexes(table.id, columnsCount, MOBILE_TIME_COLUMNS_PER_VIEW);
            // Calculate column statistics
            const getColumnAverage = (colIndex: number): number | null => {
                const values: number[] = [];
                for (let i = 0; i < sampleSize; i++) {
                    const val = dataRows[i]?.[colIndex];
                    if (val !== undefined && val !== '' && !isNaN(parseFloat(val))) {
                        values.push(parseFloat(val));
                    }
                }
                if (values.length === 0) return null;
                return values.reduce((a, b) => a + b, 0) / values.length;
            };

            const getColumnSTD = (colIndex: number): number | null => {
                const values: number[] = [];
                for (let i = 0; i < sampleSize; i++) {
                    const val = dataRows[i]?.[colIndex];
                    if (val !== undefined && val !== '' && !isNaN(parseFloat(val))) {
                        values.push(parseFloat(val));
                    }
                }
                if (values.length < 2) return null;
                const avg = values.reduce((a, b) => a + b, 0) / values.length;
                const variance = values.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / (values.length - 1);
                return Math.sqrt(variance);
            };

            return (
                <div className="space-y-2 print:space-y-0">
                    {renderMobileColumnPager({
                        tableId: table.id,
                        totalColumns: columnsCount,
                        visibleIndexes: visibleTimeIndexes,
                        windowSize: MOBILE_TIME_COLUMNS_PER_VIEW,
                        labels: timeHeaders,
                    })}
                    <div className="overflow-x-hidden print-table-container">
                        <table
                            className="w-full border-collapse text-xs print:text-[8px] print:table-fixed"
                        >
                            <thead>
                                <tr className="bg-gray-800 text-white">
                                    <th className="border border-gray-400 px-2 py-1.5 text-center font-bold print:w-[10%]" style={{ width: '60px' }}>
                                        العينة #
                                    </th>
                                    {visibleTimeIndexes.map((colIndex) => (
                                        <th
                                            key={colIndex}
                                            className="border border-gray-400 px-0.5 py-1 text-center font-bold text-[9px] print:text-[7px]"
                                        >
                                            {timeHeaders[colIndex] ?? colIndex + 1}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {Array.from({ length: sampleSize }).map((_, rowIndex) => {
                                    const row = dataRows[rowIndex] || [];
                                    return (
                                        <tr key={rowIndex} className={rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                            <td className="border border-gray-400 px-2 py-1 text-center text-gray-500 font-bold">
                                                {rowIndex + 1}
                                            </td>
                                            {visibleTimeIndexes.map((colIndex) => {
                                                const value = row[colIndex];
                                                return (
                                                    <td
                                                        key={colIndex}
                                                        className={cn(
                                                            "border border-gray-400 px-1 py-1 text-center font-mono",
                                                            (value === undefined || value === '' || value === null) && 'text-gray-300'
                                                        )}
                                                    >
                                                        {value !== undefined && value !== '' && value !== null ? value : '-'}
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    );
                                })}
                                {/* Average row */}
                                {table.features?.calculate_average && (
                                    <tr className="bg-blue-100 font-bold">
                                        <td className="border border-gray-400 px-2 py-1 text-center text-blue-800">المتوسط</td>
                                        {visibleTimeIndexes.map((colIndex) => {
                                            const avg = getColumnAverage(colIndex);
                                            return (
                                                <td key={colIndex} className="border border-gray-400 px-1 py-1 text-center font-mono text-blue-800">
                                                    {avg !== null ? avg.toFixed(2) : '-'}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                )}
                                {/* STD row */}
                                {table.features?.calculate_std && (
                                    <tr className="bg-purple-100 font-bold">
                                        <td className="border border-gray-400 px-2 py-1 text-center text-purple-800">STD</td>
                                        {visibleTimeIndexes.map((colIndex) => {
                                            const std = getColumnSTD(colIndex);
                                            return (
                                                <td key={colIndex} className="border border-gray-400 px-1 py-1 text-center font-mono text-purple-800">
                                                    {std !== null ? std.toFixed(3) : '-'}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            );
        }

        // Recipe Traceability Table - NOW RENDERS ALL RECIPES
        if (table.type === 'recipe-traceability') {
            const rawTableData = Array.isArray(tableData) ? tableData : [];

            // Check if LAST row is recipe metadata (metadata is appended at the end)
            const lastRow = rawTableData[rawTableData.length - 1] as any;
            const hasRecipeMeta = lastRow?.__recipe_meta__ === true;
            const recipeMeta = hasRecipeMeta ? lastRow : null;
            const dataRows = (hasRecipeMeta ? rawTableData.slice(0, -1) : rawTableData)
                .filter((row) => Array.isArray(row));
            const metaDoughCountByRecipe = (() => {
                const source = recipeMeta?.dough_count_by_recipe || recipeMeta?.doughCountByRecipe;
                if (!source || typeof source !== 'object' || Array.isArray(source)) return {} as Record<string, number>;

                return Object.entries(source as Record<string, unknown>).reduce<Record<string, number>>((acc, [key, value]) => {
                    const parsed = toPositiveInt(value);
                    if (key && parsed !== null) {
                        acc[key] = parsed;
                    }
                    return acc;
                }, {});
            })();
            const metaRecipeRowsById = (() => {
                const source = recipeMeta?.recipe_rows_by_id || recipeMeta?.recipeRowsById || recipeMeta?.rows_by_recipe;
                if (!source || typeof source !== 'object' || Array.isArray(source)) return {} as Record<string, any[][]>;

                return Object.entries(source as Record<string, unknown>).reduce<Record<string, any[][]>>((acc, [key, value]) => {
                    if (!key || !Array.isArray(value)) return acc;
                    acc[key] = value.filter((row) => Array.isArray(row)) as any[][];
                    return acc;
                }, {});
            })();

            const tableDerivedIngredients = dataRows.map((row: any) => ({
                ingredient_name: row[0],
                quantity: row[1],
                unit: row[2],
                batches: Array.isArray(row[3]) ? row[3] : []
            }));

            // Determine which recipes to display
            const isPreviewMode = !instance && previewRecipes.length > 0;
            const recipesToDisplay = isPreviewMode
                ? previewRecipes
                : recipeMeta
                    ? [recipeMeta]
                    : previewRecipes.length > 0
                        ? previewRecipes
                        : tableDerivedIngredients.length > 0
                            ? [{
                                id: `table-${table.id}`,
                                name: table.name || 'تتبع الخامات',
                                ingredients: tableDerivedIngredients,
                                mixing_steps: [],
                                notes: '',
                            } as any]
                            : [];

            const getRecipeKey = (recipe: any, recipeIndex: number) =>
                String(recipe?.id || recipe?.recipe_id || recipe?.name || `recipe-${recipeIndex}`);

            const getRecipeDoughCount = (recipe: any, recipeIndex: number): number => {
                const recipeId = String(recipe?.id || recipe?.recipe_id || '').trim();
                if (recipeId && metaDoughCountByRecipe[recipeId] !== undefined) {
                    return metaDoughCountByRecipe[recipeId];
                }

                const recipeRows = recipeId ? metaRecipeRowsById[recipeId] : undefined;
                if (Array.isArray(recipeRows) && Array.isArray(recipeRows[0])) {
                    const parsed = toPositiveInt(recipeRows[0]?.[4]);
                    if (parsed !== null) return parsed;
                }

                if (recipeIndex === 0 && Array.isArray(dataRows[0])) {
                    const parsed = toPositiveInt(dataRows[0]?.[4]);
                    if (parsed !== null) return parsed;
                }

                return 1;
            };

            const normalizeSummaryRecipeName = (name: string): string => {
                const normalized = String(name || '')
                    .replace(/مكونا\s+ت/gi, 'مكونات')
                    .replace(/\s+/g, ' ')
                    .trim();
                if (!normalized) return 'وصفة';

                const withoutRepeatedDoughPrefix = normalized
                    .replace(/^مكونات?\s+العجين\s*/i, '')
                    .trim();

                return withoutRepeatedDoughPrefix || normalized;
            };

            const doughCountSummary = recipesToDisplay.map((recipe, recipeIndex) => ({
                key: getRecipeKey(recipe, recipeIndex),
                name: normalizeSummaryRecipeName(String(recipe?.name || `وصفة ${recipeIndex + 1}`)),
                doughCount: getRecipeDoughCount(recipe, recipeIndex),
            }));

            // Helper function to render a single recipe table
            const renderRecipeTable = (recipe: any, recipeIndex: number) => {
                // Prefer recipe ingredients, then fallback to data captured inside the report table.
                const recipeIngredients = Array.isArray(recipe?.ingredients) ? recipe.ingredients : [];
                const baseIngredients = recipeIngredients.length > 0
                    ? recipeIngredients
                    : (recipeIndex === 0 ? tableDerivedIngredients : []);
                const ingredients = baseIngredients.map((ing: any, ingIndex: number) => {
                    const fromTableRow = dataRows[ingIndex];
                    const rowBatches = Array.isArray(fromTableRow?.[3]) ? fromTableRow[3] : [];
                    return {
                        ...ing,
                        ingredient_name: ing?.ingredient_name || ing?.name || tableDerivedIngredients[ingIndex]?.ingredient_name,
                        quantity: ing?.quantity ?? tableDerivedIngredients[ingIndex]?.quantity,
                        unit: ing?.unit ?? tableDerivedIngredients[ingIndex]?.unit,
                        batches: rowBatches.length > 0
                            ? rowBatches
                            : (Array.isArray(ing?.batches) ? ing.batches : [])
                    };
                });
                const useMobileCards = isMobile && !isPrintMode;

                if (!ingredients || ingredients.length === 0) {
                    return (
                        <div key={recipe?.id || recipeIndex} className="mb-4 text-center text-xs text-gray-500 border border-gray-200 rounded p-3">
                            لا توجد بيانات تتبع خامات لهذا الجدول.
                        </div>
                    );
                }

                return (
                    <div key={recipe?.id || recipeIndex} className="mb-6 print:mb-4">
                        {/* Recipe Header */}
                        <div className="font-bold text-sm text-blue-800 dark:text-blue-300 mb-2 print:text-[11px]">
                            📋 وصفة {recipeIndex + 1}: {recipe?.name || `وصفة ${recipeIndex + 1}`}
                            {recipe?.version && <span className="text-xs font-normal mr-2">(v{recipe.version})</span>}
                        </div>

                        {/* Mixing Steps - Compact */}
                        {recipe?.mixing_steps && recipe.mixing_steps.length > 0 && (
                            <div className="bg-gray-50 border border-gray-200 rounded p-2 mb-2 print:bg-gray-50">
                                <div className="font-bold text-xs text-gray-700 mb-1">
                                    خطوات الخلط ({recipe.mixing_steps.length})
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1 text-[10px] print:text-[8px]">
                                    {recipe.mixing_steps.map((step: any, idx: number) => (
                                        <div key={idx} className="flex gap-1 p-1 bg-white border border-gray-100 rounded">
                                            <span className="flex-shrink-0 w-4 h-4 flex items-center justify-center bg-blue-500 text-white text-[9px] rounded-full font-bold">
                                                {step.step_number || idx + 1}
                                            </span>
                                            <span className="text-gray-900">{step.title}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Ingredients Table */}
                        {useMobileCards ? (
                            <div className="space-y-2 print:hidden">
                                {ingredients.map((ing: any, ingIndex: number) => {
                                    const ingredientName = ing.ingredient_name || ing.name || '-';
                                    const quantity = ing.quantity || '-';
                                    const unit = getUnitDisplayLabel(ing.unit);
                                    const batches = Array.isArray(ing.batches) && ing.batches.length > 0
                                        ? ing.batches
                                        : [{ batchNumber: '', productionDate: '', expiryDate: '' }];

                                    return (
                                        <div
                                            key={ingIndex}
                                            className="rounded-lg border border-gray-200 bg-white px-3 py-2.5 space-y-2"
                                        >
                                            <div className="space-y-1">
                                                <h6 className="text-sm font-semibold text-gray-900">{ingredientName}</h6>
                                                <div className="flex flex-wrap gap-1.5 text-[11px]">
                                                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-gray-700">الكمية: {quantity}</span>
                                                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-gray-700">الوحدة: {unit}</span>
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                {batches.map((batch: any, batchIdx: number) => (
                                                    <div key={`${ingIndex}-${batchIdx}`} className="rounded-md border border-gray-100 px-2.5 py-2 space-y-1.5">
                                                        <div className="text-[11px] font-semibold text-gray-500">
                                                            الباتش #{batchIdx + 1}
                                                        </div>
                                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                                            <div className="text-xs">
                                                                <div className="text-[11px] text-gray-500">رقم الباتش</div>
                                                                <div className="text-gray-900">{batch.batchNumber || '-'}</div>
                                                            </div>
                                                            <div className="text-xs">
                                                                <div className="text-[11px] text-gray-500">تاريخ الإنتاج</div>
                                                                <div className="text-gray-900">
                                                                    {formatMaterialDateForDisplay(
                                                                        batch.productionDate,
                                                                        batch.productionDateFormat || 'dmy',
                                                                        'ar'
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <div className={cn(
                                                                'text-xs rounded px-1.5 py-1',
                                                                batch.expiryDate && new Date(batch.expiryDate) < new Date()
                                                                    ? 'bg-red-100 text-red-700'
                                                                    : 'bg-transparent text-gray-900'
                                                            )}>
                                                                <div className="text-[11px] text-gray-500">تاريخ الانتهاء</div>
                                                                <div>
                                                                    {formatMaterialDateForDisplay(
                                                                        batch.expiryDate,
                                                                        batch.expiryDateFormat || 'dmy',
                                                                        'ar'
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="recipe-table-container overflow-x-hidden print:overflow-hidden">
                                <table className="w-full border-collapse text-xs print:text-[10px] print:table-fixed">
                                    <thead>
                                        <tr className="bg-gray-800 text-white">
                                            <th className="border border-gray-400 px-2 py-1.5 print:px-1 print:py-0.5 text-right font-bold" style={{ width: '25%' }}>الخامة</th>
                                            <th className="border border-gray-400 px-2 py-1.5 print:px-1 print:py-0.5 text-center font-bold" style={{ width: '10%' }}>الكمية</th>
                                            <th className="border border-gray-400 px-2 py-1.5 print:px-1 print:py-0.5 text-center font-bold" style={{ width: '8%' }}>الوحدة</th>
                                            <th className="border border-gray-400 px-2 py-1.5 print:px-1 print:py-0.5 text-center font-bold" style={{ width: '19%' }}>رقم الباتش</th>
                                            <th className="border border-gray-400 px-2 py-1.5 print:px-1 print:py-0.5 text-center font-bold" style={{ width: '19%' }}>تاريخ الإنتاج</th>
                                            <th className="border border-gray-400 px-2 py-1.5 print:px-1 print:py-0.5 text-center font-bold" style={{ width: '19%' }}>تاريخ الانتهاء</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {ingredients.map((ing: any, ingIndex: number) => {
                                            const ingredientName = ing.ingredient_name || ing.name || '-';
                                            const quantity = ing.quantity || '-';
                                            const unit = getUnitDisplayLabel(ing.unit);
                                            const batches = ing.batches || [];

                                            // If no batches, show single row
                                            if (!batches || batches.length === 0) {
                                                return (
                                                    <tr key={ingIndex} className={ingIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                                        <td className="border border-gray-400 px-2 py-1 print:px-1 print:py-0.5 text-right font-medium">{ingredientName}</td>
                                                        <td className="border border-gray-400 px-2 py-1 print:px-1 print:py-0.5 text-center">{quantity}</td>
                                                        <td className="border border-gray-400 px-2 py-1 print:px-1 print:py-0.5 text-center">{unit}</td>
                                                        <td className="border border-gray-400 px-2 py-1 print:px-1 print:py-0.5 text-center text-gray-400">-</td>
                                                        <td className="border border-gray-400 px-2 py-1 print:px-1 print:py-0.5 text-center text-gray-400">-</td>
                                                        <td className="border border-gray-400 px-2 py-1 print:px-1 print:py-0.5 text-center text-gray-400">-</td>
                                                    </tr>
                                                );
                                            }

                                            // Multiple batches per ingredient
                                            return batches.map((batch: any, batchIdx: number) => (
                                                <tr key={`${ingIndex}-${batchIdx}`} className={ingIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                                    {batchIdx === 0 ? (
                                                        <>
                                                            <td className="border border-gray-400 px-2 py-1 print:px-1 print:py-0.5 text-right font-medium" rowSpan={batches.length}>{ingredientName}</td>
                                                            <td className="border border-gray-400 px-2 py-1 print:px-1 print:py-0.5 text-center" rowSpan={batches.length}>{quantity}</td>
                                                            <td className="border border-gray-400 px-2 py-1 print:px-1 print:py-0.5 text-center" rowSpan={batches.length}>{unit}</td>
                                                        </>
                                                    ) : null}
                                                    <td className="border border-gray-400 px-2 py-1 print:px-1 print:py-0.5 text-center">{batch.batchNumber || '-'}</td>
                                                    <td className="border border-gray-400 px-2 py-1 print:px-1 print:py-0.5 text-center">
                                                        {formatMaterialDateForDisplay(
                                                            batch.productionDate,
                                                            batch.productionDateFormat || 'dmy',
                                                            'ar'
                                                        )}
                                                    </td>
                                                    <td className={cn(
                                                        "border border-gray-400 px-2 py-1 print:px-1 print:py-0.5 text-center",
                                                        batch.expiryDate && new Date(batch.expiryDate) < new Date() && 'bg-red-100 text-red-700'
                                                    )}>
                                                        {formatMaterialDateForDisplay(
                                                            batch.expiryDate,
                                                            batch.expiryDateFormat || 'dmy',
                                                            'ar'
                                                        )}
                                                    </td>
                                                </tr>
                                            ));
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* Recipe Notes */}
                        {recipe?.notes && (
                            <div className="mt-2 text-xs text-gray-600 italic print:text-[9px]">
                                ملاحظات: {recipe.notes}
                            </div>
                        )}
                    </div>
                );
            };

            return (
                <div className="space-y-4">
                    {/* Header showing total recipes */}
                    {recipesToDisplay.length > 1 && (
                        <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            📋 جداول تتبع الخامات ({recipesToDisplay.length} وصفات)
                        </div>
                    )}

                    {/* Render recipes: first pair side-by-side (RTL), then full-width rows */}
                    {recipesToDisplay.length > 0 ? (
                        <>
                            {(() => {
                                const firstPair = recipesToDisplay.slice(0, 2);
                                const remainingRecipes = recipesToDisplay.slice(2);
                                const useSingleColumnLayout = isMobile && !isPrintMode;

                                return (
                                    <>
                                        {firstPair.length > 0 && (
                                            firstPair.length === 1 ? (
                                                renderRecipeTable(firstPair[0], 0)
                                            ) : (
                                                        <div
                                                    className={cn(
                                                        'grid gap-4',
                                                        useSingleColumnLayout ? 'grid-cols-1' : 'grid-cols-2'
                                                    )}
                                                    dir={useSingleColumnLayout ? undefined : 'rtl'}
                                                >
                                                    {firstPair.map((recipe, index) => (
                                                        <div key={getRecipeKey(recipe, index)} className="min-w-0">
                                                            {renderRecipeTable(recipe, index)}
                                                        </div>
                                                    ))}
                                                </div>
                                            )
                                        )}

                                        {remainingRecipes.map((recipe, index) => (
                                            <div key={getRecipeKey(recipe, index + 2)} className="w-full">
                                                {renderRecipeTable(recipe, index + 2)}
                                            </div>
                                        ))}

                                        {doughCountSummary.length > 0 && (
                                            <div className="rounded border border-gray-300 px-3 py-2 bg-gray-50 dark:bg-gray-900/30 dark:border-gray-600">
                                                <div className="text-xs font-semibold text-gray-700 dark:text-gray-200 mb-2">
                                                    عدد العجنات
                                                </div>
                                                <div className="flex flex-wrap gap-2">
                                                    {doughCountSummary.map((item) => (
                                                        <div
                                                            key={item.key}
                                                            className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-2 py-1 dark:bg-gray-800 dark:border-gray-600"
                                                        >
                                                            <span className="text-xs text-gray-700 dark:text-gray-200">
                                                                {item.name}
                                                            </span>
                                                            <span className="inline-flex min-w-6 h-6 items-center justify-center rounded border border-gray-400 bg-transparent text-black dark:text-black text-xs font-bold px-1.5">
                                                                {item.doughCount}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </>
                                );
                            })()}
                        </>
                    ) : (
                        <div className="text-center text-gray-500 py-4">
                            لم يتم العثور على وصفات لهذا المنتج
                        </div>
                    )}
                </div>
            );
        }

        // Printing Verification Table - Custom handler for image support
        if (table.type === 'printing_verification') {
            const columns = customColumns;
            const dataRows = tableData || [];
            const rowsCount = customGridSettings.rows || dataRows.length || 1;
            const sideHeaderModel = buildSideHeaderRenderModel(customSideHeaderRows, Math.max(rowsCount, dataRows.length, 1));
            const sideHeaderRenderRows = sideHeaderModel.rows;
            const hasCustomSideHeaders = hasSideHeaderConfig && sideHeaderModel.columnCount > 0;
            const customSideHeaderColumnCount = hasCustomSideHeaders ? sideHeaderModel.columnCount : 0;
            const sideHeaderColumnLabels = hasCustomSideHeaders
                ? getCustomSideHeaderLabelsForRendering(table, customSideHeaderColumnCount)
                : [];
            const sideHeaderMatrix = hasCustomSideHeaders
                ? expandSideHeaderRowsToMatrix(sideHeaderRenderRows, customSideHeaderColumnCount)
                : [];
            const useDistributedSideHeaders = hasCustomSideHeaders && !hasCustomHeaderRows;
            const sideHeaderTargets = useDistributedSideHeaders
                ? getCustomSideHeaderTargetsForRendering(table, customSideHeaderColumnCount, columns.length)
                : [];
            const sideHeaderIndexesByTarget = sideHeaderTargets.reduce<Record<number, number[]>>((acc, target, sideIndex) => {
                const normalizedTarget = Math.max(0, Math.min(columns.length, Number(target) || 0));
                if (!acc[normalizedTarget]) acc[normalizedTarget] = [];
                acc[normalizedTarget].push(sideIndex);
                return acc;
            }, {});
            const totalRows = Math.max(rowsCount, dataRows.length, sideHeaderRenderRows.length);
            const boldRowSeparators = getCustomBoldRowSeparatorsForRendering(table, totalRows);
            const boldColumnSeparators = getCustomBoldColumnSeparatorsForRendering(table, columns.length);
            const boldRowSeparatorSet = new Set(boldRowSeparators);
            const boldColumnSeparatorSet = new Set(boldColumnSeparators);
            const getColumnSeparatorStyle = (colIndex: number): React.CSSProperties | undefined => {
                if (!boldColumnSeparatorSet.has(colIndex + 1)) return undefined;
                if (customLayoutSettings.direction === 'rtl') {
                    return { borderLeftWidth: '3px', borderLeftStyle: 'double' };
                }
                return { borderRightWidth: '3px', borderRightStyle: 'double' };
            };
            const getDataSeparatorStyle = (rowIndex: number, colIndex: number) => {
                const style: React.CSSProperties = {};
                const columnStyle = getColumnSeparatorStyle(colIndex);
                if (columnStyle) Object.assign(style, columnStyle);
                if (boldRowSeparatorSet.has(rowIndex + 1)) {
                    style.borderBottomWidth = '3px';
                    style.borderBottomStyle = 'double';
                }
                return Object.keys(style).length > 0 ? style : undefined;
            };
            const getRowSeparatorStyle = (rowIndex: number) =>
                boldRowSeparatorSet.has(rowIndex + 1)
                    ? ({ borderBottomWidth: '3px', borderBottomStyle: 'double' } as const)
                    : undefined;
            const useMobileCards = isMobile && !isPrintMode;

            if (useMobileCards) {
                return (
                    <div className="space-y-2 print:hidden" dir={customLayoutSettings.direction}>
                        {Array.from({ length: totalRows }).map((_, rowIndex) => {
                            const sideLabels = hasCustomSideHeaders
                                ? Array.from({ length: customSideHeaderColumnCount })
                                    .map((_, sideIndex) => sideHeaderMatrix[rowIndex]?.[sideIndex]?.label || '')
                                    .filter((label) => label.length > 0)
                                : [];
                            return (
                                <div
                                    key={rowIndex}
                                    className="rounded-lg border border-gray-200 bg-white px-3 py-2.5 space-y-2"
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="text-[11px] font-semibold text-gray-500">
                                            {showRowNumbers ? `${rowHeaderLabel} ${rowIndex + 1}` : `صف ${rowIndex + 1}`}
                                        </span>
                                    </div>
                                    {hasCustomSideHeaders && (
                                        <div className="flex flex-wrap gap-1">
                                            {sideLabels.map((label, sideIndex) => (
                                                <span
                                                    key={`pv-mobile-side-${rowIndex}-${sideIndex}`}
                                                    className="inline-flex items-center rounded-full border border-gray-200 px-2 py-0.5 text-[10px] text-gray-600"
                                                >
                                                    {label}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                    <div className="space-y-2">
                                        {columns.map((col, colIndex) => (
                                            <div key={col.key || colIndex} className="rounded-md border border-gray-100 px-2.5 py-2">
                                                <div className="text-[11px] font-semibold text-gray-500 mb-1">{getCustomColumnLabel(colIndex)}</div>
                                                <div className="text-gray-900 text-right">
                                                    {renderReadonlyCellValue(
                                                        { ...col, type: resolveCustomCellType(table, rowIndex, colIndex, col.type || 'text') },
                                                        getResolvedCustomCellValue(dataRows, rowIndex, colIndex, col),
                                                        true
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                );
            }

            const visibleColumnIndexes = getVisibleColumnIndexes(table.id, columns.length, MOBILE_CUSTOM_COLUMNS_PER_VIEW);
            const visibleColumns = visibleColumnIndexes.map((index) => ({ index, column: columns[index] })).filter((entry) => !!entry.column);
            const visibleColumnByIndex = new Map(
                visibleColumns.map((entry, visibleIndex) => [entry.index, { ...entry, visibleIndex }])
            );
            const rowNumberWidthPercent = showRowNumbers ? 7 : 0;
            const sideColumnsWidthPercent = hasCustomSideHeaders ? Math.min(30, customSideHeaderColumnCount * 8) : 0;
            const availableColumnsWidthPercent = 100 - rowNumberWidthPercent - sideColumnsWidthPercent;
            const perSideColumnWidthPercent = hasCustomSideHeaders && customSideHeaderColumnCount > 0
                ? sideColumnsWidthPercent / customSideHeaderColumnCount
                : 0;
            const normalizedColumnWidths = (() => {
                const weights = visibleColumns.map(({ index }) => Math.max(1, Number(columns[index]?.width) || 100));
                const total = weights.reduce((sum, weight) => sum + weight, 0) || 1;
                return weights.map((weight) => (weight / total) * availableColumnsWidthPercent);
            })();

            return (
                <div className="space-y-2 print:space-y-0" dir={customLayoutSettings.direction}>
                    {renderMobileColumnPager({
                        tableId: table.id,
                        totalColumns: columns.length,
                        visibleIndexes: visibleColumnIndexes,
                        windowSize: MOBILE_CUSTOM_COLUMNS_PER_VIEW,
                        labels: columns.map((_, index) => getCustomColumnLabel(index)),
                    })}
                    <div className="overflow-x-hidden print-table-container">
                        <table
                            className="w-full border-collapse text-xs print:text-[10px]"
                            style={{
                                tableLayout: 'fixed',
                            }}
                        >
                            <colgroup>
                                {showRowNumbers && <col style={{ width: `${rowNumberWidthPercent}%` }} />}
                                {useDistributedSideHeaders
                                    ? Array.from({ length: columns.length + 1 }).map((_, positionIndex) => (
                                        <React.Fragment key={`pv-colgroup-position-${positionIndex}`}>
                                            {(sideHeaderIndexesByTarget[positionIndex] || []).map((sideIndex) => (
                                                <col
                                                    key={`pv-side-col-${positionIndex}-${sideIndex}`}
                                                    style={{ width: `${perSideColumnWidthPercent}%` }}
                                                />
                                            ))}
                                            {visibleColumnByIndex.has(positionIndex) && (
                                                <col
                                                    key={`pv-col-${positionIndex}`}
                                                    style={{
                                                        width: `${normalizedColumnWidths[visibleColumnByIndex.get(positionIndex)!.visibleIndex] || 0}%`,
                                                    }}
                                                />
                                            )}
                                        </React.Fragment>
                                    ))
                                    : (
                                        <>
                                            {hasCustomSideHeaders &&
                                                Array.from({ length: customSideHeaderColumnCount }).map((_, sideIndex) => (
                                                    <col key={`pv-side-col-${sideIndex}`} style={{ width: `${perSideColumnWidthPercent}%` }} />
                                                ))}
                                            {visibleColumns.map(({ index }, visibleIndex) => (
                                                <col
                                                    key={index}
                                                    style={{
                                                        width: `${normalizedColumnWidths[visibleIndex] || 0}%`,
                                                    }}
                                                />
                                            ))}
                                        </>
                                    )}
                            </colgroup>
                            {showTopHeader && (
                                <thead>
                                    {hasCustomHeaderRows ? (
                                        customHeaderRows.map((headerRow, headerRowIndex) => (
                                            <tr key={`pv-header-row-${headerRowIndex}`} className="bg-gray-800 text-white">
                                                {showRowNumbers && headerRowIndex === 0 && (
                                                    <th
                                                        rowSpan={customHeaderRows.length}
                                                        className="border border-gray-400 px-2 py-1.5 text-center w-10 font-bold"
                                                >
                                                    {rowHeaderLabel}
                                                </th>
                                            )}
                                                {hasCustomSideHeaders && headerRowIndex === 0 && (
                                                    <th
                                                        rowSpan={customHeaderRows.length}
                                                        colSpan={customSideHeaderColumnCount}
                                                        className="border border-gray-400 px-2 py-1.5 text-center font-bold"
                                                    >
                                                        الرأس الجانبي
                                                    </th>
                                                )}
                                                {headerRow.map((cell, cellIndex) => (
                                                    <th
                                                        key={`pv-header-cell-${headerRowIndex}-${cellIndex}`}
                                                        colSpan={cell.col_span || 1}
                                                        rowSpan={cell.row_span || 1}
                                                        className={cn(
                                                            'border border-gray-400 px-2 py-1.5 font-bold',
                                                            getColumnAlignClass(cell.align),
                                                            cell.class_name
                                                        )}
                                                        style={{
                                                            backgroundColor: cell.background_color || undefined,
                                                            color: cell.text_color || undefined,
                                                        }}
                                                    >
                                                        {cell.label}
                                                    </th>
                                                ))}
                                            </tr>
                                        ))
                                    ) : (
                                        <tr className="bg-gray-800 text-white">
                                            {showRowNumbers && (
                                                <th className="border border-gray-400 px-2 py-1.5 text-center w-10 font-bold">
                                                    {rowHeaderLabel}
                                                </th>
                                            )}
                                            {useDistributedSideHeaders
                                                ? Array.from({ length: columns.length + 1 }).map((_, positionIndex) => (
                                                    <React.Fragment key={`pv-head-position-${positionIndex}`}>
                                                        {(sideHeaderIndexesByTarget[positionIndex] || []).map((sideIndex) => (
                                                            <th
                                                                key={`pv-side-header-${positionIndex}-${sideIndex}`}
                                                                className="border border-gray-400 px-2 py-1.5 text-center font-bold"
                                                            >
                                                                {sideHeaderColumnLabels[sideIndex] || `رأس ${sideIndex + 1}`}
                                                            </th>
                                                        ))}
                                                        {visibleColumnByIndex.has(positionIndex) && (
                                                            <th
                                                                key={`pv-header-col-${positionIndex}`}
                                                                className={cn(
                                                                    'border border-gray-400 px-2 py-1.5 font-bold',
                                                                    getColumnAlignClass(visibleColumnByIndex.get(positionIndex)!.column.align)
                                                                )}
                                                                style={getColumnSeparatorStyle(positionIndex)}
                                                            >
                                                                {getCustomColumnLabel(positionIndex)}
                                                            </th>
                                                        )}
                                                    </React.Fragment>
                                                ))
                                                : (
                                                    <>
                                                        {hasCustomSideHeaders &&
                                                            Array.from({ length: customSideHeaderColumnCount }).map((_, sideIndex) => (
                                                                <th
                                                                    key={`pv-side-header-${sideIndex}`}
                                                                    className="border border-gray-400 px-2 py-1.5 text-center font-bold"
                                                                >
                                                                    {sideHeaderColumnLabels[sideIndex] || `رأس ${sideIndex + 1}`}
                                                                </th>
                                                            ))}
                                                        {visibleColumns.map(({ index, column }) => (
                                                            <th
                                                                key={column.key || index}
                                                                className={cn(
                                                                    'border border-gray-400 px-2 py-1.5 font-bold',
                                                                    getColumnAlignClass(column.align)
                                                                )}
                                                                style={getColumnSeparatorStyle(index)}
                                                            >
                                                                {getCustomColumnLabel(index)}
                                                            </th>
                                                        ))}
                                                    </>
                                                )}
                                        </tr>
                                    )}
                                </thead>
                            )}
                            <tbody>
                                {Array.from({ length: totalRows }).map((_, rowIndex) => {
                                    return (
                                        <tr key={rowIndex} className={rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                            {showRowNumbers && (
                                                <td
                                                    className="border border-gray-400 px-2 py-1 text-center text-gray-500"
                                                    style={getRowSeparatorStyle(rowIndex)}
                                                >
                                                    {rowIndex + 1}
                                                </td>
                                            )}
                                            {useDistributedSideHeaders
                                                ? Array.from({ length: columns.length + 1 }).map((_, positionIndex) => (
                                                    <React.Fragment key={`pv-body-position-${rowIndex}-${positionIndex}`}>
                                                        {(sideHeaderIndexesByTarget[positionIndex] || []).map((sideIndex) => {
                                                            const cell = sideHeaderMatrix[rowIndex]?.[sideIndex];
                                                            if (!cell) return null;
                                                            return (
                                                                <th
                                                                    key={`pv-side-row-${rowIndex}-${positionIndex}-${sideIndex}`}
                                                                    rowSpan={cell.row_span || 1}
                                                                    className={cn(
                                                                        'border border-gray-400 px-2 py-1 font-semibold text-white bg-gray-800',
                                                                        getColumnAlignClass(cell.align),
                                                                        cell.class_name
                                                                    )}
                                                                    style={{
                                                                        ...getRowSeparatorStyle(rowIndex),
                                                                        backgroundColor: cell.background_color || undefined,
                                                                        color: cell.text_color || undefined,
                                                                    }}
                                                                >
                                                                    {cell.label || '-'}
                                                                </th>
                                                            );
                                                        })}
                                                        {visibleColumnByIndex.has(positionIndex) && (() => {
                                                            const entry = visibleColumnByIndex.get(positionIndex)!;
                                                            const colIndex = entry.index;
                                                            const col = entry.column;
                                                            const val = getResolvedCustomCellValue(dataRows, rowIndex, colIndex, col);
                                                            return (
                                                                <td
                                                                    key={col.key || colIndex}
                                                                    className={cn(
                                                                        'border border-gray-400 px-2 py-0.5',
                                                                        getColumnAlignClass(col.align),
                                                                        'print:break-words print:overflow-wrap-anywhere'
                                                                    )}
                                                                    style={getDataSeparatorStyle(rowIndex, colIndex)}
                                                                >
                                                                    {renderReadonlyCellValue(
                                                                        { ...col, type: resolveCustomCellType(table, rowIndex, colIndex, col.type || 'text') },
                                                                        val
                                                                    )}
                                                                </td>
                                                            );
                                                        })()}
                                                    </React.Fragment>
                                                ))
                                        : (
                                            <>
                                                {hasCustomSideHeaders &&
                                                            Array.from({ length: customSideHeaderColumnCount }).map((_, sideIndex) => {
                                                                const cell = sideHeaderMatrix[rowIndex]?.[sideIndex];
                                                                if (!cell) return null;
                                                                return (
                                                                    <th
                                                                        key={`pv-side-row-${rowIndex}-${sideIndex}`}
                                                                        rowSpan={cell.row_span || 1}
                                                                        className={cn(
                                                                            'border border-gray-400 px-2 py-1 font-semibold text-white bg-gray-800',
                                                                            getColumnAlignClass(cell.align),
                                                                            cell.class_name
                                                                        )}
                                                                        style={{
                                                                            ...getRowSeparatorStyle(rowIndex),
                                                                            backgroundColor: cell.background_color || undefined,
                                                                            color: cell.text_color || undefined,
                                                                        }}
                                                                    >
                                                                        {cell.label || '-'}
                                                                    </th>
                                                                );
                                                            })}
                                                {visibleColumns.map(({ index: colIndex, column: col }) => {
                                                    const val = getResolvedCustomCellValue(dataRows, rowIndex, colIndex, col);
                                                    return (
                                                                <td
                                                                    key={col.key || colIndex}
                                                                    className={cn(
                                                                        'border border-gray-400 px-2 py-0.5',
                                                                        getColumnAlignClass(col.align),
                                                                        'print:break-words print:overflow-wrap-anywhere'
                                                                    )}
                                                                    style={getDataSeparatorStyle(rowIndex, colIndex)}
                                                                >
                                                                    {renderReadonlyCellValue(
                                                                        { ...col, type: resolveCustomCellType(table, rowIndex, colIndex, col.type || 'text') },
                                                                        val
                                                                    )}
                                                                </td>
                                                            );
                                                        })}
                                                    </>
                                                )}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            );
        }

        // Default table rendering for custom/ai-code
        const columns = customColumns;
        const dataRows = tableData || [];
        const rowsCount = customGridSettings.rows || dataRows.length || 5;
        const sideHeaderModel = buildSideHeaderRenderModel(customSideHeaderRows, Math.max(rowsCount, dataRows.length, 1));
        const sideHeaderRenderRows = sideHeaderModel.rows;
        const hasCustomSideHeaders = hasSideHeaderConfig && sideHeaderModel.columnCount > 0;
        const customSideHeaderColumnCount = hasCustomSideHeaders ? sideHeaderModel.columnCount : 0;
        const sideHeaderColumnLabels = hasCustomSideHeaders
            ? getCustomSideHeaderLabelsForRendering(table, customSideHeaderColumnCount)
            : [];
        const sideHeaderMatrix = hasCustomSideHeaders
            ? expandSideHeaderRowsToMatrix(sideHeaderRenderRows, customSideHeaderColumnCount)
            : [];
        const useDistributedSideHeaders = hasCustomSideHeaders && !hasCustomHeaderRows;
        const sideHeaderTargets = useDistributedSideHeaders
            ? getCustomSideHeaderTargetsForRendering(table, customSideHeaderColumnCount, columns.length)
            : [];
        const sideHeaderIndexesByTarget = sideHeaderTargets.reduce<Record<number, number[]>>((acc, target, sideIndex) => {
            const normalizedTarget = Math.max(0, Math.min(columns.length, Number(target) || 0));
            if (!acc[normalizedTarget]) acc[normalizedTarget] = [];
            acc[normalizedTarget].push(sideIndex);
            return acc;
        }, {});
        const totalRows = Math.max(rowsCount, dataRows.length, sideHeaderRenderRows.length);
        const boldRowSeparators = getCustomBoldRowSeparatorsForRendering(table, totalRows);
        const boldColumnSeparators = getCustomBoldColumnSeparatorsForRendering(table, columns.length);
        const boldRowSeparatorSet = new Set(boldRowSeparators);
        const boldColumnSeparatorSet = new Set(boldColumnSeparators);
        const getColumnSeparatorStyle = (colIndex: number): React.CSSProperties | undefined => {
            if (!boldColumnSeparatorSet.has(colIndex + 1)) return undefined;
            if (customLayoutSettings.direction === 'rtl') {
                return { borderLeftWidth: '3px', borderLeftStyle: 'double' };
            }
            return { borderRightWidth: '3px', borderRightStyle: 'double' };
        };
        const getDataSeparatorStyle = (rowIndex: number, colIndex: number) => {
            const style: React.CSSProperties = {};
            const columnStyle = getColumnSeparatorStyle(colIndex);
            if (columnStyle) Object.assign(style, columnStyle);
            if (boldRowSeparatorSet.has(rowIndex + 1)) {
                style.borderBottomWidth = '3px';
                style.borderBottomStyle = 'double';
            }
            return Object.keys(style).length > 0 ? style : undefined;
        };
        const getRowSeparatorStyle = (rowIndex: number) =>
            boldRowSeparatorSet.has(rowIndex + 1)
                ? ({ borderBottomWidth: '3px', borderBottomStyle: 'double' } as const)
                : undefined;
        const useMobileCards = isMobile && !isPrintMode;

        if (useMobileCards) {
            return (
                <div className="space-y-2 print:hidden" dir={customLayoutSettings.direction}>
                    {Array.from({ length: totalRows }).map((_, rowIndex) => {
                        const sideLabels = hasCustomSideHeaders
                            ? Array.from({ length: customSideHeaderColumnCount })
                                .map((_, sideIndex) => sideHeaderMatrix[rowIndex]?.[sideIndex]?.label || '')
                                .filter((label) => label.length > 0)
                            : [];
                        return (
                            <div
                                key={rowIndex}
                                className="rounded-lg border border-gray-200 bg-white px-3 py-2.5 space-y-2"
                            >
                                <div className="flex items-center justify-between">
                                    <span className="text-[11px] font-semibold text-gray-500">
                                        {showRowNumbers ? `${rowHeaderLabel} ${rowIndex + 1}` : `صف ${rowIndex + 1}`}
                                    </span>
                                </div>
                                {hasCustomSideHeaders && (
                                    <div className="flex flex-wrap gap-1">
                                        {sideLabels.map((label, sideIndex) => (
                                            <span
                                                key={`custom-mobile-side-${rowIndex}-${sideIndex}`}
                                                className="inline-flex items-center rounded-full border border-gray-200 px-2 py-0.5 text-[10px] text-gray-600"
                                            >
                                                {label}
                                            </span>
                                        ))}
                                    </div>
                                )}
                                <div className="space-y-2">
                                    {columns.map((col, colIndex) => (
                                        <div key={col.key || colIndex} className="rounded-md border border-gray-100 px-2.5 py-2">
                                            <div className="text-[11px] font-semibold text-gray-500 mb-1">{getCustomColumnLabel(colIndex)}</div>
                                            <div className="text-gray-900 text-right">
                                                {renderReadonlyCellValue(
                                                    { ...col, type: resolveCustomCellType(table, rowIndex, colIndex, col.type || 'text') },
                                                    getResolvedCustomCellValue(dataRows, rowIndex, colIndex, col),
                                                    true
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            );
        }

        const visibleColumnIndexes = getVisibleColumnIndexes(table.id, columns.length, MOBILE_CUSTOM_COLUMNS_PER_VIEW);
        const visibleColumns = visibleColumnIndexes.map((index) => ({ index, column: columns[index] })).filter((entry) => !!entry.column);
        const visibleColumnByIndex = new Map(
            visibleColumns.map((entry, visibleIndex) => [entry.index, { ...entry, visibleIndex }])
        );
        const rowNumberWidthPercent = showRowNumbers ? 7 : 0;
        const sideColumnsWidthPercent = hasCustomSideHeaders ? Math.min(30, customSideHeaderColumnCount * 8) : 0;
        const availableColumnsWidthPercent = 100 - rowNumberWidthPercent - sideColumnsWidthPercent;
        const perSideColumnWidthPercent = hasCustomSideHeaders && customSideHeaderColumnCount > 0
            ? sideColumnsWidthPercent / customSideHeaderColumnCount
            : 0;
        const normalizedColumnWidths = (() => {
            const weights = visibleColumns.map(({ index }) => Math.max(1, Number(columns[index]?.width) || 100));
            const total = weights.reduce((sum, weight) => sum + weight, 0) || 1;
            return weights.map((weight) => (weight / total) * availableColumnsWidthPercent);
        })();

        return (
            <div className="space-y-2 print:space-y-0" dir={customLayoutSettings.direction}>
                {renderMobileColumnPager({
                    tableId: table.id,
                    totalColumns: columns.length,
                    visibleIndexes: visibleColumnIndexes,
                    windowSize: MOBILE_CUSTOM_COLUMNS_PER_VIEW,
                    labels: columns.map((_, index) => getCustomColumnLabel(index)),
                })}
                <div className="overflow-x-hidden print-table-container">
                    <table
                        className="w-full border-collapse text-xs print:text-[10px]"
                        style={{
                            tableLayout: 'fixed',
                        }}
                    >
                        <colgroup>
                            {showRowNumbers && <col style={{ width: `${rowNumberWidthPercent}%` }} />}
                            {useDistributedSideHeaders
                                ? Array.from({ length: columns.length + 1 }).map((_, positionIndex) => (
                                    <React.Fragment key={`custom-colgroup-position-${positionIndex}`}>
                                        {(sideHeaderIndexesByTarget[positionIndex] || []).map((sideIndex) => (
                                            <col
                                                key={`custom-side-col-${positionIndex}-${sideIndex}`}
                                                style={{ width: `${perSideColumnWidthPercent}%` }}
                                            />
                                        ))}
                                        {visibleColumnByIndex.has(positionIndex) && (
                                            <col
                                                key={`custom-col-${positionIndex}`}
                                                style={{
                                                    width: `${normalizedColumnWidths[visibleColumnByIndex.get(positionIndex)!.visibleIndex] || 0}%`,
                                                }}
                                            />
                                        )}
                                    </React.Fragment>
                                ))
                                : (
                                    <>
                                        {hasCustomSideHeaders &&
                                            Array.from({ length: customSideHeaderColumnCount }).map((_, sideIndex) => (
                                                <col key={`custom-side-col-${sideIndex}`} style={{ width: `${perSideColumnWidthPercent}%` }} />
                                            ))}
                                        {visibleColumns.map(({ index }, visibleIndex) => (
                                            <col
                                                key={`custom-col-${index}`}
                                                style={{
                                                    width: `${normalizedColumnWidths[visibleIndex] || 0}%`,
                                                }}
                                            />
                                        ))}
                                    </>
                                )}
                        </colgroup>
                        {showTopHeader && (
                            <thead>
                                {hasCustomHeaderRows ? (
                                    customHeaderRows.map((headerRow, headerRowIndex) => (
                                        <tr key={`custom-header-row-${headerRowIndex}`} className="bg-gray-800 text-white">
                                            {showRowNumbers && headerRowIndex === 0 && (
                                                <th
                                                    rowSpan={customHeaderRows.length}
                                                    className="border border-gray-400 px-2 py-1.5 text-center w-10 font-bold"
                                                >
                                                    {rowHeaderLabel}
                                                </th>
                                            )}
                                            {hasCustomSideHeaders && headerRowIndex === 0 && (
                                                <th
                                                    rowSpan={customHeaderRows.length}
                                                    colSpan={customSideHeaderColumnCount}
                                                    className="border border-gray-400 px-2 py-1.5 text-center font-bold"
                                                >
                                                    الرأس الجانبي
                                                </th>
                                            )}
                                            {headerRow.map((cell, cellIndex) => (
                                                <th
                                                    key={`custom-header-cell-${headerRowIndex}-${cellIndex}`}
                                                    colSpan={cell.col_span || 1}
                                                    rowSpan={cell.row_span || 1}
                                                    className={cn(
                                                        'border border-gray-400 px-2 py-1.5 font-bold',
                                                        getColumnAlignClass(cell.align),
                                                        cell.class_name
                                                    )}
                                                    style={{
                                                        backgroundColor: cell.background_color || undefined,
                                                        color: cell.text_color || undefined,
                                                    }}
                                                >
                                                    {cell.label}
                                                </th>
                                            ))}
                                        </tr>
                                    ))
                                ) : (
                                    <tr className="bg-gray-800 text-white">
                                        {showRowNumbers && (
                                            <th className="border border-gray-400 px-2 py-1.5 text-center w-10 font-bold">
                                                {rowHeaderLabel}
                                            </th>
                                        )}
                                        {useDistributedSideHeaders
                                            ? Array.from({ length: columns.length + 1 }).map((_, positionIndex) => (
                                                <React.Fragment key={`custom-head-position-${positionIndex}`}>
                                                    {(sideHeaderIndexesByTarget[positionIndex] || []).map((sideIndex) => (
                                                        <th
                                                            key={`custom-side-header-${positionIndex}-${sideIndex}`}
                                                            className="border border-gray-400 px-2 py-1.5 text-center font-bold"
                                                        >
                                                            {sideHeaderColumnLabels[sideIndex] || `رأس ${sideIndex + 1}`}
                                                        </th>
                                                    ))}
                                                    {visibleColumnByIndex.has(positionIndex) && (
                                                        <th
                                                            key={`custom-head-col-${positionIndex}`}
                                                            className={cn(
                                                                'border border-gray-400 px-2 py-1.5 font-bold',
                                                                getColumnAlignClass(visibleColumnByIndex.get(positionIndex)!.column.align)
                                                            )}
                                                            style={getColumnSeparatorStyle(positionIndex)}
                                                        >
                                                            {getCustomColumnLabel(positionIndex)}
                                                        </th>
                                                    )}
                                                </React.Fragment>
                                            ))
                                            : (
                                                <>
                                                    {hasCustomSideHeaders &&
                                                        Array.from({ length: customSideHeaderColumnCount }).map((_, sideIndex) => (
                                                            <th
                                                                key={`custom-side-header-${sideIndex}`}
                                                                className="border border-gray-400 px-2 py-1.5 text-center font-bold"
                                                            >
                                                                {sideHeaderColumnLabels[sideIndex] || `رأس ${sideIndex + 1}`}
                                                            </th>
                                                        ))}
                                                    {visibleColumns.map(({ index, column: col }) => (
                                                        <th
                                                            key={col.key || index}
                                                            className={cn(
                                                                'border border-gray-400 px-2 py-1.5 font-bold',
                                                                getColumnAlignClass(col.align)
                                                            )}
                                                            style={getColumnSeparatorStyle(index)}
                                                        >
                                                            {getCustomColumnLabel(index)}
                                                        </th>
                                                    ))}
                                                </>
                                            )}
                                    </tr>
                                )}
                            </thead>
                        )}
                        <tbody>
                            {Array.from({ length: totalRows }).map((_, rowIndex) => {
                                return (
                                    <tr key={rowIndex} className={rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                    {showRowNumbers && (
                                        <td
                                            className="border border-gray-400 px-2 py-1 text-center text-gray-500"
                                            style={getRowSeparatorStyle(rowIndex)}
                                        >
                                            {rowIndex + 1}
                                        </td>
                                    )}
                                    {useDistributedSideHeaders
                                        ? Array.from({ length: columns.length + 1 }).map((_, positionIndex) => (
                                            <React.Fragment key={`custom-body-position-${rowIndex}-${positionIndex}`}>
                                                {(sideHeaderIndexesByTarget[positionIndex] || []).map((sideIndex) => {
                                                    const cell = sideHeaderMatrix[rowIndex]?.[sideIndex];
                                                    if (!cell) return null;
                                                    return (
                                                        <th
                                                            key={`custom-side-row-${rowIndex}-${positionIndex}-${sideIndex}`}
                                                            rowSpan={cell.row_span || 1}
                                                            className={cn(
                                                                'border border-gray-400 px-2 py-1 font-semibold text-white bg-gray-800',
                                                                getColumnAlignClass(cell.align),
                                                                cell.class_name
                                                            )}
                                                            style={{
                                                                ...getRowSeparatorStyle(rowIndex),
                                                                backgroundColor: cell.background_color || undefined,
                                                                color: cell.text_color || undefined,
                                                            }}
                                                        >
                                                            {cell.label || '-'}
                                                        </th>
                                                    );
                                                })}
                                                {visibleColumnByIndex.has(positionIndex) && (() => {
                                                    const entry = visibleColumnByIndex.get(positionIndex)!;
                                                    const colIndex = entry.index;
                                                    const col = entry.column;
                                                    const val = getResolvedCustomCellValue(dataRows, rowIndex, colIndex, col);
                                                    return (
                                                        <td
                                                            key={col.key || colIndex}
                                                            className={cn(
                                                                'border border-gray-400 px-2 py-0.5',
                                                                getColumnAlignClass(col.align),
                                                                'print:break-words print:overflow-wrap-anywhere'
                                                            )}
                                                            style={getDataSeparatorStyle(rowIndex, colIndex)}
                                                        >
                                                            {renderReadonlyCellValue(
                                                                { ...col, type: resolveCustomCellType(table, rowIndex, colIndex, col.type || 'text') },
                                                                val
                                                            )}
                                                        </td>
                                                    );
                                                })()}
                                            </React.Fragment>
                                        ))
                                        : (
                                            <>
                                                {hasCustomSideHeaders &&
                                                    Array.from({ length: customSideHeaderColumnCount }).map((_, sideIndex) => {
                                                        const cell = sideHeaderMatrix[rowIndex]?.[sideIndex];
                                                        if (!cell) return null;
                                                        return (
                                                            <th
                                                                key={`custom-side-row-${rowIndex}-${sideIndex}`}
                                                                rowSpan={cell.row_span || 1}
                                                                className={cn(
                                                                    'border border-gray-400 px-2 py-1 font-semibold text-white bg-gray-800',
                                                                    getColumnAlignClass(cell.align),
                                                                    cell.class_name
                                                                )}
                                                                style={{
                                                                    ...getRowSeparatorStyle(rowIndex),
                                                                    backgroundColor: cell.background_color || undefined,
                                                                    color: cell.text_color || undefined,
                                                                }}
                                                            >
                                                                {cell.label || '-'}
                                                            </th>
                                                        );
                                                    })}
                                                {visibleColumns.map(({ index: colIndex, column: col }) => {
                                                    const val = getResolvedCustomCellValue(dataRows, rowIndex, colIndex, col);
                                                    return (
                                                        <td
                                                            key={col.key || colIndex}
                                                            className={cn(
                                                                'border border-gray-400 px-2 py-0.5',
                                                                getColumnAlignClass(col.align),
                                                                'print:break-words print:overflow-wrap-anywhere'
                                                            )}
                                                            style={getDataSeparatorStyle(rowIndex, colIndex)}
                                                        >
                                                            {renderReadonlyCellValue(
                                                                { ...col, type: resolveCustomCellType(table, rowIndex, colIndex, col.type || 'text') },
                                                                val
                                                            )}
                                                        </td>
                                                    );
                                                })}
                                            </>
                                        )}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    const statusInfo = getStatusInfo(instance?.status);

    return (
        <div className="report-print-root h-full flex flex-col bg-gray-100 dark:bg-gray-900 print:bg-white" dir="rtl">
            {/* Header - Hidden in print */}
            <div className="sticky top-0 z-20 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-3 sm:px-6 py-3 sm:py-4 print:hidden">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex items-center gap-2 sm:gap-4 min-w-0">
                        <button
                            onClick={handleBack}
                            className="p-1.5 sm:p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                        >
                            <ArrowLeftIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                        </button>
                        <div className="min-w-0">
                            <h1 className="text-base sm:text-xl font-bold text-gray-900 dark:text-white">
                                معاينة التقرير
                            </h1>
                            <div className="flex flex-wrap items-center gap-1.5 sm:gap-3 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                                <span className="truncate max-w-[220px] sm:max-w-none">{templateForRendering.name}</span>
                                <span>•</span>
                                <span>الإصدار {templateForRendering.version}</span>
                                {instance && (
                                    <>
                                        <span>•</span>
                                        <ReportStatusBadge
                                            status={instance.status as ReportStatus}
                                            size="sm"
                                        />
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="w-full lg:w-auto overflow-x-auto pb-1 -mx-1 px-1 lg:overflow-visible lg:pb-0 lg:mx-0 lg:px-0">
                        <div className="flex items-center gap-2 sm:gap-3 min-w-max lg:min-w-0 snap-x snap-mandatory">
                            <button
                                onClick={handlePrint}
                                className="snap-start flex-none min-h-[40px] min-w-[88px] whitespace-nowrap justify-center flex items-center gap-2 px-3 sm:px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                            >
                                <PrinterIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                                {isMobile ? 'طباعة' : 'طباعة'}
                            </button>

                            <button
                                onClick={handleExportPDF}
                                className="snap-start flex-none min-h-[40px] min-w-[88px] whitespace-nowrap justify-center flex items-center gap-2 px-3 sm:px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                            >
                                <DocumentArrowDownIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                                {isMobile ? 'PDF' : 'تصدير PDF'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Report Content - A4 Paper Style */}
            <div className="report-scroll-container flex-1 overflow-y-visible p-2 sm:p-6 print:p-0 print:overflow-visible">
                <div className="report-paper max-w-[210mm] mx-auto bg-white shadow-lg print:shadow-none print:max-w-none print:w-full overflow-visible">
                    {/* Inner container to constrain all content */}
                    <div className="report-paper-body w-full max-w-full overflow-visible print:px-2">
                        {/* Official Document Header */}
                        <div className="border-b-2 border-gray-800 print:border-black">
                            {/* Top Header - Compact */}
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-3 sm:px-4 py-2">
                                {/* Right: Document Control Info - Vertical layout */}
                                <div className="text-right text-[9px] w-full sm:w-auto sm:min-w-[120px]">
                                    {templateForRendering.document_control && (
                                        <div className="space-y-0">
                                            {/* Document Code */}
                                            {templateForRendering.document_control.doc_code && (
                                                <div className="font-bold text-[10px]">
                                                    رمز الوثيقة: <span className="font-mono">{templateForRendering.document_control.doc_code}</span>
                                                </div>
                                            )}
                                            {/* Issue Number */}
                                            <div>
                                                الإصدار: <span className="font-mono font-bold">{templateForRendering.document_control.issue_no}</span>
                                            </div>
                                            {/* Issue Date */}
                                            <div>
                                                تاريخ الإصدار: <span className="font-mono">{templateForRendering.document_control.issue_date}</span>
                                            </div>
                                            {/* Review Number */}
                                            <div>
                                                المراجعة: <span className="font-mono font-bold">{templateForRendering.document_control.review_no}</span>
                                            </div>
                                            {/* Review Date */}
                                            <div>
                                                تاريخ المراجعة: <span className="font-mono">{templateForRendering.document_control.review_date || '-'}</span>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Center: Document Title + Status */}
                                <div className="flex-1 text-center px-0 sm:px-4">
                                    <h1 className="text-lg font-bold text-gray-900">
                                        {templateForRendering.name}
                                    </h1>
                                    {/* Status Badge - Below title */}
                                    {instance && (
                                        <div className={cn(
                                            "inline-block border-2 rounded px-3 py-0.5 text-[10px] font-bold mt-1",
                                            statusInfo.stampColor
                                        )}>
                                            {statusInfo.stamp}
                                        </div>
                                    )}
                                </div>

                                {/* Left: Company Logo + Name */}
                                <div className="flex flex-col items-center justify-center w-full sm:w-auto sm:min-w-[140px]">
                                    <div className="w-36 h-16 flex items-center justify-center">
                                        <img
                                            src={logoUrl || '/Logo.png'}
                                            alt="Logo"
                                            className="max-w-full max-h-full object-contain"
                                            style={{ transform: `scale(${logoScale || 1})` }}
                                        />
                                    </div>
                                    {selectedCompany && (
                                        <span className="text-[10px] font-bold text-gray-700">{selectedCompany.name}</span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Report Info Table */}
                        {instance && (
                            <div className="px-2 sm:px-4 py-2">
                                <div className="overflow-x-hidden print-table-container">
                                    <table className="w-full border-collapse text-xs">
                                        <tbody>
                                            <tr>
                                                <td className="border border-gray-400 bg-gray-800 text-white px-2 py-1 font-bold w-1/6 text-center">التاريخ</td>
                                                <td className="border border-gray-400 px-2 py-1 w-1/3 font-mono text-center">{formData?.report_date || '-'}</td>
                                                <td className="border border-gray-400 bg-gray-800 text-white px-2 py-1 font-bold w-1/6 text-center">الوردية</td>
                                                <td className="border border-gray-400 px-2 py-1 w-1/3 text-center">{formData?.shift || '-'}</td>
                                            </tr>
                                            {/* Hide batch number row for data-collection type */}
                                            {templateForRendering.type !== 'data-collection' && (
                                                <tr>
                                                    <td className="border border-gray-400 bg-gray-800 text-white px-2 py-1 font-bold text-center">رقم الدُفعة</td>
                                                    <td className="border border-gray-400 px-2 py-1 font-mono font-bold text-primary-700 text-center">{formData?.batch_number || '-'}</td>
                                                    <td className="border border-gray-400 bg-gray-800 text-white px-2 py-1 font-bold text-center">خط الإنتاج</td>
                                                    <td className="border border-gray-400 px-2 py-1 text-center">{formData?.production_line || '-'}</td>
                                                </tr>
                                            )}
                                            <tr>
                                                <td className="border border-gray-400 bg-gray-800 text-white px-2 py-1 font-bold text-center">المشغل</td>
                                                <td className="border border-gray-400 px-2 py-1 text-center">{formData?.operator || '-'}</td>
                                                <td className="border border-gray-400 bg-gray-800 text-white px-2 py-1 font-bold text-center">وقت البدء</td>
                                                <td className="border border-gray-400 px-2 py-1 font-mono text-center">{formData?.inspection_start_time || '-'}</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Sections */}
                    <div className="p-3 space-y-3">
                        {sections.map((section: any, sectionIndex: number) => {
                            const sectionData = formData?.sections?.[section.id];

                            return (
                                <div key={section.id || `section-${sectionIndex}`}>
                                    {/* Section Header */}
                                    <div className="flex items-center gap-2 bg-gray-800 text-white px-3 py-1.5 mb-2">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-bold">{sectionIndex + 1}.</span>
                                            <h3 className="text-xs font-bold">
                                                {section.name}
                                            </h3>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        {(section.tables || []).map((table, tableIndex) => {
                                            const tableData = sectionData?.tables?.[table.id]?.data || formData?.tables?.[table.id]?.data || [];
                                            const tableNotes = sectionData?.tables?.[table.id]?.notes || formData?.table_notes?.[table.id];

                                            return (
                                                <div key={table.id || `table-${sectionIndex}-${tableIndex}`}>
                                                    {/* Table Title - Hide for recipe-traceability */}
                                                    {table.type !== 'recipe-traceability' && (
                                                        <div className="flex items-center justify-between mb-1">
                                                            <h4 className="font-bold text-xs text-blue-800">
                                                                {table.name}
                                                            </h4>
                                                            {table.inspection_period && (
                                                                <span className="text-[9px] text-gray-500">
                                                                    فترة الفحص: كل {table.inspection_period} دقيقة
                                                                </span>
                                                            )}
                                                        </div>
                                                    )}
                                                    {renderTable(table, tableData)}

                                                    {/* Table Notes - Shown in print if exists */}
                                                    {tableNotes && (
                                                        <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs print:bg-blue-50">
                                                            <div className="flex items-start gap-2">
                                                                <svg className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                                </svg>
                                                                <div>
                                                                    <span className="font-bold text-blue-800">ملاحظات:</span>
                                                                    <p className="text-blue-900 mt-0.5 whitespace-pre-wrap" dir="rtl">{tableNotes}</p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}

                                        {/* Section-level Quality Criteria */}
                                        {section.quality_criteria && section.quality_criteria.length > 0 && (
                                            <div className="report-quality-block mt-3">
                                                <div className="font-bold text-xs text-green-800 mb-2">معايير الجودة</div>
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 print:grid-cols-1">
                                                    {section.quality_criteria.map((criteria, index) => {
                                                        const colorMap: Record<string, string> = {
                                                            'green': 'bg-green-100 border-green-400 text-green-800',
                                                            'blue': 'bg-blue-100 border-blue-400 text-blue-800',
                                                            'yellow': 'bg-yellow-100 border-yellow-400 text-yellow-800',
                                                            'red': 'bg-red-100 border-red-400 text-red-800',
                                                            'purple': 'bg-purple-100 border-purple-400 text-purple-800',
                                                        };
                                                        const colorClass = colorMap[criteria.color] || colorMap['green'];

                                                        return (
                                                            <div key={criteria.id || index} className={cn("border rounded-lg overflow-hidden", colorClass.split(' ')[1])}>
                                                                <div className={cn("px-2 py-1 font-bold text-xs", colorClass)}>
                                                                    {criteria.title}
                                                                </div>
                                                                {criteria.acceptance && (
                                                                    <div className="px-2 py-1 text-[10px] bg-white border-t">
                                                                        <span className="font-bold">معيار القبول:</span> {criteria.acceptance}
                                                                    </div>
                                                                )}
                                                                {criteria.items && criteria.items.length > 0 && (
                                                                    <table className="w-full text-[10px] bg-white">
                                                                        <thead>
                                                                            <tr className="bg-gray-100">
                                                                                <th className="border-t border-gray-300 px-2 py-0.5 text-right">المعلمة</th>
                                                                                <th className="border-t border-gray-300 px-2 py-0.5 text-center">المواصفة</th>
                                                                            </tr>
                                                                        </thead>
                                                                        <tbody>
                                                                            {criteria.items.map((item, itemIndex) => (
                                                                                <tr key={itemIndex} className={itemIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                                                                    <td className="border-t border-gray-200 px-2 py-0.5">{item.parameter}</td>
                                                                                    <td className="border-t border-gray-200 px-2 py-0.5 text-center font-mono">{item.specification}</td>
                                                                                </tr>
                                                                            ))}
                                                                        </tbody>
                                                                    </table>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Quality Criteria Section */}
                    {templateForRendering.quality_criteria && templateForRendering.quality_criteria.length > 0 && (
                        <div className="report-quality-block p-4 border-t-2 border-gray-800">
                            <div className="bg-gray-800 text-white px-3 py-2 mb-3">
                                <h3 className="text-sm font-bold">معايير الجودة والقبول</h3>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 print:grid-cols-1">
                                {templateForRendering.quality_criteria.map((criteria, index) => (
                                    <div key={criteria.id || index} className="border border-gray-400">
                                        <div className={cn(
                                            "px-3 py-1.5 font-bold text-sm border-b border-gray-400",
                                            criteria.color || 'bg-gray-100'
                                        )}>
                                            {criteria.title}
                                        </div>
                                        <table className="w-full text-xs">
                                            <thead>
                                                <tr className="bg-gray-100">
                                                    <th className="border-b border-gray-400 px-2 py-1 text-right">المعلمة</th>
                                                    <th className="border-b border-gray-400 px-2 py-1 text-center">المواصفة</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {criteria.items.map((item, itemIndex) => (
                                                    <tr key={itemIndex} className={itemIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                                        <td className="border-b border-gray-300 px-2 py-1">{item.parameter}</td>
                                                        <td className="border-b border-gray-300 px-2 py-1 text-center font-mono text-[10px]">{item.specification}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                        <div className="px-2 py-1 text-[10px] bg-gray-50 border-t border-gray-300">
                                            <span className="font-bold">معيار القبول:</span> {criteria.acceptance}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Notes Section */}
                    {templateForRendering.notes && (
                        <div className="p-4 border-t border-gray-300 print:break-inside-avoid">
                            <div className="bg-yellow-50 border border-yellow-300 p-3">
                                <h4 className="text-xs font-bold text-yellow-800 mb-1">ملاحظات هامة:</h4>
                                <div
                                    className="text-xs text-yellow-900 prose prose-sm max-w-none prose-p:my-0 prose-ul:my-0 prose-ol:my-0"
                                    dangerouslySetInnerHTML={{ __html: templateForRendering.notes }}
                                />
                            </div>
                        </div>
                    )}

                    {/* Signatures Section */}
                    {templateForRendering.signatures && templateForRendering.signatures.length > 0 && (
                        <div className="report-signatures-block p-4 border-t-2 border-gray-800">
                            <div className="bg-gray-800 text-white px-3 py-2 mb-3">
                                <h3 className="text-sm font-bold">التواقيع والاعتمادات</h3>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 print:grid-cols-2">
                                {templateForRendering.signatures.map((sig, index) => {
                                    const signatureData = instance?.signatures?.[index];

                                    return (
                                        <div
                                            key={index}
                                            className="p-4 border border-gray-300 rounded-lg"
                                        >
                                            <div className="text-sm font-medium text-gray-700 mb-2 text-center">
                                                {sig.role || `توقيع ${index + 1}`}
                                            </div>
                                            <div className="h-16 border-b-2 border-gray-300 mb-2 flex items-end justify-center">
                                                {signatureData?.signature_data && (
                                                    <img
                                                        src={signatureData.signature_data}
                                                        alt="Signature"
                                                        className="h-14 object-contain"
                                                    />
                                                )}
                                            </div>
                                            <div className="flex justify-between text-xs text-gray-500">
                                                <span>الاسم: {signatureData?.name || '_____________'}</span>
                                                <span>التاريخ: {signatureData?.timestamp
                                                    ? formatDate(signatureData.timestamp)
                                                    : '___/___/______'}</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Footer */}
                    <div className="border-t-2 border-gray-800 p-3 text-center text-[10px] text-gray-500 bg-gray-50">
                        <div className="flex flex-col sm:flex-row justify-between items-center gap-1 sm:gap-0">
                            <span>تم إنشاء هذا التقرير بواسطة نظام الجودة الشامل</span>
                            <span>صفحة 1 من 1</span>
                            <span>تاريخ الطباعة: {formatDate(new Date())}</span>
                        </div>
                    </div>
                </div>{/* End inner container */}
            </div>
        </div>
    );
};

export default ReportViewer;

