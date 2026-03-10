/**
 * Unified Dashboard — لوحة التحكم الموحدة
 *
 * الهيكل القابل للتوسع:
 *   لإضافة تبويب جديد، أضف عنصراً في مصفوفة TABS فقط.
 *   كل تبويب: { id, label, icon, component (lazy) }
 */

import React, { useState, lazy, Suspense, useMemo } from 'react';
import {
  ChartBarIcon,
  ExclamationTriangleIcon,
  BeakerIcon,
  ClipboardDocumentListIcon,
} from '@heroicons/react/24/outline';
import { useNcrs } from '../../hooks/ncr/useNcrs';
import { useTaskStore } from '../../store/taskStore';
import { useLabV2Runs } from '../../modules/lab_v2/hooks/useTestRuns';
import { PageSkeleton } from '../../components/common/LoadingStates';
import type { TabConfig } from './dashboard.types';

// ============ Lazy Tab Components ============
const ReportsTab = lazy(() => import('./tabs/ReportsTab'));
const NcrTab     = lazy(() => import('./tabs/NcrTab'));
const LabTab     = lazy(() => import('./tabs/LabTab'));
const TasksTab   = lazy(() => import('./tabs/TasksTab'));

// ============ Tab Registry (add new tabs here only) ============
const TABS: TabConfig[] = [
  {
    id: 'reports',
    label: 'التقارير',
    icon: ChartBarIcon,
    component: ReportsTab,
  },
  {
    id: 'ncr',
    label: 'عدم المطابقة',
    icon: ExclamationTriangleIcon,
    component: NcrTab,
  },
  {
    id: 'lab',
    label: 'المختبر',
    icon: BeakerIcon,
    component: LabTab,
  },
  {
    id: 'tasks',
    label: 'المهام',
    icon: ClipboardDocumentListIcon,
    component: TasksTab,
  },
  // ---- مثال: تبويب مستقبلي ----
  // {
  //   id: 'pallet',
  //   label: 'البالتات',
  //   icon: TruckIcon,
  //   component: lazy(() => import('./tabs/PalletTab')),
  // },
] as (TabConfig & { component: React.LazyExoticComponent<React.FC> | React.FC })[];

// ============ Alert count hooks (summary badges) ============
function useTabAlerts(): Record<string, number> {
  const { ncrs } = useNcrs();
  const { tasks, getOverdueTasks } = useTaskStore();
  const { data: v2Runs = [] } = useLabV2Runs({ limit: 200 });

  return useMemo(() => {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const overdueNcrs = ncrs.filter(n =>
      n.status !== 'closed' && new Date(n.date) < sevenDaysAgo
    ).length;

    const overdueTasks = getOverdueTasks().length;

    const v2Fail = v2Runs.filter(r => r.evaluation_result === 'fail').length;

    return {
      ncr: overdueNcrs,
      tasks: overdueTasks,
      lab: v2Fail,
    };
  }, [ncrs, tasks, v2Runs, getOverdueTasks]);
}

// ============ TabButton ============
interface TabButtonProps {
  tab: (typeof TABS)[number];
  isActive: boolean;
  alertCount: number;
  onClick: () => void;
}

const TabButton: React.FC<TabButtonProps> = ({ tab, isActive, alertCount, onClick }) => {
  const Icon = tab.icon;
  return (
    <button
      onClick={onClick}
      className={[
        'shrink-0 relative flex items-center gap-2 px-3 sm:px-5 py-2.5 rounded-corporate font-medium transition-all duration-200 text-sm',
        isActive
          ? 'bg-white dark:bg-slate-700 text-primary-600 shadow-card'
          : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-white/50 dark:hover:bg-slate-700/50',
      ].join(' ')}
    >
      <Icon className="w-5 h-5" />
      <span className="hidden sm:inline">{tab.label}</span>
      {alertCount > 0 && (
        <span className="absolute -top-1 -left-1 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
          {alertCount > 99 ? '99+' : alertCount}
        </span>
      )}
    </button>
  );
};

// ============ Main Dashboard ============
const UnifiedDashboard: React.FC = () => {
  const [activeTabId, setActiveTabId] = useState<string>(TABS[0].id);
  const alerts = useTabAlerts();

  const activeTab = TABS.find(t => t.id === activeTabId) ?? TABS[0];
  const ActiveComponent = (activeTab as any).component as React.FC;

  return (
    <div className="p-3 sm:p-4 lg:p-6 min-h-full">
      {/* Header */}
      <div className="mb-5">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
          لوحة التحكم
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          نظرة شاملة على مؤشرات الأداء الرئيسية
        </p>
      </div>

      {/* Tab Bar */}
      <div className="flex items-center gap-1 p-1.5 bg-slate-100 dark:bg-slate-800/80 rounded-corporate-lg w-full max-w-full mb-6 overflow-x-auto shadow-inner-soft">
        {TABS.map(tab => (
          <TabButton
            key={tab.id}
            tab={tab}
            isActive={activeTabId === tab.id}
            alertCount={alerts[tab.id] ?? 0}
            onClick={() => setActiveTabId(tab.id)}
          />
        ))}
      </div>

      {/* Tab Content */}
      <Suspense fallback={<PageSkeleton />}>
        <ActiveComponent />
      </Suspense>
    </div>
  );
};

export default UnifiedDashboard;
