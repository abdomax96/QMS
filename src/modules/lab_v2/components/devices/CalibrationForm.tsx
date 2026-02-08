import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import Input from '../../../../components/common/Input';
import Select from '../../../../components/common/Select';
import Button from '../../../../components/common/Button';
import type { LabV2CalibrationResult, LabV2DeviceCalibration } from '../../types/device.types';

const schema = z.object({
  calibration_date: z.string().trim().min(1, 'تاريخ المعايرة مطلوب'),
  next_due_date: z.string().trim().min(1, 'تاريخ الاستحقاق مطلوب'),
  result: z.enum(['pass', 'fail', 'conditional']),
  performed_by: z.string().optional().nullable(),
  certificate_number: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

type FormValues = z.infer<typeof schema>;

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '';
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export const CalibrationForm: React.FC<{
  device_id: string;
  defaultIntervalDays?: number;
  onSubmit: (values: Omit<LabV2DeviceCalibration, 'id' | 'company_id' | 'created_at' | 'created_by'>) => Promise<void> | void;
  onCancel: () => void;
  submitLabel?: string;
  loading?: boolean;
}> = ({ device_id, defaultIntervalDays = 365, onSubmit, onCancel, submitLabel = 'إضافة', loading }) => {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      calibration_date: new Date().toISOString().slice(0, 10),
      next_due_date: addDays(new Date().toISOString().slice(0, 10), defaultIntervalDays),
      result: 'pass',
      performed_by: '',
      certificate_number: '',
      notes: '',
    },
  });

  const calibration_date = watch('calibration_date');

  useEffect(() => {
    if (!calibration_date) return;
    setValue('next_due_date', addDays(calibration_date, defaultIntervalDays), { shouldValidate: true });
  }, [calibration_date, defaultIntervalDays, setValue]);

  const resultOptions: { value: LabV2CalibrationResult; label: string }[] = [
    { value: 'pass', label: 'Pass' },
    { value: 'fail', label: 'Fail' },
    { value: 'conditional', label: 'Conditional' },
  ];

  return (
    <form
      onSubmit={handleSubmit(async (values) => {
        await onSubmit({
          device_id,
          calibration_date: values.calibration_date,
          next_due_date: values.next_due_date,
          result: values.result,
          performed_by: values.performed_by?.trim() || null,
          certificate_number: values.certificate_number?.trim() || null,
          notes: values.notes?.trim() || null,
        } as any);
      })}
      className="space-y-4"
      dir="rtl"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input type="date" label="تاريخ المعايرة" error={errors.calibration_date?.message} {...register('calibration_date')} required />
        <Input type="date" label="تاريخ الاستحقاق التالي" error={errors.next_due_date?.message} {...register('next_due_date')} required />
        <Select label="النتيجة" error={errors.result?.message} options={resultOptions} {...register('result')} />
        <Input label="تمت بواسطة" error={errors.performed_by?.message} {...register('performed_by')} />
        <Input label="رقم الشهادة" error={errors.certificate_number?.message} {...register('certificate_number')} />
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

export default CalibrationForm;
