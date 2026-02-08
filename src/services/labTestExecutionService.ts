/**
 * Lab Test Execution Service
 * خدمة تنفيذ فحوصات المعمل
 */

import { supabase } from '../config/supabase';
import type {
    LabTestRun,
    TestRunWithDetails,
    QuickEntryDefaults,
    CreateTestRunData,
    SubmitTestRunData,
    ApproveTestRunData,
    RejectTestRunData,
    TestRunStatus,
    EvaluationResult
} from '../types/labTests';
import { labTestConfigService } from './labTestConfigService';

class LabTestExecutionService {
    // =====================================================
    // Test Runs - CRUD
    // =====================================================

    async getTestRuns(filters?: {
        status?: TestRunStatus;
        configId?: string;
        batchId?: string;
        productId?: string;
        performedBy?: string;
        startDate?: string;
        endDate?: string;
    }): Promise<LabTestRun[]> {
        let query = supabase
            .from('lab_test_runs')
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
            .order('created_at', { ascending: false });

        if (filters) {
            if (filters.status) query = query.eq('status', filters.status);
            if (filters.configId) query = query.eq('test_config_id', filters.configId);
            if (filters.batchId) query = query.eq('linked_batch_id', filters.batchId);
            if (filters.productId) query = query.eq('linked_product_id', filters.productId);
            if (filters.performedBy) query = query.eq('performed_by', filters.performedBy);
            if (filters.startDate) query = query.gte('created_at', filters.startDate);
            if (filters.endDate) query = query.lte('created_at', filters.endDate);
        }

        const { data, error } = await query;

        if (error) throw error;
        return data || [];
    }

    async getTestRunById(id: string): Promise<TestRunWithDetails | null> {
        const { data, error } = await supabase
            .from('lab_test_runs')
            .select(`
                *,
                test_config:lab_tests_config(
                    *,
                    test_type:lab_test_types(
                        *,
                        category:lab_test_categories(*)
                    ),
                    fields:lab_test_fields(*)
                ),
                schedule:lab_test_schedules(*)
            `)
            .eq('id', id)
            .single();

        if (error) throw error;

        if (data && data.test_config?.fields) {
            data.test_config.fields.sort((a: any, b: any) => a.display_order - b.display_order);
        }

        return data as TestRunWithDetails;
    }

    async getTestRunsByBatch(batchId: string): Promise<LabTestRun[]> {
        return this.getTestRuns({ batchId });
    }

    // =====================================================
    // Test Run Creation
    // =====================================================

