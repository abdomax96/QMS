import type { LabV2AcceptanceRule, LabV2Test, LabV2TestDeviceLink, LabV2TestParameter } from '../types/test.types';

export interface LabV2RunSnapshots {
  test_snapshot: Record<string, any>;
  params_snapshot: any[];
  rules_snapshot: any[];
  device_links_snapshot?: any[];
}

/**
 * Build snapshots to be stored on the run for integrity.
 * We keep these JSON blobs as close as possible to the DB rows.
 */
export function buildLabV2RunSnapshots(input: {
  test: LabV2Test;
  parameters: LabV2TestParameter[];
  rules: LabV2AcceptanceRule[];
  deviceLinks?: LabV2TestDeviceLink[];
}): LabV2RunSnapshots {
  return {
    test_snapshot: { ...input.test },
    params_snapshot: (input.parameters || []).map(p => ({ ...p })),
    rules_snapshot: (input.rules || []).map(r => ({ ...r })),
    device_links_snapshot: (input.deviceLinks || []).map(l => ({ ...l })),
  };
}

