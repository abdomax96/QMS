import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import Input from '../../../../components/common/Input';
import Select from '../../../../components/common/Select';
import Button from '../../../../components/common/Button';
import type { LabV2ChemicalReceipt, LabV2ChemicalReceiptStatus, LabV2ChemicalReceiptType } from '../../types/chemical.types';
import { LAB_V2_RECEIPT_STATUS_LABELS } from '../../constants/statuses';

const schema = z.object({
  receipt_number: z.string().trim().min(1, 'رقم الاستلام مطلوب'),
  lot_number: z.string().optional().nullable(),
  batch_number: z.string().optional().nullable(),
  quantity: z
    .string()
    .trim()
    .min(1, 'الكمية مطلوبة')
    .refine((val) => {
      const n = Number(val);
      return Number.isFinite(n) && n > 0;
    }, 'الكمية يجب أن تكون رقم موجب'),
  unit: z.string().trim().min(1, 'الوحدة مطلوبة'),
  received_date: z.string().trim().min(1, 'تاريخ الاستلام مطلوب'),
  expiry_date: z.string().optional().nullable(),
  supplier_source: z.string().optional().nullable(),
  type: z.enum(['raw_material', 'reagent_for_test', 'other']),
  remaining_quantity: z
    .string()
    .optional()
    .nullable()
    .refine((val) => {
      const s = (val || '').trim();
      if (!s) return true;
      const n = Number(s);
      return Number.isFinite(n) && n >= 0;
    }, 'المتبقي يجب أن يكون رقم'),
  status: z.enum(['available', 'depleted', 'expired', 'disposed']),
  notes: z.string().optional().nullable(),
});

type FormValues = z.infer<typeof schema>;

export const ReceiptForm: React.FC<{
  chemical_id: string;
  onSubmit: (values: Partial<LabV2ChemicalReceipt> & { chemical_id: string }) => Promise<void> | void;
  onCancel: () => void;
  submitLabel?: string;
  loading?: boolean;
}> = ({ chemical_id, onSubmit, onCancel, submitLabel = 'إضافة', loading }) => {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      receipt_number: '',
      lot_number: '',
      batch_number: '',
      quantity: '1',
      unit: 'kg',
      received_date: new Date().toISOString().slice(0, 10),
      expiry_date: '',
      supplier_source: '',
      type: 'reagent_for_test',
      remaining_quantity: undefined,
      status: 'available',
      notes: '',
    },
  });

  const qty = watch('quantity');

  useEffect(() => {
    const current = watch('remaining_quantity');
    if (!current) {
      setValue('remaining_quantity', qty, { shouldValidate: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qty]);

  const typeOptions: { value: LabV2ChemicalReceiptType; label: string }[] = [
    { value: 'raw_material', label: 'Raw material' },
    { value: 'reagent_for_test', label: 'Reagent for test' },
    { value: 'other', label: 'Other' },
  ];

  const statusOptions = (Object.keys(LAB_V2_RECEIPT_STATUS_LABELS) as LabV2ChemicalReceiptStatus[]).map((s) => ({
    value: s,
    label: LAB_V2_RECEIPT_STATUS_LABELS[s],
  }));

  return (
    <form
      dir="rtl"
      className="space-y-4"
      onSubmit={handleSubmit(async (values) => {
        const quantity = Number(values.quantity);
        const remaining_quantity = values.remaining_quantity ? Number(values.remaining_quantity) : quantity;

        await onSubmit({
          chemical_id,
          receipt_number: values.receipt_number.trim(),
          lot_number: values.lot_number?.trim() || null,
          batch_number: values.batch_number?.trim() || null,
          quantity,
          unit: values.unit.trim(),
          received_date: values.received_date,
          expiry_date: values.expiry_date?.trim() || null,
          supplier_source: values.supplier_source?.trim() || null,
          type: values.type,
          remaining_quantity,
          status: values.status,
          notes: values.notes?.trim() || null,
        });
      })}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input label="رقم الاستلام" error={errors.receipt_number?.message} {...register('receipt_number')} required />
        <Select label="النوع" error={errors.type?.message} options={typeOptions} {...register('type')} />
        <Input label="Lot Number" error={errors.lot_number?.message} {...register('lot_number')} />
        <Input label="Batch Number" error={errors.batch_number?.message} {...register('batch_number')} />
        <Input type="number" label="الكمية" error={errors.quantity?.message} {...register('quantity')} required />
        <Input label="الوحدة" error={errors.unit?.message} {...register('unit')} required />
        <Input type="date" label="تاريخ الاستلام" error={errors.received_date?.message} {...register('received_date')} required />
        <Input type="date" label="تاريخ الانتهاء" error={errors.expiry_date?.message} {...register('expiry_date')} />
        <Input type="number" label="المتبقي" error={errors.remaining_quantity?.message} {...register('remaining_quantity')} />
        <Select label="الحالة" error={errors.status?.message} options={statusOptions} {...register('status')} />
      </div>

      <Input label="Supplier / Source" error={errors.supplier_source?.message} {...register('supplier_source')} />
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

export default ReceiptForm;
