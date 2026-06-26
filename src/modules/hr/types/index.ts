export type HrWorkerType = 'regular' | 'daily';
export type HrEmploymentStatus = 'active' | 'inactive' | 'suspended' | 'archived';

export interface HrDashboardSummary {
  employeesCount: number;
  dailyWorkersCount: number;
  worksitesCount: number;
  shiftPlansCount: number;
  transportLinesCount: number;
  openRequestsCount: number;
  openPenaltiesCount: number;
  payrollPeriodsCount: number;
  submittedAttendanceBatchesCount: number;
}

export interface HrEmployeeListItem {
  id: string;
  profileId: string | null;
  name: string;
  email: string | null;
  baseEmployeeCode: string;
  internalEmployeeCode: string | null;
  originalEmployeeCode: string | null;
  workerType: HrWorkerType;
  departmentId: string | null;
  departmentName: string | null;
  worksiteId: string | null;
  worksiteName: string | null;
  jobTitleText: string | null;
  employmentStatus: HrEmploymentStatus;
  isActive: boolean;
  hasAccount: boolean;
  notes: string | null;
}

export interface HrTransportLineItem {
  id: string;
  code: string | null;
  name: string;
  description: string | null;
  isActive: boolean;
}

export interface HrTransportLineFormValues {
  id?: string;
  code: string;
  name: string;
  description: string;
  isActive: boolean;
}

export interface HrTransportVehicleItem {
  id: string;
  lineId: string | null;
  lineName: string | null;
  code: string | null;
  plateNumber: string | null;
  capacity: number | null;
  notes: string | null;
  isActive: boolean;
}

export interface HrTransportVehicleFormValues {
  id?: string;
  lineId: string;
  code: string;
  plateNumber: string;
  capacity: string;
  notes: string;
  isActive: boolean;
}

export interface HrTransportAssignmentItem {
  id: string;
  employeeProfileId: string | null;
  employeeName: string;
  lineId: string | null;
  lineName: string | null;
  vehicleId: string | null;
  vehicleCode: string | null;
  vehiclePlateNumber: string | null;
  isDefault: boolean;
  effectiveFrom: string | null;
  effectiveTo: string | null;
  notes: string | null;
}

export interface HrTransportAssignmentFormValues {
  id?: string;
  employeeProfileId: string;
  lineId: string;
  vehicleId: string;
  isDefault: boolean;
  effectiveFrom: string;
  effectiveTo: string;
  notes: string;
}

export interface HrTransportFormOptions {
  employeeProfiles: HrEmployeeProfileOption[];
  lines: HrTransportLineItem[];
  vehicles: HrTransportVehicleItem[];
}

export interface HrShiftPlanItem {
  id: string;
  name: string;
  status: string;
  periodStart: string;
  periodEnd: string;
  version: number;
  publishedAt: string | null;
  notes?: string | null;
}

export interface HrShiftTemplateItem {
  id: string;
  code: string | null;
  name: string;
  startTime: string;
  endTime: string;
  hoursCount: number;
  breakMinutes: number;
  isNightShift: boolean;
  notes: string | null;
}

export interface HrShiftTemplateFormValues {
  id?: string;
  code: string;
  name: string;
  startTime: string;
  endTime: string;
  hoursCount: string;
  breakMinutes: string;
  isNightShift: boolean;
  notes: string;
}

export interface HrShiftAssignmentFormValue {
  id?: string;
  employeeProfileId: string;
  shiftTemplateId: string;
  workDate: string;
  notes: string;
  isPrimary: boolean;
}

export interface HrShiftPlanFormValues {
  id?: string;
  name: string;
  periodStart: string;
  periodEnd: string;
  notes: string;
  assignments: HrShiftAssignmentFormValue[];
}

export interface HrShiftAssignmentItem {
  id: string;
  employeeName: string;
  shiftName: string | null;
  workDate: string;
  notes: string | null;
}

export interface HrRequestItem {
  id: string;
  requestType: 'leave' | 'mission';
  employeeProfileId: string | null;
  employeeName: string;
  leaveTypeId?: string | null;
  leaveTypeName?: string | null;
  status: string;
  startDate: string | null;
  endDate: string | null;
  summary: string | null;
  reason?: string | null;
  destination?: string | null;
  details?: string | null;
}

export interface HrPenaltyItem {
  id: string;
  employeeProfileId: string | null;
  employeeName: string;
  penaltyTypeId: string | null;
  penaltyTypeName: string | null;
  status: string;
  effectiveDate: string | null;
  amount: number | null;
  details?: string | null;
  referenceNumber?: string | null;
  approvedAt?: string | null;
}

export interface HrPayrollRunItem {
  id: string;
  payrollPeriodId: string;
  runLabel: string | null;
  runStatus: string;
  periodCode: string | null;
  calculatedAt: string | null;
  approvedAt: string | null;
  summary: Record<string, unknown> | null;
}

