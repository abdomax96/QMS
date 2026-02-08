/**
 * NCR State Machine Tests
 * اختبارات آلة الحالة لـ NCR
 */

import { describe, it, expect } from 'vitest';
import {
    canTransition,
    getNextStage,
    getStageInfo,
    validateTransition,
    getStageProgress,
    isTerminal,
    getStagesWithStatus,
    NCR_STAGE_ORDER,
    NCR_VALID_TRANSITIONS,
    type NcrDatabaseStage
} from '../../utils/ncr/ncrStateMachine';

describe('ncrStateMachine', () => {
    // ==================== canTransition Tests ====================
    describe('canTransition', () => {
        it('should allow initial_report → root_cause_analysis', () => {
            expect(canTransition('initial_report', 'root_cause_analysis')).toBe(true);
        });

        it('should allow root_cause_analysis → capa_planning', () => {
            expect(canTransition('root_cause_analysis', 'capa_planning')).toBe(true);
        });

        it('should allow capa_planning → capa_execution', () => {
            expect(canTransition('capa_planning', 'capa_execution')).toBe(true);
        });

        it('should allow capa_execution → verification_closure', () => {
            expect(canTransition('capa_execution', 'verification_closure')).toBe(true);
        });

        it('should NOT allow initial_report → verification_closure (skip stages)', () => {
            expect(canTransition('initial_report', 'verification_closure')).toBe(false);
        });

        it('should NOT allow backward transition root_cause_analysis → initial_report', () => {
            expect(canTransition('root_cause_analysis', 'initial_report')).toBe(false);
        });

        it('should NOT allow any transition from verification_closure (terminal)', () => {
            expect(canTransition('verification_closure', 'initial_report')).toBe(false);
            expect(canTransition('verification_closure', 'capa_execution')).toBe(false);
        });
    });

    // ==================== getNextStage Tests ====================
    describe('getNextStage', () => {
        it('should return root_cause_analysis for initial_report', () => {
            expect(getNextStage('initial_report')).toBe('root_cause_analysis');
        });

        it('should return capa_planning for root_cause_analysis', () => {
            expect(getNextStage('root_cause_analysis')).toBe('capa_planning');
        });

        it('should return capa_execution for capa_planning', () => {
            expect(getNextStage('capa_planning')).toBe('capa_execution');
        });

        it('should return verification_closure for capa_execution', () => {
            expect(getNextStage('capa_execution')).toBe('verification_closure');
        });

        it('should return null for verification_closure (terminal)', () => {
            expect(getNextStage('verification_closure')).toBe(null);
        });
    });

    // ==================== getStageInfo Tests ====================
    describe('getStageInfo', () => {
        it('should return correct info for initial_report', () => {
            const info = getStageInfo('initial_report');
            expect(info.stage).toBe('initial_report');
            expect(info.index).toBe(0);
            expect(info.isFirst).toBe(true);
            expect(info.isLast).toBe(false);
            expect(info.canProgress).toBe(true);
            expect(info.nextStage).toBe('root_cause_analysis');
            expect(info.prevStage).toBe(null);
        });

        it('should return correct info for verification_closure', () => {
            const info = getStageInfo('verification_closure');
            expect(info.stage).toBe('verification_closure');
            expect(info.index).toBe(4);
            expect(info.isFirst).toBe(false);
            expect(info.isLast).toBe(true);
            expect(info.canProgress).toBe(false);
            expect(info.nextStage).toBe(null);
            expect(info.prevStage).toBe('capa_execution');
        });

        it('should return correct info for middle stage', () => {
            const info = getStageInfo('capa_planning');
            expect(info.isFirst).toBe(false);
            expect(info.isLast).toBe(false);
            expect(info.canProgress).toBe(true);
        });
    });

    // ==================== getStageProgress Tests ====================
    describe('getStageProgress', () => {
        it('should return 0% for initial_report', () => {
            expect(getStageProgress('initial_report')).toBe(0);
        });

        it('should return 25% for root_cause_analysis', () => {
            expect(getStageProgress('root_cause_analysis')).toBe(25);
        });

        it('should return 50% for capa_planning', () => {
            expect(getStageProgress('capa_planning')).toBe(50);
        });

        it('should return 75% for capa_execution', () => {
            expect(getStageProgress('capa_execution')).toBe(75);
        });

        it('should return 100% for verification_closure', () => {
            expect(getStageProgress('verification_closure')).toBe(100);
        });
    });

    // ==================== isTerminal Tests ====================
    describe('isTerminal', () => {
        it('should return true for verification_closure', () => {
            expect(isTerminal('verification_closure')).toBe(true);
        });

        it('should return false for other stages', () => {
            expect(isTerminal('initial_report')).toBe(false);
            expect(isTerminal('root_cause_analysis')).toBe(false);
            expect(isTerminal('capa_planning')).toBe(false);
            expect(isTerminal('capa_execution')).toBe(false);
        });
    });

    // ==================== getStagesWithStatus Tests ====================
    describe('getStagesWithStatus', () => {
        it('should mark all stages as pending for initial_report except first', () => {
            const stages = getStagesWithStatus('initial_report');
            expect(stages[0].status).toBe('current');
            expect(stages[1].status).toBe('pending');
            expect(stages[2].status).toBe('pending');
            expect(stages[3].status).toBe('pending');
            expect(stages[4].status).toBe('pending');
        });

        it('should mark previous stages as completed', () => {
            const stages = getStagesWithStatus('capa_planning');
            expect(stages[0].status).toBe('completed');
            expect(stages[1].status).toBe('completed');
            expect(stages[2].status).toBe('current');
            expect(stages[3].status).toBe('pending');
            expect(stages[4].status).toBe('pending');
        });

        it('should mark all stages as completed for verification_closure except last', () => {
            const stages = getStagesWithStatus('verification_closure');
            expect(stages[0].status).toBe('completed');
            expect(stages[1].status).toBe('completed');
            expect(stages[2].status).toBe('completed');
            expect(stages[3].status).toBe('completed');
            expect(stages[4].status).toBe('current');
        });
    });

    // ==================== validateTransition Tests ====================
    describe('validateTransition', () => {
        it('should fail if required fields are missing for initial_report', () => {
            const result = validateTransition({
                currentStage: 'initial_report',
                // Missing: description, department, severity
            });
            expect(result.isValid).toBe(false);
            expect(result.missingConditions).toContain('description');
        });

        it('should pass if all required fields are present for initial_report', () => {
            const result = validateTransition({
                currentStage: 'initial_report',
                description: 'Test description',
                department: 'Quality',
                severity: 'major',
            });
            expect(result.isValid).toBe(true);
            expect(result.to).toBe('root_cause_analysis');
        });

        it('should fail for root_cause_analysis without approval', () => {
            const result = validateTransition({
                currentStage: 'root_cause_analysis',
                description: 'Test',
                department: 'Quality',
                severity: 'major',
                rootCauseApproval: { status: 'pending' },
            });
            expect(result.isValid).toBe(false);
        });

        it('should pass for root_cause_analysis with approval', () => {
            const result = validateTransition({
                currentStage: 'root_cause_analysis',
                description: 'Test',
                department: 'Quality',
                severity: 'major',
                rootCauseApproval: { status: 'approved' },
            });
            expect(result.isValid).toBe(true);
        });

        it('should fail for terminal stage', () => {
            const result = validateTransition({
                currentStage: 'verification_closure',
                description: 'Test',
                department: 'Quality',
                severity: 'major',
            });
            expect(result.isValid).toBe(false);
            expect(result.blockedReason).toContain('Terminal');
        });
    });

    // ==================== NCR_STAGE_ORDER Tests ====================
    describe('NCR_STAGE_ORDER', () => {
        it('should have 5 stages', () => {
            expect(NCR_STAGE_ORDER.length).toBe(5);
        });

        it('should start with initial_report', () => {
            expect(NCR_STAGE_ORDER[0]).toBe('initial_report');
        });

        it('should end with verification_closure', () => {
            expect(NCR_STAGE_ORDER[4]).toBe('verification_closure');
        });
    });
});
