export const HR_MODULE_CODE = 'hr';

export const HR_NAV_ITEMS = [
  { path: '/hr/dashboard', label: 'لوحة الموارد البشرية', description: 'مؤشرات التشغيل، جاهزية البيانات، والتكامل مع الإنتاج.' },
  { path: '/hr/employees', label: 'العاملون', description: 'ملفات العاملين، اليومية، والربط مع الحسابات.' },
  { path: '/hr/transport', label: 'النقل وخطوط السير', description: 'الخطوط، السيارات، والتسكين الافتراضي للعامل.' },
  { path: '/hr/shifts', label: 'الورديات', description: 'قوالب الورديات والخطط المنشورة والمستقبلية.' },
  { path: '/hr/requests', label: 'الطلبات', description: 'طلبات الإجازات والمأموريات وتسويات الحضور.' },
  { path: '/hr/penalties', label: 'الجزاءات', description: 'أنواع الجزاءات والسجلات القابلة للطباعة.' },
  { path: '/hr/payroll', label: 'المرتبات', description: 'فترات التشغيل، الجريّات، واعتماد النتائج.' },
  { path: '/hr/settings', label: 'إعدادات HR', description: 'المواقع، السياسات، أنواع الإجازات ومسارات الاعتماد.' },
  { path: '/hr/reports', label: 'التقارير', description: 'قوائم وتقارير شهرية وإدارية قابلة للتوسع.' },
] as const;
