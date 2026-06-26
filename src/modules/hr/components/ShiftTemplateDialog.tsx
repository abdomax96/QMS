import React, { useEffect, useState } from 'react';
import { CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';
import type { HrShiftTemplateFormValues, HrShiftTemplateItem } from '../types';

interface ShiftTemplateDialogProps {
  open: boolean;
  template: HrShiftTemplateItem | null;
  saving: boolean;
  onClose: () => void;
  onSubmit: (values: HrShiftTemplateFormValues) => Promise<void>;
}

const INPUT_CLASS =
  'w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-emerald-400 dark:focus:ring-emerald-900/40';

const TEXTAREA_CLASS = `${INPUT_CLASS} min-h-[96px] resize-y`;

function buildInitialValues(template: HrShiftTemplateItem | null): HrShiftTemplateFormValues {
  if (!template) {
    return {
      code: '',
      name: '',
      startTime: '08:00',
      endTime: '16:00',
      hoursCount: '8',
      breakMinutes: '0',
      isNightShift: false,
      notes: '',
    };
  }

  return {
    id: template.id,
    code: template.code || '',
    name: template.name || '',
    startTime: template.startTime,
    endTime: template.endTime,
    hoursCount: String(template.hoursCount),
    breakMinutes: String(template.breakMinutes),
    isNightShift: template.isNightShift,
    notes: template.notes || '',
  };
}

const ShiftTemplateDialog: React.FC<ShiftTemplateDialogProps> = ({
  open,
  template,
  saving,
  onClose,
  onSubmit,
}) => {
  const [formValues, setFormValues] = useState<HrShiftTemplateFormValues>(() => buildInitialValues(template));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setFormValues(buildInitialValues(template));
    setError(null);
  }, [open, template]);

  if (!open) return null;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!formValues.name.trim()) {
      setError('اسم قالب الوردية مطلوب.');
      return;
    }

    if (!formValues.startTime || !formValues.endTime) {
      setError('وقت البداية والنهاية مطلوبان.');
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
              {template ? 'تعديل قالب وردية' : 'إضافة قالب وردية'}
            </h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              القالب يحدد ساعات الوردية الأساسية ويعاد استخدامه داخل خطط التسكين.
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
              <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">الكود</span>
              <input
                type="text"
                value={formValues.code}
                onChange={(event) => setFormValues((current) => ({ ...current, code: event.target.value }))}
                className={INPUT_CLASS}
                placeholder="SHIFT-A"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">اسم القالب</span>
              <input
                type="text"
                value={formValues.name}
                onChange={(event) => setFormValues((current) => ({ ...current, name: event.target.value }))}
                className={INPUT_CLASS}
                placeholder="صباحية / مسائية"
              />
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">وقت البداية</span>
              <input
                type="time"
                value={formValues.startTime}
                onChange={(event) => setFormValues((current) => ({ ...current, startTime: event.target.value }))}
                className={INPUT_CLASS}
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">وقت النهاية</span>
              <input
                type="time"
                value={formValues.endTime}
                onChange={(event) => setFormValues((current) => ({ ...current, endTime: event.target.value }))}
                className={INPUT_CLASS}
              />
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">عدد الساعات</span>
              <input
                type="number"
                min="0"
                step="0.5"
                value={formValues.hoursCount}
                onChange={(event) => setFormValues((current) => ({ ...current, hoursCount: event.target.value }))}
                className={INPUT_CLASS}
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">دقائق الراحة</span>
              <input
                type="number"
                min="0"
                step="5"
                value={formValues.breakMinutes}
                onChange={(event) => setFormValues((current) => ({ ...current, breakMinutes: event.target.value }))}
                className={INPUT_CLASS}
              />
            </label>
          </div>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">ملاحظات</span>
            <textarea
              value={formValues.notes}
              onChange={(event) => setFormValues((current) => ({ ...current, notes: event.target.value }))}
              className={TEXTAREA_CLASS}
              placeholder="أي ملاحظات تشغيلية بخصوص هذه الوردية"
            />
          </label>

          <label className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">
            <input
              type="checkbox"
              checked={formValues.isNightShift}
              onChange={(event) => setFormValues((current) => ({ ...current, isNightShift: event.target.checked }))}
              className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
            />
            هذه وردية ليلية
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
              {saving ? 'جارٍ الحفظ...' : 'حفظ القالب'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ShiftTemplateDialog;
