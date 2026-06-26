/**
 * Material Receiving Page
 * صفحة استلام المواد الخام
 * Updated: Dense table UI (Excel-like) similar to HR tables.
 */

import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowPathIcon,
  ArrowRightIcon,
  EyeIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  PlusIcon,
} from '@heroicons/react/24/outline';
import { TableSkeleton } from '../../components/common/LoadingStates';
import { FormattedDate } from '../../components/common/FormattedDate';
import { useMaterialReceivings } from '../../hooks/useLabData';
import { downloadFromUrl } from '../../services/fileStorageService';
import { useCompanyStore } from '../../store/companyStore';
import {
  materialReceivingStatusColors,
  materialReceivingStatusLabels,
  materialTypeLabels,
} from '../../domain/lab/types';
import type { MaterialReceiving, MaterialReceivingStatus, MaterialType } from '../../domain/lab/types';
import HrSortableHeader from '../../modules/hr/components/HrSortableHeader';
import HrTablePager from '../../modules/hr/components/HrTablePager';
import { HrDataGrid, HrPageShell, HrSectionCard } from '../../modules/hr/components/HrPageShell';
import { usePaginatedRows } from '../../modules/hr/hooks/usePaginatedRows';
import {
  createDateSorter,
  createNumberSorter,
  createTextSorter,
  useSortableRows,
} from '../../modules/hr/hooks/useSortableRows';
import { cn } from '../../utils';

