import type { LabV2ParameterDataType } from '../types/test.types';

export const LAB_V2_DATA_TYPE_LABELS: Record<LabV2ParameterDataType, string> = {
  text: 'نص',
  number: 'رقم',
  date: 'تاريخ',
  time: 'وقت',
  dropdown: 'قائمة',
  multi_select: 'اختيارات متعددة',
};

export const LAB_V2_DATA_TYPES: LabV2ParameterDataType[] = [
  'text',
  'number',
  'date',
  'time',
  'dropdown',
  'multi_select',
];

