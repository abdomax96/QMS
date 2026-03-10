import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PlusIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import Button from '../../../components/common/Button';
import Input from '../../../components/common/Input';
import Select from '../../../components/common/Select';
import { useDeleteLabV2Test, useLabV2Tests } from '../hooks/useTests';
import { LAB_TEST_FAMILY_OPTIONS, LAB_TEST_FAMILY_LABELS } from '../types/test.types';
import type { LabV2Test, LabV2TestFamily } from '../types/test.types';

const TestCatalogPage: React.FC = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [family, setFamily] = useState('');
  const { data: tests, isLoading } = useLabV2Tests({ search, family: family || undefined });
  const deleteTest = useDeleteLabV2Test();

  const sorted = useMemo(() => (tests || []).slice().sort((a, b) => (a.created_at < b.created_at ? 1 : -1)), [tests]);

  const openNew = () => navigate('/lab/tests/editor/new');

  return (
    <div className="p-6 min-h-screen bg-slate-50 dark:bg-slate-900" dir="rtl">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">كتالوج الفحوصات</h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">تعريف الفحوصات والمعاملات وقواعد القبول</p>
          </div>
          <Button leftIcon={<PlusIcon className="w-4 h-4" />} onClick={openNew}>
            فحص جديد
          </Button>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4">
          <div className="flex items-center gap-3">
            <div className="w-72 max-w-full">
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="بحث بالكود/الاسم/الفئة..."
                leftIcon={<MagnifyingGlassIcon className="w-4 h-4" />}
              />
            </div>
            <div className="w-72 max-w-full">
              <Select
                options={[{ value: '', label: 'كل الفئات' }, ...LAB_TEST_FAMILY_OPTIONS]}
                value={family}
                onChange={(e) => setFamily(e.target.value)}
              />
            </div>
            <div className="text-sm text-slate-500 dark:text-slate-400">
              {isLoading ? 'جاري التحميل...' : `عدد الفحوصات: ${sorted.length}`}
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-850/40">
                <tr className="text-slate-600 dark:text-slate-300">
                  <th className="text-right px-4 py-3 font-semibold">الكود</th>
                  <th className="text-right px-4 py-3 font-semibold">الاسم</th>
                  <th className="text-right px-4 py-3 font-semibold">الفئة</th>
                  <th className="text-right px-4 py-3 font-semibold">نشط</th>
                  <th className="text-right px-4 py-3 font-semibold">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {sorted.map((t: LabV2Test) => (
                  <tr key={t.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-850/40">
                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{t.code}</td>
                    <td className="px-4 py-3">
                      <Link to={`/lab/tests/editor/${t.id}`} className="text-primary-700 dark:text-primary-300 hover:underline">
                        {t.name_ar || t.name}
                      </Link>
                      <div className="text-xs text-slate-500 dark:text-slate-400">{t.name}</div>
                    </td>
                    <td className="px-4 py-3">{LAB_TEST_FAMILY_LABELS[(t.test_family as LabV2TestFamily)] || '—'}</td>
                    <td className="px-4 py-3">{t.is_active ? 'نعم' : 'لا'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => navigate(`/lab/tests/editor/${t.id}`)}>
                          تحرير
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => {
                            const ok = window.confirm('هل تريد حذف تعريف هذا الفحص؟');
                            if (!ok) return;
                            deleteTest.mutate(t.id);
                          }}
                          isLoading={deleteTest.isPending}
                        >
                          حذف
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!isLoading && sorted.length === 0 ? (
                  <tr>
                    <td className="px-4 py-8 text-center text-slate-600 dark:text-slate-400" colSpan={5}>
                      لا توجد فحوصات
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestCatalogPage;
