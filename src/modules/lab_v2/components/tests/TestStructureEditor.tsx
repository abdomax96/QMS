import React from 'react';
import Button from '../../../../components/common/Button';
import Input from '../../../../components/common/Input';
import Select from '../../../../components/common/Select';
import type {
  LabV2TestFamily,
  LabV2TestProductLink,
} from '../../types/test.types';

type ProductOption = { id: string; name: string };
type DeviceOption = { id: string; label: string };
type ChemicalOption = { id: string; label: string; unit?: string | null };

export type EditableProductLink = Partial<LabV2TestProductLink> & Pick<LabV2TestProductLink, 'product_id'>;
export type EditableStepDevicePlan = {
  id?: string;
  device_id: string;
  is_required?: boolean;
};

export type EditableStepMaterialPlan = {
  id?: string;
  chemical_id: string;
  planned_quantity: number;
  unit?: string | null;
  is_required?: boolean;
  selection_mode?: 'lot_manual';
  notes?: string | null;
};

export type EditableStep = {
  id?: string;
  title: string;
  instructions?: string | null;
  expected_duration_min?: number | null;
  is_required?: boolean;
  step_device_plans?: EditableStepDevicePlan[];
  step_material_plans?: EditableStepMaterialPlan[];
};

export const TestStructureEditor: React.FC<{
  family?: LabV2TestFamily | '';
  productLinks: EditableProductLink[];
  onProductLinksChange: (next: EditableProductLink[]) => void;
  products: ProductOption[];
  steps: EditableStep[];
  onStepsChange: (next: EditableStep[]) => void;
  devices: DeviceOption[];
  chemicals: ChemicalOption[];
}> = ({
  family,
  productLinks,
  onProductLinksChange,
  products,
  steps,
  onStepsChange,
  devices,
  chemicals,
}) => {
  const selectedProducts = new Set((productLinks || []).filter((p) => p.is_active !== false).map((p) => p.product_id));
  const chemicalById = new Map(chemicals.map((c) => [c.id, c]));

  const toggleProduct = (productId: string) => {
    if (selectedProducts.has(productId)) {
      onProductLinksChange((productLinks || []).filter((p) => p.product_id !== productId));
      return;
    }
    onProductLinksChange([...(productLinks || []), { product_id: productId, is_active: true }]);
  };

  const addStep = () => {
    onStepsChange([
      ...(steps || []),
      {
        title: '',
        instructions: '',
        expected_duration_min: null,
        is_required: true,
        step_device_plans: [],
        step_material_plans: [],
      },
    ]);
  };

  const removeStep = (idx: number) => {
    onStepsChange((steps || []).filter((_, i) => i !== idx));
  };

  const moveStep = (idx: number, dir: -1 | 1) => {
    const list = [...(steps || [])];
    const target = idx + dir;
    if (target < 0 || target >= list.length) return;
    const temp = list[idx];
    list[idx] = list[target];
    list[target] = temp;
    onStepsChange(list);
  };

  const setStep = (idx: number, patch: Partial<EditableStep>) => {
    onStepsChange((steps || []).map((step, i) => (i === idx ? { ...step, ...patch } : step)));
  };

  const toggleStepDevice = (stepIdx: number, deviceId: string) => {
    const step = steps[stepIdx];
    const current = step?.step_device_plans || [];
    const exists = current.some((d) => d.device_id === deviceId);
    const next = exists
      ? current.filter((d) => d.device_id !== deviceId)
      : [...current, { device_id: deviceId, is_required: false }];
    setStep(stepIdx, { step_device_plans: next });
  };

  const setStepDeviceRequired = (stepIdx: number, deviceId: string, isRequired: boolean) => {
    const step = steps[stepIdx];
    const current = step?.step_device_plans || [];
    const next = current.map((d) => (d.device_id === deviceId ? { ...d, is_required: isRequired } : d));
    setStep(stepIdx, { step_device_plans: next });
  };

  const addStepMaterial = (stepIdx: number) => {
    const step = steps[stepIdx];
    setStep(stepIdx, {
      step_material_plans: [
        ...(step?.step_material_plans || []),
        {
          chemical_id: '',
          planned_quantity: 1,
          unit: '',
          is_required: true,
          selection_mode: 'lot_manual',
        },
      ],
    });
  };

  const removeStepMaterial = (stepIdx: number, materialIdx: number) => {
    const step = steps[stepIdx];
    setStep(stepIdx, {
      step_material_plans: (step?.step_material_plans || []).filter((_, i) => i !== materialIdx),
    });
  };

  const setStepMaterial = (stepIdx: number, materialIdx: number, patch: Partial<EditableStepMaterialPlan>) => {
    const step = steps[stepIdx];
    const materials = (step?.step_material_plans || []).map((material, i) => {
      if (i !== materialIdx) return material;
      const next = { ...material, ...patch };
      if (patch.chemical_id && !patch.unit) {
        const chemical = chemicalById.get(patch.chemical_id);
        if (chemical?.unit) {
          next.unit = chemical.unit;
        }
      }
      return next;
    });
    setStep(stepIdx, { step_material_plans: materials });
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 bg-white dark:bg-slate-800">
        <div className="text-sm font-semibold text-slate-900 dark:text-white mb-3">ربط المنتجات</div>
        {family === 'ipc' ? (
          <div className="space-y-2">
            <div className="text-xs text-slate-500 dark:text-slate-400">فحوصات IPC تتطلب منتجًا واحدًا على الأقل.</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
              {products.map((product) => {
                const checked = selectedProducts.has(product.id);
                return (
                  <label
                    key={product.id}
                    className="flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm"
                  >
                    <input
                      type="checkbox"
                      className="h-4 w-4"
                      checked={checked}
                      onChange={() => toggleProduct(product.id)}
                    />
                    <span className="text-slate-800 dark:text-slate-200">{product.name}</span>
                  </label>
                );
              })}
              {products.length === 0 ? (
                <div className="text-sm text-slate-500 dark:text-slate-400">لا توجد منتجات.</div>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="text-sm text-slate-600 dark:text-slate-400">ربط المنتجات اختياري في هذه الفئة.</div>
        )}
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 bg-white dark:bg-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-slate-900 dark:text-white">خطوات الفحص</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">يتم اختيار lot/receipt أثناء التشغيل. الكمية هنا مخططة فقط.</div>
          </div>
          <Button type="button" variant="secondary" size="sm" onClick={addStep}>
            إضافة خطوة
          </Button>
        </div>

        {(steps || []).length === 0 ? (
          <div className="text-sm text-slate-600 dark:text-slate-400">لا توجد خطوات بعد.</div>
        ) : null}

        <div className="space-y-4">
          {(steps || []).map((step, stepIdx) => {
            const selectedDeviceIds = new Set((step.step_device_plans || []).map((d) => d.device_id));
            return (
              <div key={`${step.id || 'new'}_${stepIdx}`} className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium text-slate-900 dark:text-white">الخطوة #{stepIdx + 1}</div>
                  <div className="flex items-center gap-2">
                    <Button type="button" variant="ghost" size="sm" onClick={() => moveStep(stepIdx, -1)} disabled={stepIdx === 0}>
                      أعلى
                    </Button>
                    <Button type="button" variant="ghost" size="sm" onClick={() => moveStep(stepIdx, 1)} disabled={stepIdx === (steps.length - 1)}>
                      أسفل
                    </Button>
                    <Button type="button" variant="danger" size="sm" onClick={() => removeStep(stepIdx)}>
                      حذف
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Input
                    label="عنوان الخطوة"
                    value={step.title || ''}
                    onChange={(e) => setStep(stepIdx, { title: e.target.value })}
                  />
                  <Input
                    type="number"
                    label="المدة (دقيقة)"
                    value={step.expected_duration_min ?? ''}
                    onChange={(e) => setStep(stepIdx, { expected_duration_min: e.target.value ? Number(e.target.value) : null })}
                  />
                  <div className="flex items-center gap-2 pt-7">
                    <input
                      type="checkbox"
                      className="h-4 w-4"
                      checked={step.is_required !== false}
                      onChange={(e) => setStep(stepIdx, { is_required: e.target.checked })}
                    />
                    <span className="text-sm text-slate-700 dark:text-slate-200">خطوة مطلوبة</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">تعليمات الخطوة</label>
                  <textarea
                    value={step.instructions || ''}
                    onChange={(e) => setStep(stepIdx, { instructions: e.target.value })}
                    className="w-full min-h-[84px] rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm dark:bg-slate-900/30 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>

                <div className="space-y-2">
                  <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">أجهزة الخطوة</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {devices.map((device) => {
                      const isSelected = selectedDeviceIds.has(device.id);
                      const plan = (step.step_device_plans || []).find((item) => item.device_id === device.id);
                      return (
                        <div key={device.id} className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 flex items-center justify-between gap-2">
                          <label className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              className="h-4 w-4"
                              checked={isSelected}
                              onChange={() => toggleStepDevice(stepIdx, device.id)}
                            />
                            <span className="text-slate-800 dark:text-slate-200">{device.label}</span>
                          </label>
                          {isSelected ? (
                            <label className="flex items-center gap-1 text-xs text-slate-600 dark:text-slate-300">
                              <input
                                type="checkbox"
                                className="h-3.5 w-3.5"
                                checked={Boolean(plan?.is_required)}
                                onChange={(e) => setStepDeviceRequired(stepIdx, device.id, e.target.checked)}
                              />
                              <span>إلزامي</span>
                            </label>
                          ) : null}
                        </div>
                      );
                    })}
                    {devices.length === 0 ? <div className="text-sm text-slate-500 dark:text-slate-400">لا توجد أجهزة.</div> : null}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">مواد الفحص المخططة</div>
                    <Button type="button" variant="outline" size="sm" onClick={() => addStepMaterial(stepIdx)}>
                      إضافة مادة
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {(step.step_material_plans || []).map((material, materialIdx) => (
                      <div key={`${material.id || 'new'}_${materialIdx}`} className="rounded-lg border border-slate-200 dark:border-slate-700 p-2 grid grid-cols-1 md:grid-cols-12 gap-2">
                        <div className="md:col-span-5">
                          <Select
                            label="المادة"
                            options={[{ value: '', label: 'اختر...' }, ...chemicals.map((chemical) => ({ value: chemical.id, label: chemical.label }))]}
                            value={material.chemical_id || ''}
                            onChange={(e) => setStepMaterial(stepIdx, materialIdx, { chemical_id: e.target.value })}
                          />
                        </div>
                        <div className="md:col-span-2">
                          <Input
                            type="number"
                            label="الكمية"
                            value={material.planned_quantity ?? ''}
                            onChange={(e) => setStepMaterial(stepIdx, materialIdx, { planned_quantity: e.target.value ? Number(e.target.value) : 0 })}
                          />
                        </div>
                        <div className="md:col-span-2">
                          <Input
                            label="الوحدة"
                            value={material.unit || ''}
                            onChange={(e) => setStepMaterial(stepIdx, materialIdx, { unit: e.target.value })}
                          />
                        </div>
                        <div className="md:col-span-2 flex items-center pt-7 gap-2">
                          <input
                            type="checkbox"
                            className="h-4 w-4"
                            checked={material.is_required !== false}
                            onChange={(e) => setStepMaterial(stepIdx, materialIdx, { is_required: e.target.checked })}
                          />
                          <span className="text-sm text-slate-700 dark:text-slate-200">مطلوبة</span>
                        </div>
                        <div className="md:col-span-1 flex items-center pt-7 justify-end">
                          <Button type="button" variant="danger" size="sm" onClick={() => removeStepMaterial(stepIdx, materialIdx)}>
                            حذف
                          </Button>
                        </div>
                      </div>
                    ))}
                    {(step.step_material_plans || []).length === 0 ? (
                      <div className="text-sm text-slate-500 dark:text-slate-400">لا توجد مواد مرتبطة بهذه الخطوة.</div>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default TestStructureEditor;
