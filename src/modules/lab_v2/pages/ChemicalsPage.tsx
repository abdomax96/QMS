import React, { useMemo, useState } from 'react';
import { PlusIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import Button from '../../../components/common/Button';
import Input from '../../../components/common/Input';
import Modal from '../../../components/common/Modal';
import { formatDate } from '../../../utils';
import ChemicalForm from '../components/chemicals/ChemicalForm';
import ReceiptForm from '../components/chemicals/ReceiptForm';
import {
  useCreateLabV2Chemical,
  useCreateLabV2Receipt,
  useDeleteLabV2Chemical,
  useLabV2Chemicals,
  useLabV2Receipts,
  useUpdateLabV2Chemical,
} from '../hooks/useChemicals';
import type { LabV2Chemical } from '../types/chemical.types';
import { LAB_V2_RECEIPT_STATUS_LABELS } from '../constants/statuses';

const ChemicalsPage: React.FC = () => {
  const [search, setSearch] = useState('');
  const { data: chemicals, isLoading } = useLabV2Chemicals({ search });

  const createChemical = useCreateLabV2Chemical();
  const updateChemical = useUpdateLabV2Chemical();
  const deleteChemical = useDeleteLabV2Chemical();

  const [chemModalOpen, setChemModalOpen] = useState(false);
  const [editing, setEditing] = useState<LabV2Chemical | null>(null);

  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [activeChemical, setActiveChemical] = useState<LabV2Chemical | null>(null);
  const { data: receipts } = useLabV2Receipts(activeChemical?.id);
  const createReceipt = useCreateLabV2Receipt();

  const sorted = useMemo(() => (chemicals || []).slice().sort((a, b) => (a.created_at < b.created_at ? 1 : -1)), [chemicals]);

  const openNew = () => {
    setEditing(null);
    setChemModalOpen(true);
  };

  const openEdit = (c: LabV2Chemical) => {
    setEditing(c);
    setChemModalOpen(true);
  };

  const openReceipts = (c: LabV2Chemical) => {
    setActiveChemical(c);
    setReceiptModalOpen(true);
  };

  return (
    <div className="p-6 min-h-screen bg-slate-50 dark:bg-slate-900" dir="rtl">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">إدارة المواد (Chemicals)</h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">تسجيل المواد والاستلامات</p>
          </div>
          <Button leftIcon={<PlusIcon className="w-4 h-4" />} onClick={openNew}>
            إضافة مادة
          </Button>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4">
          <div className="flex items-center gap-3">
            <div className="w-72 max-w-full">
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="بحث بالكود/الاسم/CAS..."
                leftIcon={<MagnifyingGlassIcon className="w-4 h-4" />}
              />
            </div>
            <div className="text-sm text-slate-500 dark:text-slate-400">
              {isLoading ? 'جاري التحميل...' : `عدد المواد: ${sorted.length}`}
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-850/40">
                <tr className="text-slate-600 dark:text-slate-300">
                  <th className="text-right px-4 py-3 font-semibold">الكود</th>
                  <th className="text-right px-4 py-3 font-semibold">الاسم</th>
                  <th className="text-right px-4 py-3 font-semibold">CAS</th>
                  <th className="text-right px-4 py-3 font-semibold">Supplier</th>
                  <th className="text-right px-4 py-3 font-semibold">نشط</th>
                  <th className="text-right px-4 py-3 font-semibold">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {sorted.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-850/40">
                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{c.code}</td>
                    <td className="px-4 py-3">
                      <div className="text-slate-900 dark:text-white">{c.name_ar || c.name}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">{c.name}</div>
                    </td>
                    <td className="px-4 py-3">{c.cas_number || '—'}</td>
                    <td className="px-4 py-3">{c.supplier || '—'}</td>
                    <td className="px-4 py-3">{c.is_active ? 'نعم' : 'لا'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => openReceipts(c)}>
                          الاستلامات
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => openEdit(c)}>
                          تعديل
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => {
                            const ok = window.confirm('هل تريد حذف هذه المادة؟');
                            if (!ok) return;
                            deleteChemical.mutate(c.id);
                          }}
                          isLoading={deleteChemical.isPending}
                        >
                          حذف
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!isLoading && sorted.length === 0 ? (
                  <tr>
                    <td className="px-4 py-8 text-center text-slate-600 dark:text-slate-400" colSpan={6}>
                      لا توجد مواد
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <Modal isOpen={chemModalOpen} onClose={() => setChemModalOpen(false)} title={editing ? 'تعديل مادة' : 'إضافة مادة'} size="full">
        <ChemicalForm
          initial={editing || undefined}
          loading={createChemical.isPending || updateChemical.isPending}
          submitLabel={editing ? 'حفظ التعديل' : 'إضافة'}
          onCancel={() => setChemModalOpen(false)}
          onSubmit={async (values) => {
            if (editing) await updateChemical.mutateAsync({ id: editing.id, updates: values });
            else await createChemical.mutateAsync(values);
            setChemModalOpen(false);
          }}
        />
      </Modal>

      <Modal
        isOpen={receiptModalOpen}
        onClose={() => setReceiptModalOpen(false)}
        title={activeChemical ? `استلامات: ${activeChemical.code}` : 'الاستلامات'}
        size="full"
      >
        {activeChemical ? (
          <div className="space-y-6" dir="rtl">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-slate-50 dark:bg-slate-850/40 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                <div className="text-sm font-semibold text-slate-900 dark:text-white mb-3">استلام جديد</div>
                <ReceiptForm
                  chemical_id={activeChemical.id}
                  loading={createReceipt.isPending}
                  onCancel={() => setReceiptModalOpen(false)}
                  onSubmit={async (values) => {
                    await createReceipt.mutateAsync(values);
                  }}
                />
              </div>

              <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                  <div className="text-sm font-semibold text-slate-900 dark:text-white">سجل الاستلامات</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">{(receipts || []).length} سجل</div>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-slate-50 dark:bg-slate-850/40">
                      <tr className="text-slate-600 dark:text-slate-300">
                        <th className="text-right px-4 py-3 font-semibold">رقم</th>
                        <th className="text-right px-4 py-3 font-semibold">الكمية</th>
                        <th className="text-right px-4 py-3 font-semibold">المتبقي</th>
                        <th className="text-right px-4 py-3 font-semibold">الصلاحية</th>
                        <th className="text-right px-4 py-3 font-semibold">الحالة</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                      {(receipts || []).map((r) => (
                        <tr key={r.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-850/40">
                          <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{r.receipt_number}</td>
                          <td className="px-4 py-3">{r.quantity} {r.unit}</td>
                          <td className="px-4 py-3">{(r.remaining_quantity ?? r.quantity) as any} {r.unit}</td>
                          <td className="px-4 py-3">{r.expiry_date ? formatDate(r.expiry_date) : '—'}</td>
                          <td className="px-4 py-3">{LAB_V2_RECEIPT_STATUS_LABELS[r.status]}</td>
                        </tr>
                      ))}
                      {(receipts || []).length === 0 ? (
                        <tr>
                          <td className="px-4 py-8 text-center text-slate-600 dark:text-slate-400" colSpan={5}>
                            لا توجد استلامات
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-sm text-slate-600 dark:text-slate-400">اختر مادة أولاً</div>
        )}
      </Modal>
    </div>
  );
};

export default ChemicalsPage;

