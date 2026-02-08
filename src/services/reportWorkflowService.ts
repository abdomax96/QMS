/**
 * Report Workflow Service
 * خدمة سير عمل التقارير
 * 
 * Provides:
 * - State transition management
 * - Review queue operations
 * - History retrieval
 * - Permission-aware operations
 * 
 * Created: 2026-01-06
 */

import { supabase } from '../config/supabase';
import type { FormInstance, ReportStatus, ReportReviewHistoryEntry } from '../types';

// ==================== Types ====================

export interface TransitionResult {
    success: boolean;
    error?: string;
    report?: FormInstance;
}

export interface ReviewQueueItem {
    id: string;
    name: string;
    template_name?: string;
    created_by: string;
    created_at: string;
    submitted_at: string;
    department_id?: string;
    department_name?: string;
    status: ReportStatus;
}

export interface ReportWorkflowStats {
    pending_review: number;
    under_review: number;
    approved_today: number;
    rejected_today: number;
}

// ==================== Service Class ====================

class ReportWorkflowService {

    // ============ State Transitions ============

    /**
     * Submit a report for review
     * Transitions: draft|in_progress -> submitted
     */
    async submitReport(reportId: string): Promise<TransitionResult> {
        try {
            const { data, error } = await supabase
                .from('form_instances')
                .update({
                    status: 'submitted',
                    submitted_at: new Date().toISOString()
                })
                .eq('id', reportId)
                .select()
                .single();

            if (error) {
                // Parse database error for user-friendly message
                if (error.message.includes('INVALID_TRANSITION')) {
                    return { success: false, error: 'يجب أن يكون التقرير في حالة المسودة للإرسال' };
                }
                if (error.message.includes('PERMISSION_DENIED')) {
                    return { success: false, error: 'ليس لديك صلاحية إرسال التقارير' };
                }
                throw error;
            }

            return { success: true, report: data };
        } catch (error: any) {
            console.error('Error submitting report:', error);
            return { success: false, error: error.message || 'فشل إرسال التقرير' };
        }
    }

    /**
     * Claim a report for review
     * Transitions: submitted -> under_review
     */
    async claimReport(reportId: string): Promise<TransitionResult> {
        try {
            const { data, error } = await supabase
                .from('form_instances')
                .update({ status: 'under_review' })
                .eq('id', reportId)
                .eq('status', 'submitted') // Only claim submitted reports
                .select()
                .single();

            if (error) {
                if (error.message.includes('PERMISSION_DENIED')) {
                    return { success: false, error: 'ليس لديك صلاحية استلام التقارير للمراجعة' };
                }
                throw error;
            }

            return { success: true, report: data };
        } catch (error: any) {
            console.error('Error claiming report:', error);
            return { success: false, error: error.message || 'فشل استلام التقرير' };
        }
    }

    /**
     * Approve a report
     * Transitions: under_review -> approved
     */
    async approveReport(reportId: string, notes?: string): Promise<TransitionResult> {
        try {
            const updateData: any = { status: 'approved' };
            if (notes) {
                updateData.review_notes = notes;
            }

            const { data, error } = await supabase
                .from('form_instances')
                .update(updateData)
                .eq('id', reportId)
                .eq('status', 'under_review')
                .select()
                .single();

            if (error) {
                if (error.message.includes('PERMISSION_DENIED')) {
                    return { success: false, error: 'ليس لديك صلاحية اعتماد التقارير' };
                }
                throw error;
            }

            return { success: true, report: data };
        } catch (error: any) {
            console.error('Error approving report:', error);
            return { success: false, error: error.message || 'فشل اعتماد التقرير' };
        }
    }

    /**
     * Reject a report
     * Transitions: under_review -> rejected
     */
    async rejectReport(reportId: string, reason: string): Promise<TransitionResult> {
        try {
            if (!reason || reason.trim() === '') {
                return { success: false, error: 'يجب تحديد سبب الرفض' };
            }

            const { data, error } = await supabase
                .from('form_instances')
                .update({
                    status: 'rejected',
                    last_rejection_reason: reason
                })
                .eq('id', reportId)
                .eq('status', 'under_review')
                .select()
                .single();

            if (error) {
                if (error.message.includes('PERMISSION_DENIED')) {
                    return { success: false, error: 'ليس لديك صلاحية رفض التقارير' };
                }
                throw error;
            }

            return { success: true, report: data };
        } catch (error: any) {
            console.error('Error rejecting report:', error);
            return { success: false, error: error.message || 'فشل رفض التقرير' };
        }
    }

