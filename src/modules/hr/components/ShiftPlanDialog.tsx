import React, { useEffect, useState } from 'react';
import {
  CheckIcon,
  PlusIcon,
  TrashIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import type {
  HrShiftAssignmentFormValue,
  HrShiftPlanFormValues,
  HrShiftPlanningOptions,
} from '../types';

interface ShiftPlanDialogProps {
  open: boolean;
  values: HrShiftPlanFormValues | null;
  options: HrShiftPlanningOptions;
  saving: boolean;
  onClose: () => void;
  onSubmit: (values: HrShiftPlanFormValues) => Promise<void>;
}

const INPUT_CLASS =
  'w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-emerald-400 dark:focus:ring-emerald-900/40';

const TEXTAREA_CLASS = `${INPUT_CLASS} min-h-[88px] resize-y`;

function createEmptyAssignment(workDate = ''): HrShiftAssignmentFormValue {
  return {
    employeeProfileId: '',
    shiftTemplateId: '',
    workDate,
    notes: '',
    isPrimary: true,
  };
}

function buildInitialValues(values: HrShiftPlanFormValues | null): HrShiftPlanFormValues {
  const today = new Date().toISOString().slice(0, 10);

  if (!values) {
    return {
      name: '',
      periodStart: today,
      periodEnd: today,
      notes: '',
      assignments: [createEmptyAssignment(today)],
    };
  }

  return {
    ...values,
    assignments: values.assignments.length > 0 ? values.assignments : [createEmptyAssignment(values.periodStart)],
  };
}

const ShiftPlanDialog: React.FC<ShiftPlanDialogProps> = ({
  open,
  values,
  options,
  saving,
  onClose,
  onSubmit,
}) => {
  const [formValues, setFormValues] = useState<HrShiftPlanFormValues>(() => buildInitialValues(values));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setFormValues(buildInitialValues(values));
    setError(null);
  }, [open, values]);

  if (!open) return null;

  const setAssignmentValue = (
    index: number,
    key: keyof HrShiftAssignmentFormValue,
    value: string | boolean
  ) => {
    setFormValues((current) => ({
      ...current,
      assignments: current.assignments.map((assignment, assignmentIndex) =>
        assignmentIndex === index
          ? { ...assignment, [key]: value }
          : assignment
      ),
    }));
  };

  const addAssignment = () => {
    setFormValues((current) => ({
      ...current,
      assignments: [...current.assignments, createEmptyAssignment(current.periodStart)],
    }));
  };

  const removeAssignment = (index: number) => {
    setFormValues((current) => ({
      ...current,
      assignments:
        current.assignments.length === 1
          ? [createEmptyAssignment(current.periodStart)]
          : current.assignments.filter((_, assignmentIndex) => assignmentIndex !== index),
    }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!formValues.name.trim()) {
      setError('اسم الخطة مطلوب.');
      return;
    }

    if (!formValues.periodStart || !formValues.periodEnd) {
      setError('فترة الخطة مطلوبة.');
      return;
    }

    if (formValues.periodEnd < formValues.periodStart) {
      setError('تاريخ نهاية الخطة يجب أن يكون بعد أو يساوي تاريخ البداية.');
      return;
    }

    const completeAssignments = formValues.assignments.filter(
      (assignment) => assignment.employeeProfileId && assignment.shiftTemplateId && assignment.workDate
    );

    if (completeAssignments.length === 0) {
      setError('أضف على الأقل عاملًا واحدًا داخل الخطة.');
      return;
    }

    const invalidAssignment = completeAssignments.find(
      (assignment) =>
        assignment.workDate < formValues.periodStart || assignment.workDate > formValues.periodEnd
    );

    if (invalidAssignment) {
      setError('تاريخ أي تسكين يجب أن يقع داخل فترة الخطة.');
      return;
    }

    setError(null);
    await onSubmit({
      ...formValues,
      assignments: completeAssignments,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4" dir="rtl">
      <div className="max-h-[92vh] w-full max-w-6xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              {values?.id ? 'تعديل خطة ورديات' : 'إضافة خطة ورديات'}
            </h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              يمكنك بناء الخطة وتسكين العاملين عليها قبل النشر للاعتماد التشغيلي.
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

        <form onSubmit={handleSubmit} className="flex max-h-[calc(92vh-80px)] flex-col">
          <div className="grid gap-6 overflow-y-auto px-6 py-5 xl:grid-cols-[320px,minmax(0,1fr)]">
            <section className="space-y-4">
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">اسم الخطة</span>
                <input
                  type="text"
                  value={formValues.name}
                  onChange={(event) => setFormValues((current) => ({ ...current, name: event.target.value }))}
                  className={INPUT_CLASS}
                  placeholder="خطة أبريل 2026"
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">من</span>
                  <input
                    type="date"
                    value={formValues.periodStart}
                    onChange={(event) => setFormValues((current) => ({ ...current, periodStart: event.target.value }))}
                    className={INPUT_CLASS}
                  />
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">إلى</span>
                  <input
                    type="date"
                    value={formValues.periodEnd}
                    onChange={(event) => setFormValues((current) => ({ ...current, periodEnd: event.target.value }))}
                    className={INPUT_CLASS}
                  />
                </label>
              </div>

              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">ملاحظات عامة</span>
                <textarea
                  value={formValues.notes}
                  onChange={(event) => setFormValues((current) => ({ ...current, notes: event.target.value }))}
                  className={TEXTAREA_CLASS}
                  placeholder="ملاحظات على الخطة أو منطق توزيع الورديات"
                />
              </label>

              <div className="border border-slate-200 px-4 py-3 text-sm text-slate-600 dark:border-slate-700 dark:text-slate-300">
                <p className="font-medium text-slate-900 dark:text-slate-100">معلومة سريعة</p>
                <p className="mt-2">
                  يمكن لاحقاً تطوير نفس الخطة لدعم التسكين الجماعي وتغيير الخطة أثناء السريان مع حفظ الإصدارات.
                </p>
              </div>
            </section>

            <section className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">تسكين العاملين</h4>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    اختر العامل والقالب وتاريخ العمل لكل سجل داخل الخطة.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={addAssignment}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  <PlusIcon className="h-4 w-4" />
                  إضافة تسكين
                </button>
              </div>

              <div className="overflow-x-auto border border-slate-200 dark:border-slate-700">
                <table className="min-w-[980px] w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-right text-slate-500 dark:border-slate-700 dark:text-slate-400">
                      <th className="px-3 py-3 font-medium">العامل</th>
                      <th className="px-3 py-3 font-medium">قالب الوردية</th>
                      <th className="px-3 py-3 font-medium">تاريخ العمل</th>
                      <th className="px-3 py-3 font-medium">ملاحظات</th>
                      <th className="px-3 py-3 font-medium">أساسي</th>
                      <th className="px-3 py-3 font-medium">حذف</th>
                    </tr>
                  </thead>
                  <tbody>
                    {formValues.assignments.map((assignment, index) => (
                      <tr key={`${assignment.id || 'new'}-${index}`} className="border-b border-slate-100 align-top text-slate-700 dark:border-slate-800 dark:text-slate-200">
                        <td className="px-3 py-3">
                          <select
                            value={assignment.employeeProfileId}
                            onChange={(event) => setAssignmentValue(index, 'employeeProfileId', event.target.value)}
                            className={INPUT_CLASS}
                          >
                            <option value="">اختر العامل</option>
                            {options.employeeProfiles.map((employee) => (
                              <option key={employee.id} value={employee.id}>
                                {employee.name} {employee.baseEmployeeCode ? `(${employee.baseEmployeeCode})` : ''}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-3">
                          <select
                            value={assignment.shiftTemplateId}
                            onChange={(event) => setAssignmentValue(index, 'shiftTemplateId', event.target.value)}
                            className={INPUT_CLASS}
                          >
                            <option value="">اختر القالب</option>
                            {options.shiftTemplates.map((template) => (
                              <option key={template.id} value={template.id}>
                                {template.name} ({template.startTime} - {template.endTime})
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-3">
                          <input
                            type="date"
                            value={assignment.workDate}
                            onChange={(event) => setAssignmentValue(index, 'workDate', event.target.value)}
                            className={INPUT_CLASS}
                          />
                        </td>
                        <td className="px-3 py-3">
                          <input
                            type="text"
                            value={assignment.notes}
                            onChange={(event) => setAssignmentValue(index, 'notes', event.target.value)}
                            className={INPUT_CLASS}
                            placeholder="أي ملاحظات خاصة بهذا التسكين"
                          />
                        </td>
                        <td className="px-3 py-3">
                          <label className="inline-flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                            <input
                              type="checkbox"
                              checked={assignment.isPrimary}
                              onChange={(event) => setAssignmentValue(index, 'isPrimary', event.target.checked)}
                              className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                            />
                            أساسي
                          </label>
                        </td>
                        <td className="px-3 py-3">
                          <button
                            type="button"
                            onClick={() => removeAssignment(index)}
                            className="inline-flex items-center gap-1 rounded-lg bg-rose-100 px-3 py-2 text-xs font-medium text-rose-700 transition hover:bg-rose-200 dark:bg-rose-900/30 dark:text-rose-300"
                          >
                            <TrashIcon className="h-4 w-4" />
                            حذف
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>

          <div className="border-t border-slate-200 px-6 py-4 dark:border-slate-800">
            {error ? <p className="mb-3 text-sm text-rose-600 dark:text-rose-300">{error}</p> : null}
            <div className="flex items-center justify-end gap-3">
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
                {saving ? 'جارٍ الحفظ...' : 'حفظ الخطة'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ShiftPlanDialog;
