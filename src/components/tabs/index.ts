/**
 * Tab Components - Multi-form management system
 */

export { default as TabBar } from './TabBar';
export { default as Taskbar } from './Taskbar';
export { default as TabContent } from './TabContent';
export { default as ExplorerWithTabs } from './ExplorerWithTabs';

// Re-export context
// Re-export context (Deprecated - use tabsStore)
// export { TabsProvider, useTabs, type TabState, type TabType, type TabStatus } from '../../contexts/TabsContext';

// Re-export hook
export { useTabForm } from '../../hooks/useTabForm';
