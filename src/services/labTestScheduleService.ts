/**
 * Lab Test Schedule Service
 * خدمة جدولة فحوصات المعمل
 */

import { supabase } from '../config/supabase';
import type {
    LabTestSchedule,
    CreateTestScheduleData,
    TestScheduleType
} from '../types/labTests';
import { labTestExecutionService } from './labTestExecutionService';

class LabTestScheduleService {
    // =====================================================
    // Schedule CRUD
    // =====================================================

    async getSchedules(filters?: {
        configId?: string;
        batchId?: string;
        productId?: string;
        isActive?: boolean;
    }): Promise<LabTestSchedule[]> {
        let query = supabase
            .from('lab_test_schedules')
            .select(`
                *,
                test_config:lab_tests_config(
                    *,
                    test_type:lab_test_types(
                        *,
                        category:lab_test_categories(*)
                    )
                )
            `)
            .order('next_run_at', { ascending: true, nullsFirst: false });

        if (filters) {
            if (filters.configId) query = query.eq('test_config_id', filters.configId);
            if (filters.batchId) query = query.eq('linked_batch_id', filters.batchId);
            if (filters.productId) query = query.eq('linked_product_id', filters.productId);
            if (filters.isActive !== undefined) query = query.eq('is_active', filters.isActive);
        }

        const { data, error } = await query;

        if (error) throw error;
        return data || [];
    }

    async getScheduleById(id: string): Promise<LabTestSchedule | null> {
        const { data, error } = await supabase
            .from('lab_test_schedules')
            .select(`
                *,
                test_config:lab_tests_config(
                    *,
                    test_type:lab_test_types(
                        *,
                        category:lab_test_categories(*)
                    )
                )
            `)
            .eq('id', id)
            .single();

        if (error) throw error;
        return data;
    }

    async getUpcomingSchedules(departmentId?: string, userId?: string): Promise<LabTestSchedule[]> {
        const now = new Date().toISOString();

        let query = supabase
            .from('lab_test_schedules')
            .select(`
                *,
                test_config:lab_tests_config(
                    *,
                    test_type:lab_test_types(
                        *,
                        category:lab_test_categories(*)
                    )
                )
            `)
            .eq('is_active', true)
            .is('paused_at', null)
            .lte('next_run_at', new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()) // Next 24 hours
            .order('next_run_at', { ascending: true });

        if (departmentId) {
            query = query.eq('assigned_department_id', departmentId);
        }

        if (userId) {
            query = query.contains('assigned_user_ids', [userId]);
        }

        const { data, error } = await query;

        if (error) throw error;
        return data || [];
    }

    async getOverdueSchedules(): Promise<LabTestSchedule[]> {
        const now = new Date().toISOString();

        const { data, error } = await supabase
            .from('lab_test_schedules')
            .select(`
                *,
                test_config:lab_tests_config(
                    *,
                    test_type:lab_test_types(
                        *,
                        category:lab_test_categories(*)
                    )
                )
            `)
            .eq('is_active', true)
            .is('paused_at', null)
            .lt('next_run_at', now)
            .order('next_run_at', { ascending: true });

        if (error) throw error;
        return data || [];
    }

    async createSchedule(schedulData: CreateTestScheduleData): Promise<LabTestSchedule> {
        const { data: user } = await supabase.auth.getUser();
        const { data: settings } = await supabase
            .from('settings')
            .select('main_company_id')
            .eq('id', 'global')
            .single();

        // Calculate next run time
        const next_run_at = this.calculateNextRun(schedulData);

        const { data, error } = await supabase
            .from('lab_test_schedules')
            .insert({
                ...schedulData,
                next_run_at,
                company_id: settings?.main_company_id,
                created_by: user.user?.id
            })
            .select(`
                *,
                test_config:lab_tests_config(
                    *,
                    test_type:lab_test_types(
                        *,
                        category:lab_test_categories(*)
                    )
                )
            `)
            .single();

        if (error) throw error;
        return data;
    }

    async updateSchedule(id: string, updates: Partial<CreateTestScheduleData>): Promise<LabTestSchedule> {
        const { data: user } = await supabase.auth.getUser();

        // Recalculate next run if schedule details changed
        let next_run_at: string | undefined;
        if (updates.frequency_value || updates.frequency_unit || updates.start_time) {
            const schedule = await this.getScheduleById(id);
            if (schedule) {
                next_run_at = this.calculateNextRun({ ...schedule, ...updates });
            }
        }

        const { data, error } = await supabase
            .from('lab_test_schedules')
            .update({
                ...updates,
                ...(next_run_at && { next_run_at }),
                updated_by: user.user?.id
            })
            .eq('id', id)
            .select(`
                *,
                test_config:lab_tests_config(
                    *,
                    test_type:lab_test_types(
                        *,
                        category:lab_test_categories(*)
                    )
                )
            `)
            .single();

        if (error) throw error;
        return data;
    }

