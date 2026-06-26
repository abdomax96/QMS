// NCR Stage Actions - single source of truth for UI + seeds + policies
// Database stages (ncr_reports.current_stage)
export const NCR_DB_STAGES = [
  'initial_report',
  'root_cause_analysis',
  'capa_planning',
  'capa_execution',
  'verification_closure',
] as const;

export type NcrDbStage = typeof NCR_DB_STAGES[number];

export type NcrStageAction =
  | 'view'
  | 'create'
  | 'edit'
  | 'delete'
  | 'root_cause.propose'
  | 'assign'
  | 'approve'
  | 'release_hold'
  | 'reject'
  | 'verify_close'
  | 'export'
  | 'reopen'
  | 'capa.add'
  | 'capa.complete'
  | 'workflow.progress';

export interface StageActionConfig {
  stage: NcrDbStage;
  nameAr: string;
  nameEn: string;
  order: number;
  allowedActions: NcrStageAction[];
  canAdvance: boolean;
  canReturn: boolean;
}

// Canonical configuration used by UI and DB seeds
export const NCR_STAGE_ACTIONS: StageActionConfig[] = [
  {
    stage: 'initial_report',
    nameAr: 'التقرير الأولي',
    nameEn: 'Initial Report',
    order: 1,
    allowedActions: ['view', 'create', 'edit', 'delete', 'workflow.progress'],
    canAdvance: true,
    canReturn: false,
  },
  {
    stage: 'root_cause_analysis',
    nameAr: 'تحليل السبب الجذري',
    nameEn: 'Root Cause Analysis',
    order: 2,
    allowedActions: [
      'view',
      'edit',
      'root_cause.propose',
      'assign',
      'approve',
      'reject',
      'workflow.progress',
      'reopen',
    ],
    canAdvance: true,
    canReturn: true,
  },
  {
    stage: 'capa_planning',
    nameAr: 'تخطيط الإجراءات',
    nameEn: 'CAPA Planning',
    order: 3,
    allowedActions: [
      'view',
      'edit',
      'capa.add',
      'approve',
      'reject',
      'workflow.progress',
      'reopen',
    ],
    canAdvance: true,
    canReturn: true,
  },
  {
    stage: 'capa_execution',
    nameAr: 'تنفيذ الإجراءات',
    nameEn: 'CAPA Execution',
    order: 4,
    allowedActions: [
      'view',
      'edit',
      'capa.complete',
      'release_hold',
      'workflow.progress',
      'reopen',
    ],
    canAdvance: true,
    canReturn: true,
  },
  {
    stage: 'verification_closure',
    nameAr: 'التحقق والإغلاق',
    nameEn: 'Verification & Closure',
    order: 5,
    allowedActions: ['view', 'verify_close', 'export', 'reopen'],
    canAdvance: false,
    canReturn: true,
  },
];

// Quick lookup maps
export const STAGE_ACTION_MAP = new Map<NcrDbStage, StageActionConfig>(
  NCR_STAGE_ACTIONS.map((cfg) => [cfg.stage, cfg]),
);
