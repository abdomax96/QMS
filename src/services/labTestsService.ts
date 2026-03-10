import { labV2TestService } from '../modules/lab_v2/services/testService';
import { labV2TestRunService } from '../modules/lab_v2/services/testRunService';
import { labV2ChemicalService } from '../modules/lab_v2/services/chemicalService';
import { labV2DeviceService } from '../modules/lab_v2/services/deviceService';

// Unified service entrypoint for /lab/tests.
// Internal table names remain unchanged for backward compatibility.
export const labTestsService = labV2TestService;
export const labTestRunsService = labV2TestRunService;
export const labTestChemicalsService = labV2ChemicalService;
export const labTestDevicesService = labV2DeviceService;