    /**
     * Resubmit a rejected report
     * Transitions: rejected -> submitted
     */
    async resubmitReport(reportId: string): Promise<TransitionResult> {
        try {
            const { data, error } = await supabase
                .from('form_instances')
                .update({
                    status: 'submitted',
                    submitted_at: new Date().toISOString()
                })
                .eq('id', reportId)
                .eq('status', 'rejected')
                .select()
                .single();

            if (error) {
                if (error.message.includes('PERMISSION_DENIED')) {
                    return { success: false, error: 'ليس لديك صلاحية إعادة إرسال التقارير' };
                }
                throw error;
            }

            return { success: true, report: data };
        } catch (error: any) {
            console.error('Error resubmitting report:', error);
            return { success: false, error: error.message || 'فشل إعادة إرسال التقرير' };
        }
    }

    /**
     * Reopen an approved report
     * Transitions: approved -> submitted
     * Requires special permission
     */
    async reopenReport(reportId: string, reason: string): Promise<TransitionResult> {
        try {
            if (!reason || reason.trim() === '') {
                return { success: false, error: 'يجب تحديد سبب إعادة الفتح' };
            }

            const { data, error } = await supabase
                .from('form_instances')
                .update({
                    status: 'submitted',
                    review_notes: `إعادة فتح: ${reason}`
                })
                .eq('id', reportId)
                .eq('status', 'approved')
                .select()
                .single();

            if (error) {
                if (error.message.includes('PERMISSION_DENIED')) {
                    return { success: false, error: 'ليس لديك صلاحية إعادة فتح التقارير المعتمدة' };
                }
                throw error;
            }

            return { success: true, report: data };
        } catch (error: any) {
            console.error('Error reopening report:', error);
            return { success: false, error: error.message || 'فشل إعادة فتح التقرير' };
        }
    }

    /**
     * Archive an approved report
     * Transitions: approved -> archived
     */
    async archiveReport(reportId: string): Promise<TransitionResult> {
        try {
            const { data, error } = await supabase
                .from('form_instances')
                .update({ status: 'archived' })
                .eq('id', reportId)
                .eq('status', 'approved')
                .select()
                .single();

            if (error) {
                if (error.message.includes('PERMISSION_DENIED')) {
                    return { success: false, error: 'ليس لديك صلاحية أرشفة التقارير' };
                }
                throw error;
            }

            return { success: true, report: data };
        } catch (error: any) {
            console.error('Error archiving report:', error);
            return { success: false, error: error.message || 'فشل أرشفة التقرير' };
        }
    }

    // ============ Review Queue ============

    /**
     * Get reports pending review (for reviewers)
     */
    async getReviewQueue(departmentId?: string): Promise<ReviewQueueItem[]> {
        try {
            let query = supabase
                .from('form_instances')
                .select(`
          id,
          name,
          created_by,
          created_at,
          submitted_at,
          department_id,
          status,
          form_templates!template_id (name)
        `)
                .eq('status', 'submitted')
                .order('submitted_at', { ascending: true });

            if (departmentId) {
                query = query.eq('department_id', departmentId);
            }

            const { data, error } = await query;

            if (error) throw error;

            return (data || []).map((item: any) => ({
                id: item.id,
                name: item.name,
                template_name: item.form_templates?.name,
                created_by: item.created_by,
                created_at: item.created_at,
                submitted_at: item.submitted_at,
                department_id: item.department_id,
                status: item.status
            }));
        } catch (error) {
            console.error('Error fetching review queue:', error);
            return [];
        }
    }

    /**
     * Get reports currently being reviewed by the current user
     */
    async getMyActiveReviews(): Promise<ReviewQueueItem[]> {
        try {
            const { data: user } = await supabase.auth.getUser();
            if (!user?.user?.id) return [];

            const { data, error } = await supabase
                .from('form_instances')
                .select(`
          id,
          name,
          created_by,
          created_at,
          submitted_at,
          department_id,
          status,
          form_templates!template_id (name)
        `)
                .eq('status', 'under_review')
                .eq('reviewer_id', user.user.id)
                .order('submitted_at', { ascending: true });

            if (error) throw error;

            return (data || []).map((item: any) => ({
                id: item.id,
                name: item.name,
                template_name: item.form_templates?.name,
                created_by: item.created_by,
                created_at: item.created_at,
                submitted_at: item.submitted_at,
                department_id: item.department_id,
                status: item.status
            }));
        } catch (error) {
            console.error('Error fetching active reviews:', error);
            return [];
        }
    }

    // ============ History ============

