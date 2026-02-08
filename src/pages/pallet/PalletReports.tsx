/**
/**
 * Pallet Reports Dashboard
 * Displays Production and Loading reports with filtering and charts
 */

import { useState, useEffect, useMemo } from 'react';
import { useCompanyStore } from '../../store/companyStore';
import { supabase } from '../../config/supabase';
import {
    BarChart3,
    PieChart,
    Calendar,
    Filter,
    ArrowUpRight,
    ArrowDownRight,
    Package,
    Truck
} from 'lucide-react';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ArcElement,
} from 'chart.js';
import { Bar, Pie } from 'react-chartjs-2';
import Modal from '../../components/common/Modal';

// Register ChartJS components
ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ArcElement
);

type ReportType = 'production' | 'loading' | 'inventory';
type DateRange = 'today' | 'week' | 'month' | 'year' | 'custom';

const LOADING_STATUS_LABELS: Record<string, string> = {
    planned: 'مخططة',
    in_progress: 'جارية',
    completed: 'مكتملة',
    cancelled: 'ملغاة',
};

const LOADING_STRATEGY_LABELS: Record<string, string> = {
    fifo: 'الأقدم أولاً',
    fefo: 'الأقرب للانتهاء أولاً',
    lifo: 'الأحدث أولاً',
    random: 'عشوائي',
    specific: 'محدد',
};

