import React, { useMemo } from 'react';
import Button from '../../../../components/common/Button';
import { useLabV2Devices } from '../../hooks/useDevices';
import type { LabV2TestDeviceLink } from '../../types/test.types';

export const DeviceLinkEditor: React.FC<{
  value: Array<Partial<LabV2TestDeviceLink> & Pick<LabV2TestDeviceLink, 'device_id'>>;
  onChange: (next: Array<Partial<LabV2TestDeviceLink> & Pick<LabV2TestDeviceLink, 'device_id'>>) => void;
}> = ({ value, onChange }) => {
  const { data: devices, isLoading } = useLabV2Devices();

  const selected = useMemo(() => new Set(value.map((v) => v.device_id)), [value]);

  const toggle = (device_id: string) => {
    if (selected.has(device_id)) {
      const next = value.filter((v) => v.device_id !== device_id);
      // Ensure at least one default if items remain.
      if (next.length > 0 && !next.some((l) => l.is_default)) {
        next[0] = { ...next[0], is_default: true };
      }
      onChange(next);
      return;
    }

    const next = [...value, { device_id, is_default: value.length === 0 }];
    onChange(next);
  };

  const setDefault = (device_id: string) => {
    onChange(value.map((l) => ({ ...l, is_default: l.device_id === device_id })));
  };

  if (isLoading) {
    return <div className="text-sm text-slate-600 dark:text-slate-400">جاري تحميل الأجهزة...</div>;
  }

  return (
    <div className="space-y-3" dir="rtl">
      <div className="text-sm font-semibold text-slate-900 dark:text-white">الأجهزة المرتبطة</div>

      <div className="space-y-2">
        {(devices || []).map((d) => {
          const isChecked = selected.has(d.id);
          const isDefault = value.find((v) => v.device_id === d.id)?.is_default;

          return (
            <div key={d.id} className="flex items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
              <label className="flex items-center gap-3">
                <input type="checkbox" className="h-4 w-4" checked={isChecked} onChange={() => toggle(d.id)} />
                <div className="text-sm text-slate-800 dark:text-slate-200">
                  <span className="font-medium">{d.code}</span>
                  <span className="mx-2 text-slate-400">|</span>
                  <span>{d.name_ar || d.name}</span>
                </div>
              </label>

              <div className="flex items-center gap-2">
                {isDefault ? (
                  <span className="text-xs px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">افتراضي</span>
                ) : null}
                <Button type="button" variant="ghost" size="sm" onClick={() => setDefault(d.id)} disabled={!isChecked}>
                  تعيين افتراضي
                </Button>
              </div>
            </div>
          );
        })}

        {(devices || []).length === 0 ? (
          <div className="text-sm text-slate-600 dark:text-slate-400">لا توجد أجهزة.</div>
        ) : null}
      </div>
    </div>
  );
};

export default DeviceLinkEditor;