    /**
     * Get review history for a report
     */
    async getReportHistory(reportId: string): Promise<ReportReviewHistoryEntry[]> {
        try {
            const { data, error } = await supabase
                .from('report_review_history')
                .select('*')
                .eq('report_id', reportId)
                .order('performed_at', { ascending: true });

            if (error) throw error;

            return (data || []).map(item => ({
                id: item.id,
                reportId: item.report_id,
                action: item.action,
                fromStatus: item.from_status,
                toStatus: item.to_status,
                performedBy: item.performed_by,
                performedByName: item.performed_by_name,
                performedByEmail: item.performed_by_email,
                performedByRole: item.performed_by_role,
                performedAt: item.performed_at,
                notes: item.notes,
                fieldChanges: item.field_changes
            }));
        } catch (error) {
            console.error('Error fetching report history:', error);
            return [];
        }
    }

    // ============ Statistics ============

    /**
     * Get workflow statistics
     */
    async getWorkflowStats(departmentId?: string): Promise<ReportWorkflowStats> {
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            let baseQuery = supabase.from('form_instances');

            // Pending review count
            const pendingQuery = departmentId
                ? baseQuery.select('id', { count: 'exact', head: true }).eq('status', 'submitted').eq('department_id', departmentId)
                : baseQuery.select('id', { count: 'exact', head: true }).eq('status', 'submitted');

            const { count: pendingCount } = await pendingQuery;

            // Under review count
            const underReviewQuery = departmentId
                ? baseQuery.select('id', { count: 'exact', head: true }).eq('status', 'under_review').eq('department_id', departmentId)
                : baseQuery.select('id', { count: 'exact', head: true }).eq('status', 'under_review');

            const { count: underReviewCount } = await underReviewQuery;

            // Approved today count
            const { count: approvedTodayCount } = await supabase
                .from('form_instances')
                .select('id', { count: 'exact', head: true })
                .eq('status', 'approved')
                .gte('reviewed_at', today.toISOString());

            // Rejected today count
            const { count: rejectedTodayCount } = await supabase
                .from('form_instances')
                .select('id', { count: 'exact', head: true })
                .eq('status', 'rejected')
                .gte('reviewed_at', today.toISOString());

            return {
                pending_review: pendingCount || 0,
                under_review: underReviewCount || 0,
                approved_today: approvedTodayCount || 0,
                rejected_today: rejectedTodayCount || 0
            };
        } catch (error) {
            console.error('Error fetching workflow stats:', error);
            return {
                pending_review: 0,
                under_review: 0,
                approved_today: 0,
                rejected_today: 0
            };
        }
    }

    // ============ Utilities ============

    /**
     * Check if a report is editable
     */
    isEditable(report: FormInstance): boolean {
        // Not locked and in editable status
        if (!report.is_locked && ['draft', 'in_progress', 'rejected'].includes(report.status)) {
            return true;
        }
        return false;
    }

    /**
     * Get allowed actions for a report based on its status
     */
    getAllowedActions(report: FormInstance): string[] {
        const actions: string[] = ['view'];

        switch (report.status) {
            case 'draft':
            case 'in_progress':
                actions.push('edit', 'submit', 'delete');
                break;
            case 'submitted':
                actions.push('claim');
                break;
            case 'under_review':
                actions.push('approve', 'reject');
                // Edit only if reviewer has permission (checked server-side)
                actions.push('edit_review');
                break;
            case 'rejected':
                actions.push('edit', 'resubmit');
                break;
            case 'approved':
                actions.push('reopen', 'archive');
                break;
            case 'archived':
                // View only
                break;
        }

        return actions;
    }

    /**
     * Get status display info
     */
    getStatusDisplay(status: ReportStatus): { label: string; labelAr: string; color: string; icon: string } {
        const statusMap: Record<ReportStatus, { label: string; labelAr: string; color: string; icon: string }> = {
            draft: { label: 'Draft', labelAr: 'مسودة', color: 'gray', icon: '📝' },
            in_progress: { label: 'In Progress', labelAr: 'قيد التعبئة', color: 'blue', icon: '✏️' },
            submitted: { label: 'Pending Review', labelAr: 'في انتظار المراجعة', color: 'yellow', icon: '⏳' },
            under_review: { label: 'Under Review', labelAr: 'قيد المراجعة', color: 'orange', icon: '🔍' },
            approved: { label: 'Approved', labelAr: 'معتمد', color: 'green', icon: '✅' },
            rejected: { label: 'Rejected', labelAr: 'مرفوض', color: 'red', icon: '↩️' },
            archived: { label: 'Archived', labelAr: 'مؤرشف', color: 'slate', icon: '📦' },
            cancelled: { label: 'Cancelled', labelAr: 'ملغي', color: 'gray', icon: '❌' }
        };

        return statusMap[status] || { label: status, labelAr: status, color: 'gray', icon: '❓' };
    }
}

// Export singleton instance
export const reportWorkflowService = new ReportWorkflowService();
export default reportWorkflowService;
