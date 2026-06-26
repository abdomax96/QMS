import React, { useEffect, useState } from 'react';
import { CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';
import type {
  HrEmployeeProfileOption,
  ProductionAttendanceEventFormValues,
  ProductionAttendanceEventItem,
} from '../types';

interface AttendanceEventDialogProps {
  open: boolean;
  event: ProductionAttendanceEventItem | null;
  employees: HrEmployeeProfileOption[];
  batchId: string;
  batchDate: string;
  saving: boolean;
  onClose: () => void;
  onSubmit: (values: ProductionAttendanceEventFormValues) => Promise<void>;
}

const INPUT_CLASS =
  'w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-emerald-400 dark:focus:ring-emerald-900/40';

const TEXTAREA_CLASS = `${INPUT_CLASS} min-h-[96px] resize-y`;

function toTimeValue(dateTime: string | null) {
  if (!dateTime) return '';
  return new Date(dateTime).toISOString().slice(11, 16);
}

function buildInitialValues(
  event: ProductionAttendanceEventItem | null,
  batchId: string,
  batchDate: string
): ProductionAttendanceEventFormValues {
  if (!event) {
    return {
      reviewBatchId: batchId,
      employeeProfileId: '',
      eventDate: batchDate,
      attendanceStatus: 'present',
      checkInAt: '',
      checkOutAt: '',
      shiftAssignmentId: '',
      notes: '',
    };
  }

  return {
    id: event.id,
    reviewBatchId: event.reviewBatchId || batchId,
    employeeProfileId: event.employeeProfileId || '',
    eventDate: event.eventDate || batchDate,
    attendanceStatus: event.attendanceStatus,
    checkInAt: toTimeValue(event.checkInAt),
    checkOutAt: toTimeValue(event.checkOutAt),
    shiftAssignmentId: event.shiftAssignmentId || '',
    notes: event.notes || '',
  };
}

const AttendanceEventDialog: React.FC<AttendanceEventDialogProps> = ({
  open,
  event,
  employees,
  batchId,
  batchDate,
  saving,
  onClose,
  onSubmit,
}) => {
  const [formValues, setFormValues] = useState<ProductionAttendanceEventFormValues>(() =>
    buildInitialValues(event, batchId, batchDate)
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setFormValues(buildInitialValues(event, batchId, batchDate));
    setError(null);
  }, [open, event, batchId, batchDate]);

  if (!open) return null;

  const handleSubmit = async (submitEvent: React.FormEvent<HTMLFormElement>) => {
    submitEvent.preventDefault();

    if (!formValues.employeeProfileId) {
      setError('اختر العامل أولاً.');
      return;
    }

    if (!formValues.eventDate) {
      setError('تاريخ الحضور مطلوب.');
      return;
    }

    setError(null);
    await onSubmit(formValues);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4" dir="rtl">
      <div className="w-full max-w-3xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              {event ? 'تعديل سجل حضور' : 'إضافة سجل حضور'}
            </h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              السجل يضاف إلى الدفعة الحالية ثم يرسل للمراجعة والاعتماد.
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
            <label className="block sm:col-span-2">
              <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">العامل</span>
              <select
                value={formValues.employeeProfileId}
                onChange={(changeEvent) => setFormValues((current) => ({ ...current, employeeProfileId: changeEvent.target.value }))}
                className={INPUT_CLASS}
              >
                <option value="">اختر العامل</option>
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.name} {employee.baseEmployeeCode ? `(${employee.baseEmployeeCode})` : ''}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">التاريخ</span>
              <input
                type="date"
                value={formValues.eventDate}
                onChange={(changeEvent) => setFormValues((current) => ({ ...current, eventDate: changeEvent.target.value }))}
                className={INPUT_CLASS}
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">الحالة</span>
              <select
                value={formValues.attendanceStatus}
                onChange={(changeEvent) => setFormValues((current) => ({ ...current, attendanceStatus: changeEvent.target.value }))}
                className={INPUT_CLASS}
              >
                <option value="present">حضور</option>
                <option value="absent">غياب</option>
                <option value="leave">إجازة</option>
                <option value="mission">مأمورية</option>
                <option value="permission">إذن</option>
                <option value="holiday">عطلة رسمية</option>
                <option value="off">راحة</option>
              </select>
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">وقت الحضور</span>
              <input
                type="time"
                value={formValues.checkInAt}
                onChange={(changeEvent) => setFormValues((current) => ({ ...current, checkInAt: changeEvent.target.value }))}
                className={INPUT_CLASS}
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">وقت الانصراف</span>
              <input
                type="time"
                value={formValues.checkOutAt}
                onChange={(changeEvent) => setFormValues((current) => ({ ...current, checkOutAt: changeEvent.target.value }))}
                className={INPUT_CLASS}
              />
            </label>
          </div>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">ملاحظات</span>
            <textarea
              value={formValues.notes}
              onChange={(changeEvent) => setFormValues((current) => ({ ...current, notes: changeEvent.target.value }))}
              className={TEXTAREA_CLASS}
              placeholder="أي ملاحظات بخصوص حالة هذا العامل في هذا اليوم"
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
              {saving ? 'جارٍ الحفظ...' : 'حفظ السجل'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AttendanceEventDialog;
