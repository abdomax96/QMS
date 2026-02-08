import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeftIcon,
    DocumentArrowDownIcon,
    PrinterIcon,
    CheckCircleIcon,
    XCircleIcon,
    ClockIcon,
    ArrowPathIcon,
    ArchiveBoxIcon,
} from '@heroicons/react/24/outline';
import useStore from '../store';
import { useCompanyStore } from '../store/companyStore';
import { useAppSettingsStore } from '../store/appSettingsStore';
import { cn, calculateStats, useDateFormat } from '../utils';
import type { Table, ReportStatus } from '../types';
import { getRecipesByProduct } from '../services/recipeService';
import type { Recipe } from '../types/recipe';
import { ReportStatusBadge, ReportReviewPanel, ReportTimeline } from '../components/reports';
import { useReportWorkflow } from '../hooks/useReportWorkflow';

const ReportViewer: React.FC = () => {
    const { templateId, instanceId } = useParams<{ templateId?: string; instanceId?: string }>();
    const navigate = useNavigate();
    const { formTemplates, formInstances, syncInstance } = useStore();
    const { selectedCompany } = useCompanyStore();
    const { logoUrl, logoScale } = useAppSettingsStore();
    const { formatDate } = useDateFormat();

    // ✅ FIX: Load instance from database to ensure fresh data
    const [loadedInstance, setLoadedInstance] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);

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

    // State for recipe data - moved here to fix hooks order
    const [previewRecipes, setPreviewRecipes] = useState<Recipe[]>([]);

    // Load ALL recipes based on product_id
    useEffect(() => {
        const productId = template?.basic_info?.product_id;
        if (productId) {
            getRecipesByProduct(productId).then(recipes => {
                console.log('📋 Loaded', recipes.length, 'recipes for product:', productId);
                setPreviewRecipes(recipes);
            }).catch(err => {
                console.error('Failed to load recipes:', err);
            });
        }
    }, [template?.basic_info?.product_id]);

    const handlePrint = () => {
        window.print();
    };

    const handleExportPDF = () => {
        // Would integrate with jsPDF for full export
        window.print();
    };

    // Workflow action handlers
    const [isProcessing, setIsProcessing] = useState(false);


    const handleReopen = async () => {
        const reason = prompt('أدخل سبب إعادة فتح التقرير:');
        if (!reason || !reason.trim()) return;

        setIsProcessing(true);
        try {
            const { reportWorkflowService } = await import('../services/reportWorkflowService');
            const result = await reportWorkflowService.reopenReport(instance!.instance_id, reason);
            if (result.success) {
                window.location.reload();
            } else {
                alert(result.error || 'فشل إعادة فتح التقرير');
            }
        } catch (error: any) {
            alert(error.message || 'حدث خطأ');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleArchive = async () => {
        if (!window.confirm('هل أنت متأكد من أرشفة هذا التقرير؟')) return;

        setIsProcessing(true);
        try {
            const { reportWorkflowService } = await import('../services/reportWorkflowService');
            const result = await reportWorkflowService.archiveReport(instance!.instance_id);
            if (result.success) {
                window.location.reload();
            } else {
                alert(result.error || 'فشل أرشفة التقرير');
            }
        } catch (error: any) {
            alert(error.message || 'حدث خطأ');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleClaim = async () => {
        if (!window.confirm('هل تريد استلام هذا التقرير للمراجعة؟')) return;

        setIsProcessing(true);
        try {
            const { reportWorkflowService } = await import('../services/reportWorkflowService');
            const result = await reportWorkflowService.claimReport(instance!.instance_id);
            if (result.success) {
                window.location.reload();
            } else {
                alert(result.error || 'فشل استلام التقرير');
            }
        } catch (error: any) {
            alert(error.message || 'حدث خطأ');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleResubmit = async () => {
        if (!window.confirm('هل تريد إعادة إرسال التقرير للمراجعة؟')) return;

        setIsProcessing(true);
        try {
            const { reportWorkflowService } = await import('../services/reportWorkflowService');
            const result = await reportWorkflowService.resubmitReport(instance!.instance_id);
            if (result.success) {
                window.location.reload();
            } else {
                alert(result.error || 'فشل إعادة إرسال التقرير');
            }
        } catch (error: any) {
            alert(error.message || 'حدث خطأ');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleEditRejected = () => {
        // Navigate to edit page for rejected report
        navigate(`/reports/edit/${instance!.instance_id}`);
    };

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

    const sections = Object.values(template.sections || {}).sort((a: any, b: any) => a.order - b.order);
    const formData = instance?.form_data;

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

        if (table.type === 'parameters') {
            // Apply data fallback: check flat formData.tables if tableData is empty
            const finalTableData = (tableData && tableData.length > 0)
                ? tableData
                : formData?.tables?.[table.id]?.data || [];

            const parameters = table.parameters || [];
            const columnsCount = timeHeaders.length || table.rows || 10;
            const displayColumns = timeHeaders.length || Math.min(columnsCount, 10);

            return (
                <div className="overflow-x-auto print-table-container">
                    <table
                        className="w-full border-collapse text-xs print:text-[10px]"
                        style={{ tableLayout: 'auto' }}
                    >
                        <colgroup>
                            {/* Parameter name - responsive width */}
                            <col style={{ minWidth: '80px', width: '18%' }} />
                            {/* Limits - responsive width */}
                            <col style={{ minWidth: '50px', width: '8%' }} />
                            {/* Data columns - flexible with constraints */}
                            {Array.from({ length: displayColumns }).map((_, i) => (
                                <col key={i} style={{ minWidth: '8mm', maxWidth: '50mm' }} />
                            ))}
                            {/* AVG/STD - fixed small width */}
                            {table.features?.show_avg && <col style={{ width: '6%', minWidth: '40px' }} />}
                            {table.features?.show_std && <col style={{ width: '6%', minWidth: '40px' }} />}
                        </colgroup>
                        <thead>
                            <tr className="bg-gray-800 text-white print:bg-gray-800">
                                <th className="border border-gray-400 px-2 py-1.5 text-right font-bold">
                                    المعلمة
                                </th>
                                <th className="border border-gray-400 px-2 py-1.5 text-center font-bold">
                                    الحدود
                                </th>
                                {timeHeaders.length > 0 ? (
                                    timeHeaders.map((time, i) => (
                                        <th
                                            key={i}
                                            className="border border-gray-400 px-0.5 py-1 text-center font-bold text-[9px] print:text-[7px]"
                                        >
                                            {time}
                                        </th>
                                    ))
                                ) : (
                                    Array.from({ length: Math.min(columnsCount, 10) }).map((_, i) => (
                                        <th
                                            key={i}
                                            className="border border-gray-400 px-0.5 py-1 text-center font-bold print:text-[7px]"
                                        >
                                            {i + 1}
                                        </th>
                                    ))
                                )}
                                {table.features?.show_avg && (
                                    <th className="border border-gray-400 px-1 py-1.5 text-center font-bold bg-blue-700 print:w-[6%]">
                                        المتوسط
                                    </th>
                                )}
                                {table.features?.show_std && (
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
                                            {isCritical && (
                                                <span className="text-[9px] text-red-600 font-bold">
                                                    {param.critical_level === 'ccp' ? 'CCP' : 'OPRP'}
                                                </span>
                                            )}
                                        </td>
                                        <td className="border border-gray-400 px-1 py-1 text-center text-gray-700 font-mono text-[10px]">
                                            {param.min !== undefined && param.max !== undefined
                                                ? `${param.min}-${param.max}`
                                                : param.limits || '-'}
                                        </td>
                                        {Array.from({ length: displayColumns }).map((_, colIndex) => {
                                            const value = rowData[colIndex];
                                            const isValid =
                                                param.min !== undefined && param.max !== undefined && value !== undefined && value !== null && value !== ''
                                                    ? Number(value) >= Number(param.min) && Number(value) <= Number(param.max)
                                                    : true;

                                            // Get smart styling based on content length
                                            const cellStyle = getSmartCellStyle(value);

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
                                                    {value !== undefined && value !== null && value !== '' ? value : '-'}
                                                </td>
                                            );
                                        })}
                                        {table.features?.show_avg && (
                                            <td className="border border-gray-400 px-1 py-1 text-center font-bold bg-blue-50 font-mono">
                                                {numericValues.length > 0 ? stats.avg.toFixed(2) : '-'}
                                            </td>
                                        )}
                                        {table.features?.show_std && (
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
            );
        }

        if (table.type === 'checklist') {
            const items = table.items || [];
            return (
                <div className="overflow-x-auto">
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
            );
        }

        if (table.type === 'recipe') {
            const ingredients = table.ingredients || [];
            return (
                <div className="overflow-x-auto">
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
            );
        }

        if (table.type === 'sample') {
            const sampleSize = table.sample_size || 20;
            const columnsCount = timeHeaders.length;
            const dataRows = tableData || [];

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
                <div className="overflow-x-auto print-table-container">
                    <table className="w-full border-collapse text-xs print:text-[8px] print:table-fixed">
                        <thead>
                            <tr className="bg-gray-800 text-white">
                                <th className="border border-gray-400 px-2 py-1.5 text-center font-bold print:w-[10%]" style={{ width: '60px' }}>
                                    العينة #
                                </th>
                                {timeHeaders.map((time, i) => (
                                    <th
                                        key={i}
                                        className="border border-gray-400 px-0.5 py-1 text-center font-bold text-[9px] print:text-[7px]"
                                    >
                                        {time}
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
                                        {Array.from({ length: columnsCount }).map((_, colIndex) => {
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
                                    {Array.from({ length: columnsCount }).map((_, colIndex) => {
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
                                    {Array.from({ length: columnsCount }).map((_, colIndex) => {
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
            );
        }

        // Recipe Traceability Table - NOW RENDERS ALL RECIPES
        if (table.type === 'recipe-traceability') {
            const rawTableData = tableData || [];

            // Check if LAST row is recipe metadata (metadata is appended at the end)
            const lastRow = rawTableData[rawTableData.length - 1] as any;
            const hasRecipeMeta = lastRow?.__recipe_meta__ === true;
            const recipeMeta = hasRecipeMeta ? lastRow : null;
            let dataRows = hasRecipeMeta ? rawTableData.slice(0, -1) : rawTableData;

            // Determine which recipes to display
            const isPreviewMode = !instance && previewRecipes.length > 0;
            const recipesToDisplay = isPreviewMode ? previewRecipes : (recipeMeta ? [recipeMeta] : previewRecipes);

            // Helper function to render a single recipe table
            const renderRecipeTable = (recipe: any, recipeIndex: number) => {
                // Get ingredients from recipe or from dataRows
                const ingredients = recipe?.ingredients || (recipeIndex === 0 ? dataRows.map((row: any) => ({
                    ingredient_name: Array.isArray(row) ? row[0] : row.ingredient_name,
                    quantity: Array.isArray(row) ? row[1] : row.quantity,
                    unit: Array.isArray(row) ? row[2] : row.unit,
                    batches: Array.isArray(row) ? row[3] : row.batches
                })) : []);

                if (!ingredients || ingredients.length === 0) return null;

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
                                <div className="grid grid-cols-3 gap-1 text-[10px] print:text-[8px]">
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
                        <div className="recipe-table-container overflow-x-auto print:overflow-hidden">
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
                                        const unit = ing.unit || '-';
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
                                                <td className="border border-gray-400 px-2 py-1 print:px-1 print:py-0.5 text-center">{batch.productionDate || '-'}</td>
                                                <td className={cn(
                                                    "border border-gray-400 px-2 py-1 print:px-1 print:py-0.5 text-center",
                                                    batch.expiryDate && new Date(batch.expiryDate) < new Date() && 'bg-red-100 text-red-700'
                                                )}>{batch.expiryDate || '-'}</td>
                                            </tr>
                                        ));
                                    })}
                                </tbody>
                            </table>
                        </div>

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

                    {/* Render ALL recipes, each in separate table */}
                    {recipesToDisplay.length > 0 ? (
                        recipesToDisplay.map((recipe, index) => renderRecipeTable(recipe, index))
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
            const columns = table.columns || [];
            const dataRows = tableData || [];
            const rowsCount = table.rows || dataRows.length || 1;

            return (
                <div className="overflow-x-auto">
                    <table
                        className="w-full border-collapse text-xs print:text-[10px]"
                        style={{ tableLayout: 'auto' }}
                    >
                        <colgroup>
                            {/* Row number - fixed small */}
                            <col style={{ width: '40px' }} />
                            {/* Data columns - responsive */}
                            {columns.map((_, i) => (
                                <col key={i} style={{ minWidth: '100px', maxWidth: '300px' }} />
                            ))}
                        </colgroup>
                        <thead>
                            <tr className="bg-gray-800 text-white">
                                <th className="border border-gray-400 px-2 py-1.5 text-center w-10 font-bold">
                                    #
                                </th>
                                {columns.map((col) => (
                                    <th
                                        key={col.key}
                                        className="border border-gray-400 px-2 py-1.5 text-center font-bold"
                                    >
                                        {col.label}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {Array.from({ length: Math.max(rowsCount, dataRows.length) }).map((_, rowIndex) => {
                                const row = dataRows[rowIndex] || [];
                                return (
                                    <tr key={rowIndex} className={rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                        <td className="border border-gray-400 px-2 py-1 text-center text-gray-500">
                                            {rowIndex + 1}
                                        </td>
                                        {columns.map((col, colIndex) => {
                                            const val = row[colIndex];

                                            if (col.type === 'image') {
                                                let images: string[] = [];
                                                if (Array.isArray(val)) {
                                                    images = val;
                                                } else if (typeof val === 'string') {
                                                    if (val.trim().startsWith('[')) {
                                                        try {
                                                            const parsed = JSON.parse(val);
                                                            if (Array.isArray(parsed)) images = parsed;
                                                            else images = [val];
                                                        } catch (e) {
                                                            images = [val];
                                                        }
                                                    } else {
                                                        images = [val];
                                                    }
                                                }
                                                // Filter out empty/null values
                                                images = images.filter(img => img && typeof img === 'string' && img.length > 10);

                                                return (
                                                    <td key={col.key} className="border border-gray-400 px-2 py-1 text-center" style={{ minWidth: '150px' }}>
                                                        <div className="flex flex-col gap-1 w-full">
                                                            {images.map((img: string, idx: number) => (
                                                                <div key={idx} className="w-full relative pt-[12.5%] border border-gray-100 rounded overflow-hidden">
                                                                    {/* pt-12.5% creates 8:1 aspect ratio (100/8 = 12.5) */}
                                                                    <img
                                                                        src={img}
                                                                        alt="Item"
                                                                        className="absolute top-0 left-0 w-full h-full object-cover"
                                                                    />
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </td>
                                                );
                                            }

                                            if (col.type === 'long-text') {
                                                return (
                                                    <td key={col.key} className="border border-gray-400 px-2 py-1 text-right" style={{ minWidth: '200px' }}>
                                                        <div className="whitespace-pre-wrap text-xs">
                                                            {val !== undefined && val !== '' ? String(val) : '-'}
                                                        </div>
                                                    </td>
                                                );
                                            }

                                            if (col.type === 'boolean-check') {
                                                const isTrue = val === true || val === 'true' || val === 'checked' || val === 'مقبول';
                                                const isFalse = val === false || val === 'false' || val === 'unchecked' || val === 'مرفوض';
                                                return (
                                                    <td key={col.key} className="border border-gray-400 px-2 py-1 text-center font-bold font-sans">
                                                        {isTrue ? <span className="text-green-600 text-lg">✓</span> : (isFalse ? <span className="text-red-600 text-lg">✗</span> : '-')}
                                                    </td>
                                                );
                                            }

                                            if (col.type === 'boolean-yesno') {
                                                const isTrue = val === true || val === 'true' || val === 'yes' || val === 'نعم';
                                                const isFalse = val === false || val === 'false' || val === 'no' || val === 'لا';
                                                return (
                                                    <td key={col.key} className="border border-gray-400 px-2 py-1 text-center">
                                                        {isTrue ? 'نعم' : (isFalse ? 'لا' : '-')}
                                                    </td>
                                                );
                                            }

                                            // For other types: apply smart cell styling
                                            const cellStyle = getSmartCellStyle(val);

                                            return (
                                                <td
                                                    key={col.key}
                                                    className={cn(
                                                        'border border-gray-400 px-2 py-0.5 text-center',
                                                        'print:break-words print:overflow-wrap-anywhere',
                                                        cellStyle.className
                                                    )}
                                                    style={cellStyle.fontSize ? { fontSize: cellStyle.fontSize } : undefined}
                                                >
                                                    {val !== undefined && val !== '' ? String(val) : '-'}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            );
        }

        // Default table rendering for custom/ai-code
        const columns = table.columns || [];
        const dataRows = tableData || [];
        const rowsCount = table.rows || dataRows.length || 5;

        return (
            <div className="overflow-x-auto">
                <table
                    className="w-full border-collapse text-xs print:text-[10px]"
                    style={{ tableLayout: 'auto' }}
                >
                    <thead>
                        <tr className="bg-gray-800 text-white">
                            <th className="border border-gray-400 px-2 py-1.5 text-center w-10 font-bold">
                                #
                            </th>
                            {columns.map((col) => (
                                <th
                                    key={col.key}
                                    className="border border-gray-400 px-2 py-1.5 text-center font-bold"
                                >
                                    {col.label}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {Array.from({ length: Math.max(rowsCount, dataRows.length) }).map((_, rowIndex) => {
                            const row = dataRows[rowIndex] || [];
                            return (
                                <tr key={rowIndex} className={rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                    <td className="border border-gray-400 px-2 py-1 text-center text-gray-500">
                                        {rowIndex + 1}
                                    </td>
                                    {columns.map((col, colIndex) => {
                                        const val = row[colIndex];

                                        if (col.type === 'image') {
                                            let images: string[] = [];
                                            if (Array.isArray(val)) {
                                                images = val;
                                            } else if (typeof val === 'string') {
                                                if (val.trim().startsWith('[')) {
                                                    try {
                                                        const parsed = JSON.parse(val);
                                                        if (Array.isArray(parsed)) images = parsed;
                                                        else images = [val];
                                                    } catch (e) {
                                                        images = [val];
                                                    }
                                                } else {
                                                    images = [val];
                                                }
                                            }
                                            // Filter out empty/null values
                                            images = images.filter(img => img && typeof img === 'string' && img.length > 10);

                                            return (
                                                <td key={col.key} className="border border-gray-400 px-2 py-1 text-center" style={{ minWidth: '150px' }}>
                                                    <div className="flex flex-col gap-1 w-full">
                                                        {images.map((img: string, idx: number) => (
                                                            <div key={idx} className="w-full relative pt-[12.5%] border border-gray-100 rounded overflow-hidden">
                                                                {/* pt-12.5% creates 8:1 aspect ratio (100/8 = 12.5) */}
                                                                <img
                                                                    src={img}
                                                                    alt="Item"
                                                                    className="absolute top-0 left-0 w-full h-full object-cover"
                                                                />
                                                            </div>
                                                        ))}
                                                    </div>
                                                </td>
                                            );
                                        }

                                        if (col.type === 'long-text') {
                                            return (
                                                <td key={col.key} className="border border-gray-400 px-2 py-1 text-right whitespace-pre-wrap min-w-[200px]">
                                                    {val || '-'}
                                                </td>
                                            );
                                        }

                                        if (col.type === 'boolean-check') {
                                            const isTrue = val === true || val === 'true' || val === 'checked' || val === 'مقبول';
                                            const isFalse = val === false || val === 'false' || val === 'unchecked' || val === 'مرفوض';
                                            return (
                                                <td key={col.key} className="border border-gray-400 px-2 py-1 text-center font-bold font-sans">
                                                    {isTrue ? <span className="text-green-600 text-lg">✓</span> : (isFalse ? <span className="text-red-600 text-lg">✗</span> : '-')}
                                                </td>
                                            );
                                        }

                                        if (col.type === 'boolean-yesno') {
                                            const isTrue = val === true || val === 'true' || val === 'yes' || val === 'نعم';
                                            const isFalse = val === false || val === 'false' || val === 'no' || val === 'لا';
                                            return (
                                                <td key={col.key} className="border border-gray-400 px-2 py-1 text-center">
                                                    {isTrue ? 'نعم' : (isFalse ? 'لا' : '-')}
                                                </td>
                                            );
                                        }

                                        // For all other types: apply smart cell styling
                                        const cellStyle = getSmartCellStyle(val);

                                        return (
                                            <td
                                                key={col.key}
                                                className={cn(
                                                    'border border-gray-400 px-2 py-0.5 text-center',
                                                    'print:break-words print:overflow-wrap-anywhere',
                                                    cellStyle.className
                                                )}
                                                style={cellStyle.fontSize ? { fontSize: cellStyle.fontSize } : undefined}
                                            >
                                                {val !== undefined && val !== '' ? String(val) : '-'}
                                            </td>
                                        );
                                    })}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        );
    };

    const statusInfo = getStatusInfo(instance?.status);

    return (
        <div className="h-full flex flex-col bg-gray-100 dark:bg-gray-900 print:bg-white">
            {/* Header - Hidden in print */}
            <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 print:hidden">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate(-1)}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                        >
                            <ArrowLeftIcon className="w-5 h-5" />
                        </button>
                        <div>
                            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                                معاينة التقرير
                            </h1>
                            <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
                                <span>{template.name}</span>
                                <span>•</span>
                                <span>الإصدار {template.version}</span>
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

                    <div className="flex items-center gap-3">
                        {/* Review Panel for reviewers (when under review) - Compact mode */}
                        {instance && instance.status === 'under_review' && (
                            <ReportReviewPanel
                                report={instance}
                                compact={true}
                                onActionComplete={(action, success) => {
                                    if (success) {
                                        window.location.reload();
                                    }
                                }}
                            />
                        )}

                        {/* Claim button for submitted reports (for reviewers) */}
                        {instance && instance.status === 'submitted' && (
                            <button
                                onClick={handleClaim}
                                disabled={isProcessing}
                                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 
                                         text-white rounded-lg shadow-sm font-medium text-sm
                                         hover:from-blue-600 hover:to-blue-700 transition-all
                                         disabled:opacity-50 disabled:cursor-not-allowed"
                                title="استلام التقرير للمراجعة"
                            >
                                <CheckCircleIcon className="w-4 h-4" />
                                {isProcessing ? 'جاري الاستلام...' : 'استلام للمراجعة'}
                            </button>
                        )}

                        {/* Action buttons for approved reports */}
                        {instance && instance.status === 'approved' && (
                            <>
                                <button
                                    onClick={handleReopen}
                                    disabled={isProcessing}
                                    className="flex items-center gap-2 px-3 py-2 text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 disabled:opacity-50"
                                    title="إعادة فتح التقرير للتعديل"
                                >
                                    <ArrowPathIcon className="w-4 h-4" />
                                    إعادة فتح
                                </button>
                                <button
                                    onClick={handleArchive}
                                    disabled={isProcessing}
                                    className="flex items-center gap-2 px-3 py-2 text-gray-700 bg-gray-100 border border-gray-200 rounded-lg hover:bg-gray-200 disabled:opacity-50"
                                    title="أرشفة التقرير"
                                >
                                    <ArchiveBoxIcon className="w-4 h-4" />
                                    أرشفة
                                </button>
                            </>
                        )}

                        {/* Action buttons for rejected reports */}
                        {instance && instance.status === 'rejected' && (
                            <>
                                <button
                                    onClick={handleEditRejected}
                                    disabled={isProcessing}
                                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 
                                             text-white rounded-lg shadow-sm font-medium text-sm
                                             hover:from-amber-600 hover:to-amber-700 transition-all
                                             disabled:opacity-50 disabled:cursor-not-allowed"
                                    title="تعديل التقرير وتصحيح الأخطاء"
                                >
                                    <ArrowPathIcon className="w-4 h-4" />
                                    تعديل التقرير
                                </button>
                                <button
                                    onClick={handleResubmit}
                                    disabled={isProcessing}
                                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 
                                             text-white rounded-lg shadow-sm font-medium text-sm
                                             hover:from-green-600 hover:to-green-700 transition-all
                                             disabled:opacity-50 disabled:cursor-not-allowed"
                                    title="إعادة إرسال التقرير للمراجعة"
                                >
                                    <CheckCircleIcon className="w-4 h-4" />
                                    إعادة الإرسال
                                </button>
                            </>
                        )}

                        <button
                            onClick={handleExportPDF}
                            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                        >
                            <DocumentArrowDownIcon className="w-5 h-5" />
                            تصدير PDF
                        </button>
                    </div>
                </div>
            </div>

            {/* Report Content - A4 Paper Style */}
            <div className="flex-1 overflow-y-auto p-6 print:p-0 print:overflow-visible">
                <div className="max-w-[210mm] mx-auto bg-white shadow-lg print:shadow-none print:max-w-none print:w-full overflow-hidden">
                    {/* Inner container to constrain all content */}
                    <div className="w-full max-w-full overflow-hidden print:px-2">
                        {/* Official Document Header */}
                        <div className="border-b-2 border-gray-800 print:border-black">
                            {/* Top Header - Compact */}
                            <div className="flex items-center justify-between px-4 py-2">
                                {/* Right: Document Control Info - Vertical layout */}
                                <div className="text-right text-[9px] min-w-[120px]">
                                    {template.document_control && (
                                        <div className="space-y-0">
                                            {/* Document Code */}
                                            {template.document_control.doc_code && (
                                                <div className="font-bold text-[10px]">
                                                    رمز الوثيقة: <span className="font-mono">{template.document_control.doc_code}</span>
                                                </div>
                                            )}
                                            {/* Issue Number */}
                                            <div>
                                                الإصدار: <span className="font-mono font-bold">{template.document_control.issue_no}</span>
                                            </div>
                                            {/* Issue Date */}
                                            <div>
                                                تاريخ الإصدار: <span className="font-mono">{template.document_control.issue_date}</span>
                                            </div>
                                            {/* Review Number */}
                                            <div>
                                                المراجعة: <span className="font-mono font-bold">{template.document_control.review_no}</span>
                                            </div>
                                            {/* Review Date */}
                                            <div>
                                                تاريخ المراجعة: <span className="font-mono">{template.document_control.review_date || '-'}</span>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Center: Document Title + Status */}
                                <div className="flex-1 text-center px-4">
                                    <h1 className="text-lg font-bold text-gray-900">
                                        {template.name}
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
                                <div className="flex flex-col items-center justify-center min-w-[140px]">
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

                        {/* Report Info Table - Compact */}
                        {instance && (
                            <div className="px-4 py-2">
                                <table className="w-full border-collapse text-xs">
                                    <tbody>
                                        <tr>
                                            <td className="border border-gray-400 bg-gray-800 text-white px-2 py-1 font-bold w-1/6 text-center">التاريخ</td>
                                            <td className="border border-gray-400 px-2 py-1 w-1/3 font-mono text-center">{formData?.report_date || '-'}</td>
                                            <td className="border border-gray-400 bg-gray-800 text-white px-2 py-1 font-bold w-1/6 text-center">الوردية</td>
                                            <td className="border border-gray-400 px-2 py-1 w-1/3 text-center">{formData?.shift || '-'}</td>
                                        </tr>
                                        {/* Hide batch number row for data-collection type */}
                                        {template.type !== 'data-collection' && (
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
                                        <span className="text-xs font-bold">{sectionIndex + 1}.</span>
                                        <h3 className="text-xs font-bold">
                                            {section.name}
                                        </h3>
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
                                            <div className="mt-3 print:break-inside-avoid">
                                                <div className="font-bold text-xs text-green-800 mb-2">معايير الجودة</div>
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 print:grid-cols-3">
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
                    {template.quality_criteria && template.quality_criteria.length > 0 && (
                        <div className="p-4 border-t-2 border-gray-800 print:break-inside-avoid">
                            <div className="bg-gray-800 text-white px-3 py-2 mb-3">
                                <h3 className="text-sm font-bold">معايير الجودة والقبول</h3>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 print:grid-cols-3">
                                {template.quality_criteria.map((criteria, index) => (
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
                    {template.notes && (
                        <div className="p-4 border-t border-gray-300 print:break-inside-avoid">
                            <div className="bg-yellow-50 border border-yellow-300 p-3">
                                <h4 className="text-xs font-bold text-yellow-800 mb-1">ملاحظات هامة:</h4>
                                <div
                                    className="text-xs text-yellow-900 prose prose-sm max-w-none prose-p:my-0 prose-ul:my-0 prose-ol:my-0"
                                    dangerouslySetInnerHTML={{ __html: template.notes }}
                                />
                            </div>
                        </div>
                    )}

                    {/* Signatures Section */}
                    {template.signatures && template.signatures.length > 0 && (
                        <div className="p-4 border-t-2 border-gray-800 print:break-inside-avoid">
                            <div className="bg-gray-800 text-white px-3 py-2 mb-3">
                                <h3 className="text-sm font-bold">التواقيع والاعتمادات</h3>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 print:grid-cols-3">
                                {template.signatures.map((sig, index) => {
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
                        <div className="flex justify-between items-center">
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

