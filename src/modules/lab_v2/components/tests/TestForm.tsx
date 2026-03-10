import React from 'react';
import Input from '../../../../components/common/Input';
import Select from '../../../../components/common/Select';
import { LAB_TEST_FAMILY_OPTIONS } from '../../types/test.types';
import type { LabV2Test, LabV2TestFamily, LabV2TestScope } from '../../types/test.types';

const scopeOptions: { value: LabV2TestScope; label: string }[] = [
  { value: 'global', label: 'عام' },
  { value: 'company', label: 'خاص بالشركة' },
  { value: 'product', label: 'خاص بالمنتج' },
];

export const TestForm: React.FC<{
  value: Partial<LabV2Test>;
  onChange: (next: Partial<LabV2Test>) => void;
}> = ({ value, onChange }) => {
  return (
    <div className="space-y-4" dir="rtl">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="كود الفحص"
          value={value.code || ''}
          onChange={(e) => onChange({ ...value, code: e.target.value })}
          required
        />
        <Input
          label="اسم الفحص"
          value={value.name || ''}
          onChange={(e) => onChange({ ...value, name: e.target.value })}
          required
        />
        <Select
          label="فئة الفحص"
          options={[{ value: '', label: 'اختر...' }, ...LAB_TEST_FAMILY_OPTIONS]}
          value={(value.test_family as any) || ''}
          onChange={(e) => onChange({ ...value, test_family: e.target.value as LabV2TestFamily })}
        />
        <Input
          label="الاسم (عربي)"
          value={value.name_ar || ''}
          onChange={(e) => onChange({ ...value, name_ar: e.target.value })}
        />
        <Input
          label="المعيار"
          value={value.method_standard || ''}
          onChange={(e) => onChange({ ...value, method_standard: e.target.value })}
          placeholder="ISO 4833, AOAC 990.12"
        />
        <Select
          label="النطاق"
          options={scopeOptions}
          value={(value.scope as any) || 'global'}
          onChange={(e) => onChange({ ...value, scope: e.target.value as LabV2TestScope })}
        />
        <Input
          type="number"
          label="المدة التقديرية (دقيقة)"
          value={value.estimated_duration_minutes ?? ''}
          onChange={(e) => onChange({ ...value, estimated_duration_minutes: e.target.value ? Number(e.target.value) : null })}
        />
        <div className="flex items-center gap-2 pt-7">
          <input
            type="checkbox"
            className="h-4 w-4"
            checked={Boolean(value.requires_approval)}
            onChange={(e) => onChange({ ...value, requires_approval: e.target.checked })}
          />
          <span className="text-sm text-slate-700 dark:text-slate-200">يتطلب اعتماد QA</span>
        </div>
        <div className="flex items-center gap-2 pt-7">
          <input
            type="checkbox"
            className="h-4 w-4"
            checked={value.is_active !== false}
            onChange={(e) => onChange({ ...value, is_active: e.target.checked })}
          />
          <span className="text-sm text-slate-700 dark:text-slate-200">نشط</span>
        </div>
      </div>

      <Input
        label="وصف الفحص"
        value={value.description || ''}
        onChange={(e) => onChange({ ...value, description: e.target.value })}
      />

      <Input
        label="وصف الطريقة"
        value={value.method_description || ''}
        onChange={(e) => onChange({ ...value, method_description: e.target.value })}
      />
    </div>
  );
};

export default TestForm;