export interface HrWorksiteItem {
  id: string;
  code: string | null;
  name: string;
  description: string | null;
  isActive: boolean;
  isDefault: boolean;
}

export interface HrDepartmentOption {
  id: string;
  name: string;
}

export interface HrEmployeeFormOptions {
  departments: HrDepartmentOption[];
  worksites: HrWorksiteItem[];
}

export interface HrEmployeeProfileOption {
  id: string;
  employeeId: string;
  name: string;
  baseEmployeeCode: string | null;
  internalEmployeeCode: string | null;
  workerType: HrWorkerType;
}

export interface HrShiftPlanningOptions {
  employeeProfiles: HrEmployeeProfileOption[];
  shiftTemplates: HrShiftTemplateItem[];
}

export interface HrEmployeeFormValues {
  id?: string;
  profileId?: string | null;
  baseEmployeeCode: string;
  name: string;
  email: string;
  workerType: HrWorkerType;
  internalEmployeeCode: string;
  originalEmployeeCode: string;
  departmentId: string;
  worksiteId: string;
  jobTitleText: string;
  employmentStatus: HrEmploymentStatus;
  notes: string;
  isActive: boolean;
}

export interface HrWorksiteFormValues {
  id?: string;
  code: string;
  name: string;
  description: string;
  isActive: boolean;
  isDefault: boolean;
}

export interface HrLeaveTypeItem {
  id: string;
  code: string | null;
  name: string;
  isPaid: boolean;
  annualAllowance: number;
  isActive: boolean;
}

export interface HrLeaveTypeFormValues {
  id?: string;
  code: string;
  name: string;
  isPaid: boolean;
  annualAllowance: string;
  isActive: boolean;
}

export interface HrPolicyDefinitionItem {
  id: string;
  code: string;
  name: string;
  policyType: string;
  effectiveFrom: string | null;
  effectiveTo: string | null;
  isActive: boolean;
}

export interface HrWorkflowDefinitionItem {
  id: string;
  code: string;
  name: string;
  entityType: string;
  isActive: boolean;
}

export interface HrRequestFormValues {
  id?: string;
  requestType: 'leave' | 'mission';
  employeeProfileId: string;
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  startAt: string;
  endAt: string;
  status: string;
  reason: string;
  destination: string;
  details: string;
}

export interface HrRequestFormOptions {
  employeeProfiles: HrEmployeeProfileOption[];
  leaveTypes: HrLeaveTypeItem[];
}

export interface HrPenaltyTypeItem {
  id: string;
  code: string | null;
  name: string;
  isDeductionBased: boolean;
  defaultAmount: number;
  isActive: boolean;
}

export interface HrPenaltyTypeFormValues {
  id?: string;
  code: string;
  name: string;
  isDeductionBased: boolean;
  defaultAmount: string;
  isActive: boolean;
}

export interface HrPolicyDefinitionFormValues {
  id?: string;
  code: string;
  name: string;
  policyType: string;
  effectiveFrom: string;
  effectiveTo: string;
  isActive: boolean;
}

export interface HrPenaltyFormValues {
  id?: string;
  employeeProfileId: string;
  penaltyTypeId: string;
  status: string;
  effectiveDate: string;
  amount: string;
  details: string;
  referenceNumber: string;
}

export interface HrPenaltyFormOptions {
  employeeProfiles: HrEmployeeProfileOption[];
  penaltyTypes: HrPenaltyTypeItem[];
}

export interface HrPayrollPeriodItem {
  id: string;
  code: string;
  periodStart: string;
  periodEnd: string;
  status: string;
  notes: string | null;
  lockedAt: string | null;
}

export interface HrPayrollPeriodFormValues {
  id?: string;
  code: string;
  periodStart: string;
  periodEnd: string;
  notes: string;
}

export interface ProductionAttendanceBatchItem {
  id: string;
  batchDate: string;
  shiftPlanId: string | null;
  shiftPlanName: string | null;
  reviewStatus: string;
  submittedAt: string | null;
  reviewedAt: string | null;
  notes: string | null;
}

export interface ProductionAttendanceBatchFormValues {
  id?: string;
  batchDate: string;
  shiftPlanId: string;
  notes: string;
}

export interface ProductionAttendanceEventItem {
  id: string;
  reviewBatchId: string | null;
  employeeProfileId: string | null;
  employeeName: string;
  eventDate: string;
  attendanceStatus: string;
  checkInAt: string | null;
  checkOutAt: string | null;
  shiftAssignmentId: string | null;
  notes: string | null;
}

export interface ProductionAttendanceEventFormValues {
  id?: string;
  reviewBatchId: string;
  employeeProfileId: string;
  eventDate: string;
  attendanceStatus: string;
  checkInAt: string;
  checkOutAt: string;
  shiftAssignmentId: string;
  notes: string;
}

export interface ProductionAttendanceFormOptions {
  employeeProfiles: HrEmployeeProfileOption[];
  shiftPlans: HrShiftPlanItem[];
}
