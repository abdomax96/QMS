import { useModuleAccess } from '../../../hooks/useModulePermissions';
import { HR_MODULE_CODE } from '../constants/module';

export function useHrPermissions() {
  return useModuleAccess(HR_MODULE_CODE);
}

export default useHrPermissions;
