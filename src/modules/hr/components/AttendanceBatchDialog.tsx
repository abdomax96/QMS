import React, { useEffect, useState } from 'react';
import { CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';
import type {
  HrShiftPlanItem,
  ProductionAttendanceBatchFormValues,
  ProductionAttendanceBatchItem,
} from '../types';

interface AttendanceBatchDialogProps {
  open: boolean;
  batch: ProductionAttendanceBatchItem | null;
  shiftPlans: HrShiftPlanItem[];
  saving: boolean;
  onClose: () => void;
  onSubmit: (values: ProductionAttendanceBatchFormValues) => Promise<void>;
}

const INPUT_CLASS =
  'w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-emerald-400 dark:focus:ring-emerald-900/40';

const TEXTAREA_CLASS = `${INPUT_CLASS} min-h-[96px] resize-y`;

function buildInitialValues(batch: ProductionAttendanceBatchItem | null): ProductionAttendanceBatchFormValues {
  const today = new Date().toISOString().slice(0, 10);

  if (!batch) {
    return {
      batchDate: today,
      shiftPlanId: '',
      notes: '',
    };
  }

  return {
    id: batch.id,
    batchDate: batch.batchDate,
    shiftPlanId: batch.shiftPlanId || '',
    notes: batch.notes || '',
  };
}

const AttendanceBatchDialog: React.FC<AttendanceBatchDialogProps> = ({
  open,
  batch,
  shiftPlans,
  saving,
  onClose,
  onSubmit,
}) => {
  const [formValues, setFormValues] = useState<ProductionAttendanceBatchFormValues>(() => buildInitialValues(batch));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setFormValues(buildInitialValues(batch));
    setError(null);
  }, [open, batch]);

  if (!open) return null;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!formValues.batchDate) {
      setError('تاريخ الدفعة مطلوب.');
      return;
    }

    setError(null);
    await onSubmit(formValues);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4" dir="rtl">
      <div className="w-full max-w-2xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              {batch ? 'تعديل دفعة الحضور' : 'إضافة دفعة حضور'}
            </h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              كل دفعة تمثل يوم تشغيل واحد يمكن إرساله بعد المراجعة إلى HR/Payroll.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            aria-label="إغلاق"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 px-6 py-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">تاريخ الدفعة</span>
              <input
                type="date"
                value={formValues.batchDate}
                onChange={(event) => setFormValues((current) => ({ ...current, batchDate: event.target.value }))}
                className={INPUT_CLASS}
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">خطة الوردية</span>
              <select
                value={formValues.shiftPlanId}
                onChange={(event) => setFormValues((current) => ({ ...current, shiftPlanId: event.target.value }))}
                className={INPUT_CLASS}
              >
                <option value="">بدون ربط بخطة</option>
                {shiftPlans.map((plan) => (
                  <option key={plan.id} value={plan.id}>
                    {plan.name} ({plan.periodStart} - {plan.periodEnd})
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">ملاحظات</span>
            <textarea
              value={formValues.notes}
              onChange={(event) => setFormValues((current) => ({ ...current, notes: event.target.value }))}
              className={TEXTAREA_CLASS}
              placeholder="أي ملاحظات تشغيلية أو أسباب استثنائية لهذه الدفعة"
            />
          </label>

          {error ? <p className="text-sm text-rose-600 dark:text-rose-300">{error}</p> : null}

          <div className="flex items-center justify-end gap-3 border-t border-slate-200 pt-4 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <CheckIcon className="h-4 w-4" />
              {saving ? 'جارٍ الحفظ...' : 'حفظ الدفعة'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AttendanceBatchDialog;
