import React, { useEffect, useState } from 'react';
import { CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';
import type {
  HrEmployeeFormOptions,
  HrEmployeeFormValues,
  HrEmployeeListItem,
  HrEmploymentStatus,
  HrWorkerType,
} from '../types';

interface EmployeeProfileDialogProps {
  open: boolean;
  employee: HrEmployeeListItem | null;
  options: HrEmployeeFormOptions;
  saving: boolean;
  onClose: () => void;
  onSubmit: (values: HrEmployeeFormValues) => Promise<void>;
}

const INPUT_CLASS =
  'w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-emerald-400 dark:focus:ring-emerald-900/40';

const TEXTAREA_CLASS = `${INPUT_CLASS} min-h-[96px] resize-y`;

function buildInitialValues(
  employee: HrEmployeeListItem | null,
  options: HrEmployeeFormOptions
): HrEmployeeFormValues {
  const defaultWorksite = options.worksites.find((item) => item.isDefault);

  if (!employee) {
    return {
      profileId: null,
      baseEmployeeCode: '',
      name: '',
      email: '',
      workerType: 'regular',
      internalEmployeeCode: '',
      originalEmployeeCode: '',
      departmentId: '',
      worksiteId: defaultWorksite?.id || '',
      jobTitleText: '',
      employmentStatus: 'active',
      notes: '',
      isActive: true,
    };
  }

  return {
    id: employee.id,
    profileId: employee.profileId,
    baseEmployeeCode: employee.baseEmployeeCode || '',
    name: employee.name || '',
    email: employee.email || '',
    workerType: employee.workerType || 'regular',
    internalEmployeeCode: employee.baseEmployeeCode || '',
    originalEmployeeCode: employee.baseEmployeeCode || '',
    departmentId: employee.departmentId || '',
    worksiteId: employee.worksiteId || defaultWorksite?.id || '',
    jobTitleText: employee.jobTitleText || '',
    employmentStatus: employee.employmentStatus || 'active',
    notes: employee.notes || '',
    isActive: employee.isActive,
  };
}

function normalizeStatus(status: HrEmploymentStatus, isActive: boolean): HrEmploymentStatus {
  if (!isActive && status === 'active') {
    return 'inactive';
  }

  if (isActive && status === 'inactive') {
    return 'active';
  }

  return status;
}

const EmployeeProfileDialog: React.FC<EmployeeProfileDialogProps> = ({
  open,
  employee,
  options,
  saving,
  onClose,
  onSubmit,
}) => {
  const [formValues, setFormValues] = useState<HrEmployeeFormValues>(() => buildInitialValues(employee, options));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setFormValues(buildInitialValues(employee, options));
    setError(null);
  }, [open, employee, options]);

  if (!open) return null;

  const handleWorkerTypeChange = (workerType: HrWorkerType) => {
    setFormValues((current) => ({
      ...current,
      workerType,
    }));
  };

  const handleActiveChange = (isActive: boolean) => {
    setFormValues((current) => ({
      ...current,
      isActive,
      employmentStatus: normalizeStatus(current.employmentStatus, isActive),
    }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!formValues.baseEmployeeCode.trim()) {
      setError('تكويد العامل مطلوب.');
      return;
    }

    if (!formValues.name.trim()) {
      setError('اسم العامل مطلوب.');
      return;
    }

    setError(null);
    await onSubmit({
      ...formValues,
      employmentStatus: normalizeStatus(formValues.employmentStatus, formValues.isActive),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4" dir="rtl">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              {employee ? 'تعديل ملف عامل' : 'إضافة عامل جديد'}
            </h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              يتم الحفظ في الدليل المركزي `company_employees` مع طبقة HR التفصيلية المرتبطة به.
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

        <form onSubmit={handleSubmit} className="flex max-h-[calc(90vh-80px)] flex-col">
          <div className="grid gap-6 overflow-y-auto px-6 py-5 lg:grid-cols-2">
            <section className="space-y-4">
              <div>
                <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">البيانات الأساسية</h4>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  هذه الحقول تمثل السجل الرئيسي للعامل داخل الشركة.
                </p>
              </div>

              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">التكويد</span>
                <input
                  type="text"
                  value={formValues.baseEmployeeCode}
                  onChange={(event) =>
                    setFormValues((current) => ({
                      ...current,
                      baseEmployeeCode: event.target.value,
                      internalEmployeeCode: event.target.value,
                      originalEmployeeCode: event.target.value,
                    }))
                  }
                  className={INPUT_CLASS}
                  placeholder="EMP-001"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">اسم العامل</span>
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
                  placeholder="الاسم الكامل"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">البريد الإلكتروني</span>
                <input
                  type="email"
                  value={formValues.email}
                  onChange={(event) =>
                    setFormValues((current) => ({
                      ...current,
                      email: event.target.value,
                    }))
                  }
                  className={INPUT_CLASS}
                  placeholder="name@company.com"
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">نوع العامل</span>
                  <select
                    value={formValues.workerType}
                    onChange={(event) => handleWorkerTypeChange(event.target.value as HrWorkerType)}
                    className={INPUT_CLASS}
                  >
                    <option value="regular">عامل دائم</option>
                    <option value="daily">عامل يومية</option>
                  </select>
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">الحالة التشغيلية</span>
                  <select
                    value={formValues.employmentStatus}
                    onChange={(event) =>
                      setFormValues((current) => ({
                        ...current,
                        employmentStatus: event.target.value as HrEmploymentStatus,
                        isActive: event.target.value !== 'inactive' && event.target.value !== 'archived',
                      }))
                    }
                    className={INPUT_CLASS}
                  >
                    <option value="active">نشط</option>
                    <option value="inactive">غير نشط</option>
                    <option value="suspended">موقوف</option>
                    <option value="archived">مؤرشف</option>
                  </select>
                </label>
              </div>
            </section>

            <section className="space-y-4">
              <div>
                <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">بيانات HR التفصيلية</h4>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  يتم استخدام نفس التكويد داخل الدليل وملف HR مع تحديد القسم والموقع والوظيفة الحالية.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">القسم</span>
                  <select
                    value={formValues.departmentId}
                    onChange={(event) =>
                      setFormValues((current) => ({
                        ...current,
                        departmentId: event.target.value,
                      }))
                    }
                    className={INPUT_CLASS}
                  >
                    <option value="">بدون قسم</option>
                    {options.departments.map((department) => (
                      <option key={department.id} value={department.id}>
                        {department.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">موقع العمل</span>
                  <select
                    value={formValues.worksiteId}
                    onChange={(event) =>
                      setFormValues((current) => ({
                        ...current,
                        worksiteId: event.target.value,
                      }))
                    }
                    className={INPUT_CLASS}
                  >
                    <option value="">بدون موقع</option>
                    {options.worksites.map((worksite) => (
                      <option key={worksite.id} value={worksite.id}>
                        {worksite.name}
                        {worksite.isDefault ? ' (الافتراضي)' : ''}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">المسمى الوظيفي</span>
                <input
                  type="text"
                  value={formValues.jobTitleText}
                  onChange={(event) =>
                    setFormValues((current) => ({
                      ...current,
                      jobTitleText: event.target.value,
                    }))
                  }
                  className={INPUT_CLASS}
                  placeholder="مشغل خط / سائق / فني ..."
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">ملاحظات</span>
                <textarea
                  value={formValues.notes}
                  onChange={(event) =>
                    setFormValues((current) => ({
                      ...current,
                      notes: event.target.value,
                    }))
                  }
                  className={TEXTAREA_CLASS}
                  placeholder="أي ملاحظات مهمة بخصوص العامل أو التسكين الحالي"
                />
              </label>

              <label className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={formValues.isActive}
                  onChange={(event) => handleActiveChange(event.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                العامل نشط حالياً داخل النظام
              </label>
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
                {saving ? 'جارٍ الحفظ...' : 'حفظ العامل'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EmployeeProfileDialog;
