import React from 'react';

const LabV2SettingsPage: React.FC = () => {
  return (
    <div className="p-6 min-h-screen bg-slate-50 dark:bg-slate-900" dir="rtl">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">إعدادات المختبر (V2)</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          إعدادات الموديول سيتم إضافتها لاحقاً (صلاحيات، حقول مخصصة، إعدادات الترقيم).
        </p>
      </div>
    </div>
  );
};

export default LabV2SettingsPage;

