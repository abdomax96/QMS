import { supabase } from '../config/supabase';
import type {
  HrEmployeeProfileOption,
  HrShiftPlanItem,
  ProductionAttendanceBatchFormValues,
  ProductionAttendanceBatchItem,
  ProductionAttendanceEventFormValues,
  ProductionAttendanceEventItem,
  ProductionAttendanceFormOptions,
} from '../modules/hr/types';

function logScopeError(scope: string, error: unknown) {
  const normalized = error as { message?: string; details?: string } | null;
  console.warn(`[ProductionAttendance] ${scope} unavailable`, normalized?.message || normalized?.details || error);
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
  const profiles = await safeSelect<any>('attendance employee options', () =>
    supabase
      .from('hr_employee_profiles')
      .select('id, employee_id, worker_type, internal_employee_code')
      .neq('employment_status', 'archived')
      .limit(limit)
  );

  if (profiles.length === 0) {
    return [];
  }

  const employees = await safeSelect<any>('attendance employee directory', () =>
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

function toDateTimeIso(dateValue: string, timeValue: string) {
  if (!dateValue || !timeValue) {
    return null;
  }

  return new Date(`${dateValue}T${timeValue}:00`).toISOString();
}

export const productionAttendanceService = {
  async listReviewBatches(limit: number = 20): Promise<ProductionAttendanceBatchItem[]> {
    const rows = await safeSelect<any>('attendance review batches', () =>
      supabase
        .from('ops_attendance_review_batches')
        .select('id, batch_date, shift_plan_id, review_status, submitted_at, reviewed_at, notes, shift_plan:hr_shift_plans(name)')
        .order('batch_date', { ascending: false })
        .limit(limit)
    );

    return rows.map((row) => ({
      id: row.id,
      batchDate: row.batch_date,
      shiftPlanId: row.shift_plan_id || null,
      shiftPlanName: row.shift_plan?.name || null,
      reviewStatus: row.review_status,
      submittedAt: row.submitted_at || null,
      reviewedAt: row.reviewed_at || null,
      notes: row.notes || null,
    }));
  },

  async listRecentEvents(limit: number = 20): Promise<ProductionAttendanceEventItem[]> {
    const [lookup, rows] = await Promise.all([
      loadProfileEmployeeLookup(),
      safeSelect<any>('attendance events', () =>
        supabase
          .from('ops_attendance_events')
          .select('id, review_batch_id, employee_profile_id, shift_assignment_id, event_date, attendance_status, check_in_at, check_out_at, notes')
          .order('event_date', { ascending: false })
          .limit(limit)
      ),
    ]);

    return rows.map((row) => ({
      id: row.id,
      reviewBatchId: row.review_batch_id || null,
      employeeProfileId: row.employee_profile_id || null,
      employeeName: lookup.get(row.employee_profile_id) || 'عامل غير معروف',
      eventDate: row.event_date,
      attendanceStatus: row.attendance_status,
      checkInAt: row.check_in_at || null,
      checkOutAt: row.check_out_at || null,
      shiftAssignmentId: row.shift_assignment_id || null,
      notes: row.notes || null,
    }));
  },

  async listBatchEvents(batchId: string): Promise<ProductionAttendanceEventItem[]> {
    const [lookup, rows] = await Promise.all([
      loadProfileEmployeeLookup(),
      safeSelect<any>('attendance batch events', () =>
        supabase
          .from('ops_attendance_events')
          .select('id, review_batch_id, employee_profile_id, shift_assignment_id, event_date, attendance_status, check_in_at, check_out_at, notes')
          .eq('review_batch_id', batchId)
          .order('event_date')
          .order('created_at')
      ),
    ]);

    return rows.map((row) => ({
      id: row.id,
      reviewBatchId: row.review_batch_id || null,
      employeeProfileId: row.employee_profile_id || null,
      employeeName: lookup.get(row.employee_profile_id) || 'عامل غير معروف',
      eventDate: row.event_date,
      attendanceStatus: row.attendance_status,
      checkInAt: row.check_in_at || null,
      checkOutAt: row.check_out_at || null,
      shiftAssignmentId: row.shift_assignment_id || null,
      notes: row.notes || null,
    }));
  },

  async getFormOptions(): Promise<ProductionAttendanceFormOptions> {
    const [employeeProfiles, shiftPlansRaw] = await Promise.all([
      loadEmployeeProfileOptions(),
      safeSelect<any>('attendance shift plan options', () =>
        supabase
          .from('hr_shift_plans')
          .select('id, name, status, period_start, period_end, version, published_at, notes')
          .neq('status', 'archived')
          .order('period_start', { ascending: false })
          .limit(100)
      ),
    ]);

    const shiftPlans: HrShiftPlanItem[] = shiftPlansRaw.map((plan) => ({
      id: plan.id,
      name: plan.name,
      status: plan.status,
      periodStart: plan.period_start,
      periodEnd: plan.period_end,
      version: Number(plan.version || 1),
      publishedAt: plan.published_at || null,
      notes: plan.notes || null,
    }));

    return {
      employeeProfiles,
      shiftPlans,
    };
  },

  async saveBatch(values: ProductionAttendanceBatchFormValues): Promise<string> {
    const [actorId, companyId] = await Promise.all([
      resolveCurrentActorId(),
      resolveCurrentCompanyId(),
    ]);

    if (!companyId) {
      throw new Error('تعذر تحديد الشركة الحالية لحفظ دفعة الحضور.');
    }

    const payload = {
      company_id: companyId,
      batch_date: values.batchDate,
      shift_plan_id: values.shiftPlanId || null,
      notes: values.notes.trim() || null,
      updated_by: actorId,
    };

    if (values.id) {
      const { error } = await supabase
        .from('ops_attendance_review_batches')
        .update(payload)
        .eq('id', values.id);
      if (error) throw error;
      return values.id;
    }

    const existingRows = await safeSelect<{ id: string }>('existing attendance batch', () =>
      supabase
        .from('ops_attendance_review_batches')
        .select('id')
        .eq('company_id', companyId)
        .eq('batch_date', values.batchDate)
        .limit(1)
    );

    if (existingRows[0]?.id) {
      const { error } = await supabase
        .from('ops_attendance_review_batches')
        .update(payload)
        .eq('id', existingRows[0].id);
      if (error) throw error;
      return existingRows[0].id;
    }

    const { data, error } = await supabase
      .from('ops_attendance_review_batches')
      .insert({
        ...payload,
        review_status: 'draft',
        created_by: actorId,
      })
      .select('id')
      .single();
    if (error) throw error;
    return data.id;
  },

  async saveAttendanceEvent(values: ProductionAttendanceEventFormValues): Promise<string> {
    const [actorId, companyId] = await Promise.all([
      resolveCurrentActorId(),
      resolveCurrentCompanyId(),
    ]);

    if (!companyId) {
      throw new Error('تعذر تحديد الشركة الحالية لحفظ سجل الحضور.');
    }

    const payload = {
      company_id: companyId,
      review_batch_id: values.reviewBatchId || null,
      employee_profile_id: values.employeeProfileId,
      shift_assignment_id: values.shiftAssignmentId || null,
      event_date: values.eventDate,
      check_in_at: toDateTimeIso(values.eventDate, values.checkInAt),
      check_out_at: toDateTimeIso(values.eventDate, values.checkOutAt),
      attendance_status: values.attendanceStatus,
      source: 'manual',
      notes: values.notes.trim() || null,
      captured_by: actorId,
      updated_by: actorId,
    };

    if (values.id) {
      const { error } = await supabase
        .from('ops_attendance_events')
        .update(payload)
        .eq('id', values.id);
      if (error) throw error;
      return values.id;
    }

    const { data, error } = await supabase
      .from('ops_attendance_events')
      .insert({
        ...payload,
        created_by: actorId,
      })
      .select('id')
      .single();
    if (error) throw error;
    return data.id;
  },

  async submitBatch(batchId: string): Promise<string> {
    const { data, error } = await supabase.rpc('ops_submit_attendance_batch', {
      p_review_batch_id: batchId,
    });

    if (error) throw error;
    return data as string;
  },

  async reviewBatch(batchId: string, reviewStatus: string, notes?: string): Promise<string> {
    const { data, error } = await supabase.rpc('ops_review_attendance_batch', {
      p_review_batch_id: batchId,
      p_review_status: reviewStatus,
      p_notes: notes || null,
    });

    if (error) throw error;
    return data as string;
  },
};

export default productionAttendanceService;
