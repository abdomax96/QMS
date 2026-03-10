import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowRightIcon, CheckIcon } from '@heroicons/react/24/outline';
import Button from '../../../components/common/Button';
import { useLabV2TestDefinition, useSaveLabV2TestDefinition } from '../hooks/useTests';
import { useLabV2Devices } from '../hooks/useDevices';
import { useLabV2Chemicals } from '../hooks/useChemicals';
import { useCompanyStore } from '../../../store/companyStore';
import * as productService from '../../../services/productService';
import type { Product } from '../../../types/product';
import type {
  LabV2AcceptanceRule,
  LabV2Test,
  LabV2TestDeviceLink,
  LabV2TestParameter,
} from '../types/test.types';
import TestForm from '../components/tests/TestForm';
import ParameterEditor from '../components/tests/ParameterEditor';
import AcceptanceRuleEditor from '../components/tests/AcceptanceRuleEditor';
import DeviceLinkEditor from '../components/tests/DeviceLinkEditor';
import TestStructureEditor from '../components/tests/TestStructureEditor';
import type { EditableProductLink, EditableStep } from '../components/tests/TestStructureEditor';

const emptyTest: Partial<LabV2Test> = {
  code: '',
  name: '',
  name_ar: '',
  test_family: 'final_release',
  category: '',
  description: '',
  method_description: '',
  method_standard: '',
  scope: 'global',
  requires_approval: true,
  is_active: true,
};

type EditorTab = 'basic' | 'params' | 'rules' | 'devices' | 'structure';
const BUTTER_SANDWICH_EXAMPLE_CODE = 'MOIST-BS-MANUAL';

