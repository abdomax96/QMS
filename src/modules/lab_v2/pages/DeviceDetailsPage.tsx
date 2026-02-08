import React, { useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowRightIcon, PlusIcon } from '@heroicons/react/24/outline';
import Button from '../../../components/common/Button';
import Modal from '../../../components/common/Modal';
import { formatDate } from '../../../utils';
import { useAddLabV2Calibration, useLabV2Device } from '../hooks/useDevices';
import CalibrationForm from '../components/devices/CalibrationForm';
import { LAB_V2_DEVICE_STATUS_LABELS } from '../constants/statuses';

const DeviceDetailsPage: React.FC = () => {
  const { id } = useParams();
  const deviceId = id as string | undefined;
  const { data, isLoading } = useLabV2Device(deviceId);
  const addCalibration = useAddLabV2Calibration();

  const [calModalOpen, setCalModalOpen] = useState(false);

  const latest = useMemo(() => {
    const cal = data?.calibrations || [];
    return cal.length ? cal[0] : null;
  }, [data?.calibrations]);

  if (isLoading) {
    return <div className="p-6" dir="rtl">جاري التحميل...</div>;
  }

  if (!data) {
    return (
      <div className="p-6" dir="rtl">
        <div className="text-slate-700">الجهاز غير موجود.</div>
        <Link to="/lab/tests/devices" className="text-primary-600 hover:underline">العودة</Link>
      </div>
    );
  }

  return (
    <div className="p-6 min-h-screen bg-slate-50 dark:bg-slate-900" dir="rtl">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Link to="/lab/tests/devices" className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white">
              <ArrowRightIcon className="w-4 h-4" />
              العودة للأجهزة
            </Link>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{data.name_ar || data.name}</h1>
            <div className="text-sm text-slate-600 dark:text-slate-400">{data.code} • {LAB_V2_DEVICE_STATUS_LABELS[data.status]}</div>
          </div>
          <Button leftIcon={<PlusIcon className="w-4 h-4" />} onClick={() => setCalModalOpen(true)}>
            إضافة معايرة
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
            <div className="text-sm font-semibold text-slate-900 dark:text-white mb-3">بيانات الجهاز</div>
            <div className="space-y-2 text-sm text-slate-700 dark:text-slate-200">
              <div><span className="text-slate-500 dark:text-slate-400">Manufacturer:</span> {data.manufacturer || '—'}</div>
              <div><span className="text-slate-500 dark:text-slate-400">Model:</span> {data.model || '—'}</div>
              <div><span className="text-slate-500 dark:text-slate-400">Serial:</span> {data.serial_number || '—'}</div>
              <div><span className="text-slate-500 dark:text-slate-400">Location:</span> {data.location || '—'}</div>
              <div><span className="text-slate-500 dark:text-slate-400">Calibration interval:</span> {data.calibration_interval_days || '—'} days</div>
              <div><span className="text-slate-500 dark:text-slate-400">Due date:</span> {data.calibration_due_date ? formatDate(data.calibration_due_date) : '—'}</div>
              {latest ? (
                <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                  <div className="text-sm font-medium text-slate-900 dark:text-white mb-1">آخر معايرة</div>
                  <div><span className="text-slate-500 dark:text-slate-400">Date:</span> {formatDate(latest.calibration_date)}</div>
                  <div><span className="text-slate-500 dark:text-slate-400">Result:</span> {latest.result}</div>
                  <div><span className="text-slate-500 dark:text-slate-400">Next due:</span> {formatDate(latest.next_due_date)}</div>
                </div>
              ) : null}
            </div>
          </div>

          <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="p-5 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div className="text-sm font-semibold text-slate-900 dark:text-white">سجل المعايرات</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">{data.calibrations.length} سجل</div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-850/40">
                  <tr className="text-slate-600 dark:text-slate-300">
                    <th className="text-right px-4 py-3 font-semibold">تاريخ المعايرة</th>
                    <th className="text-right px-4 py-3 font-semibold">النتيجة</th>
                    <th className="text-right px-4 py-3 font-semibold">تاريخ الاستحقاق</th>
                    <th className="text-right px-4 py-3 font-semibold">شهادة</th>
                    <th className="text-right px-4 py-3 font-semibold">ملاحظات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {data.calibrations.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-850/40">
                      <td className="px-4 py-3">{formatDate(c.calibration_date)}</td>
                      <td className="px-4 py-3">{c.result}</td>
                      <td className="px-4 py-3">{formatDate(c.next_due_date)}</td>
                      <td className="px-4 py-3">{c.certificate_number || '—'}</td>
                      <td className="px-4 py-3">{c.notes || '—'}</td>
                    </tr>
                  ))}
                  {data.calibrations.length === 0 ? (
                    <tr>
                      <td className="px-4 py-8 text-center text-slate-600 dark:text-slate-400" colSpan={5}>
                        لا توجد معايرات
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <Modal isOpen={calModalOpen} onClose={() => setCalModalOpen(false)} title="إضافة معايرة" size="lg">
        <CalibrationForm
          device_id={data.id}
          defaultIntervalDays={data.calibration_interval_days || 365}
          loading={addCalibration.isPending}
          onCancel={() => setCalModalOpen(false)}
          onSubmit={async (values) => {
            await addCalibration.mutateAsync(values as any);
            setCalModalOpen(false);
          }}
        />
      </Modal>
    </div>
  );
};

export default DeviceDetailsPage;
