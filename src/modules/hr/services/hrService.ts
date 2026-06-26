import { supabase } from '../../../config/supabase';
import type {
  HrDashboardSummary,
  HrDepartmentOption,
  HrEmployeeFormOptions,
  HrEmployeeFormValues,
  HrEmployeeListItem,
  HrEmployeeProfileOption,
  HrLeaveTypeItem,
  HrLeaveTypeFormValues,
  HrPenaltyFormOptions,
  HrPenaltyItem,
  HrPenaltyFormValues,
  HrPenaltyTypeItem,
  HrPenaltyTypeFormValues,
  HrPayrollPeriodFormValues,
  HrPayrollPeriodItem,
  HrPayrollRunItem,
  HrPolicyDefinitionItem,
  HrPolicyDefinitionFormValues,
  HrRequestFormOptions,
  HrRequestFormValues,
  HrRequestItem,
  HrShiftAssignmentFormValue,
  HrShiftAssignmentItem,
  HrShiftPlanFormValues,
  HrShiftPlanItem,
  HrShiftPlanningOptions,
  HrShiftTemplateFormValues,
  HrShiftTemplateItem,
  HrTransportAssignmentItem,
  HrTransportAssignmentFormValues,
  HrTransportFormOptions,
  HrTransportLineFormValues,
  HrTransportLineItem,
  HrTransportVehicleFormValues,
  HrTransportVehicleItem,
  HrWorkflowDefinitionItem,
  HrWorksiteFormValues,
  HrWorksiteItem,
} from '../types';

function logScopeError(scope: string, error: unknown) {
  const normalized = error as { message?: string; details?: string } | null;
  console.warn(`[HR] ${scope} unavailable`, normalized?.message || normalized?.details || error);
}

async function safeCount(scope: string, queryFactory: () => Promise<{ count: number | null; error: unknown }>) {
  try {
    const { count, error } = await queryFactory();
    if (error) {
      logScopeError(scope, error);
      return 0;
    }
    return count || 0;
  } catch (error) {
    logScopeError(scope, error);
    return 0;
  }
}

async function safeSelect<T>(scope: string, queryFactory: () => Promise<{ data: T[] | null; error: unknown }>) {
  try {
    const { data, error } = await queryFactory();
    if (error) {
      logScopeError(scope, error);
      return [] as T[];
    }
    return (data || []) as T[];
  } catch (error) {
    logScopeError(scope, error);
    return [] as T[];
  }
}

function calculateInclusiveDays(startDate: string, endDate: string) {
  if (!startDate || !endDate) return 0;

  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  const diff = end.getTime() - start.getTime();

  if (Number.isNaN(diff) || diff < 0) return 0;

  return Math.floor(diff / (1000 * 60 * 60 * 24)) + 1;
}

async function resolveCurrentActorId() {
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    logScopeError('resolve current actor', error);
  }
  return data.user?.id || null;
}

async function resolveCurrentCompanyId() {
  try {
    const { data, error } = await supabase.rpc('get_user_company_id');
    if (!error && data) {
      return data as string;
    }
    if (error) {
      logScopeError('resolve company via rpc', error);
    }
  } catch (error) {
    logScopeError('resolve company via rpc', error);
  }

  const settingsRows = await safeSelect<{ main_company_id: string | null }>('resolve company via settings', () =>
    supabase
      .from('settings')
      .select('main_company_id')
      .limit(1)
  );
  if (settingsRows[0]?.main_company_id) {
    return settingsRows[0].main_company_id;
  }

  const companies = await safeSelect<{ id: string }>('resolve company via companies', () =>
    supabase
      .from('companies')
      .select('id')
      .limit(1)
  );
  return companies[0]?.id || null;
}

async function loadProfileEmployeeLookup() {
  const profiles = await safeSelect<{ id: string; employee_id: string }>('employee lookup profiles', () =>
    supabase
      .from('hr_employee_profiles')
      .select('id, employee_id')
      .limit(500)
  );

  if (profiles.length === 0) return new Map<string, string>();

  const employees = await safeSelect<{ id: string; name: string }>('employee lookup directory', () =>
    supabase
      .from('company_employees')
      .select('id, name')
      .in('id', profiles.map((profile) => profile.employee_id))
  );

  const employeeNameById = new Map(employees.map((employee) => [employee.id, employee.name]));
  return new Map(
    profiles.map((profile) => [profile.id, employeeNameById.get(profile.employee_id) || 'عامل غير مسمى'])
  );
}

async function loadEmployeeProfileOptions(limit: number = 500): Promise<HrEmployeeProfileOption[]> {
  const profiles = await safeSelect<any>('employee profile options', () =>
    supabase
      .from('hr_employee_profiles')
      .select('id, employee_id, worker_type, internal_employee_code')
      .neq('employment_status', 'archived')
      .limit(limit)
  );

  if (profiles.length === 0) {
    return [];
  }

  const employees = await safeSelect<any>('employee directory options', () =>
    supabase
      .from('company_employees')
      .select('id, name, employee_code, is_active')
      .in('id', profiles.map((profile) => profile.employee_id))
  );

  const employeeById = new Map(employees.map((employee) => [employee.id, employee]));

  return profiles
    .map((profile): HrEmployeeProfileOption | null => {
      const employee = employeeById.get(profile.employee_id);
      if (!employee || employee.is_active === false) {
        return null;
      }

      return {
        id: profile.id,
        employeeId: profile.employee_id,
        name: employee.name,
        baseEmployeeCode: employee.employee_code || null,
        internalEmployeeCode: profile.internal_employee_code || null,
        workerType: profile.worker_type || 'regular',
      };
    })
    .filter((item): item is HrEmployeeProfileOption => Boolean(item))
    .sort((a, b) => a.name.localeCompare(b.name, 'ar'));
}