export default function PalletReports() {
    const { selectedCompanyId } = useCompanyStore();
    const [reportType, setReportType] = useState<ReportType>('production');
    const [dateRange, setDateRange] = useState<DateRange>('week');
    const [loading, setLoading] = useState(false);

    // Data States
    const [productionStats, setProductionStats] = useState({
        totalPallets: 0,
        totalCartons: 0,
        byProduct: {} as Record<string, number>,
        byShift: {} as Record<string, number>,
        dailyTrend: [] as any[],
        efficiency: 0
    });

    const [loadingStats, setLoadingStats] = useState({
        totalOperations: 0,
        totalLoadedPallets: 0,
        totalLoadedCartons: 0,
        completedRate: 0,
        avgPalletsPerOperation: 0,
        avgCartonsPerOperation: 0,
        byVehicleType: {} as Record<string, number>,
        byStatus: {} as Record<string, number>,
        avgDurationMinutes: 0,
        longOperationsCount: 0,
        cancelledCount: 0,
        partialLoadsCount: 0,
        holdsInLoadedCount: 0,
        dailyTrend: [] as any[]
    });
    const [warehouseStats, setWarehouseStats] = useState({
        pallets: 0,
        cartons: 0,
    });

    const [loadingOperations, setLoadingOperations] = useState<any[]>([]);
    const [loadingOperationsPage, setLoadingOperationsPage] = useState<any[]>([]);
    const [loadingPage, setLoadingPage] = useState(1);
    const [loadingPageSize, setLoadingPageSize] = useState(50);
    const [loadingTotalCount, setLoadingTotalCount] = useState(0);
    const [loadingPageLoading, setLoadingPageLoading] = useState(false);
    const [loadingBatchInfo, setLoadingBatchInfo] = useState<Record<string, {
        batchNumber?: string;
        productionDate?: string;
        completedAt?: string;
        batchCount: number;
        multiple: boolean;
    }>>({});
    const [loadingVehicles, setLoadingVehicles] = useState<any[]>([]);
    const [loadingProductOptions, setLoadingProductOptions] = useState<{
        names: string[];
        categories: string[];
    }>({ names: [], categories: [] });
    const [loadingFilters, setLoadingFilters] = useState({
        statusQuery: '',
        strategyQuery: '',
        vehicleQuery: '',
        loadingDateFrom: '',
        loadingDateTo: '',
        batchQuery: '',
        productionDateFrom: '',
        productionDateTo: '',
        productQuery: '',
    });
    const [loadingComparison, setLoadingComparison] = useState({
        totalOperations: 0,
        totalLoadedPallets: 0,
        totalLoadedCartons: 0,
        completedRate: 0,
    });
    const [loadingExceptions, setLoadingExceptions] = useState<{
        long: any[];
        cancelled: any[];
        partial: any[];
        holds: any[];
    }>({
        long: [],
        cancelled: [],
        partial: [],
        holds: [],
    });
    const [loadingUserNames, setLoadingUserNames] = useState<Record<string, string>>({});
    const [loadingDetailsOpen, setLoadingDetailsOpen] = useState(false);
    const [loadingDetailsLoading, setLoadingDetailsLoading] = useState(false);
    const [loadingDetailsError, setLoadingDetailsError] = useState<string | null>(null);
    const [loadingDetails, setLoadingDetails] = useState<any>(null);

    useEffect(() => {
        if (selectedCompanyId) {
            fetchData();
        }
    }, [selectedCompanyId, reportType, dateRange, loadingFilters]);

    useEffect(() => {
        if (selectedCompanyId && reportType === 'loading') {
            fetchLoadingPage();
        }
    }, [
        selectedCompanyId,
        reportType,
        dateRange,
        loadingFilters.statusQuery,
        loadingFilters.strategyQuery,
        loadingFilters.vehicleQuery,
        loadingFilters.loadingDateFrom,
        loadingFilters.loadingDateTo,
        loadingFilters.batchQuery,
        loadingFilters.productionDateFrom,
        loadingFilters.productionDateTo,
        loadingFilters.productQuery,
        loadingPage,
        loadingPageSize,
    ]);

    useEffect(() => {
        if (reportType === 'loading') {
            setLoadingPage(1);
        }
    }, [
        selectedCompanyId,
        reportType,
        dateRange,
        loadingFilters.statusQuery,
        loadingFilters.strategyQuery,
        loadingFilters.vehicleQuery,
        loadingFilters.loadingDateFrom,
        loadingFilters.loadingDateTo,
        loadingFilters.batchQuery,
        loadingFilters.productionDateFrom,
        loadingFilters.productionDateTo,
        loadingFilters.productQuery,
    ]);

    useEffect(() => {
        if (selectedCompanyId && reportType === 'loading') {
            fetchLoadingVehicles();
        }
    }, [selectedCompanyId, reportType]);

    useEffect(() => {
        if (selectedCompanyId && reportType === 'loading') {
            fetchLoadingProducts();
        }
    }, [selectedCompanyId, reportType]);

    const fetchData = async () => {
        if (!selectedCompanyId) return;
        setLoading(true);

        try {
            const endDate = new Date();
            let startDate = new Date();

            switch (dateRange) {
                case 'today': startDate.setDate(endDate.getDate() - 0); break;
                case 'week': startDate.setDate(endDate.getDate() - 7); break;
                case 'month': startDate.setMonth(endDate.getMonth() - 1); break;
                case 'year': startDate.setFullYear(endDate.getFullYear() - 1); break;
            }
            // Set to start of day
            startDate.setHours(0, 0, 0, 0);

            if (reportType === 'production') {
                await fetchProductionData(startDate.toISOString(), endDate.toISOString());
            } else if (reportType === 'loading') {
                await fetchLoadingData(startDate.toISOString(), endDate.toISOString());
            }
        } catch (error) {
            console.error('Error fetching report data:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchLoadingVehicles = async () => {
        if (!selectedCompanyId) return;
        try {
            const { data, error } = await supabase
                .from('vehicles')
                .select('id, vehicle_number, vehicle_type')
                .eq('company_id', selectedCompanyId)
                .order('vehicle_number', { ascending: true })
                .limit(500);

            if (error) throw error;
            setLoadingVehicles(data || []);
        } catch (err) {
            console.error('Error loading vehicles for reports:', err);
            setLoadingVehicles([]);
        }
    };

    const fetchLoadingProducts = async () => {
        if (!selectedCompanyId) return;
        try {
            const { data, error } = await supabase
                .from('products')
                .select('name, category')
                .eq('company_id', selectedCompanyId)
                .order('name', { ascending: true })
                .limit(1000);

            if (error) throw error;

            const nameSet = new Set<string>();
            const categorySet = new Set<string>();
            (data || []).forEach((item: any) => {
                if (item.name) nameSet.add(item.name);
                if (item.category) categorySet.add(item.category);
            });

            setLoadingProductOptions({
                names: Array.from(nameSet),
                categories: Array.from(categorySet),
            });
        } catch (err) {
            console.error('Error loading products for reports:', err);
            setLoadingProductOptions({ names: [], categories: [] });
        }
    };

    const formatDateTime = (value?: string) =>
        value ? new Date(value).toLocaleString('ar-EG') : '-';
    const formatDate = (value?: string) =>
        value ? new Date(value).toLocaleDateString('ar-EG') : '-';
    const productOptionValues = useMemo(() => {
        const values = new Set<string>();
        loadingProductOptions.categories.forEach((category) => values.add(category));
        loadingProductOptions.names.forEach((name) => values.add(name));
        return values;
    }, [loadingProductOptions]);
    const selectedProductValue = productOptionValues.has(loadingFilters.productQuery)
        ? loadingFilters.productQuery
        : '';

    const normalizeLookupValue = (input: string, labels: Record<string, string>) => {
        const trimmed = input.trim();
        if (!trimmed) return '';
        const match = Object.entries(labels).find(
            ([code, label]) => code === trimmed || label === trimmed
        );
        return match ? match[0] : trimmed;
    };

    const toStartOfDayIso = (dateStr: string) => {
        const date = new Date(dateStr);
        date.setHours(0, 0, 0, 0);
        return date.toISOString();
    };

    const toEndOfDayIso = (dateStr: string) => {
        const date = new Date(dateStr);
        date.setHours(23, 59, 59, 999);
        return date.toISOString();
    };

    const resolveVehicleIds = () => {
        const query = loadingFilters.vehicleQuery.trim().toLowerCase();
        if (!query) return null;
        const matches = loadingVehicles.filter((vehicle: any) => {
            const number = String(vehicle.vehicle_number || '').toLowerCase();
            const type = String(vehicle.vehicle_type || '').toLowerCase();
            const driver = String(vehicle.driver_name || '').toLowerCase();
            const id = String(vehicle.id || '').toLowerCase();
            return (
                number.includes(query) ||
                type.includes(query) ||
                driver.includes(query) ||
                id.includes(query)
            );
        });
        return matches.map((vehicle: any) => vehicle.id);
    };

    const resolveLoadingOperationIds = async () => {
        if (!selectedCompanyId) return null;

        const batchQuery = loadingFilters.batchQuery.trim();
        const productQuery = loadingFilters.productQuery.trim();
        const hasBatchFilters =
            !!batchQuery ||
            !!loadingFilters.productionDateFrom ||
            !!loadingFilters.productionDateTo;

        if (!hasBatchFilters && !productQuery) return null;

        let batchIds: string[] = [];
        if (hasBatchFilters) {
            let batchQueryBuilder = supabase
                .from('pallet_batches')
                .select('id')
                .eq('company_id', selectedCompanyId);

            if (batchQuery) {
                batchQueryBuilder = batchQueryBuilder.ilike('batch_number', `%${batchQuery}%`);
            }
            if (loadingFilters.productionDateFrom) {
                batchQueryBuilder = batchQueryBuilder.gte('production_date', loadingFilters.productionDateFrom);
            }
            if (loadingFilters.productionDateTo) {
                batchQueryBuilder = batchQueryBuilder.lte('production_date', loadingFilters.productionDateTo);
            }

            const { data: batches, error: batchesError } = await batchQueryBuilder;
            if (batchesError) throw batchesError;

            batchIds = (batches || []).map((batch: any) => batch.id);
            if (batchIds.length === 0) return [];
        }

        let productIds: string[] = [];
        if (productQuery) {
            let productQueryBuilder = supabase
                .from('products')
                .select('id')
                .eq('company_id', selectedCompanyId)
                .or(`name.ilike.%${productQuery}%,category.ilike.%${productQuery}%`);

            const { data: products, error: productsError } = await productQueryBuilder;
            if (productsError) throw productsError;

            productIds = (products || []).map((product: any) => product.id);
            if (productIds.length === 0) return [];
        }

        let palletsQuery = supabase
            .from('pallets')
            .select('id')
            .eq('company_id', selectedCompanyId);

        if (batchIds.length > 0) {
            palletsQuery = palletsQuery.in('batch_id', batchIds);
        }
        if (productIds.length > 0) {
            palletsQuery = palletsQuery.in('product_id', productIds);
        }

        const { data: pallets, error: palletsError } = await palletsQuery;
        if (palletsError) throw palletsError;

        const palletIds = (pallets || []).map((pallet: any) => pallet.id);
        if (palletIds.length === 0) return [];

        const { data: loadedRows, error: loadedError } = await supabase
            .from('loaded_pallets')
            .select('loading_operation_id')
            .in('pallet_id', palletIds);

        if (loadedError) throw loadedError;

        const operationIds = Array.from(
            new Set((loadedRows || []).map((row: any) => row.loading_operation_id).filter(Boolean))
        );

        return operationIds;
    };

    const fetchWarehouseStats = async () => {
        if (!selectedCompanyId) return;
        const { data, error } = await supabase
            .from('pallets')
            .select(`
                id,
                status,
                actual_cartons,
                loaded_pallets(cartons_loaded, is_confirmed)
            `)
            .eq('company_id', selectedCompanyId)
            .in('status', ['complete', 'partial', 'hold', 'partial_hold', 'partial_load']);

        if (error) throw error;

        const pallets = data?.length || 0;
        const cartons = (data || []).reduce((sum: number, pallet: any) => {
            const confirmedLoaded = (pallet.loaded_pallets || []).reduce(
                (acc: number, row: { cartons_loaded?: number; is_confirmed?: boolean }) =>
                    acc + (row.is_confirmed ? row.cartons_loaded || 0 : 0),
                0
            );
            const remaining = Math.max(0, (pallet.actual_cartons || 0) - confirmedLoaded);
            return sum + remaining;
        }, 0);

        setWarehouseStats({ pallets, cartons });
    };

    const fetchProductionData = async (start: string, end: string) => {
        // Fetch pallets created in range
        const { data: pallets, error } = await supabase
            .from('pallets')
            .select(`
                *,
                product:products(name)
            `)
            .eq('company_id', selectedCompanyId)
            .gte('created_at', start)
            .lte('created_at', end);

        if (error) throw error;

        // Process Data
        const stats = {
            totalPallets: pallets.length,
            totalCartons: pallets.reduce((sum, p) => sum + (p.actual_cartons || 0), 0),
            byProduct: {} as Record<string, number>,
            byShift: {} as Record<string, number>,
            dailyTrend: [] as any[],
            efficiency: 0 // Placeholder
        };

        // Aggregations
        pallets.forEach(p => {
            // By Product
            const prodName = p.product?.name || 'Unknown';
            stats.byProduct[prodName] = (stats.byProduct[prodName] || 0) + p.actual_cartons;

            // By Shift: placeholder until shift data is available in reports
        });

        // Daily Trend
        // ... (simplified logic)

        setProductionStats(stats);
    };

    const fetchLoadingData = async (start: string, end: string) => {
        if (!selectedCompanyId) return;

        let query = supabase
            .from('loading_operations')
            .select(`
                id,
                status,
                loading_strategy,
                actual_pallets,
                actual_cartons,
                created_by,
                loaded_by,
                created_at,
                started_at,
                completed_at,
                vehicle_id,
                vehicle:vehicles(vehicle_number, vehicle_type, driver_name),
                loaded_pallets:loaded_pallets(
                    is_partial_load,
                    pallet:pallets(hold_quantity)
                )
            `)
            .eq('company_id', selectedCompanyId)
            .gte('created_at', start)
            .lte('created_at', end)
            .order('created_at', { ascending: false });

        const normalizedStatus = normalizeLookupValue(loadingFilters.statusQuery, LOADING_STATUS_LABELS);
        const normalizedStrategy = normalizeLookupValue(loadingFilters.strategyQuery, LOADING_STRATEGY_LABELS);

        if (normalizedStatus) {
            query = query.eq('status', normalizedStatus);
        }
        if (normalizedStrategy) {
            query = query.eq('loading_strategy', normalizedStrategy);
        }

        const vehicleIds = resolveVehicleIds();
        if (vehicleIds && vehicleIds.length === 0) {
            setLoadingOperations([]);
            setLoadingStats({
                totalOperations: 0,
                totalLoadedPallets: 0,
                totalLoadedCartons: 0,
                completedRate: 0,
                avgPalletsPerOperation: 0,
                avgCartonsPerOperation: 0,
                byVehicleType: {},
                byStatus: {},
                avgDurationMinutes: 0,
                longOperationsCount: 0,
                cancelledCount: 0,
                partialLoadsCount: 0,
                holdsInLoadedCount: 0,
                dailyTrend: []
            });
            setLoadingExceptions({ long: [], cancelled: [], partial: [], holds: [] });
            setLoadingUserNames({});
            return;
        }
        if (vehicleIds) {
            query = query.in('vehicle_id', vehicleIds);
        }

        if (loadingFilters.loadingDateFrom) {
            query = query.gte('started_at', toStartOfDayIso(loadingFilters.loadingDateFrom));
        }
        if (loadingFilters.loadingDateTo) {
            query = query.lte('started_at', toEndOfDayIso(loadingFilters.loadingDateTo));
        }

        const operationIds = await resolveLoadingOperationIds();
        if (operationIds && operationIds.length === 0) {
            setLoadingOperations([]);
            setLoadingStats({
                totalOperations: 0,
                totalLoadedPallets: 0,
                totalLoadedCartons: 0,
                completedRate: 0,
                avgPalletsPerOperation: 0,
                avgCartonsPerOperation: 0,
                byVehicleType: {},
                byStatus: {},
                avgDurationMinutes: 0,
                longOperationsCount: 0,
                cancelledCount: 0,
                partialLoadsCount: 0,
                holdsInLoadedCount: 0,
                dailyTrend: []
            });
            setLoadingExceptions({ long: [], cancelled: [], partial: [], holds: [] });
            setLoadingUserNames({});
            return;
        }
        if (operationIds) {
            query = query.in('id', operationIds);
        }

        const { data: operations, error } = await query;

        if (error) throw error;

        const totalOperations = operations.length;
        const totalLoadedPallets = operations.reduce((sum, op) => sum + (op.actual_pallets || 0), 0);
        const totalLoadedCartons = operations.reduce((sum, op) => sum + (op.actual_cartons || 0), 0);
        const completedCount = operations.filter((op) => op.status === 'completed').length;
        const cancelledCount = operations.filter((op) => op.status === 'cancelled').length;
        const completedRate = totalOperations > 0 ? Math.round((completedCount / totalOperations) * 100) : 0;
        const avgPalletsPerOperation = totalOperations > 0 ? Math.round(totalLoadedPallets / totalOperations) : 0;
        const avgCartonsPerOperation = totalOperations > 0 ? Math.round(totalLoadedCartons / totalOperations) : 0;
        const partialLoadsCount = operations.filter((op: any) =>
            (op.loaded_pallets || []).some((lp: any) => lp.is_partial_load)
        ).length;
        const holdsInLoadedCount = operations.filter((op: any) =>
            (op.loaded_pallets || []).some((lp: any) => (lp.pallet?.hold_quantity || 0) > 0)
        ).length;

        const byVehicleType: Record<string, number> = {};
        const byStatus: Record<string, number> = {};
        const trendMap: Record<string, { operations: number; pallets: number; cartons: number }> = {};
        const longOps: any[] = [];
        const cancelledOps: any[] = [];
        const partialOps: any[] = [];
        const holdsOps: any[] = [];
        const durations: { id: string; minutes: number; vehicle?: string }[] = [];
        operations.forEach((op: any) => {
            const type = op.vehicle?.vehicle_type || 'غير محدد';
            byVehicleType[type] = (byVehicleType[type] || 0) + 1;
            const statusKey = op.status || 'unknown';
            byStatus[statusKey] = (byStatus[statusKey] || 0) + 1;

            const dateKey = new Date(op.created_at).toISOString().split('T')[0];
            if (!trendMap[dateKey]) {
                trendMap[dateKey] = { operations: 0, pallets: 0, cartons: 0 };
            }
            trendMap[dateKey].operations += 1;
            trendMap[dateKey].pallets += op.actual_pallets || 0;
            trendMap[dateKey].cartons += op.actual_cartons || 0;

            const summary = {
                id: op.id,
                vehicle: op.vehicle?.vehicle_number || '-',
                status: op.status,
                started_at: op.started_at,
                completed_at: op.completed_at,
                actual_pallets: op.actual_pallets || 0,
                actual_cartons: op.actual_cartons || 0,
            };

            if (op.status === 'cancelled') {
                cancelledOps.push(summary);
            }

            const hasPartial = (op.loaded_pallets || []).some((lp: any) => lp.is_partial_load);
            if (hasPartial) {
                partialOps.push(summary);
            }

            const hasHolds = (op.loaded_pallets || []).some((lp: any) => (lp.pallet?.hold_quantity || 0) > 0);
            if (hasHolds) {
                holdsOps.push(summary);
            }

            if (op.started_at && op.completed_at) {
                const minutes =
                    (new Date(op.completed_at).getTime() - new Date(op.started_at).getTime()) / 60000;
                durations.push({
                    id: op.id,
                    minutes,
                    vehicle: op.vehicle?.vehicle_number,
                });
                if (minutes >= 120) {
                    longOps.push({ ...summary, minutes });
                }
            }
        });

        const dailyTrend = Object.keys(trendMap)
            .sort()
            .map((date) => ({
                date,
                ...trendMap[date],
            }));

        const avgDurationMinutes =
            durations.length > 0 ? Math.round(durations.reduce((sum, d) => sum + d.minutes, 0) / durations.length) : 0;
        const longOperationsCount = durations.filter((d) => d.minutes >= 120).length;

        setLoadingOperations(operations || []);
        setLoadingStats({
            totalOperations,
            totalLoadedPallets,
            totalLoadedCartons,
            completedRate,
            avgPalletsPerOperation,
            avgCartonsPerOperation,
            byVehicleType,
            byStatus,
            avgDurationMinutes,
            longOperationsCount,
            cancelledCount,
            partialLoadsCount,
            holdsInLoadedCount,
            dailyTrend,
        });

        setLoadingExceptions({
            long: longOps,
            cancelled: cancelledOps,
            partial: partialOps,
            holds: holdsOps,
        });

        try {
            await fetchWarehouseStats();
        } catch (err) {
            console.error('Failed to load warehouse stats:', err);
        }

        const userIds = Array.from(
            new Set(
                operations
                    .flatMap((op: any) => [op.created_by, op.loaded_by])
                    .filter(Boolean)
            )
        ) as string[];

        if (userIds.length > 0) {
            const { data: usersData, error: usersError } = await supabase
                .from('users')
                .select('id, name, display_name, email')
                .in('id', userIds);

            if (!usersError && usersData) {
                const map: Record<string, string> = {};
                usersData.forEach((user: any) => {
                    map[user.id] = user.display_name || user.name || user.email || user.id;
                });
                setLoadingUserNames(map);
            }
        }

        // Comparison with previous period
        try {
            const endDate = new Date(end);
            const startDate = new Date(start);
            const rangeMs = endDate.getTime() - startDate.getTime();
            const prevEnd = new Date(startDate.getTime() - 1);
            const prevStart = new Date(prevEnd.getTime() - rangeMs);

            let prevQuery = supabase
                .from('loading_operations')
                .select('status, actual_pallets, actual_cartons')
                .eq('company_id', selectedCompanyId)
                .gte('created_at', prevStart.toISOString())
                .lte('created_at', prevEnd.toISOString());

            if (normalizedStatus) {
                prevQuery = prevQuery.eq('status', normalizedStatus);
            }
            if (normalizedStrategy) {
                prevQuery = prevQuery.eq('loading_strategy', normalizedStrategy);
            }
            if (vehicleIds && vehicleIds.length > 0) {
                prevQuery = prevQuery.in('vehicle_id', vehicleIds);
            }
            if (operationIds && operationIds.length > 0) {
                prevQuery = prevQuery.in('id', operationIds);
            }

            const { data: prevOps, error: prevError } = await prevQuery;
            if (!prevError && prevOps) {
                const prevTotal = prevOps.length;
                const prevPallets = prevOps.reduce((sum, op: any) => sum + (op.actual_pallets || 0), 0);
                const prevCartons = prevOps.reduce((sum, op: any) => sum + (op.actual_cartons || 0), 0);
                const prevCompleted = prevOps.filter((op: any) => op.status === 'completed').length;
                const prevCompletedRate = prevTotal > 0 ? Math.round((prevCompleted / prevTotal) * 100) : 0;

                setLoadingComparison({
                    totalOperations: prevTotal,
                    totalLoadedPallets: prevPallets,
                    totalLoadedCartons: prevCartons,
                    completedRate: prevCompletedRate,
                });
            }
        } catch (err) {
            console.error('Failed to load comparison period:', err);
        }
    };

    const fetchLoadingPage = async () => {
        if (!selectedCompanyId) return;

        setLoadingPageLoading(true);
        setLoadingBatchInfo({});
        try {
            const endDate = new Date();
            let startDate = new Date();

            switch (dateRange) {
                case 'today': startDate.setDate(endDate.getDate() - 0); break;
                case 'week': startDate.setDate(endDate.getDate() - 7); break;
                case 'month': startDate.setMonth(endDate.getMonth() - 1); break;
                case 'year': startDate.setFullYear(endDate.getFullYear() - 1); break;
            }
            startDate.setHours(0, 0, 0, 0);

            const from = (loadingPage - 1) * loadingPageSize;
            const to = from + loadingPageSize - 1;

            let query = supabase
                .from('loading_operations')
                .select(`
                    id,
                    status,
                    loading_strategy,
                    actual_pallets,
                    actual_cartons,
                    created_by,
                    loaded_by,
                    created_at,
                    started_at,
                    completed_at,
                    vehicle_id,
                    vehicle:vehicles(vehicle_number, vehicle_type, driver_name)
                `, { count: 'exact' })
                .eq('company_id', selectedCompanyId)
                .gte('created_at', startDate.toISOString())
                .lte('created_at', endDate.toISOString())
                .order('created_at', { ascending: false })
                .range(from, to);

            const normalizedStatus = normalizeLookupValue(loadingFilters.statusQuery, LOADING_STATUS_LABELS);
            const normalizedStrategy = normalizeLookupValue(loadingFilters.strategyQuery, LOADING_STRATEGY_LABELS);

            if (normalizedStatus) {
                query = query.eq('status', normalizedStatus);
            }
            if (normalizedStrategy) {
                query = query.eq('loading_strategy', normalizedStrategy);
            }

            const vehicleIds = resolveVehicleIds();
            if (vehicleIds && vehicleIds.length === 0) {
                setLoadingOperationsPage([]);
                setLoadingBatchInfo({});
                setLoadingTotalCount(0);
                return;
            }
            if (vehicleIds) {
                query = query.in('vehicle_id', vehicleIds);
            }

            if (loadingFilters.loadingDateFrom) {
                query = query.gte('started_at', toStartOfDayIso(loadingFilters.loadingDateFrom));
            }
            if (loadingFilters.loadingDateTo) {
                query = query.lte('started_at', toEndOfDayIso(loadingFilters.loadingDateTo));
            }

            const operationIds = await resolveLoadingOperationIds();
            if (operationIds && operationIds.length === 0) {
                setLoadingOperationsPage([]);
                setLoadingBatchInfo({});
                setLoadingTotalCount(0);
                return;
            }
            if (operationIds) {
                query = query.in('id', operationIds);
            }

            const { data, error, count } = await query;
            if (error) throw error;

            setLoadingOperationsPage(data || []);
            await fetchLoadingBatchInfo(data || []);
            const totalCount = count || 0;
            setLoadingTotalCount(totalCount);

            const totalPages = Math.max(1, Math.ceil(totalCount / loadingPageSize));
            if (loadingPage > totalPages) {
                setLoadingPage(totalPages);
            }
        } catch (err) {
            console.error('Error fetching loading operations page:', err);
            setLoadingOperationsPage([]);
            setLoadingBatchInfo({});
            setLoadingTotalCount(0);
        } finally {
            setLoadingPageLoading(false);
        }
    };

    const fetchLoadingBatchInfo = async (operations: any[]) => {
        const operationIds = operations.map((op) => op.id).filter(Boolean);
        if (operationIds.length === 0) {
            setLoadingBatchInfo({});
            return;
        }

        try {
            const { data, error } = await supabase
                .from('loaded_pallets')
                .select(`
                    loading_operation_id,
                    pallet:pallets(
                        batch:pallet_batches(batch_number, production_date, completed_at)
                    )
                `)
                .in('loading_operation_id', operationIds)
                .order('load_sequence', { ascending: true });

            if (error) throw error;

            const batchSets: Record<string, Set<string>> = {};
            const infoMap: Record<string, {
                batchNumber?: string;
                productionDate?: string;
                completedAt?: string;
                batchCount: number;
                multiple: boolean;
            }> = {};

            (data || []).forEach((row: any) => {
                const opId = row.loading_operation_id;
                const batch = row.pallet?.batch;
                if (!opId || !batch?.batch_number) return;

                if (!batchSets[opId]) {
                    batchSets[opId] = new Set();
                    infoMap[opId] = {
                        batchNumber: batch.batch_number,
                        productionDate: batch.production_date,
                        completedAt: batch.completed_at,
                        batchCount: 0,
                        multiple: false,
                    };
                }

                const set = batchSets[opId];
                if (!set.has(batch.batch_number)) {
                    set.add(batch.batch_number);
                    infoMap[opId].batchCount = set.size;
                    infoMap[opId].multiple = set.size > 1;
                }
            });

            setLoadingBatchInfo(infoMap);
        } catch (err) {
            console.error('Error fetching loading batch info:', err);
            setLoadingBatchInfo({});
        }
    };

    const openLoadingDetails = async (operationId: string) => {
        setLoadingDetailsOpen(true);
        setLoadingDetailsLoading(true);
        setLoadingDetailsError(null);
        setLoadingDetails(null);

        try {
            const { data, error } = await supabase
                .from('loading_operations')
                .select(`
                    id,
                    status,
                    loading_strategy,
                    actual_pallets,
                    actual_cartons,
                    created_by,
                    loaded_by,
                    created_at,
                    started_at,
                    completed_at,
                    vehicle:vehicles(vehicle_number, vehicle_type, driver_name),
                    loaded_pallets:loaded_pallets(
                        id,
                        cartons_loaded,
                        is_partial_load,
                        loaded_at,
                        pallet:pallets(
                            id,
                            pallet_number,
                            location,
                            actual_cartons,
                            target_cartons,
                            hold_quantity,
                            batch:pallet_batches(batch_number),
                            product:products(name)
                        )
                    )
                `)
                .eq('id', operationId)
                .single();

            if (error) throw error;

            setLoadingDetails(data);
        } catch (err) {
            console.error('Error loading loading operation details:', err);
            setLoadingDetailsError('تعذر تحميل تفاصيل عملية التحميل');
        } finally {
            setLoadingDetailsLoading(false);
        }
    };

    const closeLoadingDetails = () => {
        setLoadingDetailsOpen(false);
        setLoadingDetails(null);
        setLoadingDetailsError(null);
    };

    // Chart Data Helpers
    const getProductChartData = () => ({
        labels: Object.keys(productionStats.byProduct),
        datasets: [{
            label: 'الكراتين المنتجة',
            data: Object.values(productionStats.byProduct),
            backgroundColor: [
                'rgba(59, 130, 246, 0.6)',
                'rgba(16, 185, 129, 0.6)',
                'rgba(245, 158, 11, 0.6)',
                'rgba(239, 68, 68, 0.6)',
                'rgba(139, 92, 246, 0.6)',
            ],
            borderColor: [
                'rgb(59, 130, 246)',
                'rgb(16, 185, 129)',
                'rgb(245, 158, 11)',
                'rgb(239, 68, 68)',
                'rgb(139, 92, 246)',
            ],
            borderWidth: 1,
        }],
    });

    const getShiftChartData = () => ({
        labels: Object.keys(productionStats.byShift),
        datasets: [{
            label: 'إنتاج الورديات (كرتونة)',
            data: Object.values(productionStats.byShift),
            backgroundColor: 'rgba(59, 130, 246, 0.5)',
            borderColor: 'rgb(59, 130, 246)',
            borderWidth: 1,
        }]
    });

    const getLoadingTrendData = () => ({
        labels: loadingStats.dailyTrend.map((item: any) => item.date),
        datasets: [
            {
                label: 'عمليات التحميل',
                data: loadingStats.dailyTrend.map((item: any) => item.operations),
                borderColor: 'rgb(59, 130, 246)',
                backgroundColor: 'rgba(59, 130, 246, 0.2)',
                tension: 0.3,
            },
            {
                label: 'الكراتين المحملة',
                data: loadingStats.dailyTrend.map((item: any) => item.cartons),
                borderColor: 'rgb(16, 185, 129)',
                backgroundColor: 'rgba(16, 185, 129, 0.2)',
                tension: 0.3,
            },
        ],
    });

    const getLoadingStatusData = () => ({
        labels: Object.keys(loadingStats.byStatus).map(
            (status) => LOADING_STATUS_LABELS[status] || status
        ),
        datasets: [
            {
                label: 'توزيع الحالات',
                data: Object.values(loadingStats.byStatus),
                backgroundColor: [
                    'rgba(59, 130, 246, 0.6)',
                    'rgba(16, 185, 129, 0.6)',
                    'rgba(245, 158, 11, 0.6)',
                    'rgba(239, 68, 68, 0.6)',
                ],
            },
        ],
    });

    const getVehicleTypeData = () => ({
        labels: Object.keys(loadingStats.byVehicleType),
        datasets: [
            {
                label: 'حسب نوع السيارة',
                data: Object.values(loadingStats.byVehicleType),
                backgroundColor: [
                    'rgba(59, 130, 246, 0.6)',
                    'rgba(16, 185, 129, 0.6)',
                    'rgba(245, 158, 11, 0.6)',
                    'rgba(139, 92, 246, 0.6)',
                ],
            },
        ],
    });

    const formatDuration = (minutes: number) => {
        if (!minutes || Number.isNaN(minutes)) return '-';
        const hrs = Math.floor(minutes / 60);
        const mins = Math.round(minutes % 60);
        if (hrs === 0) return `${mins} دقيقة`;
        return `${hrs} ساعة ${mins} دقيقة`;
    };

    const getDeltaLabel = (current: number, previous: number) => {
        if (!previous && !current) return '0%';
        if (!previous && current) return '+100%';
        const diff = current - previous;
        const percent = Math.round((diff / previous) * 100);
        return `${diff >= 0 ? '+' : ''}${percent}%`;
    };

    return (
        <>
            <div className="max-w-7xl mx-auto p-6 space-y-6">

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <BarChart3 className="text-blue-600" />
                        تقارير الإنتاج والتحميل
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">عرض وتحليل مؤشرات الأداء الرئيسية</p>
                </div>

                <div className="flex gap-2">
                    {/* Type Selector */}
                    <div className="flex bg-gray-100 p-1 rounded-lg">
                        <button
                            onClick={() => setReportType('production')}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${reportType === 'production' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                                }`}
                        >
                            <Package size={16} className="inline ml-2" />
                            الإنتاج
                        </button>
                        <button
                            onClick={() => setReportType('loading')}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${reportType === 'loading' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                                }`}
                        >
                            <Truck size={16} className="inline ml-2" />
                            التحميل
                        </button>
                    </div>

                    {/* Date Selector */}
                    <select
                        value={dateRange}
                        onChange={(e) => setDateRange(e.target.value as DateRange)}
                        className="bg-white border border-gray-300 text-gray-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5"
                    >
                        <option value="today">اليوم</option>
                        <option value="week">آخر 7 أيام</option>
                        <option value="month">هذا الشهر</option>
                        <option value="year">هذا العام</option>
                    </select>

                </div>
            </div>

            {/* Dashboard Content */}
            {loading ? (
                <div className="flex justify-center py-20">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
            ) : reportType === 'production' ? (
                // Production Dashboard
                <div className="space-y-6">
                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-sm font-medium text-gray-500">إجمالي البالتات</p>
                                    <h3 className="text-2xl font-bold text-gray-900 mt-1">{productionStats.totalPallets}</h3>
                                </div>
                                <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                                    <Package size={20} />
                                </div>
                            </div>
                        </div>
                        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-sm font-medium text-gray-500">إجمالي الكراتين</p>
                                    <h3 className="text-2xl font-bold text-gray-900 mt-1">{productionStats.totalCartons.toLocaleString()}</h3>
                                </div>
                                <div className="p-2 bg-green-50 rounded-lg text-green-600">
                                    <Package size={20} />
                                </div>
                            </div>
                        </div>
                        {/* More stats... */}
                    </div>

                    {/* Charts */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">الإنتاج حسب المنتج</h3>
                            <div className="h-64 flex items-center justify-center">
                                {/* Using Pie Chart for Product Distribution */}
                                {Object.keys(productionStats.byProduct).length > 0 ? (
                                    <Pie data={getProductChartData()} options={{ maintainAspectRatio: false }} />
                                ) : <p className="text-gray-400">لا توجد بيانات</p>}
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">الإنتاج حسب الوردية</h3>
                            <div className="h-64">
                                <Bar data={getShiftChartData()} options={{ maintainAspectRatio: false }} />
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                // Loading Dashboard
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-sm font-medium text-gray-500">عمليات التحميل</p>
                                    <h3 className="text-2xl font-bold text-gray-900 mt-1">{loadingStats.totalOperations}</h3>
                                    <div className="mt-1 flex items-center gap-1 text-xs">
                                        {loadingStats.totalOperations >= loadingComparison.totalOperations ? (
                                            <ArrowUpRight size={12} className="text-green-600" />
                                        ) : (
                                            <ArrowDownRight size={12} className="text-rose-600" />
                                        )}
                                        <span className="text-gray-500">
                                            {getDeltaLabel(loadingStats.totalOperations, loadingComparison.totalOperations)} مقارنة بالفترة السابقة
                                        </span>
                                    </div>
                                </div>
                                <div className="p-2 bg-purple-50 rounded-lg text-purple-600">
                                    <Truck size={20} />
                                </div>
                            </div>
                        </div>
                        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-sm font-medium text-gray-500">البالتات المحملة</p>
                                    <h3 className="text-2xl font-bold text-gray-900 mt-1">{loadingStats.totalLoadedPallets}</h3>
                                    <div className="mt-1 flex items-center gap-1 text-xs">
                                        {loadingStats.totalLoadedPallets >= loadingComparison.totalLoadedPallets ? (
                                            <ArrowUpRight size={12} className="text-green-600" />
                                        ) : (
                                            <ArrowDownRight size={12} className="text-rose-600" />
                                        )}
                                        <span className="text-gray-500">
                                            {getDeltaLabel(loadingStats.totalLoadedPallets, loadingComparison.totalLoadedPallets)} مقارنة بالفترة السابقة
                                        </span>
                                    </div>
                                </div>
                                <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                                    <Package size={20} />
                                </div>
                            </div>
                        </div>
                        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-sm font-medium text-gray-500">الكراتين المحملة</p>
                                    <h3 className="text-2xl font-bold text-gray-900 mt-1">{loadingStats.totalLoadedCartons.toLocaleString()}</h3>
                                    <div className="mt-1 flex items-center gap-1 text-xs">
                                        {loadingStats.totalLoadedCartons >= loadingComparison.totalLoadedCartons ? (
                                            <ArrowUpRight size={12} className="text-green-600" />
                                        ) : (
                                            <ArrowDownRight size={12} className="text-rose-600" />
                                        )}
                                        <span className="text-gray-500">
                                            {getDeltaLabel(loadingStats.totalLoadedCartons, loadingComparison.totalLoadedCartons)} مقارنة بالفترة السابقة
                                        </span>
                                    </div>
                                </div>
                                <div className="p-2 bg-green-50 rounded-lg text-green-600">
                                    <Package size={20} />
                                </div>
                            </div>
                        </div>
                        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-sm font-medium text-gray-500">بالتات بالمخزن</p>
                                    <h3 className="text-2xl font-bold text-gray-900 mt-1">{warehouseStats.pallets}</h3>
                                    <p className="mt-2 text-xs text-gray-500">كراتين بالمخزن</p>
                                    <p className="text-lg font-semibold text-gray-900">
                                        {warehouseStats.cartons.toLocaleString()}
                                    </p>
                                </div>
                                <div className="p-2 bg-amber-50 rounded-lg text-amber-600">
                                    <Package size={20} />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 space-y-4">
                        <div className="flex items-center gap-2 text-gray-700">
                            <Filter size={16} />
                            <span className="text-sm font-medium">فلاتر التحميل</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div>
                                <label className="block text-sm text-gray-600 mb-1">الاستراتيجية</label>
                                <input
                                    list="loading-strategy-options"
                                    value={loadingFilters.strategyQuery}
                                    onChange={(e) => setLoadingFilters((prev) => ({ ...prev, strategyQuery: e.target.value }))}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
                                    placeholder="ابحث بالاستراتيجية"
                                />
                                <datalist id="loading-strategy-options">
                                    {Object.keys(LOADING_STRATEGY_LABELS).map((strategy) => (
                                        <option key={strategy} value={LOADING_STRATEGY_LABELS[strategy]} />
                                    ))}
                                </datalist>
                            </div>
                            <div>
                                <label className="block text-sm text-gray-600 mb-1">السيارة</label>
                                <input
                                    list="loading-vehicle-options"
                                    value={loadingFilters.vehicleQuery}
                                    onChange={(e) => setLoadingFilters((prev) => ({ ...prev, vehicleQuery: e.target.value }))}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
                                    placeholder="ابحث برقم السيارة أو النوع"
                                />
                                <datalist id="loading-vehicle-options">
                                    {loadingVehicles.map((vehicle) => (
                                        <option key={vehicle.id} value={vehicle.vehicle_number} />
                                    ))}
                                </datalist>
                            </div>
                            <div>
                                <label className="block text-sm text-gray-600 mb-1">تاريخ التحميل (من)</label>
                                <input
                                    type="date"
                                    value={loadingFilters.loadingDateFrom}
                                    onChange={(e) => setLoadingFilters((prev) => ({ ...prev, loadingDateFrom: e.target.value }))}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-gray-600 mb-1">تاريخ التحميل (إلى)</label>
                                <input
                                    type="date"
                                    value={loadingFilters.loadingDateTo}
                                    onChange={(e) => setLoadingFilters((prev) => ({ ...prev, loadingDateTo: e.target.value }))}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-gray-600 mb-1">رقم الباتش</label>
                                <input
                                    type="text"
                                    value={loadingFilters.batchQuery}
                                    onChange={(e) => setLoadingFilters((prev) => ({ ...prev, batchQuery: e.target.value }))}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
                                    placeholder="اكتب رقم الباتش"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-gray-600 mb-1">تاريخ الإنتاج (من)</label>
                                <input
                                    type="date"
                                    value={loadingFilters.productionDateFrom}
                                    onChange={(e) => setLoadingFilters((prev) => ({ ...prev, productionDateFrom: e.target.value }))}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-gray-600 mb-1">تاريخ الإنتاج (إلى)</label>
                                <input
                                    type="date"
                                    value={loadingFilters.productionDateTo}
                                    onChange={(e) => setLoadingFilters((prev) => ({ ...prev, productionDateTo: e.target.value }))}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-gray-600 mb-1">نوع المنتج</label>
                                <div className="flex gap-2">
                                    <select
                                        value={selectedProductValue}
                                        onChange={(e) => setLoadingFilters((prev) => ({ ...prev, productQuery: e.target.value }))}
                                        className="w-40 px-2 py-2 border border-gray-200 rounded-lg text-sm bg-white"
                                    >
                                        <option value="">اختيار سريع</option>
                                        {loadingProductOptions.categories.length > 0 && (
                                            <optgroup label="تصنيفات">
                                                {loadingProductOptions.categories.map((category) => (
                                                    <option key={`category-${category}`} value={category}>
                                                        {category}
                                                    </option>
                                                ))}
                                            </optgroup>
                                        )}
                                        {loadingProductOptions.names.length > 0 && (
                                            <optgroup label="منتجات">
                                                {loadingProductOptions.names.map((name) => (
                                                    <option key={`name-${name}`} value={name}>
                                                        {name}
                                                    </option>
                                                ))}
                                            </optgroup>
                                        )}
                                    </select>
                                    <div className="flex-1">
                                        <input
                                            type="text"
                                            value={loadingFilters.productQuery}
                                            onChange={(e) => setLoadingFilters((prev) => ({ ...prev, productQuery: e.target.value }))}
                                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
                                            placeholder="اسم أو تصنيف المنتج"
                                            list="loading-product-options"
                                        />
                                        <datalist id="loading-product-options">
                                            {loadingProductOptions.categories.map((category) => (
                                                <option key={`category-${category}`} value={category} label={`نوع: ${category}`} />
                                            ))}
                                            {loadingProductOptions.names.map((name) => (
                                                <option key={`name-${name}`} value={name} label={`منتج: ${name}`} />
                                            ))}
                                        </datalist>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-end">
                                <button
                                    type="button"
                                    onClick={() =>
                                        setLoadingFilters({
                                            statusQuery: '',
                                            strategyQuery: '',
                                            vehicleQuery: '',
                                            loadingDateFrom: '',
                                            loadingDateTo: '',
                                            batchQuery: '',
                                            productionDateFrom: '',
                                            productionDateTo: '',
                                            productQuery: '',
                                        })
                                    }
                                    className="px-4 py-2 text-sm border border-gray-200 rounded-lg bg-white text-gray-600 hover:bg-gray-50 w-full"
                                >
                                    إعادة ضبط
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-gray-900">عمليات التحميل</h3>
                            <div className="text-sm text-gray-500">
                                المتوسط: {loadingStats.avgPalletsPerOperation} بالتة • {loadingStats.avgCartonsPerOperation} كرتونة
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-right">
                                <thead className="bg-gray-50 text-gray-700">
                                    <tr>
                                        <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider">رقم العملية</th>
                                        <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider">الباتش</th>
                                        <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider">تاريخ الإنتاج</th>
                                        <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider">تاريخ الانتهاء</th>
                                        <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider">السيارة</th>
                                        <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider">الحالة</th>
                                        <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider">الاستراتيجية</th>
                                        <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider">وقت بدء التحميل</th>
                                        <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider">البالتات</th>
                                        <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider">الكراتين</th>
                                        <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider">تفاصيل</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {loadingPageLoading && (
                                        <tr>
                                            <td colSpan={11} className="px-6 py-10 text-center text-gray-500">
                                                جاري تحميل البيانات...
                                            </td>
                                        </tr>
                                    )}
                                    {!loadingPageLoading && loadingOperationsPage.map((operation: any) => (
                                        <tr key={operation.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap text-gray-900 font-medium">
                                                {operation.id?.slice(0, 8)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-gray-700">
                                                {loadingBatchInfo[operation.id]?.multiple
                                                    ? `متعدد (${loadingBatchInfo[operation.id]?.batchCount || 0})`
                                                    : (loadingBatchInfo[operation.id]?.batchNumber || '-')}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                                                {loadingBatchInfo[operation.id]?.multiple
                                                    ? 'متعدد'
                                                    : formatDate(loadingBatchInfo[operation.id]?.productionDate)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                                                {loadingBatchInfo[operation.id]?.multiple
                                                    ? 'متعدد'
                                                    : formatDate(loadingBatchInfo[operation.id]?.completedAt)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-gray-700">
                                                {operation.vehicle?.vehicle_number || '-'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="px-2 py-1 text-xs rounded-full bg-slate-100 text-slate-700">
                                                    {LOADING_STATUS_LABELS[operation.status] || operation.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-gray-700">
                                                {LOADING_STRATEGY_LABELS[operation.loading_strategy] || operation.loading_strategy}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                                                {formatDateTime(operation.started_at || operation.created_at)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-gray-700">
                                                {operation.actual_pallets || 0}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-gray-700">
                                                {operation.actual_cartons || 0}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <button
                                                    type="button"
                                                    onClick={() => openLoadingDetails(operation.id)}
                                                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                                                >
                                                    عرض
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {!loadingPageLoading && loadingOperationsPage.length === 0 && (
                                        <tr>
                                            <td colSpan={11} className="px-6 py-10 text-center text-gray-500">
                                                لا توجد عمليات تحميل ضمن النطاق المحدد
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        <div className="flex flex-col md:flex-row items-center justify-between gap-3 px-6 py-4 border-t border-gray-100 text-sm">
                            <div className="text-gray-500">
                                {loadingTotalCount > 0 ? (
                                    <>عرض {Math.min((loadingPage - 1) * loadingPageSize + 1, loadingTotalCount)} - {Math.min(loadingPage * loadingPageSize, loadingTotalCount)} من {loadingTotalCount}</>
                                ) : (
                                    <>لا توجد نتائج</>
                                )}
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                                <select
                                    value={loadingPageSize}
                                    onChange={(e) => {
                                        setLoadingPageSize(Number(e.target.value));
                                        setLoadingPage(1);
                                    }}
                                    className="px-2 py-1 border border-gray-200 rounded-lg text-sm bg-white"
                                >
                                    <option value={20}>20 / صفحة</option>
                                    <option value={50}>50 / صفحة</option>
                                    <option value={100}>100 / صفحة</option>
                                </select>
                                <button
                                    type="button"
                                    onClick={() => setLoadingPage((prev) => Math.max(1, prev - 1))}
                                    disabled={loadingPage === 1 || loadingPageLoading}
                                    className="px-3 py-1 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                                >
                                    السابق
                                </button>
                                <span className="text-gray-600">
                                    الصفحة {loadingPage} من {Math.max(1, Math.ceil(loadingTotalCount / loadingPageSize))}
                                </span>
                                <button
                                    type="button"
                                    onClick={() =>
                                        setLoadingPage((prev) => Math.min(Math.max(1, Math.ceil(loadingTotalCount / loadingPageSize)), prev + 1))
                                    }
                                    disabled={loadingPageLoading || loadingPage >= Math.max(1, Math.ceil(loadingTotalCount / loadingPageSize))}
                                    className="px-3 py-1 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                                >
                                    التالي
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>

            <Modal
                isOpen={loadingDetailsOpen}
                onClose={closeLoadingDetails}
                title="تفاصيل عملية التحميل"
                size="full"
            >
                {loadingDetailsLoading ? (
                    <div className="py-10 text-center text-gray-500">جاري تحميل التفاصيل...</div>
                ) : loadingDetailsError ? (
                    <div className="py-10 text-center text-red-600">{loadingDetailsError}</div>
                ) : loadingDetails ? (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-slate-50 rounded-lg p-4">
                                <p className="text-xs text-slate-500 mb-1">السيارة</p>
                                <p className="text-sm font-semibold text-slate-800">
                                    {loadingDetails.vehicle?.vehicle_number || '-'}
                                </p>
                            </div>
                            <div className="bg-slate-50 rounded-lg p-4">
                                <p className="text-xs text-slate-500 mb-1">الحالة</p>
                                <p className="text-sm font-semibold text-slate-800">
                                    {LOADING_STATUS_LABELS[loadingDetails.status] || loadingDetails.status}
                                </p>
                            </div>
                            <div className="bg-slate-50 rounded-lg p-4">
                                <p className="text-xs text-slate-500 mb-1">الاستراتيجية</p>
                                <p className="text-sm font-semibold text-slate-800">
                                    {LOADING_STRATEGY_LABELS[loadingDetails.loading_strategy] || loadingDetails.loading_strategy}
                                </p>
                            </div>
                            <div className="bg-slate-50 rounded-lg p-4">
                                <p className="text-xs text-slate-500 mb-1">تم الإنشاء بواسطة</p>
                                <p className="text-sm font-semibold text-slate-800">
                                    {loadingUserNames[loadingDetails.created_by] || loadingDetails.created_by || '-'}
                                </p>
                            </div>
                            <div className="bg-slate-50 rounded-lg p-4">
                                <p className="text-xs text-slate-500 mb-1">تم التحميل بواسطة</p>
                                <p className="text-sm font-semibold text-slate-800">
                                    {loadingUserNames[loadingDetails.loaded_by] || loadingDetails.loaded_by || '-'}
                                </p>
                            </div>
                            <div className="bg-slate-50 rounded-lg p-4">
                                <p className="text-xs text-slate-500 mb-1">تاريخ البداية</p>
                                <p className="text-sm font-semibold text-slate-800">
                                    {formatDateTime(loadingDetails.started_at || loadingDetails.created_at)}
                                </p>
                            </div>
                            <div className="bg-slate-50 rounded-lg p-4">
                                <p className="text-xs text-slate-500 mb-1">تاريخ الانتهاء</p>
                                <p className="text-sm font-semibold text-slate-800">
                                    {formatDateTime(loadingDetails.completed_at)}
                                </p>
                            </div>
                            <div className="bg-slate-50 rounded-lg p-4">
                                <p className="text-xs text-slate-500 mb-1">مدة التحميل</p>
                                <p className="text-sm font-semibold text-slate-800">
                                    {loadingDetails.started_at && loadingDetails.completed_at
                                        ? formatDuration(
                                            (new Date(loadingDetails.completed_at).getTime() -
                                                new Date(loadingDetails.started_at).getTime()) /
                                                60000
                                        )
                                        : '-'}
                                </p>
                            </div>
                            <div className="bg-slate-50 rounded-lg p-4">
                                <p className="text-xs text-slate-500 mb-1">البالتات / الكراتين</p>
                                <p className="text-sm font-semibold text-slate-800">
                                    {loadingDetails.actual_pallets || 0} / {loadingDetails.actual_cartons || 0}
                                </p>
                            </div>
                        </div>

                        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                            <div className="px-4 py-3 border-b border-slate-200">
                                <h3 className="text-sm font-semibold text-slate-700">البالتات المحملة</h3>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-right">
                                    <thead className="bg-slate-50 text-slate-600">
                                        <tr>
                                            <th className="px-4 py-2 text-xs font-semibold">رقم البالتة</th>
                                            <th className="px-4 py-2 text-xs font-semibold">المنتج</th>
                                            <th className="px-4 py-2 text-xs font-semibold">التشغيلة</th>
                                            <th className="px-4 py-2 text-xs font-semibold">الكمية المحملة</th>
                                            <th className="px-4 py-2 text-xs font-semibold">تحميل جزئي</th>
                                            <th className="px-4 py-2 text-xs font-semibold">محجوزة</th>
                                            <th className="px-4 py-2 text-xs font-semibold">الموقع</th>
                                            <th className="px-4 py-2 text-xs font-semibold">وقت التحميل</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {(loadingDetails.loaded_pallets || []).map((lp: any) => (
                                            <tr key={lp.id}>
                                                <td className="px-4 py-2 text-sm text-slate-800">
                                                    {lp.pallet?.pallet_number || '-'}
                                                </td>
                                                <td className="px-4 py-2 text-sm text-slate-700">
                                                    {lp.pallet?.product?.name || '-'}
                                                </td>
                                                <td className="px-4 py-2 text-sm text-slate-700">
                                                    {lp.pallet?.batch?.batch_number || '-'}
                                                </td>
                                                <td className="px-4 py-2 text-sm text-slate-700">
                                                    {lp.cartons_loaded || 0}
                                                </td>
                                                <td className="px-4 py-2 text-sm text-slate-700">
                                                    {lp.is_partial_load ? 'نعم' : 'لا'}
                                                </td>
                                                <td className="px-4 py-2 text-sm text-slate-700">
                                                    {(lp.pallet?.hold_quantity || 0) > 0 ? 'نعم' : 'لا'}
                                                </td>
                                                <td className="px-4 py-2 text-sm text-slate-700">
                                                    {lp.pallet?.location || '-'}
                                                </td>
                                                <td className="px-4 py-2 text-sm text-slate-500">
                                                    {formatDateTime(lp.loaded_at)}
                                                </td>
                                            </tr>
                                        ))}
                                        {(!loadingDetails.loaded_pallets || loadingDetails.loaded_pallets.length === 0) && (
                                            <tr>
                                                <td colSpan={8} className="px-4 py-6 text-center text-slate-500">
                                                    لا توجد بالتات محملة لهذه العملية
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="py-10 text-center text-gray-500">لا توجد بيانات</div>
                )}
            </Modal>
        </>
    );
}
