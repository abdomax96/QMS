import { useModuleAccess } from '../../../hooks/useModulePermissions';
import { LAB_V2_MODULE_CODE } from '../constants/permissions';

export function useLabV2Permissions() {
  return useModuleAccess(LAB_V2_MODULE_CODE);
}