export const hrService = {
  async getDashboardSummary(): Promise<HrDashboardSummary> {
    const [
      employeesCount,
      dailyWorkersCount,
      worksitesCount,
      shiftPlansCount,
      transportLinesCount,
      leaveRequestsCount,
      missionRequestsCount,
      penaltiesCount,
      payrollPeriodsCount,
      submittedAttendanceBatchesCount,
    ] = await Promise.all([
      safeCount('company_employees count', () =>
        supabase.from('company_employees').select('*', { count: 'exact', head: true })
      ),
      safeCount('daily worker count', () =>
        supabase
          .from('hr_employee_profiles')
          .select('*', { count: 'exact', head: true })
          .eq('worker_type', 'daily')
      ),
      safeCount('worksites count', () =>
        supabase
          .from('hr_worksites')
          .select('*', { count: 'exact', head: true })
          .eq('is_active', true)
      ),
      safeCount('shift plan count', () =>
        supabase
          .from('hr_shift_plans')
          .select('*', { count: 'exact', head: true })
          .neq('status', 'archived')
      ),
      safeCount('transport line count', () =>
        supabase
          .from('hr_transport_lines')
          .select('*', { count: 'exact', head: true })
          .eq('is_active', true)
      ),
      safeCount('leave requests count', () =>
        supabase
          .from('hr_leave_requests')
          .select('*', { count: 'exact', head: true })
          .in('status', ['draft', 'submitted', 'approved'])
      ),
      safeCount('mission requests count', () =>
        supabase
          .from('hr_mission_requests')
          .select('*', { count: 'exact', head: true })
          .in('status', ['draft', 'submitted', 'approved'])
      ),
      safeCount('penalties count', () =>
        supabase
          .from('hr_penalty_records')
          .select('*', { count: 'exact', head: true })
          .in('status', ['draft', 'submitted', 'approved'])
      ),
      safeCount('payroll periods count', () =>
        supabase
          .from('hr_payroll_periods')
          .select('*', { count: 'exact', head: true })
          .neq('status', 'closed')
      ),
      safeCount('attendance review batches count', () =>
        supabase
          .from('ops_attendance_review_batches')
          .select('*', { count: 'exact', head: true })
          .eq('review_status', 'submitted')
      ),
    ]);

    return {
      employeesCount,
      dailyWorkersCount,
      worksitesCount,
      shiftPlansCount,
      transportLinesCount,
      openRequestsCount: leaveRequestsCount + missionRequestsCount,
      openPenaltiesCount: penaltiesCount,
      payrollPeriodsCount,
      submittedAttendanceBatchesCount,
    };
  },

  async listEmployees(limit: number = 12): Promise<HrEmployeeListItem[]> {
    const employees = await safeSelect<any>('company_employees list', () =>
      supabase
        .from('company_employees')
        .select(`
          id,
          employee_code,
          name,
          email,
          department_id,
          notes,
          account_user_id,
          is_active,
          departments(name, name_ar)
        `)
        .order('name')
        .limit(limit)
    );

    const profiles = await safeSelect<any>('hr_employee_profiles list', () =>
      supabase
        .from('hr_employee_profiles')
        .select(`
          id,
          employee_id,
          worker_type,
          internal_employee_code,
          original_employee_code,
          primary_department_id,
          job_title_text,
          notes,
          employment_status,
          worksite_id,
          worksite:hr_worksites(id, name)
        `)
        .in('employee_id', employees.map((employee) => employee.id))
    );

    const profileByEmployeeId = new Map(profiles.map((profile) => [profile.employee_id, profile]));

    return employees.map((employee) => {
      const profile = profileByEmployeeId.get(employee.id);
      const departmentName = employee.departments?.name_ar || employee.departments?.name || null;

      return {
        id: employee.id,
        profileId: profile?.id || null,
        name: employee.name,
        email: employee.email || null,
        baseEmployeeCode: employee.employee_code,
        internalEmployeeCode: employee.employee_code,
        originalEmployeeCode: employee.employee_code,
        workerType: profile?.worker_type || 'regular',
        departmentId: profile?.primary_department_id || employee.department_id || null,
        departmentName,
        worksiteId: profile?.worksite_id || null,
        worksiteName: profile?.worksite?.name || null,
        jobTitleText: profile?.job_title_text || null,
        employmentStatus: profile?.employment_status || (employee.is_active ? 'active' : 'inactive'),
        isActive: Boolean(employee.is_active),
        hasAccount: Boolean(employee.account_user_id),
        notes: profile?.notes || employee.notes || null,
      };
    });
  },

  async listTransportLines(limit: number = 12): Promise<HrTransportLineItem[]> {
    const lines = await safeSelect<any>('transport lines', () =>
      supabase
        .from('hr_transport_lines')
        .select('id, code, name, description, is_active')
        .order('name')
        .limit(limit)
    );

    return lines.map((line) => ({
      id: line.id,
      code: line.code || null,
      name: line.name,
      description: line.description || null,
      isActive: Boolean(line.is_active),
    }));
  },

  async listTransportVehicles(limit: number = 12): Promise<HrTransportVehicleItem[]> {
    const vehicles = await safeSelect<any>('transport vehicles', () =>
      supabase
        .from('hr_transport_vehicles')
        .select(`
          id,
          line_id,
          code,
          plate_number,
          capacity,
          notes,
          is_active,
          line:hr_transport_lines(name)
        `)
        .order('code')
        .limit(limit)
    );

    return vehicles.map((vehicle) => ({
      id: vehicle.id,
      lineId: vehicle.line_id || null,
      lineName: vehicle.line?.name || null,
      code: vehicle.code || null,
      plateNumber: vehicle.plate_number || null,
      capacity: vehicle.capacity === null || vehicle.capacity === undefined ? null : Number(vehicle.capacity),
      notes: vehicle.notes || null,
      isActive: Boolean(vehicle.is_active),
    }));
  },

  async listTransportAssignments(limit: number = 12): Promise<HrTransportAssignmentItem[]> {
    const [lookup, assignments] = await Promise.all([
      loadProfileEmployeeLookup(),
      safeSelect<any>('transport assignments', () =>
        supabase
          .from('hr_employee_transport_assignments')
          .select(`
            id,
            employee_profile_id,
            line_id,
            vehicle_id,
            is_default,
            effective_from,
            effective_to,
            notes,
            line:hr_transport_lines(name),
            vehicle:hr_transport_vehicles(code, plate_number)
          `)
          .order('effective_from', { ascending: false })
          .limit(limit)
      ),
    ]);

    return assignments.map((assignment) => ({
      id: assignment.id,
      employeeProfileId: assignment.employee_profile_id || null,
      employeeName: lookup.get(assignment.employee_profile_id) || 'عامل غير معروف',
      lineId: assignment.line_id || null,
      lineName: assignment.line?.name || null,
      vehicleId: assignment.vehicle_id || null,
      vehicleCode: assignment.vehicle?.code || null,
      vehiclePlateNumber: assignment.vehicle?.plate_number || null,
      isDefault: Boolean(assignment.is_default),
      effectiveFrom: assignment.effective_from || null,
      effectiveTo: assignment.effective_to || null,
      notes: assignment.notes || null,
    }));
  },

  async getTransportFormOptions(): Promise<HrTransportFormOptions> {
    const [employeeProfiles, lines, vehicles] = await Promise.all([
      loadEmployeeProfileOptions(500),
      this.listTransportLines(200),
      this.listTransportVehicles(200),
    ]);

    return {
      employeeProfiles,
      lines: lines.filter((line) => line.isActive),
      vehicles: vehicles.filter((vehicle) => vehicle.isActive),
    };
  },

  async listShiftTemplates(limit: number = 20): Promise<HrShiftTemplateItem[]> {
    const templates = await safeSelect<any>('shift templates', () =>
      supabase
        .from('hr_shift_templates')
        .select('id, code, name, start_time, end_time, hours_count, break_minutes, is_night_shift, notes')
        .order('name')
        .limit(limit)
    );

    return templates.map((template) => ({
      id: template.id,
      code: template.code || null,
      name: template.name,
      startTime: template.start_time,
      endTime: template.end_time,
      hoursCount: Number(template.hours_count || 0),
      breakMinutes: Number(template.break_minutes || 0),
      isNightShift: Boolean(template.is_night_shift),
      notes: template.notes || null,
    }));
  },

  async listShiftPlans(limit: number = 10): Promise<HrShiftPlanItem[]> {
    const plans = await safeSelect<any>('shift plans', () =>
      supabase
        .from('hr_shift_plans')
        .select('id, name, status, period_start, period_end, version, published_at, notes')
        .order('period_start', { ascending: false })
        .limit(limit)
    );

    return plans.map((plan) => ({
      id: plan.id,
      name: plan.name,
      status: plan.status,
      periodStart: plan.period_start,
      periodEnd: plan.period_end,
      version: Number(plan.version || 1),
      publishedAt: plan.published_at || null,
      notes: plan.notes || null,
    }));
  },

  async listTodayShiftAssignments(limit: number = 12): Promise<HrShiftAssignmentItem[]> {
    const [lookup, assignments] = await Promise.all([
      loadProfileEmployeeLookup(),
      safeSelect<any>('shift assignments', () =>
        supabase
          .from('hr_shift_assignments')
          .select(`
            id,
            employee_profile_id,
            work_date,
            notes,
            shift_template:hr_shift_templates(name)
          `)
          .order('work_date', { ascending: false })
          .limit(limit)
      ),
    ]);

    return assignments.map((assignment) => ({
      id: assignment.id,
      employeeName: lookup.get(assignment.employee_profile_id) || 'عامل غير معروف',
      shiftName: assignment.shift_template?.name || null,
      workDate: assignment.work_date,
      notes: assignment.notes || null,
    }));
  },

  async listRequests(limit: number = 12): Promise<HrRequestItem[]> {
    const lookup = await loadProfileEmployeeLookup();
    const [leaveRequests, missionRequests] = await Promise.all([
      safeSelect<any>('leave requests', () =>
        supabase
          .from('hr_leave_requests')
          .select('id, employee_profile_id, leave_type_id, status, start_date, end_date, reason, leave_type:hr_leave_types(name)')
          .order('created_at', { ascending: false })
          .limit(limit)
      ),
      safeSelect<any>('mission requests', () =>
        supabase
          .from('hr_mission_requests')
          .select('id, employee_profile_id, status, start_at, end_at, destination, details')
          .order('created_at', { ascending: false })
          .limit(limit)
      ),
    ]);

    return [
      ...leaveRequests.map((request) => ({
        id: request.id,
        requestType: 'leave' as const,
        employeeProfileId: request.employee_profile_id || null,
        employeeName: lookup.get(request.employee_profile_id) || 'عامل غير معروف',
        leaveTypeId: request.leave_type_id || null,
        leaveTypeName: request.leave_type?.name || null,
        status: request.status,
        startDate: request.start_date || null,
        endDate: request.end_date || null,
        summary: request.reason || 'طلب إجازة',
        reason: request.reason || null,
        destination: null,
        details: null,
      })),
      ...missionRequests.map((request) => ({
        id: request.id,
        requestType: 'mission' as const,
        employeeProfileId: request.employee_profile_id || null,
        employeeName: lookup.get(request.employee_profile_id) || 'عامل غير معروف',
        leaveTypeId: null,
        leaveTypeName: null,
        status: request.status,
        startDate: request.start_at || null,
        endDate: request.end_at || null,
        summary: request.destination || 'مأمورية',
        reason: null,
        destination: request.destination || null,
        details: request.details || null,
      })),
    ]
      .sort((a, b) => (b.startDate || '').localeCompare(a.startDate || ''))
      .slice(0, limit);
  },

  async listPenalties(limit: number = 12): Promise<HrPenaltyItem[]> {
    const lookup = await loadProfileEmployeeLookup();
    const penalties = await safeSelect<any>('penalty records', () =>
      supabase
        .from('hr_penalty_records')
        .select(`
          id,
          employee_profile_id,
          penalty_type_id,
          status,
          effective_date,
          amount,
          details,
          reference_number,
          approved_at,
          penalty_type:hr_penalty_types(name)
        `)
        .order('effective_date', { ascending: false })
        .limit(limit)
    );

    return penalties.map((penalty) => ({
      id: penalty.id,
      employeeProfileId: penalty.employee_profile_id || null,
      employeeName: lookup.get(penalty.employee_profile_id) || 'عامل غير معروف',
      penaltyTypeId: penalty.penalty_type_id || null,
      penaltyTypeName: penalty.penalty_type?.name || null,
      status: penalty.status,
      effectiveDate: penalty.effective_date || null,
      amount: penalty.amount === null || penalty.amount === undefined ? null : Number(penalty.amount),
      details: penalty.details || null,
      referenceNumber: penalty.reference_number || null,
      approvedAt: penalty.approved_at || null,
    }));
  },

  async listPayrollRuns(limit: number = 12): Promise<HrPayrollRunItem[]> {
    const runs = await safeSelect<any>('payroll runs', () =>
      supabase
        .from('hr_payroll_runs')
        .select(`
          id,
          payroll_period_id,
          run_label,
          run_status,
          calculated_at,
          approved_at,
          summary,
          period:hr_payroll_periods(code)
        `)
        .order('created_at', { ascending: false })
        .limit(limit)
    );

    return runs.map((run) => ({
      id: run.id,
      payrollPeriodId: run.payroll_period_id,
      runLabel: run.run_label || null,
      runStatus: run.run_status,
      periodCode: run.period?.code || null,
      calculatedAt: run.calculated_at || null,
      approvedAt: run.approved_at || null,
      summary: run.summary || null,
    }));
  },

  async listWorksites(limit: number = 12): Promise<HrWorksiteItem[]> {
    const worksites = await safeSelect<any>('worksites', () =>
      supabase
        .from('hr_worksites')
        .select('id, code, name, description, is_active, is_default')
        .order('name')
        .limit(limit)
    );

    return worksites.map((worksite) => ({
      id: worksite.id,
      code: worksite.code || null,
      name: worksite.name,
      description: worksite.description || null,
      isActive: Boolean(worksite.is_active),
      isDefault: Boolean(worksite.is_default),
    }));
  },

  async listLeaveTypes(limit: number = 12, activeOnly: boolean = false): Promise<HrLeaveTypeItem[]> {
    const leaveTypes = await safeSelect<any>('leave types', async () => {
      let query = supabase
        .from('hr_leave_types')
        .select('id, code, name, is_paid, annual_allowance, is_active')
        .order('name')
        .limit(limit);

      if (activeOnly) {
        query = query.eq('is_active', true);
      }

      return query;
    });

    return leaveTypes.map((item) => ({
      id: item.id,
      code: item.code || null,
      name: item.name,
      isPaid: Boolean(item.is_paid),
      annualAllowance: Number(item.annual_allowance || 0),
      isActive: Boolean(item.is_active),
    }));
  },

  async listPolicies(limit: number = 12): Promise<HrPolicyDefinitionItem[]> {
    const policies = await safeSelect<any>('policy definitions', () =>
      supabase
        .from('hr_policy_definitions')
        .select('id, code, name, policy_type, effective_from, effective_to, is_active')
        .order('effective_from', { ascending: false })
        .limit(limit)
    );

    return policies.map((policy) => ({
      id: policy.id,
      code: policy.code,
      name: policy.name,
      policyType: policy.policy_type,
      effectiveFrom: policy.effective_from || null,
      effectiveTo: policy.effective_to || null,
      isActive: Boolean(policy.is_active),
    }));
  },

  async listWorkflowDefinitions(limit: number = 12): Promise<HrWorkflowDefinitionItem[]> {
    const workflows = await safeSelect<any>('workflow definitions', () =>
      supabase
        .from('hr_workflow_definitions')
        .select('id, code, name, entity_type, is_active')
        .order('name')
        .limit(limit)
    );

    return workflows.map((workflow) => ({
      id: workflow.id,
      code: workflow.code,
      name: workflow.name,
      entityType: workflow.entity_type,
      isActive: Boolean(workflow.is_active),
    }));
  },

  async listPenaltyTypes(limit: number = 100, activeOnly: boolean = false): Promise<HrPenaltyTypeItem[]> {
    const rows = await safeSelect<any>('penalty types', async () => {
      let query = supabase
        .from('hr_penalty_types')
        .select('id, code, name, is_deduction_based, default_amount, is_active')
        .order('name')
        .limit(limit);

      if (activeOnly) {
        query = query.eq('is_active', true);
      }

      return query;
    });

    return rows.map((row) => ({
      id: row.id,
      code: row.code || null,
      name: row.name,
      isDeductionBased: Boolean(row.is_deduction_based),
      defaultAmount: Number(row.default_amount || 0),
      isActive: Boolean(row.is_active),
    }));
  },

  async listPayrollPeriods(limit: number = 24): Promise<HrPayrollPeriodItem[]> {
    const rows = await safeSelect<any>('payroll periods', () =>
      supabase
        .from('hr_payroll_periods')
        .select('id, code, period_start, period_end, status, notes, locked_at')
        .order('period_start', { ascending: false })
        .limit(limit)
    );

    return rows.map((row) => ({
      id: row.id,
      code: row.code,
      periodStart: row.period_start,
      periodEnd: row.period_end,
      status: row.status,
      notes: row.notes || null,
      lockedAt: row.locked_at || null,
    }));
  },

  async getRequestFormOptions(): Promise<HrRequestFormOptions> {
    const [employeeProfiles, leaveTypes] = await Promise.all([
      loadEmployeeProfileOptions(),
      this.listLeaveTypes(100, true),
    ]);

    return {
      employeeProfiles,
      leaveTypes,
    };
  },

  async getPenaltyFormOptions(): Promise<HrPenaltyFormOptions> {
    const [employeeProfiles, penaltyTypes] = await Promise.all([
      loadEmployeeProfileOptions(),
      this.listPenaltyTypes(100, true),
    ]);

    return {
      employeeProfiles,
      penaltyTypes,
    };
  },

  async getEmployeeFormOptions(): Promise<HrEmployeeFormOptions> {
    const [departments, worksites] = await Promise.all([
      safeSelect<any>('department options', () =>
        supabase
          .from('departments')
          .select('id, name, name_ar')
          .eq('is_active', true)
          .order('name')
      ),
      this.listWorksites(100),
    ]);

    return {
      departments: departments.map((department): HrDepartmentOption => ({
        id: department.id,
        name: department.name_ar || department.name,
      })),
      worksites,
    };
  },

  async getShiftPlanningOptions(): Promise<HrShiftPlanningOptions> {
    const [employeeProfiles, shiftTemplates] = await Promise.all([
      loadEmployeeProfileOptions(),
      this.listShiftTemplates(100),
    ]);

    return {
      employeeProfiles,
      shiftTemplates,
    };
  },

  async getShiftPlanFormValues(planId: string): Promise<HrShiftPlanFormValues> {
    const { data: plan, error: planError } = await supabase
      .from('hr_shift_plans')
      .select('id, name, period_start, period_end, notes')
      .eq('id', planId)
      .single();

    if (planError) throw planError;

    const assignments = await safeSelect<any>('shift plan assignments', () =>
      supabase
        .from('hr_shift_assignments')
        .select('id, employee_profile_id, shift_template_id, work_date, notes, is_primary')
        .eq('shift_plan_id', planId)
        .order('work_date')
    );

    return {
      id: plan.id,
      name: plan.name,
      periodStart: plan.period_start,
      periodEnd: plan.period_end,
      notes: plan.notes || '',
      assignments: assignments.map((assignment): HrShiftAssignmentFormValue => ({
        id: assignment.id,
        employeeProfileId: assignment.employee_profile_id || '',
        shiftTemplateId: assignment.shift_template_id || '',
        workDate: assignment.work_date,
        notes: assignment.notes || '',
        isPrimary: assignment.is_primary !== false,
      })),
    };
  },

  async saveLeaveType(values: HrLeaveTypeFormValues): Promise<string> {
    const [actorId, companyId] = await Promise.all([
      resolveCurrentActorId(),
      resolveCurrentCompanyId(),
    ]);

    if (!companyId) {
      throw new Error('تعذر تحديد الشركة الحالية لحفظ نوع الإجازة.');
    }

    const payload = {
      company_id: companyId,
      code: values.code.trim(),
      name: values.name.trim(),
      is_paid: values.isPaid,
      annual_allowance: values.annualAllowance.trim() ? Number(values.annualAllowance) : 0,
      is_active: values.isActive,
      updated_by: actorId,
    };

    if (values.id) {
      const { error } = await supabase
        .from('hr_leave_types')
        .update(payload)
        .eq('id', values.id);
      if (error) throw error;
      return values.id;
    }

    const { data, error } = await supabase
      .from('hr_leave_types')
      .insert({
        ...payload,
        created_by: actorId,
      })
      .select('id')
      .single();
    if (error) throw error;
    return data.id;
  },

  async savePenaltyType(values: HrPenaltyTypeFormValues): Promise<string> {
    const [actorId, companyId] = await Promise.all([
      resolveCurrentActorId(),
      resolveCurrentCompanyId(),
    ]);

    if (!companyId) {
      throw new Error('تعذر تحديد الشركة الحالية لحفظ نوع الجزاء.');
    }

    const payload = {
      company_id: companyId,
      code: values.code.trim(),
      name: values.name.trim(),
      is_deduction_based: values.isDeductionBased,
      default_amount: values.defaultAmount.trim() ? Number(values.defaultAmount) : 0,
      is_active: values.isActive,
      updated_by: actorId,
    };

    if (values.id) {
      const { error } = await supabase
        .from('hr_penalty_types')
        .update(payload)
        .eq('id', values.id);
      if (error) throw error;
      return values.id;
    }

    const { data, error } = await supabase
      .from('hr_penalty_types')
      .insert({
        ...payload,
        created_by: actorId,
      })
      .select('id')
      .single();
    if (error) throw error;
    return data.id;
  },

  async savePolicyDefinition(values: HrPolicyDefinitionFormValues): Promise<string> {
    const [actorId, companyId] = await Promise.all([
      resolveCurrentActorId(),
      resolveCurrentCompanyId(),
    ]);

    if (!companyId) {
      throw new Error('تعذر تحديد الشركة الحالية لحفظ السياسة.');
    }

    const payload = {
      company_id: companyId,
      code: values.code.trim(),
      name: values.name.trim(),
      policy_type: values.policyType.trim(),
      effective_from: values.effectiveFrom,
      effective_to: values.effectiveTo || null,
      is_active: values.isActive,
      updated_by: actorId,
    };

    if (values.id) {
      const { error } = await supabase
        .from('hr_policy_definitions')
        .update(payload)
        .eq('id', values.id);
      if (error) throw error;
      return values.id;
    }

    const { data, error } = await supabase
      .from('hr_policy_definitions')
      .insert({
        ...payload,
        created_by: actorId,
      })
      .select('id')
      .single();
    if (error) throw error;
    return data.id;
  },

  async saveEmployee(values: HrEmployeeFormValues): Promise<string> {
    const [actorId, companyId] = await Promise.all([
      resolveCurrentActorId(),
      resolveCurrentCompanyId(),
    ]);

    if (!companyId) {
      throw new Error('تعذر تحديد الشركة الحالية لحفظ بيانات العامل.');
    }

    const normalizedEmployeeCode = values.baseEmployeeCode.trim();

    const employeePayload = {
      employee_code: normalizedEmployeeCode,
      name: values.name.trim(),
      email: values.email.trim() ? values.email.trim() : null,
      department_id: values.departmentId || null,
      notes: values.notes.trim() || null,
      is_active: values.isActive,
      updated_by: actorId,
    };

    let employeeId = values.id || '';

    if (values.id) {
      const { error } = await supabase
        .from('company_employees')
        .update(employeePayload)
        .eq('id', values.id);
      if (error) throw error;
    } else {
      const { data, error } = await supabase
        .from('company_employees')
        .insert({
          ...employeePayload,
          created_by: actorId,
        })
        .select('id')
        .single();
      if (error) throw error;
      employeeId = data.id;
    }

    const profilePayload = {
      company_id: companyId,
      employee_id: employeeId,
      worker_type: values.workerType,
      original_employee_code: normalizedEmployeeCode,
      internal_employee_code: normalizedEmployeeCode,
      job_title_text: values.jobTitleText.trim() || null,
      worksite_id: values.worksiteId || null,
      primary_department_id: values.departmentId || null,
      employment_status: values.employmentStatus,
      notes: values.notes.trim() || null,
      account_enabled: false,
      updated_by: actorId,
    };

    const { error: profileError } = await supabase
      .from('hr_employee_profiles')
      .upsert(
        [{
          ...profilePayload,
          created_by: actorId,
        }],
        { onConflict: 'employee_id' }
      );
    if (profileError) throw profileError;

    const assignmentRows = await safeSelect<{ id: string }>('employee primary assignment', () =>
      supabase
        .from('hr_employee_assignments')
        .select('id')
        .eq('employee_profile_id', values.profileId || '')
        .eq('assignment_type', 'primary')
        .limit(1)
    );

    const profileRows = await safeSelect<{ id: string }>('employee profile id after save', () =>
      supabase
        .from('hr_employee_profiles')
        .select('id')
        .eq('employee_id', employeeId)
        .limit(1)
    );
    const profileId = profileRows[0]?.id;

    if (profileId) {
      const assignmentPayload = {
        company_id: companyId,
        employee_profile_id: profileId,
        worksite_id: values.worksiteId || null,
        department_id: values.departmentId || null,
        job_title_text: values.jobTitleText.trim() || null,
        assignment_type: 'primary',
        effective_from: new Date().toISOString().slice(0, 10),
        is_current: true,
        notes: values.notes.trim() || null,
        updated_by: actorId,
      };

      if (assignmentRows[0]?.id) {
        const { error } = await supabase
          .from('hr_employee_assignments')
          .update(assignmentPayload)
          .eq('id', assignmentRows[0].id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('hr_employee_assignments')
          .insert({
            ...assignmentPayload,
            created_by: actorId,
          });
        if (error) throw error;
      }
    }

    return employeeId;
  },

  async setEmployeeActiveState(employeeId: string, isActive: boolean): Promise<void> {
    const actorId = await resolveCurrentActorId();

    const { error: employeeError } = await supabase
      .from('company_employees')
      .update({
        is_active: isActive,
        updated_by: actorId,
      })
      .eq('id', employeeId);
    if (employeeError) throw employeeError;

    const { error: profileError } = await supabase
      .from('hr_employee_profiles')
      .update({
        employment_status: isActive ? 'active' : 'inactive',
        updated_by: actorId,
      })
      .eq('employee_id', employeeId);
    if (profileError) throw profileError;
  },

  async saveShiftTemplate(values: HrShiftTemplateFormValues): Promise<string> {
    const [actorId, companyId] = await Promise.all([
      resolveCurrentActorId(),
      resolveCurrentCompanyId(),
    ]);

    if (!companyId) {
      throw new Error('تعذر تحديد الشركة الحالية لحفظ قالب الوردية.');
    }

    const payload = {
      company_id: companyId,
      code: values.code.trim() || null,
      name: values.name.trim(),
      start_time: values.startTime,
      end_time: values.endTime,
      hours_count: Number(values.hoursCount || 0),
      break_minutes: Number(values.breakMinutes || 0),
      is_night_shift: values.isNightShift,
      notes: values.notes.trim() || null,
      updated_by: actorId,
    };

    if (values.id) {
      const { error } = await supabase
        .from('hr_shift_templates')
        .update(payload)
        .eq('id', values.id);
      if (error) throw error;
      return values.id;
    }

    const { data, error } = await supabase
      .from('hr_shift_templates')
      .insert({
        ...payload,
        created_by: actorId,
      })
      .select('id')
      .single();
    if (error) throw error;
    return data.id;
  },

  async saveShiftPlan(values: HrShiftPlanFormValues): Promise<string> {
    const [actorId, companyId] = await Promise.all([
      resolveCurrentActorId(),
      resolveCurrentCompanyId(),
    ]);

    if (!companyId) {
      throw new Error('تعذر تحديد الشركة الحالية لحفظ خطة الورديات.');
    }

    const planPayload = {
      company_id: companyId,
      name: values.name.trim(),
      period_start: values.periodStart,
      period_end: values.periodEnd,
      notes: values.notes.trim() || null,
      updated_by: actorId,
    };

    let planId = values.id || '';

    if (values.id) {
      const { error } = await supabase
        .from('hr_shift_plans')
        .update(planPayload)
        .eq('id', values.id);
      if (error) throw error;
      planId = values.id;
    } else {
      const { data, error } = await supabase
        .from('hr_shift_plans')
        .insert({
          ...planPayload,
          status: 'draft',
          version: 1,
          created_by: actorId,
        })
        .select('id')
        .single();
      if (error) throw error;
      planId = data.id;
    }

    const { error: deleteError } = await supabase
      .from('hr_shift_assignments')
      .delete()
      .eq('shift_plan_id', planId);
    if (deleteError) throw deleteError;

    const assignmentRows = values.assignments
      .filter((assignment) => assignment.employeeProfileId && assignment.shiftTemplateId && assignment.workDate)
      .map((assignment) => ({
        company_id: companyId,
        shift_plan_id: planId,
        employee_profile_id: assignment.employeeProfileId,
        shift_template_id: assignment.shiftTemplateId,
        work_date: assignment.workDate,
        is_primary: assignment.isPrimary,
        notes: assignment.notes.trim() || null,
        created_by: actorId,
        updated_by: actorId,
      }));

    if (assignmentRows.length > 0) {
      const { error: assignmentError } = await supabase
        .from('hr_shift_assignments')
        .insert(assignmentRows);
      if (assignmentError) throw assignmentError;
    }

    return planId;
  },

  async publishShiftPlan(planId: string): Promise<string> {
    const { data, error } = await supabase.rpc('hr_publish_shift_plan', {
      p_plan_id: planId,
    });

    if (error) throw error;
    return data as string;
  },

  async saveWorksite(values: HrWorksiteFormValues): Promise<string> {
    const [actorId, companyId] = await Promise.all([
      resolveCurrentActorId(),
      resolveCurrentCompanyId(),
    ]);

    if (!companyId) {
      throw new Error('تعذر تحديد الشركة الحالية لحفظ موقع العمل.');
    }

    if (values.isDefault) {
      const { error: resetError } = await supabase
        .from('hr_worksites')
        .update({
          is_default: false,
          updated_by: actorId,
        })
        .eq('company_id', companyId);
      if (resetError) throw resetError;
    }

    const payload = {
      company_id: companyId,
      code: values.code.trim() || null,
      name: values.name.trim(),
      description: values.description.trim() || null,
      is_active: values.isActive,
      is_default: values.isDefault,
      updated_by: actorId,
    };

    if (values.id) {
      const { error } = await supabase
        .from('hr_worksites')
        .update(payload)
        .eq('id', values.id);
      if (error) throw error;
      return values.id;
    }

    const { data, error } = await supabase
      .from('hr_worksites')
      .insert({
        ...payload,
        created_by: actorId,
      })
      .select('id')
      .single();
    if (error) throw error;
    return data.id;
  },

  async saveTransportLine(values: HrTransportLineFormValues): Promise<string> {
    const [actorId, companyId] = await Promise.all([
      resolveCurrentActorId(),
      resolveCurrentCompanyId(),
    ]);

    if (!companyId) {
      throw new Error('تعذر تحديد الشركة الحالية لحفظ خط السير.');
    }

    const payload = {
      company_id: companyId,
      code: values.code.trim() || null,
      name: values.name.trim(),
      description: values.description.trim() || null,
      is_active: values.isActive,
      updated_by: actorId,
    };

    if (values.id) {
      const { error } = await supabase
        .from('hr_transport_lines')
        .update(payload)
        .eq('id', values.id);
      if (error) throw error;
      return values.id;
    }

    const { data, error } = await supabase
      .from('hr_transport_lines')
      .insert({
        ...payload,
        created_by: actorId,
      })
      .select('id')
      .single();
    if (error) throw error;
    return data.id;
  },

  async saveTransportVehicle(values: HrTransportVehicleFormValues): Promise<string> {
    const [actorId, companyId] = await Promise.all([
      resolveCurrentActorId(),
      resolveCurrentCompanyId(),
    ]);

    if (!companyId) {
      throw new Error('تعذر تحديد الشركة الحالية لحفظ السيارة.');
    }

    const payload = {
      company_id: companyId,
      line_id: values.lineId || null,
      code: values.code.trim() || null,
      plate_number: values.plateNumber.trim() || null,
      capacity: values.capacity.trim() ? Number(values.capacity) : null,
      notes: values.notes.trim() || null,
      is_active: values.isActive,
      updated_by: actorId,
    };

    if (values.id) {
      const { error } = await supabase
        .from('hr_transport_vehicles')
        .update(payload)
        .eq('id', values.id);
      if (error) throw error;
      return values.id;
    }

    const { data, error } = await supabase
      .from('hr_transport_vehicles')
      .insert({
        ...payload,
        created_by: actorId,
      })
      .select('id')
      .single();
    if (error) throw error;
    return data.id;
  },

  async saveTransportAssignment(values: HrTransportAssignmentFormValues): Promise<string> {
    const [actorId, companyId] = await Promise.all([
      resolveCurrentActorId(),
      resolveCurrentCompanyId(),
    ]);

    if (!companyId) {
      throw new Error('تعذر تحديد الشركة الحالية لحفظ التسكين.');
    }

    let resolvedLineId = values.lineId || null;
    if (values.vehicleId && !resolvedLineId) {
      const { data: vehicle, error: vehicleError } = await supabase
        .from('hr_transport_vehicles')
        .select('line_id')
        .eq('id', values.vehicleId)
        .single();

      if (vehicleError) throw vehicleError;
      resolvedLineId = vehicle?.line_id || null;
    }

    const payload = {
      company_id: companyId,
      employee_profile_id: values.employeeProfileId,
      line_id: resolvedLineId,
      vehicle_id: values.vehicleId || null,
      is_default: values.isDefault,
      effective_from: values.effectiveFrom,
      effective_to: values.effectiveTo || null,
      notes: values.notes.trim() || null,
      updated_by: actorId,
    };

    let assignmentId = values.id;

    if (values.id) {
      const { error } = await supabase
        .from('hr_employee_transport_assignments')
        .update(payload)
        .eq('id', values.id);
      if (error) throw error;
    } else {
      const { data, error } = await supabase
        .from('hr_employee_transport_assignments')
        .insert({
          ...payload,
          created_by: actorId,
        })
        .select('id')
        .single();
      if (error) throw error;
      assignmentId = data.id;
    }

    if (!assignmentId) {
      throw new Error('تعذر تحديد التسكين المحفوظ.');
    }

    if (values.isDefault) {
      const { error } = await supabase
        .from('hr_employee_transport_assignments')
        .update({
          is_default: false,
          updated_by: actorId,
        })
        .eq('employee_profile_id', values.employeeProfileId)
        .neq('id', assignmentId);

      if (error) throw error;
    }

    return assignmentId;
  },

  async saveRequest(values: HrRequestFormValues): Promise<string> {
    const [actorId, companyId] = await Promise.all([
      resolveCurrentActorId(),
      resolveCurrentCompanyId(),
    ]);

    if (!companyId) {
      throw new Error('تعذر تحديد الشركة الحالية لحفظ الطلب.');
    }

    if (values.requestType === 'leave') {
      const payload = {
        company_id: companyId,
        employee_profile_id: values.employeeProfileId,
        leave_type_id: values.leaveTypeId || null,
        start_date: values.startDate,
        end_date: values.endDate,
        days_count: calculateInclusiveDays(values.startDate, values.endDate),
        status: values.status,
        reason: values.reason.trim() || null,
        updated_by: actorId,
      };

      if (values.id) {
        const { error } = await supabase
          .from('hr_leave_requests')
          .update(payload)
          .eq('id', values.id);
        if (error) throw error;
        return values.id;
      }

      const { data, error } = await supabase
        .from('hr_leave_requests')
        .insert({
          ...payload,
          created_by: actorId,
        })
        .select('id')
        .single();
      if (error) throw error;
      return data.id;
    }

    const payload = {
      company_id: companyId,
      employee_profile_id: values.employeeProfileId,
      start_at: values.startAt ? new Date(values.startAt).toISOString() : null,
      end_at: values.endAt ? new Date(values.endAt).toISOString() : null,
      destination: values.destination.trim() || null,
      details: values.details.trim() || null,
      status: values.status,
      updated_by: actorId,
    };

    if (values.id) {
      const { error } = await supabase
        .from('hr_mission_requests')
        .update(payload)
        .eq('id', values.id);
      if (error) throw error;
      return values.id;
    }

    const { data, error } = await supabase
      .from('hr_mission_requests')
      .insert({
        ...payload,
        created_by: actorId,
      })
      .select('id')
      .single();
    if (error) throw error;
    return data.id;
  },

  async setRequestStatus(requestType: 'leave' | 'mission', requestId: string, status: string): Promise<string> {
    const actorId = await resolveCurrentActorId();
    const tableName = requestType === 'leave' ? 'hr_leave_requests' : 'hr_mission_requests';

    const { error } = await supabase
      .from(tableName)
      .update({
        status,
        updated_by: actorId,
      })
      .eq('id', requestId);

    if (error) throw error;
    return requestId;
  },

  async savePenalty(values: HrPenaltyFormValues): Promise<string> {
    const [actorId, companyId] = await Promise.all([
      resolveCurrentActorId(),
      resolveCurrentCompanyId(),
    ]);

    if (!companyId) {
      throw new Error('تعذر تحديد الشركة الحالية لحفظ الجزاء.');
    }

    const payload = {
      company_id: companyId,
      employee_profile_id: values.employeeProfileId,
      penalty_type_id: values.penaltyTypeId || null,
      status: values.status,
      effective_date: values.effectiveDate || null,
      amount: values.amount.trim() ? Number(values.amount) : null,
      details: values.details.trim() || null,
      reference_number: values.referenceNumber.trim() || null,
      updated_by: actorId,
    };

    if (values.id) {
      const { error } = await supabase
        .from('hr_penalty_records')
        .update(payload)
        .eq('id', values.id);
      if (error) throw error;
      return values.id;
    }

    const { data, error } = await supabase
      .from('hr_penalty_records')
      .insert({
        ...payload,
        created_by: actorId,
      })
      .select('id')
      .single();
    if (error) throw error;
    return data.id;
  },

  async setPenaltyStatus(penaltyId: string, status: string): Promise<string> {
    const actorId = await resolveCurrentActorId();
    const approvedAt = status === 'approved' ? new Date().toISOString() : null;

    const { error } = await supabase
      .from('hr_penalty_records')
      .update({
        status,
        approved_by: status === 'approved' ? actorId : null,
        approved_at: approvedAt,
        updated_by: actorId,
      })
      .eq('id', penaltyId);

    if (error) throw error;
    return penaltyId;
  },

  async savePayrollPeriod(values: HrPayrollPeriodFormValues): Promise<string> {
    const [actorId, companyId] = await Promise.all([
      resolveCurrentActorId(),
      resolveCurrentCompanyId(),
    ]);

    if (!companyId) {
      throw new Error('تعذر تحديد الشركة الحالية لحفظ فترة المرتبات.');
    }

    const payload = {
      company_id: companyId,
      code: values.code.trim(),
      period_start: values.periodStart,
      period_end: values.periodEnd,
      notes: values.notes.trim() || null,
      updated_by: actorId,
    };

    if (values.id) {
      const { error } = await supabase
        .from('hr_payroll_periods')
        .update(payload)
        .eq('id', values.id);
      if (error) throw error;
      return values.id;
    }

    const { data, error } = await supabase
      .from('hr_payroll_periods')
      .insert({
        ...payload,
        status: 'open',
        created_by: actorId,
      })
      .select('id')
      .single();
    if (error) throw error;
    return data.id;
  },

  async createPayrollRun(payrollPeriodId: string, runLabel?: string): Promise<string> {
    const [actorId, companyId] = await Promise.all([
      resolveCurrentActorId(),
      resolveCurrentCompanyId(),
    ]);

    if (!companyId) {
      throw new Error('تعذر تحديد الشركة الحالية لإنشاء تشغيل مرتبات.');
    }

    const { data, error } = await supabase
      .from('hr_payroll_runs')
      .insert({
        company_id: companyId,
        payroll_period_id: payrollPeriodId,
        run_label: runLabel?.trim() || null,
        run_status: 'draft',
        created_by: actorId,
        updated_by: actorId,
      })
      .select('id')
      .single();

    if (error) throw error;
    return data.id;
  },

  async buildAttendanceLedger(periodId: string): Promise<number> {
    const { data, error } = await supabase.rpc('hr_build_attendance_ledger', {
      p_payroll_period_id: periodId,
    });

    if (error) throw error;
    return Number(data || 0);
  },

  async calculatePayrollRun(runId: string): Promise<number> {
    const { data, error } = await supabase.rpc('hr_calculate_payroll_run', {
      p_payroll_run_id: runId,
    });

    if (error) throw error;
    return Number(data || 0);
  },

  async approvePayrollRun(runId: string): Promise<string> {
    const actorId = await resolveCurrentActorId();
    const { error } = await supabase
      .from('hr_payroll_runs')
      .update({
        run_status: 'approved',
        approved_at: new Date().toISOString(),
        approved_by: actorId,
        updated_by: actorId,
      })
      .eq('id', runId);

    if (error) throw error;
    return runId;
  },

  async closePayrollPeriod(periodId: string): Promise<string> {
    const { data, error } = await supabase.rpc('hr_close_payroll_period', {
      p_period_id: periodId,
    });

    if (error) throw error;
    return data as string;
  },
};

export default hrService;