    async createTestRun(runData: CreateTestRunData): Promise<LabTestRun> {
        const { data: user } = await supabase.auth.getUser();
        const { data: settings } = await supabase
            .from('settings')
            .select('main_company_id')
            .eq('id', 'global')
            .single();

        // Get user department
        const { data: userData } = await supabase
            .from('users')
            .select('department_id')
            .eq('id', user.user?.id)
            .single();

        // Generate run number
        const { data: runNumber, error: rnError } = await supabase
            .rpc('generate_test_run_number');

        if (rnError) throw rnError;

        // Handle Batch ID (UUID vs Text)
        let linkedBatchId = runData.linked_batch_id;
        let batchNumber: string | undefined = undefined;

        const isUuid = (str?: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str || '');

        if (linkedBatchId && !isUuid(linkedBatchId)) {
            // It's a manual batch number
            batchNumber = linkedBatchId;
            linkedBatchId = undefined; // Clear UUID field
        }

        const { data, error } = await supabase
            .from('lab_test_runs')
            .insert({
                ...runData,
                linked_batch_id: linkedBatchId,
                batch_number: batchNumber,
                run_number: runNumber,
                company_id: settings?.main_company_id,
                department_id: userData?.department_id,
                created_by: user.user?.id,
                status: 'pending'
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

    // =====================================================
    // Test Run Execution
    // =====================================================

    async startTestRun(runId: string, userId: string): Promise<LabTestRun> {
        // Get user info
        const { data: user } = await supabase
            .from('users')
            .select('name, display_name')
            .eq('id', userId)
            .single();

        const userName = user?.display_name || user?.name || 'Unknown User';

        const { data, error } = await supabase
            .from('lab_test_runs')
            .update({
                status: 'in_progress',
                started_at: new Date().toISOString(),
                performed_by: userId,
                performed_by_name: userName,
                updated_by: userId
            })
            .eq('id', runId)
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    async submitTestRun(runId: string, submitData: SubmitTestRunData): Promise<LabTestRun> {
        const { data: user } = await supabase.auth.getUser();

        // Update test run with field values
        const { data, error } = await supabase
            .from('lab_test_runs')
            .update({
                field_values: submitData.field_values,
                notes: submitData.notes,
                attachments: submitData.attachments || [],
                status: 'completed',
                completed_at: new Date().toISOString(),
                updated_by: user.user?.id
            })
            .eq('id', runId)
            .select()
            .single();

        if (error) throw error;

        // Auto-evaluate
        await this.evaluateTestRun(runId);

        // Return updated run
        return await this.getTestRunById(runId) as LabTestRun;
    }

    async evaluateTestRun(runId: string): Promise<EvaluationResult> {
        const { data, error } = await supabase
            .rpc('evaluate_test_run', { p_run_id: runId });

        if (error) throw error;
        return data as EvaluationResult;
    }

    async approveTestRun(runId: string, approvalData: ApproveTestRunData): Promise<LabTestRun> {
        const { data: user } = await supabase.auth.getUser();

        // Get user info
        const { data: userData } = await supabase
            .from('users')
            .select('name, display_name')
            .eq('id', user.user?.id)
            .single();

        const userName = userData?.display_name || userData?.name || 'Unknown User';

        const { data, error } = await supabase
            .from('lab_test_runs')
            .update({
                status: 'approved',
                approved_at: new Date().toISOString(),
                approved_by: user.user?.id,
                approved_by_name: userName,
                approval_notes: approvalData.approval_notes,
                updated_by: user.user?.id
            })
            .eq('id', runId)
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    async rejectTestRun(runId: string, rejectionData: RejectTestRunData): Promise<LabTestRun> {
        const { data: user } = await supabase.auth.getUser();

        const { data, error } = await supabase
            .from('lab_test_runs')
            .update({
                status: 'rejected',
                rejected_at: new Date().toISOString(),
                rejection_reason: rejectionData.rejection_reason,
                updated_by: user.user?.id
            })
            .eq('id', runId)
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    async cancelTestRun(runId: string, reason?: string): Promise<LabTestRun> {
        const { data: user } = await supabase.auth.getUser();

        const { data, error } = await supabase
            .from('lab_test_runs')
            .update({
                status: 'cancelled',
                notes: reason || 'Cancelled',
                updated_by: user.user?.id
            })
            .eq('id', runId)
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    // =====================================================
    // Quick Entry (للفحوصات المتكررة)
    // =====================================================

    async getQuickEntryDefaults(configId: string, context?: {
        batchId?: string;
        productId?: string;
    }): Promise<QuickEntryDefaults> {
        // Get test config with fields
        const config = await labTestConfigService.getConfigWithFields(configId);
        if (!config) throw new Error('Test config not found');

        // Get last test run for this config (with same context if provided)
        let query = supabase
            .from('lab_test_runs')
            .select('*')
            .eq('test_config_id', configId)
            .eq('status', 'completed')
            .order('completed_at', { ascending: false })
            .limit(1);

        if (context?.batchId) {
            query = query.eq('linked_batch_id', context.batchId);
        }

        if (context?.productId) {
            query = query.eq('linked_product_id', context.productId);
        }

        const { data: lastRuns } = await query;
        const lastRun = lastRuns?.[0];

        // Extract last values
        const lastValues = lastRun?.field_values || {};

        return {
            test_config: config,
            last_values: lastValues,
            last_run: lastRun
        };
    }

    async quickCreateAndSubmit(
        configId: string,
        fieldValues: Record<string, any>,
        context?: {
            batchId?: string;
            productId?: string;
            notes?: string;
        }
    ): Promise<LabTestRun> {
        // Create test run
        const run = await this.createTestRun({
            test_config_id: configId,
            linked_batch_id: context?.batchId,
            linked_product_id: context?.productId,
            notes: context?.notes
        });

        // Start and submit immediately
        await this.startTestRun(run.id, run.created_by!);

        const submitted = await this.submitTestRun(run.id, {
            field_values: fieldValues,
            notes: context?.notes
        });

        return submitted;
    }

    // =====================================================
    // Statistics
    // =====================================================

    async getTestStatistics(filters?: {
        configId?: string;
        batchId?: string;
        startDate?: string;
        endDate?: string;
    }) {
        let query = supabase
            .from('lab_test_runs')
            .select('status, evaluation_result', { count: 'exact' });

        if (filters) {
            if (filters.configId) query = query.eq('test_config_id', filters.configId);
            if (filters.batchId) query = query.eq('linked_batch_id', filters.batchId);
            if (filters.startDate) query = query.gte('created_at', filters.startDate);
            if (filters.endDate) query = query.lte('created_at', filters.endDate);
        }

        const { data, count, error } = await query;

        if (error) throw error;

        const stats = {
            total_runs: count || 0,
            pending: 0,
            in_progress: 0,
            completed: 0,
            approved: 0,
            rejected: 0,
            pass_count: 0,
            fail_count: 0,
            pass_rate: 0,
            fail_rate: 0
        };

        data?.forEach((run: any) => {
            switch (run.status) {
                case 'pending':
                    stats.pending++;
                    break;
                case 'in_progress':
                    stats.in_progress++;
                    break;
                case 'completed':
                    stats.completed++;
                    break;
                case 'approved':
                    stats.approved++;
                    break;
                case 'rejected':
                    stats.rejected++;
                    break;
            }

            if (run.evaluation_result === 'pass') stats.pass_count++;
            if (run.evaluation_result === 'fail') stats.fail_count++;
        });

        const evaluatedTotal = stats.pass_count + stats.fail_count;
        if (evaluatedTotal > 0) {
            stats.pass_rate = Math.round((stats.pass_count / evaluatedTotal) * 100);
            stats.fail_rate = Math.round((stats.fail_count / evaluatedTotal) * 100);
        }

        return stats;
    }

    async getTestTrendData(
        configId: string,
        fieldKey: string,
        days: number = 30
    ) {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const { data, error } = await supabase
            .from('lab_test_runs')
            .select('created_at, field_values, evaluation_result')
            .eq('test_config_id', configId)
            .gte('created_at', startDate.toISOString())
            .not('field_values', 'is', null)
            .order('created_at', { ascending: true });

        if (error) throw error;

        return data?.map((run: any) => ({
            date: run.created_at,
            value: run.field_values[fieldKey],
            evaluation_result: run.evaluation_result
        })) || [];
    }
}

export const labTestExecutionService = new LabTestExecutionService();
export default labTestExecutionService;
