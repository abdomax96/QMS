// ==================== Departments Management Page ====================
// Food Industry (Biscuits Manufacturing) - Department & Module Assignment

import React from 'react';
import DepartmentManagement from '../components/departments/DepartmentManagement';
import { Building2, Info } from 'lucide-react';

export default function DepartmentsPage() {
  return (
    <div className="h-full flex flex-col">
      {/* Page Header */}
      <div className="bg-gradient-to-l from-blue-600 to-indigo-700 text-white p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-3">
              <Building2 className="w-7 h-7" />
              إدارة الأقسام والوحدات
            </h1>
            <p className="text-blue-100 mt-1">
              تعيين الوحدات والصلاحيات لكل قسم • عزل البيانات بين الأقسام
            </p>
          </div>
          
          <div className="bg-white/10 backdrop-blur rounded-lg p-4 max-w-md">
            <div className="flex items-start gap-2">
              <Info className="w-5 h-5 text-blue-200 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-100">
                <p className="font-medium text-white mb-1">عزل البيانات</p>
                <p>
                  الوحدات المعلّمة بـ "بيانات معزولة" تعني أن كل قسم يرى فقط البيانات الخاصة به.
                  مثلاً: نماذج الجودة لا تظهر لقسم الإنتاج والعكس.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <DepartmentManagement />
      </div>
    </div>
  );
}










