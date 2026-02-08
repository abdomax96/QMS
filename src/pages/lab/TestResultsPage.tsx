/**
 * Lab Tests Unified System
 * نظام الفحوصات المخبرية المتكامل
 */

import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
    ArrowRightIcon,
    BeakerIcon,
    CalendarIcon,
    ChartBarIcon,
    ClipboardDocumentCheckIcon,
    Cog6ToothIcon,
    EyeIcon,
    MagnifyingGlassIcon,
    PlusIcon,
    Squares2X2Icon,
    WrenchScrewdriverIcon
} from '@heroicons/react/24/outline';
import { labTestConfigService } from '../../services/labTestConfigService';
import { labTestExecutionService } from '../../services/labTestExecutionService';
import { labTestScheduleService } from '../../services/labTestScheduleService';
import { labEquipmentService } from '../../services/labEquipmentService';
import { getActiveProducts } from '../../services/productService';
import { useMaterialReceivings } from '../../hooks/useLabData';
import FormattedDate from '../../components/common/FormattedDate';
import TestRunDetailsModal from '../../components/lab/TestRunDetailsModal';
import type {
    FrequencyUnit,
    LabEquipment,
    LabTestConfig,
    LabTestRun,
    LabTestSchedule,
    TestConfigWithFields,
    TestFieldType,
    TestRunStatus,
    TestScheduleType
} from '../../types/labTests';
import type { Product } from '../../types/product';
import {
    materialReceivingStatusColors,
    materialReceivingStatusLabels,
    materialTypeLabels
} from '../../domain/lab/types';

type LabTabId = 'overview' | 'assets' | 'configs' | 'schedule' | 'results' | 'products';

const emptyStats = {
    total_runs: 0,
    pending: 0,
    in_progress: 0,
    completed: 0,
    approved: 0,
    rejected: 0,
    pass_rate: 0,
    fail_rate: 0
};

const fieldTypeLabels: Record<TestFieldType, string> = {
    number: 'رقم',
    text: 'نص',
    select: 'قائمة منسدلة',
    boolean: 'صح/خطأ',
    date: 'تاريخ',
    time: 'وقت',
    datetime: 'تاريخ ووقت',
    file: 'ملف',
    image: 'صورة'
};

const runStatusLabels: Record<TestRunStatus, string> = {
    pending: 'قيد الانتظار',
    in_progress: 'قيد الفحص',
    completed: 'مكتمل',
    approved: 'معتمد',
    rejected: 'مرفوض',
    cancelled: 'ملغي'
};

const scheduleTypeLabels: Record<TestScheduleType, string> = {
    hourly: 'كل ساعة',
    daily: 'يومي',
    weekly: 'أسبوعي',
    monthly: 'شهري',
    on_batch: 'عند الباتش',
    on_material_receipt: 'عند استلام مادة',
    on_work_order_complete: 'عند إنهاء أمر إنتاج',
    custom: 'مخصص'
};

const timeBasedScheduleTypes: TestScheduleType[] = ['hourly', 'daily', 'weekly', 'monthly'];

