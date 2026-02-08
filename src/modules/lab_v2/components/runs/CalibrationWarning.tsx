import React from 'react';
import { ExclamationTriangleIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

export const CalibrationWarning: React.FC<{
  calibration_due_date?: string | null;
}> = ({ calibration_due_date }) => {
  if (!calibration_due_date) {
    return (
      <div className="flex items-start gap-2 p-3 rounded-lg border bg-slate-50 border-slate-200 text-slate-700" dir="rtl">
        <ExclamationTriangleIcon className="w-5 h-5 text-amber-600 mt-0.5" />
        <div className="text-sm">
          لا يوجد تاريخ معايرة محدد لهذا الجهاز.
        </div>
      </div>
    );
  }

  const due = new Date(calibration_due_date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const isExpired = due.getTime() < today.getTime();
  const isSoon = !isExpired && due.getTime() - today.getTime() <= 1000 * 60 * 60 * 24 * 14; // 14 days

  if (isExpired) {
    return (
      <div className="flex items-start gap-2 p-3 rounded-lg border bg-rose-50 border-rose-200 text-rose-800" dir="rtl">
        <ExclamationTriangleIcon className="w-5 h-5 text-rose-700 mt-0.5" />
        <div className="text-sm">
          معايرة الجهاز منتهية. تاريخ الاستحقاق: <span className="font-medium">{calibration_due_date}</span>
        </div>
      </div>
    );
  }

  if (isSoon) {
    return (
      <div className="flex items-start gap-2 p-3 rounded-lg border bg-amber-50 border-amber-200 text-amber-800" dir="rtl">
        <ExclamationTriangleIcon className="w-5 h-5 text-amber-700 mt-0.5" />
        <div className="text-sm">
          معايرة الجهاز قريبة. تاريخ الاستحقاق: <span className="font-medium">{calibration_due_date}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2 p-3 rounded-lg border bg-emerald-50 border-emerald-200 text-emerald-800" dir="rtl">
      <CheckCircleIcon className="w-5 h-5 text-emerald-700 mt-0.5" />
      <div className="text-sm">
        معايرة الجهاز سارية. تاريخ الاستحقاق: <span className="font-medium">{calibration_due_date}</span>
      </div>
    </div>
  );
};

export default CalibrationWarning;

