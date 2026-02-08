import React from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import Input from '../../../../components/common/Input';
import Button from '../../../../components/common/Button';
import type { LabV2Chemical } from '../../types/chemical.types';

const schema = z.object({
  code: z.string().trim().min(1, 'الكود مطلوب'),
  name: z.string().trim().min(1, 'الاسم مطلوب'),
  name_ar: z.string().optional().nullable(),
  supplier: z.string().optional().nullable(),
  grade: z.string().optional().nullable(),
  cas_number: z.string().optional().nullable(),
  storage_conditions: z.string().optional().nullable(),
  hazard_notes: z.string().optional().nullable(),
  unit: z.string().optional().nullable(),
  is_active: z.boolean().optional(),
  custom_fields_json: z
    .string()
    .optional()
    .nullable()
    .refine((val) => {
      const s = (val || '').trim();
      if (!s) return true;
      try {
        const parsed = JSON.parse(s);
        return parsed != null && typeof parsed === 'object';
      } catch {
        return false;
      }
    }, 'تنسيق JSON غير صحيح'),
});

type FormValues = z.infer<typeof schema>;

function safeParseJson(input: string | null | undefined): Record<string, any> | null {
  const s = (input || '').trim();
  if (!s) return null;
  try {
    const parsed = JSON.parse(s);
    if (parsed && typeof parsed === 'object') return parsed;
    return null;
  } catch {
    return null;
  }
}

export const ChemicalForm: React.FC<{
  initial?: Partial<LabV2Chemical>;
  onSubmit: (values: Partial<LabV2Chemical>) => Promise<void> | void;
  onCancel: () => void;
  submitLabel?: string;
  loading?: boolean;
}> = ({ initial, onSubmit, onCancel, submitLabel = 'حفظ', loading }) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      code: initial?.code || '',
      name: initial?.name || '',
      name_ar: initial?.name_ar ?? '',
      supplier: initial?.supplier ?? '',
      grade: initial?.grade ?? '',
      cas_number: initial?.cas_number ?? '',
      storage_conditions: initial?.storage_conditions ?? '',
      hazard_notes: initial?.hazard_notes ?? '',
      unit: initial?.unit ?? 'kg',
      is_active: initial?.is_active ?? true,
      custom_fields_json: initial?.custom_fields ? JSON.stringify(initial.custom_fields, null, 2) : '',
    },
  });

  return (
    <form
      dir="rtl"
      className="space-y-4"
      onSubmit={handleSubmit(async (values) => {
        const custom_fields = safeParseJson(values.custom_fields_json) || {};

        await onSubmit({
          code: values.code.trim(),
          name: values.name.trim(),
          name_ar: values.name_ar?.trim() || null,
          supplier: values.supplier?.trim() || null,
          grade: values.grade?.trim() || null,
          cas_number: values.cas_number?.trim() || null,
          storage_conditions: values.storage_conditions?.trim() || null,
          hazard_notes: values.hazard_notes?.trim() || null,
          unit: values.unit?.trim() || null,
          is_active: Boolean(values.is_active),
          custom_fields,
        });
      })}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input label="كود المادة" error={errors.code?.message} {...register('code')} required />
        <Input label="اسم المادة" error={errors.name?.message} {...register('name')} required />
        <Input label="الاسم (عربي)" error={errors.name_ar?.message} {...register('name_ar')} />
        <Input label="Supplier" error={errors.supplier?.message} {...register('supplier')} />
        <Input label="Grade" error={errors.grade?.message} {...register('grade')} />
        <Input label="CAS Number" error={errors.cas_number?.message} {...register('cas_number')} />
        <Input label="وحدة القياس" error={errors.unit?.message} {...register('unit')} />
        <div className="flex items-center gap-2 pt-7">
          <input type="checkbox" className="h-4 w-4" {...register('is_active')} />
          <span className="text-sm text-slate-700 dark:text-slate-200">نشط</span>
        </div>
      </div>

      <Input label="شروط التخزين" error={errors.storage_conditions?.message} {...register('storage_conditions')} />
      <Input label="ملاحظات مخاطر" error={errors.hazard_notes?.message} {...register('hazard_notes')} />

      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">حقول مخصصة (JSON)</label>
        <textarea
          className="w-full min-h-[120px] rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          {...register('custom_fields_json')}
          placeholder='مثال: {"purity":"99%","storage":"4°C"}'
        />
        {errors.custom_fields_json?.message ? <div className="text-xs text-rose-600">{errors.custom_fields_json.message}</div> : null}
      </div>

      <div className="flex items-center justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
          إلغاء
        </Button>
        <Button type="submit" isLoading={Boolean(loading)}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
};

export default ChemicalForm;
