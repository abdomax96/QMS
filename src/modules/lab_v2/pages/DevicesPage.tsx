import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { PlusIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import Button from '../../../components/common/Button';
import Input from '../../../components/common/Input';
import Modal from '../../../components/common/Modal';
import { formatDate } from '../../../utils';
import { useCreateLabV2Device, useDeleteLabV2Device, useLabV2Devices, useUpdateLabV2Device } from '../hooks/useDevices';
import DeviceForm from '../components/devices/DeviceForm';
import { LAB_V2_DEVICE_STATUS_LABELS } from '../constants/statuses';
import type { LabV2Device } from '../types/device.types';

function getDueState(calibration_due_date?: string | null): 'ok' | 'soon' | 'expired' | 'na' {
  if (!calibration_due_date) return 'na';
  const due = new Date(calibration_due_date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (Number.isNaN(due.getTime())) return 'na';
  if (due.getTime() < today.getTime()) return 'expired';
  if (due.getTime() - today.getTime() <= 1000 * 60 * 60 * 24 * 14) return 'soon';
  return 'ok';
}

const dueBadge: Record<string, string> = {
  ok: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  soon: 'bg-amber-50 text-amber-700 border-amber-200',
  expired: 'bg-rose-50 text-rose-700 border-rose-200',
  na: 'bg-slate-50 text-slate-600 border-slate-200',
};

const dueLabel: Record<string, string> = {
  ok: 'سارية',
  soon: 'قريبة',
  expired: 'منتهية',
  na: 'غير محدد',
};

const DevicesPage: React.FC = () => {
  const [search, setSearch] = useState('');
  const { data: devices, isLoading } = useLabV2Devices({ search });

  const createDevice = useCreateLabV2Device();
  const updateDevice = useUpdateLabV2Device();
  const deleteDevice = useDeleteLabV2Device();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<LabV2Device | null>(null);

  const sorted = useMemo(() => {
    return (devices || []).slice().sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  }, [devices]);

  const openNew = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (d: LabV2Device) => {
    setEditing(d);
    setModalOpen(true);
  };

  return (
    <div className="p-6 min-h-screen bg-slate-50 dark:bg-slate-900" dir="rtl">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">إدارة الأجهزة</h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">تسجيل الأجهزة وتتبع المعايرات</p>
          </div>
          <Button leftIcon={<PlusIcon className="w-4 h-4" />} onClick={openNew}>
            إضافة جهاز
          </Button>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4">
          <div className="flex items-center gap-3">
            <div className="w-72 max-w-full">
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="بحث بالكود/الاسم/الشركة المصنعة..."
                leftIcon={<MagnifyingGlassIcon className="w-4 h-4" />}
              />
            </div>
            <div className="text-sm text-slate-500 dark:text-slate-400">
              {isLoading ? 'جاري التحميل...' : `عدد الأجهزة: ${sorted.length}`}
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
                  <th className="text-right px-4 py-3 font-semibold">الحالة</th>
                  <th className="text-right px-4 py-3 font-semibold">المعايرة</th>
                  <th className="text-right px-4 py-3 font-semibold">تاريخ الاستحقاق</th>
                  <th className="text-right px-4 py-3 font-semibold">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {sorted.map((d) => {
                  const state = getDueState(d.calibration_due_date);
                  return (
                    <tr key={d.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-850/40">
                      <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{d.code}</td>
                      <td className="px-4 py-3">
                        <Link to={`/lab/tests/devices/${d.id}`} className="text-primary-700 dark:text-primary-300 hover:underline">
                          {d.name_ar || d.name}
                        </Link>
                        <div className="text-xs text-slate-500 dark:text-slate-400">{d.name}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-200">{LAB_V2_DEVICE_STATUS_LABELS[d.status]}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full border text-xs ${dueBadge[state]}`}>
                          {dueLabel[state]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-200">
                        {d.calibration_due_date ? formatDate(d.calibration_due_date) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm" onClick={() => openEdit(d)}>
                            تعديل
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => {
                              const ok = window.confirm('هل تريد حذف هذا الجهاز؟');
                              if (!ok) return;
                              deleteDevice.mutate(d.id);
                            }}
                            isLoading={deleteDevice.isPending}
                          >
                            حذف
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {!isLoading && sorted.length === 0 ? (
                  <tr>
                    <td className="px-4 py-8 text-center text-slate-600 dark:text-slate-400" colSpan={6}>
                      لا توجد أجهزة
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'تعديل جهاز' : 'إضافة جهاز'}
        size="full"
      >
        <DeviceForm
          initial={editing || undefined}
          loading={createDevice.isPending || updateDevice.isPending}
          submitLabel={editing ? 'حفظ التعديل' : 'إضافة'}
          onCancel={() => setModalOpen(false)}
          onSubmit={async (values) => {
            if (editing) {
              await updateDevice.mutateAsync({ id: editing.id, updates: values });
            } else {
              await createDevice.mutateAsync(values);
            }
            setModalOpen(false);
          }}
        />
      </Modal>
    </div>
  );
};

export default DevicesPage;
