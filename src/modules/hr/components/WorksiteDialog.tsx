import React, { useEffect, useState } from 'react';
import { CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';
import type { HrWorksiteFormValues, HrWorksiteItem } from '../types';

interface WorksiteDialogProps {
  open: boolean;
  worksite: HrWorksiteItem | null;
  saving: boolean;
  onClose: () => void;
  onSubmit: (values: HrWorksiteFormValues) => Promise<void>;
}

const INPUT_CLASS =
  'w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-emerald-400 dark:focus:ring-emerald-900/40';

const TEXTAREA_CLASS = `${INPUT_CLASS} min-h-[96px] resize-y`;

function buildInitialValues(worksite: HrWorksiteItem | null): HrWorksiteFormValues {
  if (!worksite) {
    return {
      code: '',
      name: '',
      description: '',
      isActive: true,
      isDefault: false,
    };
  }

  return {
    id: worksite.id,
    code: worksite.code || '',
    name: worksite.name || '',
    description: worksite.description || '',
    isActive: worksite.isActive,
    isDefault: worksite.isDefault,
  };
}

const WorksiteDialog: React.FC<WorksiteDialogProps> = ({
  open,
  worksite,
  saving,
  onClose,
  onSubmit,
}) => {
  const [formValues, setFormValues] = useState<HrWorksiteFormValues>(() => buildInitialValues(worksite));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setFormValues(buildInitialValues(worksite));
    setError(null);
  }, [open, worksite]);

  if (!open) return null;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!formValues.name.trim()) {
      setError('اسم موقع العمل مطلوب.');
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
              {worksite ? 'تعديل موقع العمل' : 'إضافة موقع عمل'}
            </h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              المواقع تُستخدم في التسكين والورديات والتقارير الشهرية.
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
                onChange={(event) =>
                  setFormValues((current) => ({
                    ...current,
                    code: event.target.value,
                  }))
                }
                className={INPUT_CLASS}
                placeholder="WS-01"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">اسم الموقع</span>
              <input
                type="text"
                value={formValues.name}
                onChange={(event) =>
                  setFormValues((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                className={INPUT_CLASS}
                placeholder="مكتب الجيزة / مصنع 1"
              />
            </label>
          </div>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">وصف مختصر</span>
            <textarea
              value={formValues.description}
              onChange={(event) =>
                setFormValues((current) => ({
                  ...current,
                  description: event.target.value,
                }))
              }
              className={TEXTAREA_CLASS}
              placeholder="ملاحظات عن طبيعة الموقع أو تغطيته التشغيلية"
            />
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">
              <input
                type="checkbox"
                checked={formValues.isActive}
                onChange={(event) =>
                  setFormValues((current) => ({
                    ...current,
                    isActive: event.target.checked,
                  }))
                }
                className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
              />
              الموقع نشط
            </label>

            <label className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">
              <input
                type="checkbox"
                checked={formValues.isDefault}
                onChange={(event) =>
                  setFormValues((current) => ({
                    ...current,
                    isDefault: event.target.checked,
                  }))
                }
                className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
              />
              الموقع الافتراضي للنظام
            </label>
          </div>

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
              {saving ? 'جارٍ الحفظ...' : 'حفظ الموقع'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default WorksiteDialog;
