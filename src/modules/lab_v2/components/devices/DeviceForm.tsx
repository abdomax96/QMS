import React from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import Input from '../../../../components/common/Input';
import Select from '../../../../components/common/Select';
import Button from '../../../../components/common/Button';
import type { LabV2Device, LabV2DeviceStatus } from '../../types/device.types';
import { LAB_V2_DEVICE_STATUS_LABELS } from '../../constants/statuses';

const schema = z.object({
  code: z.string().trim().min(1, 'الكود مطلوب'),
  name: z.string().trim().min(1, 'الاسم مطلوب'),
  name_ar: z.string().optional().nullable(),
  manufacturer: z.string().optional().nullable(),
  model: z.string().optional().nullable(),
  serial_number: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  status: z.enum(['active', 'maintenance', 'out_of_service']),
  calibration_due_date: z.string().optional().nullable(),
  calibration_interval_days: z
    .string()
    .optional()
    .nullable()
    .refine((val) => {
      const s = (val || '').trim();
      if (!s) return true;
      const n = Number(s);
      return Number.isInteger(n) && n >= 1;
    }, 'المدة يجب أن تكون 1 يوم أو أكثر'),
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
  notes: z.string().optional().nullable(),
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

export const DeviceForm: React.FC<{
  initial?: Partial<LabV2Device>;
  onSubmit: (values: Partial<LabV2Device>) => Promise<void> | void;
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
      manufacturer: initial?.manufacturer ?? '',
      model: initial?.model ?? '',
      serial_number: initial?.serial_number ?? '',
      location: initial?.location ?? '',
      status: (initial?.status as LabV2DeviceStatus) || 'active',
      calibration_due_date: initial?.calibration_due_date ?? '',
      calibration_interval_days: initial?.calibration_interval_days != null ? String(initial.calibration_interval_days) : '365',
      custom_fields_json: initial?.custom_fields ? JSON.stringify(initial.custom_fields, null, 2) : '',
      notes: initial?.notes ?? '',
    },
  });

  const statusOptions = (Object.keys(LAB_V2_DEVICE_STATUS_LABELS) as LabV2DeviceStatus[]).map((s) => ({
    value: s,
    label: LAB_V2_DEVICE_STATUS_LABELS[s],
  }));

  return (
    <form
      onSubmit={handleSubmit(async (values) => {
        const custom_fields = values.custom_fields_json ? safeParseJson(values.custom_fields_json) : null;
        await onSubmit({
          code: values.code.trim(),
          name: values.name.trim(),
          name_ar: values.name_ar?.trim() || null,
          manufacturer: values.manufacturer?.trim() || null,
          model: values.model?.trim() || null,
          serial_number: values.serial_number?.trim() || null,
          location: values.location?.trim() || null,
          status: values.status as LabV2DeviceStatus,
          calibration_due_date: values.calibration_due_date?.trim() || null,
          calibration_interval_days: values.calibration_interval_days ? Number(values.calibration_interval_days) : null,
          custom_fields: custom_fields || {},
          notes: values.notes?.trim() || null,
        });
      })}
      className="space-y-4"
      dir="rtl"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input label="كود الجهاز" error={errors.code?.message} {...register('code')} required />
        <Input label="اسم الجهاز" error={errors.name?.message} {...register('name')} required />
        <Input label="الاسم (عربي)" error={errors.name_ar?.message} {...register('name_ar')} />
        <Select label="الحالة" error={errors.status?.message} options={statusOptions} {...register('status')} />
        <Input label="الشركة المصنعة" error={errors.manufacturer?.message} {...register('manufacturer')} />
        <Input label="الموديل" error={errors.model?.message} {...register('model')} />
        <Input label="الرقم التسلسلي" error={errors.serial_number?.message} {...register('serial_number')} />
        <Input label="الموقع" error={errors.location?.message} {...register('location')} />
        <Input type="date" label="تاريخ استحقاق المعايرة" error={errors.calibration_due_date?.message} {...register('calibration_due_date')} />
        <Input type="number" label="فترة المعايرة (أيام)" error={errors.calibration_interval_days?.message} {...register('calibration_interval_days')} />
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">حقول مخصصة (JSON)</label>
        <textarea
          className="w-full min-h-[120px] rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          {...register('custom_fields_json')}
          placeholder='مثال: {"range":"0-14","unit":"pH"}'
        />
        {errors.custom_fields_json?.message ? <div className="text-xs text-rose-600">{errors.custom_fields_json.message}</div> : null}
      </div>

      <Input label="ملاحظات" error={errors.notes?.message} {...register('notes')} />

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

export default DeviceForm;