    async deleteSchedule(id: string): Promise<void> {
        const { error } = await supabase
            .from('lab_test_schedules')
            .delete()
            .eq('id', id);

        if (error) throw error;
    }

    // =====================================================
    // Schedule Control
    // =====================================================

    async pauseSchedule(id: string, reason: string): Promise<LabTestSchedule> {
        const { data: user } = await supabase.auth.getUser();

        const { data, error } = await supabase
            .from('lab_test_schedules')
            .update({
                paused_at: new Date().toISOString(),
                paused_reason: reason,
                paused_by: user.user?.id,
                updated_by: user.user?.id
            })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    async resumeSchedule(id: string): Promise<LabTestSchedule> {
        const { data: user } = await supabase.auth.getUser();

        // Recalculate next run
        const schedule = await this.getScheduleById(id);
        if (!schedule) throw new Error('Schedule not found');

        const next_run_at = this.calculateNextRun(schedule);

        const { data, error } = await supabase
            .from('lab_test_schedules')
            .update({
                resumed_at: new Date().toISOString(),
                paused_at: null,
                paused_reason: null,
                paused_by: null,
                next_run_at,
                updated_by: user.user?.id
            })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    async toggleSchedule(id: string): Promise<LabTestSchedule> {
        const schedule = await this.getScheduleById(id);
        if (!schedule) throw new Error('Schedule not found');

        const { data, error } = await supabase
            .from('lab_test_schedules')
            .update({
                is_active: !schedule.is_active
            })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    // =====================================================
    // Schedule Execution
    // =====================================================

    async executeSchedule(id: string, manual: boolean = false): Promise<any> {
        const schedule = await this.getScheduleById(id);
        if (!schedule) throw new Error('Schedule not found');

        // Create test run
        const run = await labTestExecutionService.createTestRun({
            test_config_id: schedule.test_config_id,
            schedule_id: id,
            linked_batch_id: schedule.linked_batch_id,
            linked_product_id: schedule.linked_product_id,
            scheduled_at: new Date().toISOString(),
            notes: manual ? 'Manually triggered from schedule' : 'Auto-created from schedule'
        });

        // Update schedule last run and calculate next run
        const next_run_at = this.calculateNextRun(schedule);

        await supabase
            .from('lab_test_schedules')
            .update({
                last_run_at: new Date().toISOString(),
                next_run_at
            })
            .eq('id', id);

        return run;
    }

    // =====================================================
    // Helper Functions
    // =====================================================

    private calculateNextRun(schedule: CreateTestScheduleData & Partial<LabTestSchedule>): string {
        const now = new Date();

        switch (schedule.schedule_type) {
            case 'hourly':
            case 'daily':
            case 'weekly':
            case 'monthly':
                return this.calculateTimeBasedNextRun(schedule, now);

            case 'on_batch':
            case 'on_material_receipt':
            case 'on_work_order_complete':
                // Event-based schedules don't have a fixed next run
                return new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(); // 1 year in future (placeholder)

            case 'custom':
            default:
                return new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // Default: 24 hours
        }
    }

    private calculateTimeBasedNextRun(
        schedule: CreateTestScheduleData & Partial<LabTestSchedule>,
        fromDate: Date
    ): string {
        const nextRun = new Date(fromDate);

        if (!schedule.frequency_value || !schedule.frequency_unit) {
            // Default to 24 hours if not specified
            nextRun.setHours(nextRun.getHours() + 24);
            return nextRun.toISOString();
        }

        switch (schedule.frequency_unit) {
            case 'minutes':
                nextRun.setMinutes(nextRun.getMinutes() + schedule.frequency_value);
                break;
            case 'hours':
                nextRun.setHours(nextRun.getHours() + schedule.frequency_value);
                break;
            case 'days':
                nextRun.setDate(nextRun.getDate() + schedule.frequency_value);
                break;
            case 'weeks':
                nextRun.setDate(nextRun.getDate() + (schedule.frequency_value * 7));
                break;
            case 'months':
                nextRun.setMonth(nextRun.getMonth() + schedule.frequency_value);
                break;
        }

        // Apply start_time if specified
        if (schedule.start_time) {
            const [hours, minutes] = schedule.start_time.split(':').map(Number);
            nextRun.setHours(hours, minutes, 0, 0);
        }

        // Apply days_of_week filter for weekly schedules
        if (schedule.schedule_type === 'weekly' && schedule.days_of_week && schedule.days_of_week.length > 0) {
            while (!schedule.days_of_week.includes(nextRun.getDay())) {
                nextRun.setDate(nextRun.getDate() + 1);
            }
        }

        return nextRun.toISOString();
    }
}

export const labTestScheduleService = new LabTestScheduleService();
export default labTestScheduleService;