const LabTestsUnifiedPage: React.FC = () => {
    const { receivings, isLoading: receivingsLoading } = useMaterialReceivings();

    const [activeTab, setActiveTab] = useState<LabTabId>('overview');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [configs, setConfigs] = useState<LabTestConfig[]>([]);
    const [equipment, setEquipment] = useState<LabEquipment[]>([]);
    const [schedules, setSchedules] = useState<LabTestSchedule[]>([]);
    const [runs, setRuns] = useState<LabTestRun[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [stats, setStats] = useState(emptyStats);

    const [expandedConfigId, setExpandedConfigId] = useState<string | null>(null);
    const [configDetails, setConfigDetails] = useState<Record<string, TestConfigWithFields>>({});
    const [configLoadingId, setConfigLoadingId] = useState<string | null>(null);

    const [runFilter, setRunFilter] = useState<'all' | TestRunStatus | 'passed' | 'failed'>('all');
    const [runSearch, setRunSearch] = useState('');
    const [configSearch, setConfigSearch] = useState('');

    const [selectedRun, setSelectedRun] = useState<LabTestRun | null>(null);
    const [isRunModalOpen, setIsRunModalOpen] = useState(false);

    const [sessionConfigId, setSessionConfigId] = useState('');
    const [sessionBatch, setSessionBatch] = useState('');
    const [activeSession, setActiveSession] = useState<{
        configId: string;
        batch?: string;
        startedAt: string;
    } | null>(null);

    const [productSchedule, setProductSchedule] = useState({
        productId: '',
        configId: '',
        scheduleType: 'on_batch' as TestScheduleType,
        frequencyValue: 1,
        frequencyUnit: 'days' as FrequencyUnit
    });
    const [creatingSchedule, setCreatingSchedule] = useState(false);
    const [scheduleError, setScheduleError] = useState<string | null>(null);

    const isLocked = !!activeSession;

    const tabs = [
        { id: 'overview' as LabTabId, label: 'نظرة عامة', icon: Squares2X2Icon },
        { id: 'assets' as LabTabId, label: 'الأجهزة والمواد', icon: WrenchScrewdriverIcon },
        { id: 'configs' as LabTabId, label: 'التكوينات والمعلمات', icon: BeakerIcon },
        { id: 'schedule' as LabTabId, label: 'الجدولة والتنفيذ', icon: CalendarIcon },
        { id: 'results' as LabTabId, label: 'النتائج والباتشات', icon: ChartBarIcon },
        { id: 'products' as LabTabId, label: 'فحوصات المنتجات', icon: ClipboardDocumentCheckIcon }
    ];

    const loadData = async () => {
        setLoading(true);
        setError(null);

        try {
            const [configsData, runsData, statsData, schedulesData, productsData, equipmentData] = await Promise.all([
                labTestConfigService.getAllConfigs().catch(() => []),
                labTestExecutionService.getTestRuns({}).catch(() => []),
                labTestExecutionService.getTestStatistics({}).catch(() => emptyStats),
                labTestScheduleService.getSchedules({}).catch(() => []),
                getActiveProducts().catch(() => []),
                labEquipmentService.getEquipment().catch(() => [])
            ]);

            setConfigs(configsData);
            setRuns(runsData);
            setStats({ ...emptyStats, ...(statsData || {}) });
            setSchedules(schedulesData);
            setProducts(productsData);
            setEquipment(equipmentData);
        } catch (err) {
            setError('فشل تحميل بيانات نظام المختبر');
        } finally {
            setLoading(false);
        }
    };

    const refreshRuns = async () => {
        const [runsData, statsData] = await Promise.all([
            labTestExecutionService.getTestRuns({}).catch(() => []),
            labTestExecutionService.getTestStatistics({}).catch(() => emptyStats)
        ]);
        setRuns(runsData);
        setStats({ ...emptyStats, ...(statsData || {}) });
    };

    useEffect(() => {
        loadData();
    }, []);

    const equipmentList = useMemo(() => {
        return [...equipment].sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ar'));
    }, [equipment]);

    const schedulesByProduct = useMemo(() => {
        const map = new Map<string, LabTestSchedule[]>();
        schedules.forEach((schedule) => {
            if (!schedule.linked_product_id) return;
            const list = map.get(schedule.linked_product_id) || [];
            list.push(schedule);
            map.set(schedule.linked_product_id, list);
        });
        return map;
    }, [schedules]);

    const filteredRuns = useMemo(() => {
        const query = runSearch.trim().toLowerCase();
        return runs.filter((run) => {
            if (query) {
                const testName = run.test_config?.name_ar || run.test_config?.name || '';
                const batch = run.batch_number || run.linked_batch_id || '';
                const matches =
                    run.run_number?.toLowerCase().includes(query) ||
                    testName.toLowerCase().includes(query) ||
                    batch.toLowerCase().includes(query);
                if (!matches) return false;
            }

            if (runFilter === 'passed') return run.evaluation_result === 'pass';
            if (runFilter === 'failed') return run.evaluation_result === 'fail';
            if (runFilter !== 'all') return run.status === runFilter;
            return true;
        });
    }, [runs, runFilter, runSearch]);

    const toggleConfigDetails = async (configId: string) => {
        if (expandedConfigId === configId) {
            setExpandedConfigId(null);
            return;
        }

        setExpandedConfigId(configId);
        if (!configDetails[configId]) {
            setConfigLoadingId(configId);
            try {
                const details = await labTestConfigService.getConfigWithFields(configId);
                if (details) {
                    setConfigDetails((prev) => ({ ...prev, [configId]: details }));
                }
            } catch (err) {
                console.error('Failed to load config fields:', err);
            } finally {
                setConfigLoadingId(null);
            }
        }
    };

    const openRunDetails = async (run: LabTestRun) => {
        setSelectedRun(run);
        setIsRunModalOpen(true);
        try {
            const detailed = await labTestExecutionService.getTestRunById(run.id);
            if (detailed) {
                setSelectedRun(detailed);
            }
        } catch (err) {
            console.error('Failed to load run details:', err);
        }
    };

    const startSession = () => {
        if (!sessionConfigId) return;
        setActiveSession({
            configId: sessionConfigId,
            batch: sessionBatch.trim() || undefined,
            startedAt: new Date().toISOString()
        });
        setActiveTab('schedule');
    };

    const endSession = () => {
        setActiveSession(null);
    };

    const handleCreateProductSchedule = async () => {
        setScheduleError(null);

        if (!productSchedule.productId || !productSchedule.configId) {
            setScheduleError('يرجى اختيار المنتج والفحص قبل الحفظ.');
            return;
        }

        setCreatingSchedule(true);
        try {
            const payload: any = {
                test_config_id: productSchedule.configId,
                schedule_type: productSchedule.scheduleType,
                linked_product_id: productSchedule.productId,
                notify_before_minutes: 30,
                auto_create_run: true
            };

            if (timeBasedScheduleTypes.includes(productSchedule.scheduleType)) {
                payload.frequency_value = productSchedule.frequencyValue;
                payload.frequency_unit = productSchedule.frequencyUnit;
                payload.start_time = '09:00';
            }

            await labTestScheduleService.createSchedule(payload);
            await loadData();
            setProductSchedule({
                productId: '',
                configId: '',
                scheduleType: 'on_batch',
                frequencyValue: 1,
                frequencyUnit: 'days'
            });
        } catch (err) {
            setScheduleError('حدث خطأ أثناء إنشاء الجدول.');
        } finally {
            setCreatingSchedule(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary-600 mx-auto mb-4"></div>
                    <p className="text-slate-600 dark:text-slate-400">جاري تحميل النظام...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-6">
                <div className="max-w-5xl mx-auto bg-red-50 border border-red-200 text-red-700 rounded-xl p-4">
                    {error}
                </div>
            </div>
        );
    }

    const statsCards = [
        {
            label: 'إجمالي الفحوصات',
            value: stats.total_runs,
            icon: ChartBarIcon,
            color: 'text-blue-600',
            bg: 'bg-blue-50 dark:bg-blue-900/20'
        },
        {
            label: 'نسبة النجاح',
            value: `${stats.pass_rate || 0}%`,
            icon: ClipboardDocumentCheckIcon,
            color: 'text-green-600',
            bg: 'bg-green-50 dark:bg-green-900/20'
        },
        {
            label: 'الجدولة النشطة',
            value: schedules.filter((s) => s.is_active).length,
            icon: CalendarIcon,
            color: 'text-purple-600',
            bg: 'bg-purple-50 dark:bg-purple-900/20'
        },
        {
            label: 'التكوينات',
            value: configs.length,
            icon: BeakerIcon,
            color: 'text-orange-600',
            bg: 'bg-orange-50 dark:bg-orange-900/20'
        },
        {
            label: 'الأجهزة المسجلة',
            value: equipmentList.length,
            icon: WrenchScrewdriverIcon,
            color: 'text-slate-700 dark:text-slate-200',
            bg: 'bg-slate-100 dark:bg-slate-800'
        }
    ];

    const planSteps = [
        { title: 'تسجيل الأجهزة', desc: 'ربط الأجهزة بالفحوصات والطريقة', done: equipmentList.length > 0 },
        { title: 'تسجيل المواد', desc: 'مواد خام أو مواد مستلمة', done: receivings.length > 0 },
        { title: 'تعريف الطرق', desc: 'طرق الاختبار والمعايير', done: configs.length > 0 },
        { title: 'تعريف المعلمات', desc: 'نطاقات وحقول البيانات', done: Object.keys(configDetails).length > 0 },
        { title: 'الجدولة', desc: 'جدولة تلقائية للفحوصات', done: schedules.length > 0 },
        { title: 'التنفيذ', desc: 'تشغيل الجلسات وتسجيل النتائج', done: runs.length > 0 },
        { title: 'الاعتماد', desc: 'مراجعة واعتماد النتائج', done: stats.approved > 0 }
    ];

    const configSearchText = configSearch;
    const filteredConfigs = configs.filter((config) => {
        if (!configSearchText.trim()) return true;
        const query = configSearchText.toLowerCase();
        return (
            config.name?.toLowerCase().includes(query) ||
            config.name_ar?.toLowerCase().includes(query) ||
            config.code?.toLowerCase().includes(query)
        );
    });

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-6">
            <div className="max-w-7xl mx-auto">
                <Link
                    to="/lab"
                    className="inline-flex items-center gap-2 text-slate-600 dark:text-slate-300 hover:text-primary-600 dark:hover:text-primary-400 mb-4 transition-colors"
                >
                    <ArrowRightIcon className="w-5 h-5" />
                    <span>العودة للمختبر</span>
                </Link>

                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                            <div className="p-2 bg-gradient-to-br from-primary-500 to-purple-600 rounded-xl shadow-lg">
                                <BeakerIcon className="w-7 h-7 text-white" />
                            </div>
                            نظام الفحوصات المخبرية المتكامل
                        </h1>
                        <p className="text-slate-600 dark:text-slate-400 mt-1">
                            تسجيل الأجهزة والمواد، تعريف الطرق والمعلمات، جدولة الفحوصات، تنفيذ النتائج واعتمادها
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        <Link
                            to="/lab/quick-entry"
                            className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:shadow-lg transition-all"
                        >
                            <PlusIcon className="w-5 h-5" />
                            إدخال سريع
                        </Link>
                        <Link
                            to="/lab/receiving/new"
                            className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl hover:shadow-md transition-all"
                        >
                            استلام مادة
                        </Link>
                        <Link
                            to="/lab/tests/v1/settings"
                            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all"
                        >
                            <Cog6ToothIcon className="w-5 h-5" />
                            إعدادات النظام
                        </Link>
                    </div>
                </div>

                {activeSession && (
                    <div className="mb-6 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/40 rounded-2xl p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                        <div>
                            <p className="text-sm text-amber-700 dark:text-amber-200 font-semibold">جلسة فحص نشطة</p>
                            <p className="text-slate-700 dark:text-slate-200">
                                لا يمكن تغيير التبويب حتى إنهاء الجلسة. بدأ في{' '}
                                <FormattedDate date={activeSession.startedAt} includeTime />
                            </p>
                        </div>
                        <button
                            onClick={endSession}
                            className="px-4 py-2 bg-amber-600 text-white rounded-xl hover:bg-amber-700 transition-colors"
                        >
                            إنهاء الجلسة
                        </button>
                    </div>
                )}

                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-2">
                    <div className="flex flex-wrap gap-2">
                        {tabs.map((tab) => {
                            const Icon = tab.icon;
                            const isActive = activeTab === tab.id;
                            const isDisabled = isLocked && tab.id !== 'schedule';

                            return (
                                <button
                                    key={tab.id}
                                    disabled={isDisabled}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                                        isActive
                                            ? 'bg-primary-600 text-white shadow-lg'
                                            : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                                    } ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    title={isDisabled ? 'أكمل جلسة الفحص أولاً' : tab.label}
                                >
                                    <Icon className="w-5 h-5" />
                                    {tab.label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="mt-6 space-y-6">
                    {activeTab === 'overview' && (
                        <>
                            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                                {statsCards.map((stat) => (
                                    <div
                                        key={stat.label}
                                        className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700"
                                    >
                                        <div className="flex items-center justify-between mb-3">
                                            <div className={`p-2 rounded-xl ${stat.bg}`}>
                                                <stat.icon className={`w-6 h-6 ${stat.color}`} />
                                            </div>
                                        </div>
                                        <div className="text-2xl font-bold text-slate-900 dark:text-white">
                                            {stat.value}
                                        </div>
                                        <div className="text-sm text-slate-500 dark:text-slate-400">{stat.label}</div>
                                    </div>
                                ))}
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
                                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
                                        خطة التشغيل المتكاملة
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {planSteps.map((step) => (
                                            <div
                                                key={step.title}
                                                className="border border-slate-200 dark:border-slate-700 rounded-xl p-4 bg-slate-50 dark:bg-slate-900/40"
                                            >
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span
                                                        className={`w-2.5 h-2.5 rounded-full ${
                                                            step.done ? 'bg-emerald-500' : 'bg-slate-300'
                                                        }`}
                                                    ></span>
                                                    <h4 className="font-semibold text-slate-900 dark:text-white">
                                                        {step.title}
                                                    </h4>
                                                </div>
                                                <p className="text-sm text-slate-500 dark:text-slate-400">{step.desc}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="bg-gradient-to-br from-primary-600 to-purple-600 rounded-2xl p-6 text-white">
                                    <h3 className="text-xl font-bold mb-2">مركز التحكم السريع</h3>
                                    <p className="text-sm text-white/80 mb-4">
                                        انتقل مباشرة للأجزاء الأكثر استخدامًا داخل نظام الفحوصات.
                                    </p>
                                    <div className="grid grid-cols-2 gap-3">
                                        <Link
                                            to="/lab/config/new"
                                            className="bg-white/15 hover:bg-white/25 rounded-xl px-3 py-2 text-sm font-medium"
                                        >
                                            تكوين فحص
                                        </Link>
                                        <Link
                                            to="/lab/receiving"
                                            className="bg-white/15 hover:bg-white/25 rounded-xl px-3 py-2 text-sm font-medium"
                                        >
                                            الاستلام
                                        </Link>
                                        <Link
                                            to="/lab/materials"
                                            className="bg-white/15 hover:bg-white/25 rounded-xl px-3 py-2 text-sm font-medium"
                                        >
                                            المواد الخام
                                        </Link>
                                        <Link
                                            to="/lab/analytics"
                                            className="bg-white/15 hover:bg-white/25 rounded-xl px-3 py-2 text-sm font-medium"
                                        >
                                            التحليلات
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}

                    {activeTab === 'assets' && (
                        <>
                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                                            سجل الأجهزة
                                        </h3>
                                        <Link
                                            to="/lab/tests/v1/settings?tab=equipment"
                                            className="text-sm text-primary-600 hover:underline"
                                        >
                                            إضافة جهاز
                                        </Link>
                                    </div>
                                    {equipmentList.length === 0 ? (
                                        <div className="text-center py-10 text-slate-500">
                                            لم يتم تسجيل أجهزة بعد. قم بإضافة أجهزة وربطها بالفحوصات.
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {equipmentList.map((equipmentItem) => (
                                                <div
                                                    key={equipmentItem.id}
                                                    className="border border-slate-200 dark:border-slate-700 rounded-xl p-4 bg-slate-50 dark:bg-slate-900/40"
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <span className="font-semibold text-slate-900 dark:text-white">
                                                            {equipmentItem.name_ar || equipmentItem.name}
                                                        </span>
                                                        <span className="text-xs bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 px-2 py-1 rounded-full">
                                                            {(equipmentItem.linked_tests || []).length} فحص
                                                        </span>
                                                    </div>
                                                    <div className="mt-3 flex flex-wrap gap-2">
                                                        {(equipmentItem.linked_tests || []).slice(0, 3).map((test) => (
                                                            <span
                                                                key={test.id}
                                                                className="text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 py-1 rounded-full"
                                                            >
                                                                {test.name_ar || test.name}
                                                            </span>
                                                        ))}
                                                        {(equipmentItem.linked_tests || []).length > 3 && (
                                                            <span className="text-xs text-slate-400">
                                                                +{(equipmentItem.linked_tests || []).length - 3} أخرى
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                                            المواد الكيميائية والاستلام
                                        </h3>
                                        <div className="flex gap-2">
                                            <Link to="/lab/materials" className="text-sm text-primary-600 hover:underline">
                                                المواد الخام
                                            </Link>
                                            <Link to="/lab/receiving" className="text-sm text-primary-600 hover:underline">
                                                الاستلام
                                            </Link>
                                        </div>
                                    </div>
                                    {receivingsLoading ? (
                                        <div className="text-center py-8 text-slate-500">جاري تحميل الاستلامات...</div>
                                    ) : receivings.length === 0 ? (
                                        <div className="text-center py-10 text-slate-500">
                                            لا توجد استلامات مواد حتى الآن.
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {receivings.slice(0, 5).map((receiving) => (
                                                <div
                                                    key={receiving.id}
                                                    className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-200 dark:border-slate-700"
                                                >
                                                    <div>
                                                        <div className="font-medium text-slate-900 dark:text-white">
                                                            {receiving.materialName}
                                                        </div>
                                                        <div className="text-xs text-slate-500">
                                                            {materialTypeLabels[receiving.materialType]} • باتش {receiving.batchNumber}
                                                        </div>
                                                    </div>
                                                    <span
                                                        className={`text-xs px-2 py-1 rounded-full ${
                                                            materialReceivingStatusColors[receiving.status].bg
                                                        } ${materialReceivingStatusColors[receiving.status].text}`}
                                                    >
                                                        {materialReceivingStatusLabels[receiving.status]}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
                                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
                                    اختيار المادة للفحص
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">
                                            نوع المصدر
                                        </label>
                                        <div className="flex gap-2">
                                            <button className="flex-1 px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                                                مواد خام
                                            </button>
                                            <button className="flex-1 px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                                                مواد مستلمة
                                            </button>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">
                                            المادة أو الاستلام
                                        </label>
                                        <select className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900">
                                            <option>اختر مادة من الاستلامات</option>
                                            {receivings.slice(0, 5).map((receiving) => (
                                                <option key={receiving.id} value={receiving.id}>
                                                    {receiving.materialName} • {receiving.batchNumber}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">
                                            رقم الباتش
                                        </label>
                                        <input
                                            type="text"
                                            className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900"
                                            placeholder="إدخال رقم الباتش"
                                        />
                                    </div>
                                </div>
                                <p className="text-xs text-slate-500 mt-3">
                                    يمكنك اختيار مادة خام أو استلام مادة محددة ثم ربطها بجلسة الفحص.
                                </p>
                            </div>
                        </>
                    )}

                    {activeTab === 'configs' && (
                        <>
                            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
                                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
                                    <div>
                                        <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                                            طرق الاختبار والمعلمات
                                        </h3>
                                        <p className="text-sm text-slate-500">
                                            تعريف الطريقة، الأجهزة المطلوبة، ونطاقات النتائج.
                                        </p>
                                    </div>
                                    <Link
                                        to="/lab/config/new"
                                        className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors"
                                    >
                                        <PlusIcon className="w-5 h-5" />
                                        تكوين جديد
                                    </Link>
                                </div>

                                <div className="relative mb-6">
                                    <MagnifyingGlassIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                    <input
                                        type="text"
                                        value={configSearch}
                                        onChange={(e) => setConfigSearch(e.target.value)}
                                        placeholder="ابحث في التكوينات..."
                                        className="w-full pl-4 pr-10 py-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 focus:ring-2 focus:ring-primary-500"
                                    />
                                </div>

                                {filteredConfigs.length === 0 ? (
                                    <div className="text-center py-12 text-slate-500">
                                        لا توجد تكوينات مطابقة لبحثك.
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                        {filteredConfigs.map((config) => {
                                            const details = configDetails[config.id];
                                            const isExpanded = expandedConfigId === config.id;
                                            return (
                                                <div
                                                    key={config.id}
                                                    className="border border-slate-200 dark:border-slate-700 rounded-2xl p-4 bg-slate-50 dark:bg-slate-900/40"
                                                >
                                                    <div className="flex items-start justify-between gap-4">
                                                        <div>
                                                            <h4 className="font-bold text-slate-900 dark:text-white">
                                                                {config.name_ar || config.name}
                                                            </h4>
                                                            <p className="text-xs text-slate-500">
                                                                {config.test_type?.category?.name_ar || config.test_type?.category?.name}
                                                                {' • '}
                                                                {config.test_type?.name_ar || config.test_type?.name}
                                                            </p>
                                                        </div>
                                                        <Link
                                                            to={`/lab/config/${config.id}`}
                                                            className="text-sm text-primary-600 hover:underline"
                                                        >
                                                            تحرير
                                                        </Link>
                                                    </div>

                                                    <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-slate-600 dark:text-slate-300">
                                                        <div>
                                                            <span className="font-medium">الطريقة:</span>{' '}
                                                            {config.method || 'غير محددة'}
                                                        </div>
                                                        <div>
                                                            <span className="font-medium">المعيار:</span>{' '}
                                                            {config.method_standard || 'غير محدد'}
                                                        </div>
                                                    </div>

                                                    <div className="mt-3">
                                                        <div className="text-xs text-slate-500">الأجهزة المطلوبة</div>
                                                        <div className="flex flex-wrap gap-2 mt-1">
                                                            {(config.equipment || []).length === 0 && (
                                                                <span className="text-xs text-slate-400">
                                                                    لم يتم تحديد أجهزة بعد
                                                                </span>
                                                            )}
                                                            {(config.equipment || []).map((equipment) => (
                                                                <span
                                                                    key={equipment.id}
                                                                    className="text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 py-1 rounded-full"
                                                                >
                                                                    {equipment.name_ar || equipment.name}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    <button
                                                        onClick={() => toggleConfigDetails(config.id)}
                                                        className="mt-4 text-sm text-primary-600 hover:underline"
                                                    >
                                                        {isExpanded ? 'إخفاء المعلمات' : 'عرض المعلمات'}
                                                    </button>

                                                    {isExpanded && (
                                                        <div className="mt-4 space-y-3">
                                                            {configLoadingId === config.id && (
                                                                <div className="text-sm text-slate-500">
                                                                    جاري تحميل المعلمات...
                                                                </div>
                                                            )}
                                                            {!configLoadingId && details?.fields?.length === 0 && (
                                                                <div className="text-sm text-slate-500">
                                                                    لا توجد معلمات لهذا الفحص.
                                                                </div>
                                                            )}
                                                            {details?.fields?.map((field) => (
                                                                <div
                                                                    key={field.id}
                                                                    className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3"
                                                                >
                                                                    <div>
                                                                        <div className="font-medium text-slate-900 dark:text-white">
                                                                            {field.label_ar || field.label}
                                                                        </div>
                                                                        <div className="text-xs text-slate-500">
                                                                            {fieldTypeLabels[field.field_type]}
                                                                            {field.is_required ? ' • مطلوب' : ''}
                                                                            {field.is_evaluable ? ' • قابل للتقييم' : ''}
                                                                        </div>
                                                                    </div>
                                                                    <div className="text-xs text-slate-500">
                                                                        {field.is_evaluable ? (
                                                                            <>
                                                                                النطاق:{' '}
                                                                                {field.spec_min_value ?? '-'}{' '}
                                                                                - {field.spec_max_value ?? '-'}{' '}
                                                                                {field.spec_unit || ''}
                                                                            </>
                                                                        ) : (
                                                                            '—'
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </>
                    )}

                    {activeTab === 'schedule' && (
                        <>
                            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
                                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">
                                        جلسة فحص تشغيلية
                                    </h3>
                                    <p className="text-sm text-slate-500 mb-4">
                                        افتح جلسة فحص جديدة، لن يتم إغلاق الصفحة حتى إنهاء الجلسة.
                                    </p>
                                    <div className="space-y-3">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">
                                                الفحص
                                            </label>
                                            <select
                                                value={sessionConfigId}
                                                onChange={(e) => setSessionConfigId(e.target.value)}
                                                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900"
                                            >
                                                <option value="">اختر الفحص</option>
                                                {configs.map((config) => (
                                                    <option key={config.id} value={config.id}>
                                                        {config.name_ar || config.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">
                                                رقم الباتش (اختياري)
                                            </label>
                                            <input
                                                type="text"
                                                value={sessionBatch}
                                                onChange={(e) => setSessionBatch(e.target.value)}
                                                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900"
                                                placeholder="Batch-2026-001"
                                            />
                                        </div>
                                        <button
                                            onClick={startSession}
                                            disabled={!sessionConfigId}
                                            className="w-full px-4 py-2 bg-primary-600 text-white rounded-xl hover:bg-primary-700 disabled:opacity-50"
                                        >
                                            بدء الجلسة
                                        </button>
                                    </div>
                                    {activeSession && (
                                        <div className="mt-4 bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700 rounded-xl p-3">
                                            <div className="text-sm text-slate-600 dark:text-slate-300">
                                                جلسة نشطة الآن. استخدم الإدخال السريع لتسجيل النتائج.
                                            </div>
                                            <Link
                                                to="/lab/quick-entry"
                                                className="inline-flex items-center gap-2 mt-3 text-sm text-primary-600 hover:underline"
                                            >
                                                فتح الإدخال السريع
                                                <ArrowRightIcon className="w-4 h-4" />
                                            </Link>
                                        </div>
                                    )}
                                </div>

                                <div className="xl:col-span-2 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                                            الجداول النشطة
                                        </h3>
                                        <Link to="/lab/tests/v1/settings" className="text-sm text-primary-600 hover:underline">
                                            إدارة الجداول
                                        </Link>
                                    </div>
                                    {schedules.length === 0 ? (
                                        <div className="text-center py-10 text-slate-500">
                                            لا توجد جداول مفعلة حالياً.
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {schedules.slice(0, 6).map((schedule) => (
                                                <div
                                                    key={schedule.id}
                                                    className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 p-3 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-200 dark:border-slate-700"
                                                >
                                                    <div>
                                                        <div className="font-medium text-slate-900 dark:text-white">
                                                            {schedule.test_config?.name_ar || schedule.test_config?.name}
                                                        </div>
                                                        <div className="text-xs text-slate-500">
                                                            {scheduleTypeLabels[schedule.schedule_type]} •
                                                            التالي{' '}
                                                            <FormattedDate
                                                                date={schedule.next_run_at}
                                                                includeTime
                                                                fallback="-"
                                                            />
                                                        </div>
                                                    </div>
                                                    <span
                                                        className={`text-xs px-2 py-1 rounded-full ${
                                                            schedule.is_active
                                                                ? 'bg-emerald-100 text-emerald-700'
                                                                : 'bg-slate-200 text-slate-600'
                                                        }`}
                                                    >
                                                        {schedule.is_active ? 'نشط' : 'متوقف'}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </>
                    )}

                    {activeTab === 'results' && (
                        <>
                            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
                                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
                                    <div>
                                        <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                                            نتائج الفحوصات والباتشات
                                        </h3>
                                        <p className="text-sm text-slate-500">
                                            الرجوع لنتائج كل باتشة وربطها بالفحص المعتمد.
                                        </p>
                                    </div>
                                    <button
                                        onClick={refreshRuns}
                                        className="px-4 py-2 text-sm bg-slate-900 text-white rounded-xl hover:bg-slate-800"
                                    >
                                        تحديث النتائج
                                    </button>
                                </div>

                                <div className="flex flex-col md:flex-row gap-3 mb-6">
                                    <div className="relative flex-1">
                                        <MagnifyingGlassIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                        <input
                                            type="text"
                                            value={runSearch}
                                            onChange={(e) => setRunSearch(e.target.value)}
                                            placeholder="بحث برقم الفحص أو الباتش..."
                                            className="w-full pl-4 pr-10 py-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 focus:ring-2 focus:ring-primary-500"
                                        />
                                    </div>
                                    <select
                                        value={runFilter}
                                        onChange={(e) => setRunFilter(e.target.value as any)}
                                        className="px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900"
                                    >
                                        <option value="all">كل الحالات</option>
                                        <option value="pending">قيد الانتظار</option>
                                        <option value="in_progress">قيد الفحص</option>
                                        <option value="completed">مكتمل</option>
                                        <option value="approved">معتمد</option>
                                        <option value="rejected">مرفوض</option>
                                        <option value="passed">مطابق</option>
                                        <option value="failed">غير مطابق</option>
                                    </select>
                                </div>

                                {filteredRuns.length === 0 ? (
                                    <div className="text-center py-12 text-slate-500">
                                        لا توجد نتائج مطابقة للبحث الحالي.
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="text-slate-500 border-b border-slate-200 dark:border-slate-700">
                                                    <th className="text-right py-2">رقم الفحص</th>
                                                    <th className="text-right py-2">الاختبار</th>
                                                    <th className="text-right py-2">الباتش</th>
                                                    <th className="text-right py-2">الحالة</th>
                                                    <th className="text-right py-2">النتيجة</th>
                                                    <th className="text-right py-2">التاريخ</th>
                                                    <th className="text-center py-2">إجراء</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                                {filteredRuns.map((run) => (
                                                    <tr key={run.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/40">
                                                        <td className="py-3 font-mono text-primary-600">
                                                            {run.run_number}
                                                        </td>
                                                        <td className="py-3">
                                                            {run.test_config?.name_ar || run.test_config?.name || '—'}
                                                        </td>
                                                        <td className="py-3">
                                                            {run.batch_number || run.linked_batch_id || '—'}
                                                        </td>
                                                        <td className="py-3">
                                                            <span className="text-xs px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200">
                                                                {runStatusLabels[run.status]}
                                                            </span>
                                                        </td>
                                                        <td className="py-3">
                                                            {run.evaluation_result === 'pass' && (
                                                                <span className="text-xs px-2 py-1 rounded-full bg-emerald-100 text-emerald-700">
                                                                    مطابق
                                                                </span>
                                                            )}
                                                            {run.evaluation_result === 'fail' && (
                                                                <span className="text-xs px-2 py-1 rounded-full bg-red-100 text-red-700">
                                                                    غير مطابق
                                                                </span>
                                                            )}
                                                            {!run.evaluation_result && (
                                                                <span className="text-xs text-slate-400">—</span>
                                                            )}
                                                        </td>
                                                        <td className="py-3 text-slate-500">
                                                            <FormattedDate date={run.created_at} includeTime />
                                                        </td>
                                                        <td className="py-3 text-center">
                                                            <button
                                                                onClick={() => openRunDetails(run)}
                                                                className="inline-flex items-center gap-1 text-primary-600 hover:underline"
                                                            >
                                                                <EyeIcon className="w-4 h-4" />
                                                                عرض
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </>
                    )}

                    {activeTab === 'products' && (
                        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
                                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">
                                    ربط فحص بمنتج
                                </h3>
                                <p className="text-sm text-slate-500 mb-4">
                                    خصص اختبارات لكل منتج حسب الشركة والباتش.
                                </p>
                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">
                                            المنتج
                                        </label>
                                        <select
                                            value={productSchedule.productId}
                                            onChange={(e) =>
                                                setProductSchedule((prev) => ({ ...prev, productId: e.target.value }))
                                            }
                                            className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900"
                                        >
                                            <option value="">اختر المنتج</option>
                                            {products.map((product) => (
                                                <option key={product.id} value={product.id}>
                                                    {product.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">
                                            الفحص
                                        </label>
                                        <select
                                            value={productSchedule.configId}
                                            onChange={(e) =>
                                                setProductSchedule((prev) => ({ ...prev, configId: e.target.value }))
                                            }
                                            className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900"
                                        >
                                            <option value="">اختر الفحص</option>
                                            {configs.map((config) => (
                                                <option key={config.id} value={config.id}>
                                                    {config.name_ar || config.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">
                                            نوع الجدولة
                                        </label>
                                        <select
                                            value={productSchedule.scheduleType}
                                            onChange={(e) =>
                                                setProductSchedule((prev) => ({
                                                    ...prev,
                                                    scheduleType: e.target.value as TestScheduleType
                                                }))
                                            }
                                            className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900"
                                        >
                                            <option value="on_batch">عند الباتش</option>
                                            <option value="on_material_receipt">عند استلام مادة</option>
                                            <option value="daily">يومي</option>
                                            <option value="weekly">أسبوعي</option>
                                            <option value="monthly">شهري</option>
                                        </select>
                                    </div>
                                    {timeBasedScheduleTypes.includes(productSchedule.scheduleType) && (
                                        <div className="grid grid-cols-2 gap-2">
                                            <input
                                                type="number"
                                                min={1}
                                                value={productSchedule.frequencyValue}
                                                onChange={(e) =>
                                                    setProductSchedule((prev) => ({
                                                        ...prev,
                                                        frequencyValue: Number(e.target.value)
                                                    }))
                                                }
                                                className="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900"
                                            />
                                            <select
                                                value={productSchedule.frequencyUnit}
                                                onChange={(e) =>
                                                    setProductSchedule((prev) => ({
                                                        ...prev,
                                                        frequencyUnit: e.target.value as FrequencyUnit
                                                    }))
                                                }
                                                className="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900"
                                            >
                                                <option value="hours">ساعات</option>
                                                <option value="days">أيام</option>
                                                <option value="weeks">أسابيع</option>
                                                <option value="months">أشهر</option>
                                            </select>
                                        </div>
                                    )}
                                    {scheduleError && (
                                        <div className="text-sm text-red-600">{scheduleError}</div>
                                    )}
                                    <button
                                        onClick={handleCreateProductSchedule}
                                        disabled={creatingSchedule}
                                        className="w-full px-4 py-2 bg-primary-600 text-white rounded-xl hover:bg-primary-700 disabled:opacity-50"
                                    >
                                        {creatingSchedule ? 'جاري الحفظ...' : 'حفظ الجدول'}
                                    </button>
                                </div>
                            </div>

                            <div className="xl:col-span-2 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                                        مصفوفة الفحوصات حسب المنتج
                                    </h3>
                                    <span className="text-sm text-slate-500">عدد المنتجات: {products.length}</span>
                                </div>
                                {products.length === 0 ? (
                                    <div className="text-center py-12 text-slate-500">
                                        لا توجد منتجات مفعلة حالياً.
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {products.map((product) => {
                                            const assignedSchedules = schedulesByProduct.get(product.id) || [];
                                            return (
                                                <div
                                                    key={product.id}
                                                    className="border border-slate-200 dark:border-slate-700 rounded-2xl p-4 bg-slate-50 dark:bg-slate-900/40"
                                                >
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div>
                                                            <div className="font-semibold text-slate-900 dark:text-white">
                                                                {product.name}
                                                            </div>
                                                            <div className="text-xs text-slate-500">SKU: {product.sku}</div>
                                                        </div>
                                                        <span className="text-xs bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 px-2 py-1 rounded-full">
                                                            {assignedSchedules.length} فحص
                                                        </span>
                                                    </div>
                                                    <div className="mt-3 flex flex-wrap gap-2">
                                                        {assignedSchedules.length === 0 && (
                                                            <span className="text-xs text-slate-400">
                                                                لا توجد فحوصات مرتبطة
                                                            </span>
                                                        )}
                                                        {assignedSchedules.slice(0, 3).map((schedule) => (
                                                            <span
                                                                key={schedule.id}
                                                                className="text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 py-1 rounded-full"
                                                            >
                                                                {schedule.test_config?.name_ar || schedule.test_config?.name}
                                                            </span>
                                                        ))}
                                                        {assignedSchedules.length > 3 && (
                                                            <span className="text-xs text-slate-400">
                                                                +{assignedSchedules.length - 3} أخرى
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {selectedRun && (
                <TestRunDetailsModal
                    run={selectedRun}
                    isOpen={isRunModalOpen}
                    onClose={() => setIsRunModalOpen(false)}
                    onUpdate={refreshRuns}
                    canApprove={true}
                />
            )}
        </div>
    );
};

export default LabTestsUnifiedPage;
