import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowRightIcon, CheckIcon } from '@heroicons/react/24/outline';
import Button from '../../../components/common/Button';
import { useLabV2TestDefinition, useSaveLabV2TestDefinition } from '../hooks/useTests';
import type { LabV2AcceptanceRule, LabV2Test, LabV2TestDeviceLink, LabV2TestParameter } from '../types/test.types';
import TestForm from '../components/tests/TestForm';
import ParameterEditor from '../components/tests/ParameterEditor';
import AcceptanceRuleEditor from '../components/tests/AcceptanceRuleEditor';
import DeviceLinkEditor from '../components/tests/DeviceLinkEditor';

const emptyTest: Partial<LabV2Test> = {
  code: '',
  name: '',
  name_ar: '',
  category: '',
  description: '',
  method_description: '',
  method_standard: '',
  scope: 'global',
  requires_approval: true,
  is_active: true,
};

const TestEditorPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isNew = !id || id === 'new';
  const testId = !isNew ? (id as string) : undefined;

  const { data, isLoading } = useLabV2TestDefinition(testId);
  const saveDef = useSaveLabV2TestDefinition();

  const [test, setTest] = useState<Partial<LabV2Test>>(emptyTest);
  const [parameters, setParameters] = useState<Array<Partial<LabV2TestParameter>>>([]);
  const [rules, setRules] = useState<Array<Partial<LabV2AcceptanceRule> & { param_key?: string }>>([]);
  const [deviceLinks, setDeviceLinks] = useState<Array<Partial<LabV2TestDeviceLink> & { device_id: string }>>([]);

  useEffect(() => {
    if (isNew) return;
    if (!data) return;
    setTest(data.test);
    setParameters(data.parameters || []);

    const keyById = new Map((data.parameters || []).map((p) => [p.id, p.param_key] as const));
    setRules(
      (data.rules || []).map((r) => ({
        ...r,
        param_key: r.parameter_id ? keyById.get(r.parameter_id) : undefined,
      }))
    );
    setDeviceLinks((data.device_links || []).map((l) => ({ ...l, device_id: l.device_id })));
  }, [data, isNew]);

  const canSave = useMemo(() => {
    return Boolean(test.code && test.name);
  }, [test.code, test.name]);

  return (
    <div className="p-6 min-h-screen bg-slate-50 dark:bg-slate-900" dir="rtl">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Link to="/lab/tests/catalog" className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white">
              <ArrowRightIcon className="w-4 h-4" />
              العودة للكتالوج
            </Link>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{isNew ? 'إنشاء تعريف فحص' : 'تحرير تعريف فحص'}</h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">واجهة عربية مع إبقاء المصطلحات العلمية بالإنجليزية</p>
          </div>
          <Button
            leftIcon={<CheckIcon className="w-4 h-4" />}
            onClick={async () => {
              if (!canSave) return;

              const normalizedParams = (parameters || []).map((p, idx) => ({
                ...p,
                display_order: idx,
                param_key: (p.param_key || '').trim(),
                label: (p.label || '').trim(),
              }));

              const payload = {
                test: {
                  ...test,
                  id: testId,
                  code: (test.code || '').trim(),
                  name: (test.name || '').trim(),
                  name_ar: (test.name_ar || '').trim() || null,
                  requires_approval: Boolean(test.requires_approval),
                  is_active: test.is_active !== false,
                },
                parameters: normalizedParams as any,
                rules: (rules || []).map((r, idx) => ({ ...r, priority: r.priority ?? idx })) as any,
                device_links: (deviceLinks || []).map((l) => ({ ...l, device_id: l.device_id })) as any,
              };

              const saved = await saveDef.mutateAsync(payload as any);
              navigate(`/lab/tests/editor/${saved.test.id}`);
            }}
            disabled={!canSave || saveDef.isPending}
            isLoading={saveDef.isPending}
          >
            حفظ
          </Button>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
          {isLoading && !isNew ? (
            <div className="text-sm text-slate-600 dark:text-slate-400">جاري التحميل...</div>
          ) : (
            <TestForm value={test} onChange={setTest} />
          )}
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
          <ParameterEditor value={parameters} onChange={setParameters} />
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
          <AcceptanceRuleEditor parameters={(parameters as any) || []} value={rules} onChange={setRules} />
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
          <DeviceLinkEditor value={deviceLinks} onChange={setDeviceLinks} />
        </div>
      </div>
    </div>
  );
};

export default TestEditorPage;

