import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BeakerIcon,
  CubeIcon,
  Cog6ToothIcon,
  TruckIcon,
  WrenchScrewdriverIcon,
  ClipboardDocumentCheckIcon,
  BuildingStorefrontIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { usePermissions } from '../../../hooks/ncr/usePermissions';
import {
  createLabPackagingSubtype,
  createLabPackagingType,
  getLabPackagingSettingsTree,
  toggleLabPackagingSubtypeActive,
  toggleLabPackagingTypeActive,
  updateLabPackagingSubtype,
  updateLabPackagingType,
  type LabPackagingSubtype,
  type LabPackagingType,
} from '../../../services/labPackagingSettingsService';
import {
  DEFAULT_LAB_V2_RUN_PRINT_SETTINGS,
  getLabV2RunPrintSettings,
  saveLabV2RunPrintSettings,
  type LabV2RunPrintSettingsInput,
} from '../services/runPrintSettingsService';

const LabV2SettingsPage: React.FC = () => {
  const { hasAnyPermission, isAdmin, loading: permissionsLoading } = usePermissions();
  const canView = isAdmin || hasAnyPermission(['lab_tests.view', 'lab.view', 'lab.*']);
  const canEdit = isAdmin || hasAnyPermission(['lab_tests.edit', 'lab.edit', 'lab.*']);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [printSettingsError, setPrintSettingsError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [packagingTypes, setPackagingTypes] = useState<LabPackagingType[]>([]);
  const [printSettings, setPrintSettings] = useState<LabV2RunPrintSettingsInput>(DEFAULT_LAB_V2_RUN_PRINT_SETTINGS);
  const [isPrintSettingsLoading, setIsPrintSettingsLoading] = useState(true);

  const [newTypeName, setNewTypeName] = useState('');
  const [newSubtypeName, setNewSubtypeName] = useState('');
  const [newSubtypeTypeId, setNewSubtypeTypeId] = useState('');

  const loadPackagingTree = async (options?: { silent?: boolean }) => {
    if (!options?.silent) {
      setIsLoading(true);
    }
    try {
      const data = await getLabPackagingSettingsTree({ includeInactive: true });
      setPackagingTypes(data);
      setError(null);

      if (!newSubtypeTypeId && data.length > 0) {
        setNewSubtypeTypeId(data[0].id);
      }
    } catch (err: any) {
      console.error('Error loading packaging settings:', err);
      setError(err?.message || 'تعذر تحميل إعدادات مواد التعبئة والتغليف');
      setPackagingTypes([]);
    } finally {
      if (!options?.silent) {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    void loadPackagingTree();
    void loadPrintSettings();
  }, []);

  const loadPrintSettings = async () => {
    setIsPrintSettingsLoading(true);
    try {
      const settings = await getLabV2RunPrintSettings();
      setPrintSettings({
        document_title: settings.document_title,
        doc_code: settings.doc_code,
        issue_no: settings.issue_no,
        issue_date: settings.issue_date,
        review_no: settings.review_no,
        review_date: settings.review_date,
        footer_note: settings.footer_note,
      });
      setPrintSettingsError(null);
    } catch (err: any) {
      console.error('Error loading run print settings:', err);
      setPrintSettingsError(err?.message || 'تعذر تحميل إعدادات طباعة سجل الفحوصات');
      setPrintSettings(DEFAULT_LAB_V2_RUN_PRINT_SETTINGS);
    } finally {
      setIsPrintSettingsLoading(false);
    }
  };

  const filteredTypes = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return packagingTypes;

    return packagingTypes
      .map((type) => {
        const typeMatch = type.name.toLowerCase().includes(keyword);
        const subtypeMatches = type.subtypes.filter((subtype) => subtype.name.toLowerCase().includes(keyword));

        if (typeMatch) {
          return type;
        }

        if (subtypeMatches.length > 0) {
          return {
            ...type,
            subtypes: subtypeMatches,
          };
        }

        return null;
      })
      .filter(Boolean) as LabPackagingType[];
  }, [packagingTypes, search]);

  const sectionGroups = [
    {
      title: 'الفحوصات',
      icon: BeakerIcon,
      links: [
        { to: '/lab/tests/dashboard', label: 'لوحة الفحوصات' },
        { to: '/lab/tests/results', label: 'نتائج الفحوصات' },
        { to: '/lab/tests/catalog', label: 'كتالوج الفحوصات' },
      ],
    },
    {
      title: 'المواد والاستلام',
      icon: TruckIcon,
      links: [
        { to: '/lab/materials', label: 'المواد الخام' },
        { to: '/lab/receiving', label: 'استلام المواد الخام' },
        { to: '/lab/suppliers', label: 'الموردون' },
        { to: '/lab/inspection-criteria', label: 'معايير الفحص' },
      ],
    },
    {
      title: 'المرجعيات والإعدادات',
      icon: Cog6ToothIcon,
      links: [
        { to: '/lab/settings', label: 'إعدادات المختبر' },
        { to: '/lab/tests/settings', label: 'إعدادات نظام الفحوصات' },
        { to: '/lab/companies', label: 'الشركات' },
      ],
    },
  ];

  const runSave = async (operation: () => Promise<void>) => {
    setIsSaving(true);
    try {
      await operation();
      await loadPackagingTree({ silent: true });
      setError(null);
    } catch (err: any) {
      console.error('Error saving packaging settings:', err);
      setError(err?.message || 'حدث خطأ أثناء حفظ الإعدادات');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSavePrintSettings = async () => {
    if (!canEdit) return;
    setIsSaving(true);
    try {
      const saved = await saveLabV2RunPrintSettings(printSettings);
      setPrintSettings({
        document_title: saved.document_title,
        doc_code: saved.doc_code,
        issue_no: saved.issue_no,
        issue_date: saved.issue_date,
        review_no: saved.review_no,
        review_date: saved.review_date,
        footer_note: saved.footer_note,
      });
      setPrintSettingsError(null);
    } catch (err: any) {
      console.error('Error saving run print settings:', err);
      setPrintSettingsError(err?.message || 'تعذر حفظ إعدادات طباعة سجل الفحوصات');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateType = async () => {
    const name = newTypeName.trim();
    if (!name || !canEdit) return;

    await runSave(async () => {
      await createLabPackagingType({ name, isActive: true });
      setNewTypeName('');
    });
  };

  const handleCreateSubtype = async () => {
    const name = newSubtypeName.trim();
    if (!name || !newSubtypeTypeId || !canEdit) return;

    await runSave(async () => {
      await createLabPackagingSubtype({ packagingTypeId: newSubtypeTypeId, name, isActive: true });
      setNewSubtypeName('');
    });
  };

  const handleRenameType = async (type: LabPackagingType) => {
    if (!canEdit) return;
    const nextName = window.prompt('تعديل اسم النوع الرئيسي', type.name);
    if (nextName === null || !nextName.trim() || nextName.trim() === type.name) return;

    await runSave(async () => {
      await updateLabPackagingType(type.id, { name: nextName.trim() });
    });
  };

  const handleRenameSubtype = async (subtype: LabPackagingSubtype) => {
    if (!canEdit) return;
    const nextName = window.prompt('تعديل اسم النوع الفرعي', subtype.name);
    if (nextName === null || !nextName.trim() || nextName.trim() === subtype.name) return;

    await runSave(async () => {
      await updateLabPackagingSubtype(subtype.id, { name: nextName.trim() });
    });
  };

  const handleToggleType = async (type: LabPackagingType) => {
    if (!canEdit) return;

    if (!type.isActive && type.usageCount > 0) {
      const confirmEnable = window.confirm('هذا النوع مستخدم في مواد خام. هل تريد تفعيله مرة أخرى؟');
      if (!confirmEnable) return;
    }

    if (type.isActive && type.usageCount > 0) {
      const confirmDisable = window.confirm('هذا النوع مستخدم في مواد خام. سيتم تعطيله فقط بدون حذف. متابعة؟');
      if (!confirmDisable) return;
    }

    await runSave(async () => {
      await toggleLabPackagingTypeActive(type.id, !type.isActive);
    });
  };

  const handleToggleSubtype = async (subtype: LabPackagingSubtype) => {
    if (!canEdit) return;

    if (subtype.isActive && subtype.usageCount > 0) {
      const confirmDisable = window.confirm('هذا النوع الفرعي مستخدم في مواد خام. سيتم تعطيله فقط بدون حذف. متابعة؟');
      if (!confirmDisable) return;
    }

    await runSave(async () => {
      await toggleLabPackagingSubtypeActive(subtype.id, !subtype.isActive);
    });
  };

  if (permissionsLoading || isLoading || isPrintSettingsLoading) {
    return (
      <div className="p-6" dir="rtl">
        <div className="h-28 rounded-xl border border-gray-200 bg-white animate-pulse" />
      </div>
    );
  }

  if (!canView) {
    return (
      <div className="p-6" dir="rtl">
        <div className="rounded-xl border border-red-200 bg-red-50 text-red-700 px-4 py-3">
          لا تملك صلاحية عرض إعدادات المختبر.
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 min-h-screen bg-slate-50 dark:bg-slate-900" dir="rtl">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="rounded-xl border border-slate-200 bg-white dark:bg-slate-800 dark:border-slate-700 p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">إعدادات المختبر</h1>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                لوحة موحدة لعناوين المختبر مع إدارة إعدادات مواد التعبئة والتغليف.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                void loadPackagingTree();
                void loadPrintSettings();
              }}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
            >
              <ArrowPathIcon className={`w-4 h-4 ${isSaving ? 'animate-spin' : ''}`} />
              تحديث
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {sectionGroups.map((group) => (
            <div key={group.title} className="rounded-xl border border-slate-200 bg-white dark:bg-slate-800 dark:border-slate-700 p-4">
              <div className="flex items-center gap-2 mb-3">
                <group.icon className="w-5 h-5 text-slate-700 dark:text-slate-300" />
                <h2 className="font-semibold text-slate-900 dark:text-white">{group.title}</h2>
              </div>
              <div className="space-y-2">
                {group.links.map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    className="block rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white dark:bg-slate-800 dark:border-slate-700 p-5 space-y-4">
          <div className="flex items-center gap-2">
            <BuildingStorefrontIcon className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">إعدادات مواد التعبئة والتغليف</h2>
          </div>

          {!canEdit && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 text-amber-700 px-3 py-2 text-sm">
              العرض متاح، لكن التعديل والإضافة والحذف غير متاحين بسبب الصلاحيات.
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 text-red-700 px-3 py-2 text-sm">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="بحث في الأنواع الرئيسية والفرعية"
              className="md:col-span-3 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700"
            />

            <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-3 space-y-2">
              <label className="block text-xs text-slate-600 dark:text-slate-400">إضافة نوع رئيسي</label>
              <input
                type="text"
                value={newTypeName}
                onChange={(e) => setNewTypeName(e.target.value)}
                placeholder="مثال: عبوة"
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700"
                disabled={!canEdit || isSaving}
              />
              <button
                type="button"
                onClick={handleCreateType}
                disabled={!canEdit || isSaving || !newTypeName.trim()}
                className="w-full px-3 py-2 text-sm rounded-lg bg-indigo-600 text-white disabled:opacity-50"
              >
                إضافة
              </button>
            </div>

            <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-3 space-y-2 md:col-span-2">
              <label className="block text-xs text-slate-600 dark:text-slate-400">إضافة نوع فرعي</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <select
                  value={newSubtypeTypeId}
                  onChange={(e) => setNewSubtypeTypeId(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700"
                  disabled={!canEdit || isSaving}
                >
                  <option value="">اختر النوع الرئيسي</option>
                  {packagingTypes.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.name}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  value={newSubtypeName}
                  onChange={(e) => setNewSubtypeName(e.target.value)}
                  placeholder="مثال: كيس 25 كجم"
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700"
                  disabled={!canEdit || isSaving}
                />
              </div>
              <button
                type="button"
                onClick={handleCreateSubtype}
                disabled={!canEdit || isSaving || !newSubtypeTypeId || !newSubtypeName.trim()}
                className="w-full px-3 py-2 text-sm rounded-lg bg-indigo-600 text-white disabled:opacity-50"
              >
                إضافة النوع الفرعي
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {filteredTypes.length === 0 ? (
              <div className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-4 text-sm text-slate-500 text-center">
                لا توجد نتائج مطابقة.
              </div>
            ) : (
              filteredTypes.map((type) => (
                <div key={type.id} className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                  <div className="px-4 py-3 bg-slate-50 dark:bg-slate-700/40 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <CubeIcon className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                      <span className="font-semibold text-slate-900 dark:text-white">{type.name}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${type.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-700'}`}>
                        {type.isActive ? 'نشط' : 'غير نشط'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                      <span>مواد مرتبطة: {type.usageCount}</span>
                      <button
                        type="button"
                        onClick={() => handleRenameType(type)}
                        disabled={!canEdit || isSaving}
                        className="px-2 py-1 rounded border border-slate-300 dark:border-slate-600 disabled:opacity-50"
                      >
                        تعديل
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleType(type)}
                        disabled={!canEdit || isSaving}
                        className="px-2 py-1 rounded border border-slate-300 dark:border-slate-600 disabled:opacity-50"
                      >
                        {type.isActive ? 'تعطيل' : 'تفعيل'}
                      </button>
                    </div>
                  </div>

                  <div className="divide-y divide-slate-200 dark:divide-slate-700">
                    {type.subtypes.length === 0 ? (
                      <div className="px-4 py-3 text-sm text-slate-500">لا توجد أنواع فرعية.</div>
                    ) : (
                      type.subtypes.map((subtype) => (
                        <div key={subtype.id} className="px-4 py-2.5 flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2 text-sm">
                            <WrenchScrewdriverIcon className="w-4 h-4 text-slate-500" />
                            <span className="text-slate-900 dark:text-white">{subtype.name}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${subtype.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-700'}`}>
                              {subtype.isActive ? 'نشط' : 'غير نشط'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                            <span>مواد مرتبطة: {subtype.usageCount}</span>
                            <button
                              type="button"
                              onClick={() => handleRenameSubtype(subtype)}
                              disabled={!canEdit || isSaving}
                              className="px-2 py-1 rounded border border-slate-300 dark:border-slate-600 disabled:opacity-50"
                            >
                              تعديل
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleSubtype(subtype)}
                              disabled={!canEdit || isSaving}
                              className="px-2 py-1 rounded border border-slate-300 dark:border-slate-600 disabled:opacity-50"
                            >
                              {subtype.isActive ? 'تعطيل' : 'تفعيل'}
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="rounded-lg border border-dashed border-slate-300 dark:border-slate-600 p-3 text-xs text-slate-500">
            <div className="flex items-center gap-2 mb-1">
              <ClipboardDocumentCheckIcon className="w-4 h-4" />
              <span className="font-medium">سياسات التنفيذ الحالية</span>
            </div>
            <ul className="space-y-1">
              <li>مواد التعبئة في شاشة المواد تتطلب نوع رئيسي + نوع فرعي.</li>
              <li>في شاشة الاستلام يتم الفلترة بالنوع الرئيسي/الفرعي قبل اختيار المادة.</li>
              <li>التعطيل متاح بدل الحذف للحفاظ على التوافق مع السجلات المرتبطة.</li>
            </ul>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white dark:bg-slate-800 dark:border-slate-700 p-5 space-y-4">
          <div className="flex items-center gap-2">
            <BeakerIcon className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">إعدادات طباعة سجل الفحوصات</h2>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            هذه البيانات تظهر في هيدر طباعة سجل الفحوصات من صفحة <span className="font-mono">/lab/tests/runs</span>.
          </p>

          {printSettingsError && (
            <div className="rounded-lg border border-red-200 bg-red-50 text-red-700 px-3 py-2 text-sm">
              {printSettingsError}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">عنوان النموذج</label>
              <input
                type="text"
                value={printSettings.document_title}
                onChange={(e) => setPrintSettings((prev) => ({ ...prev, document_title: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700"
                disabled={!canEdit || isSaving}
              />
              <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                يمكنك استخدام <span className="font-mono">{'{test_type}'}</span> لإظهار نوع الفحص تلقائياً بدون اسم المنتج.
              </p>
            </div>
            <div>
              <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">رمز الوثيقة</label>
              <input
                type="text"
                value={printSettings.doc_code}
                onChange={(e) => setPrintSettings((prev) => ({ ...prev, doc_code: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700"
                disabled={!canEdit || isSaving}
              />
            </div>
            <div>
              <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">الإصدار</label>
              <input
                type="text"
                value={printSettings.issue_no}
                onChange={(e) => setPrintSettings((prev) => ({ ...prev, issue_no: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700"
                disabled={!canEdit || isSaving}
              />
            </div>
            <div>
              <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">تاريخ الإصدار</label>
              <input
                type="text"
                value={printSettings.issue_date}
                onChange={(e) => setPrintSettings((prev) => ({ ...prev, issue_date: e.target.value }))}
                placeholder="YYYY-MM-DD"
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700"
                disabled={!canEdit || isSaving}
              />
            </div>
            <div>
              <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">المراجعة</label>
              <input
                type="text"
                value={printSettings.review_no}
                onChange={(e) => setPrintSettings((prev) => ({ ...prev, review_no: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700"
                disabled={!canEdit || isSaving}
              />
            </div>
            <div>
              <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">تاريخ المراجعة</label>
              <input
                type="text"
                value={printSettings.review_date}
                onChange={(e) => setPrintSettings((prev) => ({ ...prev, review_date: e.target.value }))}
                placeholder="YYYY-MM-DD"
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700"
                disabled={!canEdit || isSaving}
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">ملاحظة التذييل (اختياري)</label>
              <input
                type="text"
                value={printSettings.footer_note}
                onChange={(e) => setPrintSettings((prev) => ({ ...prev, footer_note: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700"
                disabled={!canEdit || isSaving}
              />
            </div>
          </div>

          <div className="flex items-center justify-end">
            <button
              type="button"
              onClick={handleSavePrintSettings}
              disabled={!canEdit || isSaving}
              className="px-4 py-2 text-sm rounded-lg bg-indigo-600 text-white disabled:opacity-50"
            >
              حفظ إعدادات الطباعة
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default LabV2SettingsPage;
