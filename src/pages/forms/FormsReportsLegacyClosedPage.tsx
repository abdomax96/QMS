import { ArrowLeftIcon, TableCellsIcon } from '@heroicons/react/24/outline';
import { useNavigate } from 'react-router-dom';
import { FORMS_REPORTS_HOME } from '../../constants/formsReportsRoutes';

export default function FormsReportsLegacyClosedPage() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-xl rounded-lg border border-slate-200 bg-white p-6 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300">
          <TableCellsIcon className="h-6 w-6" />
        </div>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
          تم إغلاق الواجهة القديمة للنماذج والسجلات
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
          الواجهة المعتمدة الآن هي صفحة الجداول الجديدة فقط. استخدم الرابط الجديد لمتابعة النماذج والتقارير.
        </p>
        <button
          type="button"
          onClick={() => navigate(FORMS_REPORTS_HOME, { replace: true })}
          className="mt-5 inline-flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700"
        >
          الذهاب للواجهة الجديدة
          <ArrowLeftIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
