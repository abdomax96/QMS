/**
 * Pallet List Page
 * Displays all pallets with filters, search, and details
 */

import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  AlertTriangle,
  Eye,
  Pencil,
  RefreshCcw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  XCircle,
} from 'lucide-react';
import { useCompanyStore } from '../../store/companyStore';
import { usePalletStore } from '../../store/palletStore';
import { palletService } from '../../services/palletService';
import { holdService } from '../../services/holdService';
import * as productService from '../../services/productService';
import { supabase } from '../../config/supabase';
import type { Product } from '../../types/product';
import {
  DispositionType,
  HoldStatus,
  PalletStatus,
  PALLET_STATUS_LABELS,
  type PalletStatus as PalletStatusType,
  type PalletWithDetails,
} from '../../types/pallet';
import PalletStatusBadge from '../../components/pallet/PalletStatusBadge';
import { TableSkeleton } from '../../components/common/LoadingStates';
import Modal from '../../components/common/Modal';
import { PermissionButton } from '../../components/common/PermissionGate';
import { formatDate } from '../../utils';

interface BatchOption {
  id: string;
  batch_number: string;
  production_date?: string;
  status?: string;
}

const PAGE_SIZES = [20, 50, 100];

export default function PalletList() {
  const navigate = useNavigate();
  const { selectedCompanyId, companies, selectCompany } = useCompanyStore();
  const { pallets, loading, error, currentPage, totalPages, totalCount, loadPallets } = usePalletStore();

  const [search, setSearch] = useState('');
  const [selectedStatuses, setSelectedStatuses] = useState<PalletStatusType[]>([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [pageSize, setPageSize] = useState(20);
  const [products, setProducts] = useState<Product[]>([]);
  const [batches, setBatches] = useState<BatchOption[]>([]);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const [detailsPallet, setDetailsPallet] = useState<PalletWithDetails | null>(null);
  const [labRunsLoading, setLabRunsLoading] = useState(false);
  const [labRunsError, setLabRunsError] = useState<string | null>(null);
  const [labRuns, setLabRuns] = useState<Array<{
    id: string;
    run_number: string;
    status: string;
    evaluation_result: string | null;
    created_at: string;
  }>>([]);
  const [actionPallet, setActionPallet] = useState<PalletWithDetails | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<{
    status: PalletStatusType;
    location: string;
    notes: string;
  }>({
    status: PalletStatus.PARTIAL,
    location: '',
    notes: '',
  });
  const [holdOpen, setHoldOpen] = useState(false);
  const [holdForm, setHoldForm] = useState({ quantity: '', reason: '', ncrId: '' });
  const [resolveOpen, setResolveOpen] = useState(false);
  const [resolveMode, setResolveMode] = useState<'release' | 'dispose'>('release');
  const [resolveForm, setResolveForm] = useState<{
    holdId: string;
    action: DispositionType;
    quantity: string;
    notes: string;
  }>({
    holdId: '',
    action: DispositionType.ACCEPT,
    quantity: '',
    notes: '',
  });

  const statusOptions = useMemo(() => Object.values(PalletStatus), []);
  const activeHolds = useMemo(
    () => (actionPallet?.holds || []).filter((hold) => hold.status === HoldStatus.ACTIVE),
    [actionPallet]
  );
  const selectedHold = useMemo(
    () => activeHolds.find((hold) => hold.id === resolveForm.holdId),
    [activeHolds, resolveForm.holdId]
  );

  useEffect(() => {
    loadProducts();
  }, [selectedCompanyId]);

  useEffect(() => {
    loadBatches();
  }, [selectedCompanyId, selectedProductId]);

  useEffect(() => {
    handleApplyFilters(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCompanyId]);

  const loadProducts = async () => {
    const list = await productService.getProducts(selectedCompanyId || undefined);
    setProducts(list);
  };

  const loadBatches = async () => {
    try {
      let query = supabase
        .from('pallet_batches')
        .select('id, batch_number, production_date, status')
        .order('created_at', { ascending: false })
        .limit(200);

      if (selectedCompanyId) {
        query = query.eq('company_id', selectedCompanyId);
      }

      if (selectedProductId) {
        query = query.eq('product_id', selectedProductId);
      }

      const { data, error: batchError } = await query;
      if (batchError) throw batchError;

      setBatches(data || []);
    } catch (err) {
      console.error('Failed to load batches:', err);
      setBatches([]);
    }
  };

  const buildRequest = (page: number, limitOverride?: number) => {
    const normalizedFrom = fromDate ? new Date(fromDate).toISOString() : undefined;
    const normalizedTo = toDate
      ? new Date(`${toDate}T23:59:59.999`).toISOString()
      : undefined;

    return {
      company_id: selectedCompanyId || undefined,
      product_id: selectedProductId || undefined,
      batch_id: selectedBatchId || undefined,
      status: selectedStatuses.length > 0 ? selectedStatuses : undefined,
      from_date: normalizedFrom,
      to_date: normalizedTo,
      search: search.trim() || undefined,
      page,
      limit: limitOverride || pageSize,
    };
  };

  const handleApplyFilters = async (page: number = 1) => {
    await loadPallets(buildRequest(page));
  };

  const handleClearFilters = () => {
    setSearch('');
    setSelectedStatuses([]);
    setSelectedProductId('');
    setSelectedBatchId('');
    setFromDate('');
    setToDate('');

    loadPallets({
      company_id: selectedCompanyId || undefined,
      page: 1,
      limit: pageSize,
    });
  };

  const handleToggleStatus = (status: PalletStatusType) => {
    setSelectedStatuses((prev) =>
      prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]
    );
  };

  const handlePageChange = (nextPage: number) => {
    if (nextPage < 1 || nextPage > totalPages) return;
    handleApplyFilters(nextPage);
  };

  const openDetails = async (palletId: string) => {
    setDetailsOpen(true);
    setDetailsLoading(true);
    setDetailsError(null);
    setDetailsPallet(null);
    setLabRuns([]);
    setLabRunsError(null);

    try {
      const pallet = await palletService.getPalletDetails(palletId);
      setDetailsPallet(pallet);

      // Load lab_v2 test runs linked to this batch (best-effort).
      const batchId = pallet?.batch_id || pallet?.batch?.id;
      if (batchId) {
        setLabRunsLoading(true);
        try {
          const { data, error: labError } = await supabase
            .from('lab_v2_test_runs')
            .select('id, run_number, status, evaluation_result, created_at')
            .eq('batch_id', batchId)
            .order('created_at', { ascending: false })
            .limit(10);

          if (labError) throw labError;
          setLabRuns((data || []) as any);
        } catch (err) {
          console.error('Failed to load lab_v2 runs:', err);
          setLabRunsError('تعذر تحميل نتائج المختبر (V2)');
        } finally {
          setLabRunsLoading(false);
        }
      }
    } catch (err) {
      console.error('Failed to load pallet details:', err);
      setDetailsError('تعذر تحميل تفاصيل البالتة');
    } finally {
      setDetailsLoading(false);
    }
  };

  const closeDetails = () => {
    setDetailsOpen(false);
    setDetailsPallet(null);
    setDetailsError(null);
    setLabRuns([]);
    setLabRunsError(null);
  };

  const formatDateTime = (value?: string) => (value ? formatDate(value, 'dd/MM/yyyy HH:mm') : '-');

  const getAvailableCartons = (pallet: PalletWithDetails) =>
    Math.max(0, (pallet.actual_cartons || 0) - (pallet.hold_quantity || 0));

  const loadActionPallet = async (palletId: string) => {
    if (detailsPallet?.id === palletId && detailsPallet.holds) {
      setActionPallet(detailsPallet);
      return detailsPallet;
    }

    setActionLoading(true);
    try {
      const pallet = await palletService.getPalletDetails(palletId);
      setActionPallet(pallet);
      return pallet;
    } catch (err) {
      console.error('Failed to load pallet for action:', err);
      setActionError('تعذر تحميل بيانات البالتة');
      return null;
    } finally {
      setActionLoading(false);
    }
  };

  const refreshPalletData = async (palletId?: string) => {
    await handleApplyFilters(currentPage);

    if (!palletId) return;
    try {
      const updated = await palletService.getPalletDetails(palletId);
      if (!updated) return;
      if (detailsOpen && detailsPallet?.id === palletId) {
        setDetailsPallet(updated);
      }
      if (actionPallet?.id === palletId) {
        setActionPallet(updated);
      }
    } catch (err) {
      console.error('Failed to refresh pallet details:', err);
    }
  };

  const openEditModal = (pallet: PalletWithDetails) => {
    setActionError(null);
    setActionPallet(pallet);
    setEditForm({
      status: pallet.status,
      location: pallet.location || '',
      notes: pallet.notes || '',
    });
    setEditOpen(true);
  };

  const openHoldModal = (pallet: PalletWithDetails) => {
    setActionError(null);
    setActionPallet(pallet);
    const available = getAvailableCartons(pallet);
    setHoldForm({
      quantity: available > 0 ? String(available) : '',
      reason: '',
      ncrId: pallet.ncr_id || '',
    });
    setHoldOpen(true);
  };

  const openResolveModal = async (palletId: string, mode: 'release' | 'dispose') => {
    setActionError(null);
    setResolveMode(mode);
    const pallet = await loadActionPallet(palletId);
    if (!pallet) return;

    const holds = (pallet.holds || []).filter((hold) => hold.status === HoldStatus.ACTIVE);
    if (holds.length === 0) {
      alert('لا توجد حجوزات نشطة لهذه البالتة');
      return;
    }

    const firstHold = holds[0];
    setResolveForm({
      holdId: firstHold.id,
      action: mode === 'release' ? DispositionType.ACCEPT : DispositionType.SCRAP,
      quantity: String(firstHold.hold_quantity),
      notes: '',
    });
    setResolveOpen(true);
  };

  const closeEditModal = () => {
    setEditOpen(false);
    setActionError(null);
  };

  const closeHoldModal = () => {
    setHoldOpen(false);
    setActionError(null);
  };

  const closeResolveModal = () => {
    setResolveOpen(false);
    setActionError(null);
  };

  const handleSaveEdit = async () => {
    if (!actionPallet) return;
    setActionLoading(true);
    setActionError(null);

    try {
      await palletService.updatePallet(actionPallet.id, {
        status: editForm.status,
        location: editForm.location.trim(),
        notes: editForm.notes.trim(),
      });
      closeEditModal();
      await refreshPalletData(actionPallet.id);
    } catch (err) {
      console.error('Failed to update pallet:', err);
      setActionError('تعذر تحديث البالتة');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateHold = async () => {
    if (!actionPallet) return;
    const quantity = Number(holdForm.quantity);
    const available = getAvailableCartons(actionPallet);

    if (!quantity || Number.isNaN(quantity) || quantity <= 0) {
      setActionError('أدخل كمية صحيحة للحجز');
      return;
    }
    if (quantity > available) {
      setActionError(`الحد الأقصى المتاح هو ${available} كرتونة`);
      return;
    }

    setActionLoading(true);
    setActionError(null);
    try {
      await holdService.createHold({
        pallet_id: actionPallet.id,
        hold_quantity: quantity,
        hold_reason: holdForm.reason.trim() || undefined,
        ncr_id: holdForm.ncrId.trim() || undefined,
      });
      closeHoldModal();
      await refreshPalletData(actionPallet.id);
    } catch (err) {
      console.error('Failed to create hold:', err);
      setActionError('تعذر تنفيذ الحجز');
    } finally {
      setActionLoading(false);
    }
  };

  const handleResolveHold = async () => {
    if (!actionPallet) return;
    if (!selectedHold) {
      setActionError('اختر الحجز المراد معالجته');
      return;
    }

    const quantity = Number(resolveForm.quantity);
    if (!quantity || Number.isNaN(quantity) || quantity <= 0) {
      setActionError('أدخل كمية صحيحة للمعالجة');
      return;
    }
    if (quantity > selectedHold.hold_quantity) {
      setActionError(`الحد الأقصى هو ${selectedHold.hold_quantity} كرتونة`);
      return;
    }

    setActionLoading(true);
    setActionError(null);
    try {
      const payload: Parameters<typeof holdService.resolveHold>[0] = {
        hold_id: selectedHold.id,
        disposition_type: resolveForm.action,
        disposition_notes: resolveForm.notes.trim() || undefined,
      };

      if (resolveForm.action === DispositionType.ACCEPT) {
        payload.accepted_quantity = quantity;
      } else if (resolveForm.action === DispositionType.REWORK) {
        payload.reworked_quantity = quantity;
      } else {
        payload.scrapped_quantity = quantity;
      }

      await holdService.resolveHold(payload);
      closeResolveModal();
      await refreshPalletData(actionPallet.id);
    } catch (err) {
      console.error('Failed to resolve hold:', err);
      setActionError('تعذر معالجة الحجز');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeletePallet = async (pallet: PalletWithDetails) => {
    if (!window.confirm(`هل تريد حذف البالتة ${pallet.pallet_number}؟`)) return;

    setActionLoading(true);
    try {
      await palletService.deletePallet(pallet.id);
      if (detailsPallet?.id === pallet.id) {
        closeDetails();
      }
      await refreshPalletData();
    } catch (err) {
      console.error('Failed to delete pallet:', err);
      alert('تعذر حذف البالتة');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row-reverse md:items-center md:justify-between">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-3" dir="rtl">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white text-slate-700 hover:bg-slate-50"
          >
            <ArrowRight size={16} />
            رجوع
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">سجل البالتات</h1>
            <p className="text-sm text-slate-500">عرض شامل لكل البالتات مع البحث والفلاتر المتقدمة</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2">
            <label className="text-sm text-slate-600">الشركة:</label>
            <select
              value={selectedCompanyId || ''}
              onChange={(e) => {
                if (e.target.value) {
                  selectCompany(e.target.value);
                }
              }}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
            >
              <option value="">اختر شركة</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={() => handleApplyFilters(1)}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm bg-slate-900 text-white rounded-lg hover:bg-slate-800"
          >
            <RefreshCcw size={16} />
            تحديث
          </button>
        </div>
      </div>

      {/* Filters */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleApplyFilters(1);
        }}
        className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-4"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="lg:col-span-2">
            <label className="block text-sm text-slate-600 mb-1">بحث</label>
            <div className="relative">
              <Search size={16} className="absolute right-3 top-3 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="رقم البالتة أو الملاحظات"
                className="w-full pr-9 pl-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-slate-600 mb-1">المنتج</label>
            <select
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
            >
              <option value="">كل المنتجات</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-slate-600 mb-1">التشغيلة</label>
            <select
              value={selectedBatchId}
              onChange={(e) => setSelectedBatchId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
            >
              <option value="">كل التشغيلات</option>
              {batches.map((batch) => (
                <option key={batch.id} value={batch.id}>
                  {batch.batch_number}
                  {batch.production_date ? ` - ${formatDate(batch.production_date, 'dd/MM/yyyy')}` : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-slate-600 mb-1">من تاريخ</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
            />
          </div>

          <div>
            <label className="block text-sm text-slate-600 mb-1">إلى تاريخ</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm text-slate-600 mb-2">الحالة</label>
          <div className="flex flex-wrap gap-3">
            {statusOptions.map((status) => (
              <label key={status} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedStatuses.includes(status)}
                  onChange={() => handleToggleStatus(status)}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <PalletStatusBadge status={status} size="sm" />
              </label>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="submit"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
          >
            بحث
          </button>
          <button
            type="button"
            onClick={handleClearFilters}
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 text-sm"
          >
            <XCircle size={16} />
            إعادة ضبط
          </button>
          <div className="text-sm text-slate-500">
            النتائج: {totalCount.toLocaleString()}
          </div>
          <div className="flex items-center gap-2 mr-auto">
            <span className="text-sm text-slate-500">حجم الصفحة:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                const next = Number(e.target.value);
                setPageSize(next);
                loadPallets(buildRequest(1, next));
              }}
              className="px-2 py-1 border border-slate-200 rounded-lg text-sm bg-white"
            >
              {PAGE_SIZES.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>
        </div>
      </form>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-4">
            <TableSkeleton rows={8} />
          </div>
        ) : pallets.length === 0 ? (
          <div className="p-10 text-center text-slate-500">لا توجد بالتات مطابقة للفلاتر الحالية</div>
        ) : (
          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-3 text-right font-medium">رقم البالتة</th>
                  <th className="px-4 py-3 text-right font-medium">المنتج</th>
                  <th className="px-4 py-3 text-right font-medium">التشغيلة</th>
                  <th className="px-4 py-3 text-right font-medium">الحالة</th>
                  <th className="px-4 py-3 text-right font-medium">الكراتين</th>
                  <th className="px-4 py-3 text-right font-medium">الإكتمال</th>
                  <th className="px-4 py-3 text-right font-medium">الموقع</th>
                  <th className="px-4 py-3 text-right font-medium">تاريخ الإنشاء</th>
                  <th className="px-4 py-3 text-right font-medium">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {pallets.map((pallet) => {
                  const completion = Math.min(100, Math.round(pallet.completion_percentage || 0));
                  const availableCartons = getAvailableCartons(pallet);
                  const hasHold = (pallet.hold_quantity || 0) > 0;
                  return (
                    <tr key={pallet.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-semibold text-slate-800">{pallet.pallet_number}</td>
                      <td className="px-4 py-3 text-slate-700">{pallet.product_name || '-'}</td>
                      <td className="px-4 py-3 text-slate-700">{pallet.batch?.batch_number || '-'}</td>
                      <td className="px-4 py-3">
                        <PalletStatusBadge status={pallet.status} size="sm" />
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {pallet.actual_cartons} / {pallet.target_cartons}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-2 bg-slate-200 rounded-full overflow-hidden">
                            <div
                              className="h-2 bg-emerald-500"
                              style={{ width: `${completion}%` }}
                            />
                          </div>
                          <span className="text-xs text-slate-600">{completion}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-700">{pallet.location || '-'}</td>
                      <td className="px-4 py-3 text-slate-700">
                        {formatDate(pallet.created_at, 'dd/MM/yyyy')}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <PermissionButton
                            module="pallet_management"
                            action="view"
                            type="button"
                            onClick={() => openDetails(pallet.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 disabled:opacity-50"
                          >
                            <Eye size={14} />
                            تفاصيل
                          </PermissionButton>
                          <PermissionButton
                            module="pallet_management"
                            action="edit"
                            type="button"
                            onClick={() => openEditModal(pallet)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 disabled:opacity-50"
                          >
                            <Pencil size={14} />
                            تعديل
                          </PermissionButton>
                          <PermissionButton
                            module="pallet_management"
                            action="manage_hold"
                            type="button"
                            onClick={() => openHoldModal(pallet)}
                            disabled={actionLoading || availableCartons <= 0}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs bg-amber-50 text-amber-700 rounded-lg hover:bg-amber-100 disabled:opacity-50"
                            title={availableCartons <= 0 ? 'لا توجد كمية متاحة للحجز' : undefined}
                          >
                            <ShieldAlert size={14} />
                            حجز
                          </PermissionButton>
                          <PermissionButton
                            module="pallet_management"
                            action="release_hold"
                            type="button"
                            onClick={() => openResolveModal(pallet.id, 'release')}
                            disabled={actionLoading || !hasHold}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100 disabled:opacity-50"
                            title={!hasHold ? 'لا توجد حجوزات نشطة' : undefined}
                          >
                            <ShieldCheck size={14} />
                            رفع الحجز
                          </PermissionButton>
                          <PermissionButton
                            module="pallet_management"
                            action="dispose"
                            type="button"
                            onClick={() => openResolveModal(pallet.id, 'dispose')}
                            disabled={actionLoading || !hasHold}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs bg-rose-50 text-rose-700 rounded-lg hover:bg-rose-100 disabled:opacity-50"
                            title={!hasHold ? 'لا توجد حجوزات نشطة' : undefined}
                          >
                            <AlertTriangle size={14} />
                            فرز
                          </PermissionButton>
                          <PermissionButton
                            module="pallet_management"
                            action="delete"
                            type="button"
                            onClick={() => handleDeletePallet(pallet)}
                            disabled={actionLoading}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs bg-red-50 text-red-700 rounded-lg hover:bg-red-100 disabled:opacity-50"
                          >
                            <Trash2 size={14} />
                            حذف
                          </PermissionButton>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {!loading && pallets.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-slate-200">
            <div className="text-sm text-slate-500">
              صفحة {currentPage} من {totalPages} • إجمالي {totalCount.toLocaleString()}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage <= 1}
                className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 text-slate-600 disabled:opacity-50"
              >
                السابق
              </button>
              <button
                type="button"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage >= totalPages}
                className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 text-slate-600 disabled:opacity-50"
              >
                التالي
              </button>
            </div>
          </div>
        )}

        {error && <div className="p-4 text-sm text-rose-600">{error}</div>}
      </div>

      {/* Details Modal */}
      <Modal isOpen={detailsOpen} onClose={closeDetails} title="تفاصيل البالتة" size="full">
        {detailsLoading ? (
          <div className="py-10 text-center text-slate-500">جاري تحميل التفاصيل...</div>
        ) : detailsError ? (
          <div className="py-10 text-center text-rose-600">{detailsError}</div>
        ) : detailsPallet ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="bg-slate-50 rounded-lg p-4">
                <p className="text-xs text-slate-500 mb-1">رقم البالتة</p>
                <p className="text-sm font-semibold text-slate-800">{detailsPallet.pallet_number}</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-4">
                <p className="text-xs text-slate-500 mb-1">المنتج</p>
                <p className="text-sm font-semibold text-slate-800">{detailsPallet.product_name || '-'}</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-4">
                <p className="text-xs text-slate-500 mb-1">الشركة</p>
                <p className="text-sm font-semibold text-slate-800">{detailsPallet.company_name || '-'}</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-4">
                <p className="text-xs text-slate-500 mb-1">التشغيلة</p>
                <p className="text-sm font-semibold text-slate-800">{detailsPallet.batch?.batch_number || '-'}</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-4">
                <p className="text-xs text-slate-500 mb-1">الحالة</p>
                <PalletStatusBadge status={detailsPallet.status} size="sm" />
              </div>
              <div className="bg-slate-50 rounded-lg p-4">
                <p className="text-xs text-slate-500 mb-1">الكراتين</p>
                <p className="text-sm font-semibold text-slate-800">
                  {detailsPallet.actual_cartons} / {detailsPallet.target_cartons}
                </p>
              </div>
              <div className="bg-slate-50 rounded-lg p-4">
                <p className="text-xs text-slate-500 mb-1">الكمية المتاحة</p>
                <p className="text-sm font-semibold text-slate-800">{detailsPallet.available_cartons}</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-4">
                <p className="text-xs text-slate-500 mb-1">الموقع</p>
                <p className="text-sm font-semibold text-slate-800">{detailsPallet.location || '-'}</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-4">
                <p className="text-xs text-slate-500 mb-1">تاريخ الإنشاء</p>
                <p className="text-sm font-semibold text-slate-800">{formatDateTime(detailsPallet.created_at)}</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-4">
                <p className="text-xs text-slate-500 mb-1">تاريخ الانتهاء</p>
                <p className="text-sm font-semibold text-slate-800">{formatDateTime(detailsPallet.finished_at)}</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-4">
                <p className="text-xs text-slate-500 mb-1">تاريخ الإكتمال</p>
                <p className="text-sm font-semibold text-slate-800">{formatDateTime(detailsPallet.completed_at)}</p>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">ملاحظات</h3>
              <p className="text-sm text-slate-600">{detailsPallet.notes || 'لا توجد ملاحظات'}</p>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-4">
              <div className="flex items-center justify-between gap-3 mb-3">
                <h3 className="text-sm font-semibold text-slate-700">نتائج المختبر (V2)</h3>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const batchId = detailsPallet.batch_id || detailsPallet.batch?.id;
                      const productId = detailsPallet.product_id || detailsPallet.batch?.product_id || '';
                      if (!batchId) return;
                      navigate(`/lab/tests/runs/new?batch_id=${batchId}&product_id=${productId}`);
                    }}
                    disabled={!detailsPallet.batch_id && !detailsPallet.batch?.id}
                    className="px-3 py-1.5 text-sm rounded-lg bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50"
                  >
                    بدء فحص
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('/lab/tests/runs')}
                    className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                  >
                    السجل
                  </button>
                </div>
              </div>

              {!detailsPallet.batch_id && !detailsPallet.batch?.id ? (
                <p className="text-sm text-slate-500">لا يوجد Batch مرتبط بهذه البالتة.</p>
              ) : labRunsLoading ? (
                <p className="text-sm text-slate-500">جاري تحميل نتائج المختبر...</p>
              ) : labRunsError ? (
                <p className="text-sm text-rose-600">{labRunsError}</p>
              ) : labRuns.length > 0 ? (
                <div className="overflow-auto">
                  <table className="min-w-full text-sm">
                    <thead className="text-slate-500">
                      <tr>
                        <th className="px-3 py-2 text-right">رقم الفحص</th>
                        <th className="px-3 py-2 text-right">الحالة</th>
                        <th className="px-3 py-2 text-right">النتيجة</th>
                        <th className="px-3 py-2 text-right">التاريخ</th>
                        <th className="px-3 py-2 text-right">إجراء</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {labRuns.map((run) => (
                        <tr key={run.id}>
                          <td className="px-3 py-2 font-medium text-slate-800">{run.run_number}</td>
                          <td className="px-3 py-2">{run.status}</td>
                          <td className="px-3 py-2">{run.evaluation_result || '-'}</td>
                          <td className="px-3 py-2">{formatDateTime(run.created_at)}</td>
                          <td className="px-3 py-2">
                            <button
                              type="button"
                              onClick={() => navigate(`/lab/tests/runs/${run.id}`)}
                              className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                            >
                              فتح
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-slate-500">لا توجد فحوصات مرتبطة بهذه التشغيلة.</p>
              )}
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">الإضافات / المساهمات</h3>
              {detailsPallet.contributions && detailsPallet.contributions.length > 0 ? (
                <div className="overflow-auto">
                  <table className="min-w-full text-sm">
                    <thead className="text-slate-500">
                      <tr>
                        <th className="px-3 py-2 text-right">الوردية</th>
                        <th className="px-3 py-2 text-right">التاريخ</th>
                        <th className="px-3 py-2 text-right">الكمية</th>
                        <th className="px-3 py-2 text-right">المشغل</th>
                        <th className="px-3 py-2 text-right">وقت الإضافة</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {detailsPallet.contributions.map((contribution) => (
                        <tr key={contribution.id}>
                          <td className="px-3 py-2">{contribution.shift}</td>
                          <td className="px-3 py-2">{formatDate(contribution.shift_date, 'dd/MM/yyyy')}</td>
                          <td className="px-3 py-2">{contribution.cartons_added}</td>
                          <td className="px-3 py-2">{contribution.operator_name || contribution.operator_id || '-'}</td>
                          <td className="px-3 py-2">{formatDateTime(contribution.added_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-slate-500">لا توجد مساهمات مسجلة</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white border border-slate-200 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-slate-700 mb-3">مصادر التشغيلات</h3>
                {detailsPallet.batch_sources && detailsPallet.batch_sources.length > 0 ? (
                  <ul className="space-y-2 text-sm text-slate-600">
                    {detailsPallet.batch_sources.map((source) => (
                      <li key={source.id} className="flex items-center justify-between">
                        <span>{source.source_batch?.batch_number || source.source_batch_id}</span>
                        <span>{source.cartons_from_batch} كرتونة</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-slate-500">لا توجد مصادر مرتبطة</p>
                )}
              </div>

              <div className="bg-white border border-slate-200 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-slate-700 mb-3">حجوزات الجودة</h3>
                {detailsPallet.holds && detailsPallet.holds.length > 0 ? (
                  <ul className="space-y-2 text-sm text-slate-600">
                    {detailsPallet.holds.map((hold) => (
                      <li key={hold.id} className="border border-slate-100 rounded-lg p-2">
                        <div className="flex items-center justify-between">
                          <span>{hold.hold_reason || 'بدون سبب'}</span>
                          <span>{hold.hold_quantity} كرتونة</span>
                        </div>
                        <div className="text-xs text-slate-500 mt-1">
                          {hold.status} • {formatDateTime(hold.held_at)}
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-slate-500">لا توجد حجوزات</p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="py-10 text-center text-slate-500">لا توجد بيانات</div>
        )}
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={editOpen}
        onClose={closeEditModal}
        title={`تعديل البالتة${actionPallet ? ` • ${actionPallet.pallet_number}` : ''}`}
        size="lg"
        footer={
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={closeEditModal}
              className="px-4 py-2 text-sm border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50"
            >
              إلغاء
            </button>
            <button
              type="button"
              onClick={handleSaveEdit}
              disabled={actionLoading}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {actionLoading && <RefreshCcw size={14} className="animate-spin" />}
              حفظ التغييرات
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          {actionPallet && (
            <div className="bg-slate-50 rounded-lg p-3 text-sm text-slate-600">
              البالتة: <span className="font-semibold text-slate-800">{actionPallet.pallet_number}</span>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-600 mb-1">الحالة</label>
              <select
                value={editForm.status}
                onChange={(e) =>
                  setEditForm((prev) => ({ ...prev, status: e.target.value as PalletStatusType }))
                }
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
              >
                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {PALLET_STATUS_LABELS[status]?.ar || status}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">الموقع</label>
              <input
                type="text"
                value={editForm.location}
                onChange={(e) => setEditForm((prev) => ({ ...prev, location: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
                placeholder="مثال: مستودع A"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm text-slate-600 mb-1">ملاحظات</label>
            <textarea
              value={editForm.notes}
              onChange={(e) => setEditForm((prev) => ({ ...prev, notes: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
              placeholder="أي ملاحظات إضافية..."
            />
          </div>
          {actionError && <div className="text-sm text-rose-600">{actionError}</div>}
        </div>
      </Modal>

      {/* Hold Modal */}
      <Modal
        isOpen={holdOpen}
        onClose={closeHoldModal}
        title={`حجز بالتة${actionPallet ? ` • ${actionPallet.pallet_number}` : ''}`}
        size="lg"
        footer={
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={closeHoldModal}
              className="px-4 py-2 text-sm border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50"
            >
              إلغاء
            </button>
            <button
              type="button"
              onClick={handleCreateHold}
              disabled={actionLoading}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50"
            >
              {actionLoading && <RefreshCcw size={14} className="animate-spin" />}
              تنفيذ الحجز
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          {actionPallet && (
            <div className="bg-amber-50 rounded-lg p-3 text-sm text-amber-700">
              المتاح للحجز: {getAvailableCartons(actionPallet)} كرتونة
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-600 mb-1">الكمية</label>
              <input
                type="number"
                min={1}
                max={actionPallet ? getAvailableCartons(actionPallet) : undefined}
                value={holdForm.quantity}
                onChange={(e) => setHoldForm((prev) => ({ ...prev, quantity: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
                placeholder="مثال: 10"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">رقم NCR (اختياري)</label>
              <input
                type="text"
                value={holdForm.ncrId}
                onChange={(e) => setHoldForm((prev) => ({ ...prev, ncrId: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
                placeholder="NCR-0001"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm text-slate-600 mb-1">سبب الحجز</label>
            <textarea
              value={holdForm.reason}
              onChange={(e) => setHoldForm((prev) => ({ ...prev, reason: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
              placeholder="مثال: خطأ في الملصق"
            />
          </div>
          {actionError && <div className="text-sm text-rose-600">{actionError}</div>}
        </div>
      </Modal>

      {/* Resolve Hold Modal */}
      <Modal
        isOpen={resolveOpen}
        onClose={closeResolveModal}
        title={resolveMode === 'release' ? 'رفع الحجز' : 'فرز الحجز'}
        size="lg"
        footer={
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={closeResolveModal}
              className="px-4 py-2 text-sm border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50"
            >
              إلغاء
            </button>
            <button
              type="button"
              onClick={handleResolveHold}
              disabled={actionLoading}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
            >
              {actionLoading && <RefreshCcw size={14} className="animate-spin" />}
              تنفيذ الإجراء
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          {actionPallet && (
            <div className="bg-slate-50 rounded-lg p-3 text-sm text-slate-600">
              البالتة: <span className="font-semibold text-slate-800">{actionPallet.pallet_number}</span>
            </div>
          )}

          {activeHolds.length === 0 ? (
            <div className="text-sm text-slate-500">لا توجد حجوزات نشطة لهذه البالتة</div>
          ) : (
            <>
              <div>
                <label className="block text-sm text-slate-600 mb-1">الحجز النشط</label>
                <select
                  value={resolveForm.holdId}
                  onChange={(e) => {
                    const holdId = e.target.value;
                    const hold = activeHolds.find((item) => item.id === holdId);
                    setResolveForm((prev) => ({
                      ...prev,
                      holdId,
                      quantity: hold ? String(hold.hold_quantity) : prev.quantity,
                    }));
                  }}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
                >
                  {activeHolds.map((hold) => (
                    <option key={hold.id} value={hold.id}>
                      {hold.hold_reason || 'بدون سبب'} • {hold.hold_quantity} كرتونة • {formatDateTime(hold.held_at)}
                    </option>
                  ))}
                </select>
              </div>

              {selectedHold && (
                <div className="text-xs text-slate-500">
                  سبب الحجز: {selectedHold.hold_reason || 'غير محدد'} • الكمية: {selectedHold.hold_quantity} كرتونة
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-600 mb-1">الإجراء</label>
                  <select
                    value={resolveForm.action}
                    onChange={(e) =>
                      setResolveForm((prev) => ({
                        ...prev,
                        action: e.target.value as DispositionType,
                      }))
                    }
                    disabled={resolveMode === 'release'}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white disabled:opacity-70"
                  >
                    {resolveMode === 'release' ? (
                      <option value={DispositionType.ACCEPT}>رفع الحجز (قبول)</option>
                    ) : (
                      <>
                        <option value={DispositionType.SCRAP}>إتلاف</option>
                        <option value={DispositionType.REWORK}>إعادة تشغيل</option>
                        <option value={DispositionType.ACCEPT}>قبول</option>
                      </>
                    )}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-slate-600 mb-1">الكمية</label>
                  <input
                    type="number"
                    min={1}
                    max={selectedHold ? selectedHold.hold_quantity : undefined}
                    value={resolveForm.quantity}
                    onChange={(e) =>
                      setResolveForm((prev) => ({ ...prev, quantity: e.target.value }))
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-slate-600 mb-1">ملاحظات</label>
                <textarea
                  value={resolveForm.notes}
                  onChange={(e) =>
                    setResolveForm((prev) => ({ ...prev, notes: e.target.value }))
                  }
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
                  placeholder="تفاصيل الإجراء..."
                />
              </div>
            </>
          )}

          {actionError && <div className="text-sm text-rose-600">{actionError}</div>}
        </div>
      </Modal>
    </div>
  );
}