const MaterialReceivingPage: React.FC = () => {
  const { selectedCompany } = useCompanyStore();
  // Rely on RLS for company isolation. Explicit company filtering here can hide newly created rows
  // if the UI company selector drifts from the authenticated user's effective company.
  const { receivings, isLoading, error, refetch, stats } = useMaterialReceivings();

  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState<MaterialReceivingStatus[]>([]);
  const [typeFilter, setTypeFilter] = useState<MaterialType[]>([]);

  const filteredMaterials = useMemo(() => {
    let result = receivings;
    const query = searchQuery.trim().toLowerCase();

    if (query) {
      result = result.filter((m) =>
        [
          m.materialName,
          m.receivingNumber,
          m.batchNumber,
          m.materialCode,
          m.supplierName,
          m.invoiceNumber,
          m.deliveryNoteNumber,
          m.storageLocation,
          m.receivedByName,
          m.notes,
          m.rejectionReason,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(query))
      );
    }

    if (statusFilter.length > 0) {
      result = result.filter((m) => statusFilter.includes(m.status));
    }

    if (typeFilter.length > 0) {
      result = result.filter((m) => typeFilter.includes(m.materialType));
    }

    return result;
  }, [receivings, searchQuery, statusFilter, typeFilter]);

  const materialSorters = useMemo(
    () => ({
      receivingNumber: createTextSorter<MaterialReceiving>((row) => row.receivingNumber),
      status: createTextSorter<MaterialReceiving>((row) => row.status),
      materialType: createTextSorter<MaterialReceiving>((row) => row.materialType),
      materialName: createTextSorter<MaterialReceiving>((row) => row.materialName),
      materialCode: createTextSorter<MaterialReceiving>((row) => row.materialCode),
      supplierName: createTextSorter<MaterialReceiving>((row) => row.supplierName),
      batchNumber: createTextSorter<MaterialReceiving>((row) => row.batchNumber),
      quantity: createNumberSorter<MaterialReceiving>((row) => row.quantity),
      acceptedQuantity: createNumberSorter<MaterialReceiving>((row) => row.acceptedQuantity),
      rejectedQuantity: createNumberSorter<MaterialReceiving>((row) => row.rejectedQuantity),
      remainingQuantity: createNumberSorter<MaterialReceiving>(
        (row) => row.remainingQuantity ?? row.acceptedQuantity ?? row.quantity
      ),
      receivedAt: createDateSorter<MaterialReceiving>((row) => row.receivedAt),
      productionDate: createDateSorter<MaterialReceiving>((row) => row.productionDate),
      expiryDate: createDateSorter<MaterialReceiving>((row) => row.expiryDate),
      updatedAt: createDateSorter<MaterialReceiving>((row) => row.updatedAt),
    }),
    []
  );

  const { sortedRows, sortKey, sortDirection, toggleSort } = useSortableRows({
    rows: filteredMaterials,
    sorters: materialSorters,
    initialSortKey: 'receivedAt',
    initialDirection: 'desc',
  });

  const {
    page,
    setPage,
    pageCount,
    pageSize,
    setPageSize,
    pagedRows,
    totalRows,
    fromRow,
    toRow,
  } = usePaginatedRows({
    rows: sortedRows,
    initialPageSize: 50,
  });

  const handleDownloadCoa = (material: MaterialReceiving) => {
    const coaUrl = material.certificateOfAnalysis?.trim();
    if (!coaUrl) return;

    const urlParts = coaUrl.split('/');
    const fileName =
      urlParts[urlParts.length - 1] || `COA_${material.receivingNumber || material.id}.pdf`;

    void downloadFromUrl(coaUrl, fileName);
  };

  const toggleStatusFilter = (status: MaterialReceivingStatus) => {
    setStatusFilter((prev) => (prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]));
    setPage(1);
  };

  const toggleTypeFilter = (type: MaterialType) => {
    setTypeFilter((prev) => (prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]));
    setPage(1);
  };

  const clearFilters = () => {
    setStatusFilter([]);
    setTypeFilter([]);
    setPage(1);
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <TableSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button onClick={refetch} className="px-4 py-2 bg-primary-600 text-white rounded-lg">
            إعادة المحاولة
          </button>
        </div>
      </div>
    );
  }

  return (
    <HrPageShell title="استلام المواد الخام" description="" stats={[]}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Link
          to="/lab"
          className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-emerald-700 dark:text-slate-300 dark:hover:text-emerald-300"
        >
          <ArrowRightIcon className="h-4 w-4" />
          العودة للمختبر
        </Link>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
          <div className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">
            <span className="text-slate-500 dark:text-slate-400">الشركة:</span>
            <span className="font-semibold">{selectedCompany?.name || 'غير محددة'}</span>
          </div>

          <button
            type="button"
            onClick={() => void refetch()}
            className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900"
            title="تحديث"
          >
            <ArrowPathIcon className="h-4 w-4" />
            تحديث
          </button>

          <Link
            to="/lab/receiving/new"
            className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-emerald-600 px-3 text-xs font-semibold text-white transition hover:bg-emerald-700"
          >
            <PlusIcon className="h-4 w-4" />
            استلام جديد
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          { label: 'الإجمالي', value: stats.total, className: 'text-slate-900 dark:text-slate-100' },
          { label: 'قيد الانتظار', value: stats.pending, className: 'text-amber-700 dark:text-amber-200' },
          { label: 'مقبول', value: stats.accepted, className: 'text-emerald-700 dark:text-emerald-200' },
          { label: 'مرفوض', value: stats.rejected, className: 'text-rose-700 dark:text-rose-200' },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="text-[11px] text-slate-500 dark:text-slate-400">{stat.label}</div>
            <div className={cn('mt-1 text-base font-semibold', stat.className)}>{stat.value}</div>
          </div>
        ))}
      </div>

      <HrSectionCard
        title="الاستلامات"
        actions={
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
            <div className="relative">
              <MagnifyingGlassIcon className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                placeholder="بحث سريع..."
                className="h-9 w-full min-w-[220px] rounded-md border border-slate-200 bg-white pr-8 pl-2 text-xs text-slate-700 outline-none transition focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
              />
            </div>

            <button
              type="button"
              onClick={() => setShowFilters((prev) => !prev)}
              className={cn(
                'inline-flex h-9 items-center justify-center gap-2 rounded-md border px-3 text-xs font-medium transition',
                showFilters
                  ? 'border-emerald-600 bg-emerald-600 text-white'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900'
              )}
            >
              <FunnelIcon className="h-4 w-4" />
              فلاتر
            </button>

            {(statusFilter.length > 0 || typeFilter.length > 0) && (
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex h-9 items-center justify-center rounded-md border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900"
              >
                مسح
              </button>
            )}
          </div>
        }
      >
        {showFilters ? (
          <div className="mb-3 space-y-3 rounded-md border border-slate-200 bg-white p-3 text-xs dark:border-slate-800 dark:bg-slate-900">
            <div className="space-y-2">
              <div className="text-[11px] font-semibold text-slate-700 dark:text-slate-200">الحالة</div>
              <div className="flex flex-wrap gap-2">
                {(Object.entries(materialReceivingStatusLabels) as [MaterialReceivingStatus, string][]).map(
                  ([status, label]) => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => toggleStatusFilter(status)}
                      className={cn(
                        'rounded-full border px-3 py-1 text-[11px] transition',
                        statusFilter.includes(status)
                          ? `${materialReceivingStatusColors[status].bg} ${materialReceivingStatusColors[status].text} border-transparent font-semibold`
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900'
                      )}
                    >
                      {label}
                    </button>
                  )
                )}
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-[11px] font-semibold text-slate-700 dark:text-slate-200">نوع المادة</div>
              <div className="flex flex-wrap gap-2">
                {(Object.entries(materialTypeLabels) as [MaterialType, string][]).map(([type, label]) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => toggleTypeFilter(type)}
                    className={cn(
                      'rounded-full border px-3 py-1 text-[11px] transition',
                      typeFilter.includes(type)
                        ? 'border-transparent bg-emerald-50 text-emerald-700 font-semibold dark:bg-emerald-900/20 dark:text-emerald-200'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900'
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        {sortedRows.length === 0 ? (
          <div className="rounded-md border border-dashed border-slate-200 bg-white p-10 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
            لا توجد بيانات
          </div>
        ) : (
          <HrDataGrid
            rowCount={sortedRows.length}
            columnCount={27}
            footer={
              <HrTablePager
                page={page}
                pageCount={pageCount}
                pageSize={pageSize}
                totalRows={totalRows}
                fromRow={fromRow}
                toRow={toRow}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
              />
            }
          >
            <table>
              <thead>
                <tr>
                  <th>
                    <HrSortableHeader label="رقم" sortKey="receivingNumber" activeSortKey={sortKey} sortDirection={sortDirection} onToggle={toggleSort} />
                  </th>
                  <th>
                    <HrSortableHeader label="الحالة" sortKey="status" activeSortKey={sortKey} sortDirection={sortDirection} onToggle={toggleSort} />
                  </th>
                  <th>
                    <HrSortableHeader label="النوع" sortKey="materialType" activeSortKey={sortKey} sortDirection={sortDirection} onToggle={toggleSort} />
                  </th>
                  <th>
                    <HrSortableHeader label="المادة" sortKey="materialName" activeSortKey={sortKey} sortDirection={sortDirection} onToggle={toggleSort} />
                  </th>
                  <th>
                    <HrSortableHeader label="كود" sortKey="materialCode" activeSortKey={sortKey} sortDirection={sortDirection} onToggle={toggleSort} />
                  </th>
                  <th>
                    <HrSortableHeader label="المورد" sortKey="supplierName" activeSortKey={sortKey} sortDirection={sortDirection} onToggle={toggleSort} />
                  </th>
                  <th>
                    <HrSortableHeader label="Batch" sortKey="batchNumber" activeSortKey={sortKey} sortDirection={sortDirection} onToggle={toggleSort} />
                  </th>
                  <th>
                    <HrSortableHeader label="الكمية" sortKey="quantity" activeSortKey={sortKey} sortDirection={sortDirection} onToggle={toggleSort} />
                  </th>
                  <th>وحدة</th>
                  <th>التعبئة</th>
                  <th>
                    <HrSortableHeader label="إنتاج" sortKey="productionDate" activeSortKey={sortKey} sortDirection={sortDirection} onToggle={toggleSort} />
                  </th>
                  <th>
                    <HrSortableHeader label="انتهاء" sortKey="expiryDate" activeSortKey={sortKey} sortDirection={sortDirection} onToggle={toggleSort} />
                  </th>
                  <th>
                    <HrSortableHeader label="استلام" sortKey="receivedAt" activeSortKey={sortKey} sortDirection={sortDirection} onToggle={toggleSort} />
                  </th>
                  <th>مستلم</th>
                  <th>
                    <HrSortableHeader label="مقبول" sortKey="acceptedQuantity" activeSortKey={sortKey} sortDirection={sortDirection} onToggle={toggleSort} />
                  </th>
                  <th>
                    <HrSortableHeader label="مرفوض" sortKey="rejectedQuantity" activeSortKey={sortKey} sortDirection={sortDirection} onToggle={toggleSort} />
                  </th>
                  <th>
                    <HrSortableHeader label="متبقي" sortKey="remainingQuantity" activeSortKey={sortKey} sortDirection={sortDirection} onToggle={toggleSort} />
                  </th>
                  <th>مستهلك</th>
                  <th>مخزن</th>
                  <th>ظروف التخزين</th>
                  <th>إذن تسليم</th>
                  <th>فاتورة</th>
                  <th>COA</th>
                  <th>سبب الرفض</th>
                  <th>ملاحظات</th>
                  <th>
                    <HrSortableHeader label="آخر تحديث" sortKey="updatedAt" activeSortKey={sortKey} sortDirection={sortDirection} onToggle={toggleSort} />
                  </th>
                  <th className="text-center">عرض</th>
                </tr>
              </thead>
              <tbody>
                {pagedRows.map((material) => (
                  <tr key={material.id}>
                    <td className="whitespace-nowrap font-mono text-emerald-700 dark:text-emerald-300">{material.receivingNumber}</td>
                    <td className="whitespace-nowrap">
                      <span
                        className={cn(
                          'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold',
                          materialReceivingStatusColors[material.status]?.bg,
                          materialReceivingStatusColors[material.status]?.text
                        )}
                      >
                        {materialReceivingStatusLabels[material.status] || material.status}
                      </span>
                      {material.isManuallyDepleted ? (
                        <span className="mr-2 inline-flex items-center rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-semibold text-rose-700 dark:bg-rose-900/20 dark:text-rose-200">
                          نفدت يدويا
                        </span>
                      ) : null}
                    </td>
                    <td className="whitespace-nowrap">{materialTypeLabels[material.materialType] || material.materialType}</td>
                    <td className="min-w-[240px]">
                      <div className="font-semibold text-slate-900 dark:text-slate-100">{material.materialName}</div>
                    </td>
                    <td className="whitespace-nowrap font-mono">{material.materialCode || '-'}</td>
                    <td className="min-w-[180px]">
                      <div className="font-medium">{material.supplierName || '-'}</div>
                    </td>
                    <td className="whitespace-nowrap font-mono">{material.batchNumber}</td>
                    <td className="whitespace-nowrap text-right font-mono">{Number(material.quantity ?? 0).toFixed(3)}</td>
                    <td className="whitespace-nowrap">{material.unit}</td>
                    <td className="whitespace-nowrap">{material.packagingType || '-'}</td>
                    <td className="whitespace-nowrap font-mono"><FormattedDate date={material.productionDate} fallback="-" /></td>
                    <td className="whitespace-nowrap font-mono"><FormattedDate date={material.expiryDate} fallback="-" /></td>
                    <td className="whitespace-nowrap font-mono"><FormattedDate date={material.receivedAt} includeTime /></td>
                    <td className="whitespace-nowrap">{material.receivedByName || '-'}</td>
                    <td className="whitespace-nowrap text-right font-mono">{Number(material.acceptedQuantity ?? 0).toFixed(3)}</td>
                    <td className="whitespace-nowrap text-right font-mono">{Number(material.rejectedQuantity ?? 0).toFixed(3)}</td>
                    <td className="whitespace-nowrap text-right font-mono">{Number(material.remainingQuantity ?? material.acceptedQuantity ?? material.quantity ?? 0).toFixed(3)}</td>
                    <td className="whitespace-nowrap text-right font-mono">{Number(material.consumedQuantity ?? 0).toFixed(3)}</td>
                    <td className="whitespace-nowrap">{material.storageLocation || '-'}</td>
                    <td className="min-w-[180px]">{material.storageCondition || '-'}</td>
                    <td className="whitespace-nowrap font-mono">{material.deliveryNoteNumber || '-'}</td>
                    <td className="whitespace-nowrap font-mono">{material.invoiceNumber || '-'}</td>
                    <td className="whitespace-nowrap">
                      {material.certificateOfAnalysis ? (
                        <button
                          type="button"
                          onClick={() => handleDownloadCoa(material)}
                          className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 hover:underline dark:text-emerald-300 dark:hover:text-emerald-200"
                          title="تحميل COA"
                        >
                          تحميل
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-400 dark:text-slate-500">غيرمرفق</span>
                      )}
                    </td>
                    <td className="min-w-[200px]">{material.rejectionReason || '-'}</td>
                    <td className="min-w-[260px]">{material.notes || '-'}</td>
                    <td className="whitespace-nowrap font-mono"><FormattedDate date={material.updatedAt} includeTime /></td>
                    <td className="whitespace-nowrap text-center">
                      <Link
                        to={`/lab/receiving/${material.id}`}
                        className="inline-flex items-center justify-center rounded-md border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"
                        title="عرض"
                      >
                        <EyeIcon className="h-4 w-4" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </HrDataGrid>
        )}
      </HrSectionCard>
    </HrPageShell>
  );
};

export default MaterialReceivingPage;