function normalizeName(value: string | null | undefined): string {
  return String(value || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function isButterSandwichProduct(product: Product): boolean {
  const ar = normalizeName(product.name);
  const en = normalizeName((product as any).name_en);
  return (
    ar.includes('باتر ساندوتش') ||
    ar.replace(/\s+/g, '').includes('باترساندوتش') ||
    en.includes('butter sandwich')
  );
}

const TestEditorPage: React.FC = () => {
  const navigate = useNavigate();
  const selectedCompanyId = useCompanyStore((s) => s.selectedCompanyId);
  const { id } = useParams();
  const isNew = !id || id === 'new';
  const testId = !isNew ? (id as string) : undefined;

  const { data, isLoading } = useLabV2TestDefinition(testId);
  const { data: devices } = useLabV2Devices({ status: 'active' });
  const { data: chemicals } = useLabV2Chemicals({ activeOnly: true });
  const saveDef = useSaveLabV2TestDefinition();

  const [test, setTest] = useState<Partial<LabV2Test>>(emptyTest);
  const [parameters, setParameters] = useState<Array<Partial<LabV2TestParameter>>>([]);
  const [rules, setRules] = useState<Array<Partial<LabV2AcceptanceRule> & { param_key?: string }>>([]);
  const [deviceLinks, setDeviceLinks] = useState<Array<Partial<LabV2TestDeviceLink> & { device_id: string }>>([]);
  const [productLinks, setProductLinks] = useState<EditableProductLink[]>([]);
  const [steps, setSteps] = useState<EditableStep[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [activeTab, setActiveTab] = useState<EditorTab>('basic');

  useEffect(() => {
    productService.getProducts(selectedCompanyId || undefined).then(setProducts).catch(() => setProducts([]));
  }, [selectedCompanyId]);

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
    setProductLinks((data.product_links || []).map((l) => ({ ...l, product_id: l.product_id })));
    setSteps(
      (data.steps || []).map((step) => ({
        ...step,
        title: step.title || '',
        step_device_plans: (step.step_device_plans || []).map((plan) => ({ ...plan, device_id: plan.device_id })),
        step_material_plans: (step.step_material_plans || []).map((plan) => ({
          ...plan,
          chemical_id: plan.chemical_id,
          planned_quantity: plan.planned_quantity,
        })),
      }))
    );
  }, [data, isNew]);

  const canSave = useMemo(() => {
    if (!test.code || !test.name || !test.test_family) return false;
    if (test.test_family === 'ipc') {
      const activeLinks = (productLinks || []).filter((link) => link.product_id && link.is_active !== false);
      return activeLinks.length > 0;
    }
    return true;
  }, [test.code, test.name, test.test_family, productLinks]);

  const activeProductLinksCount = useMemo(
    () => (productLinks || []).filter((link) => link.product_id && link.is_active !== false).length,
    [productLinks]
  );
  const butterSandwichProduct = useMemo(
    () => (products || []).find((product) => isButterSandwichProduct(product)) || null,
    [products]
  );

  const tabs: Array<{ id: EditorTab; label: string; count?: number }> = [
    { id: 'basic', label: 'البيانات الأساسية' },
    { id: 'params', label: 'المعاملات', count: parameters.length },
    { id: 'rules', label: 'قواعد القبول', count: rules.length },
    { id: 'devices', label: 'الأجهزة', count: deviceLinks.length },
    { id: 'structure', label: 'الخطوات والمواد', count: steps.length },
  ];

  const saveDefinition = async () => {
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
      product_links: (productLinks || []).map((l) => ({ ...l, product_id: l.product_id })) as any,
      steps: (steps || []).map((step, stepIdx) => ({
        ...step,
        title: (step.title || '').trim(),
        step_order: stepIdx,
        step_device_plans: (step.step_device_plans || []).map((plan) => ({ ...plan, device_id: plan.device_id })) as any,
        step_material_plans: (step.step_material_plans || [])
          .map((plan) => ({
            ...plan,
            chemical_id: plan.chemical_id,
            planned_quantity: Number(plan.planned_quantity || 0),
          }))
          .filter((plan) => Boolean(plan.chemical_id) && Number.isFinite(plan.planned_quantity) && plan.planned_quantity > 0) as any,
      })) as any,
    };

    const saved = await saveDef.mutateAsync(payload as any);
    navigate(`/lab/tests/editor/${saved.test.id}`);
  };

  const applyButterSandwichExample = () => {
    const hasUserChanges =
      Boolean((test.code || '').trim()) ||
      Boolean((test.name || '').trim()) ||
      Boolean((test.name_ar || '').trim()) ||
      parameters.length > 0 ||
      rules.length > 0 ||
      steps.length > 0 ||
      productLinks.length > 0 ||
      deviceLinks.length > 0;

    if (hasUserChanges) {
      const confirmOverride = window.confirm('سيتم استبدال القيم الحالية بمثال باتر ساندوتش. هل تريد المتابعة؟');
      if (!confirmOverride) return;
    }

    const scope: LabV2Test['scope'] = butterSandwichProduct ? 'product' : 'company';

    setTest({
      ...emptyTest,
      code: BUTTER_SANDWICH_EXAMPLE_CODE,
      name: 'Product Moisture Test - Butter Sandwich',
      name_ar: 'فحص رطوبة المنتج - باتر ساندوتش',
      test_family: 'final_release',
      category: 'Final Release',
      description: 'فحص رطوبة المنتج النهائي لضمان مطابقة المواصفة.',
      method_description: 'قياس رطوبة المنتج باستخدام Moisture Analyzer بعد التحقق من المعايرة.',
      method_standard: 'Internal Moisture Method',
      scope,
      linked_product_id: butterSandwichProduct?.id || null,
      requires_approval: true,
      is_active: true,
    });

    setParameters([
      {
        param_key: 'moisture_percent',
        label: 'Moisture %',
        label_ar: 'رطوبة المنتج',
        data_type: 'number',
        is_required: true,
        display_order: 0,
        unit: '%',
        min_value: 0.5,
        max_value: 2.5,
        help_text: 'النطاق المقبول: من 0.5 إلى 2.5',
      },
    ]);

    setRules([
      {
        rule_type: 'numeric_range',
        param_key: 'moisture_percent',
        spec_min: 0.5,
        spec_max: 2.5,
        spec_unit: '%',
        custom_note: 'المواصفة المعتمدة لرطوبة منتج باتر ساندوتش (بسكويت).',
        priority: 0,
      },
    ]);

    setDeviceLinks([]);
    setSteps([]);
    setProductLinks(butterSandwichProduct ? [{ product_id: butterSandwichProduct.id, is_active: true }] : []);
    setActiveTab('basic');
  };

  return (
    <div className="p-4 md:p-6 min-h-screen bg-slate-50 dark:bg-slate-900" dir="rtl">
      <div className="max-w-7xl mx-auto space-y-4">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-800/95 backdrop-blur p-4 sticky top-2 z-20">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-1">
              <Link to="/lab/tests/catalog" className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white">
                <ArrowRightIcon className="w-4 h-4" />
                العودة للكتالوج
              </Link>
              <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white">{isNew ? 'إنشاء تعريف فحص' : 'تحرير تعريف فحص'}</h1>
              <p className="text-xs md:text-sm text-slate-600 dark:text-slate-400">تنسيق مضغوط ومنظم مع حفظ فوري لكل الأقسام</p>
            </div>

            <div className="flex items-center gap-2 md:gap-3">
              <div className="text-xs text-slate-500 dark:text-slate-400">
                {test.test_family === 'ipc' ? `منتجات IPC المرتبطة: ${activeProductLinksCount}` : `المعاملات: ${parameters.length} | القواعد: ${rules.length}`}
              </div>
              {isNew ? (
                <Button variant="outline" onClick={applyButterSandwichExample}>
                  تحميل مثال باتر ساندوتش
                </Button>
              ) : null}
              <Button
                leftIcon={<CheckIcon className="w-4 h-4" />}
                onClick={saveDefinition}
                disabled={!canSave || saveDef.isPending}
                isLoading={saveDef.isPending}
              >
                حفظ
              </Button>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-2 md:p-3">
          <div className="flex flex-wrap gap-2">
            {tabs.map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm border transition ${
                    active
                      ? 'bg-primary-600 text-white border-primary-600 shadow-sm'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 dark:bg-slate-900/40 dark:text-slate-200 dark:border-slate-700 dark:hover:bg-slate-900/70'
                  }`}
                >
                  <span>{tab.label}</span>
                  {typeof tab.count === 'number' ? (
                    <span className={`text-[11px] px-2 py-0.5 rounded-full ${active ? 'bg-white/20' : 'bg-slate-200 dark:bg-slate-700'}`}>
                      {tab.count}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>

        {!canSave && test.test_family === 'ipc' ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 text-amber-800 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-200 px-4 py-3 text-sm">
            فحص IPC يتطلب ربط منتج واحد على الأقل من تبويب "الخطوات والمواد".
          </div>
        ) : null}

        {activeTab === 'basic' ? (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 md:p-5">
            {isLoading && !isNew ? (
              <div className="text-sm text-slate-600 dark:text-slate-400">جاري التحميل...</div>
            ) : (
              <TestForm value={test} onChange={setTest} />
            )}
          </div>
        ) : null}

        {activeTab === 'params' ? (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 md:p-5">
            <ParameterEditor value={parameters} onChange={setParameters} />
          </div>
        ) : null}

        {activeTab === 'rules' ? (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 md:p-5">
            <AcceptanceRuleEditor parameters={(parameters as any) || []} value={rules} onChange={setRules} />
          </div>
        ) : null}

        {activeTab === 'devices' ? (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 md:p-5">
            <DeviceLinkEditor value={deviceLinks} onChange={setDeviceLinks} />
          </div>
        ) : null}

        {activeTab === 'structure' ? (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 md:p-5">
            <TestStructureEditor
              family={(test.test_family as any) || ''}
              productLinks={productLinks}
              onProductLinksChange={setProductLinks}
              products={(products || []).map((product) => ({ id: product.id, name: product.name }))}
              steps={steps}
              onStepsChange={setSteps}
              devices={(devices || []).map((device) => ({ id: device.id, label: `${device.code} - ${device.name_ar || device.name}` }))}
              chemicals={(chemicals || []).map((chemical) => ({ id: chemical.id, label: `${chemical.code} - ${chemical.name_ar || chemical.name}`, unit: chemical.unit }))}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default TestEditorPage;
