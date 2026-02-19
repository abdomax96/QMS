import React, { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import {
  Bars3Icon,
  MoonIcon,
  SunIcon,
  UserCircleIcon,
  Cog6ToothIcon,
  ArrowLeftOnRectangleIcon,
  MagnifyingGlassIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  StopIcon,
  ClipboardDocumentListIcon,
  ChatBubbleLeftRightIcon,
  BeakerIcon,
  LanguageIcon,
  FolderOpenIcon,
  ChartBarIcon,
  ChartPieIcon,
  PresentationChartLineIcon
} from '@heroicons/react/24/outline';
import { Link, Outlet, useLocation, useNavigate, ScrollRestoration } from 'react-router-dom';
import useStore from '../store';
import { cn } from '../utils';
import { NotificationCenter } from '../components/notifications';
import ChatDrawer from '../components/chat/ChatDrawer';
import { useSupabaseAuth } from '../hooks/useSupabaseAuth';
import { useLanguageStore } from '../store/languageStore';
import { useAppSettingsStore } from '../store/appSettingsStore';
import TabBar from '../components/tabs/TabBar';
// Taskbar removed - using top tab bar only
import TabCloseConfirmDialog from '../components/tabs/TabCloseConfirmDialog';
import { useTabsStore, type Tab } from '../store/tabsStore';
import supabaseService from '../services/supabaseService';
import { useModulePermissions } from '../hooks/useModulePermissions';
import { SidebarSkeleton } from '../components/common/LoadingStates';
import { useSessionHealth } from '../hooks/useSessionHealth';

// Logo Display Component
const LogoDisplay: React.FC<{ sidebarCollapsed: boolean }> = ({ sidebarCollapsed }) => {
  const { logoUrl, logoScale } = useAppSettingsStore();

  return (
    <div className={cn(
      "flex items-center justify-center border-b border-slate-200/60 dark:border-slate-700/60 transition-all duration-300 overflow-hidden bg-gradient-to-b from-white to-slate-50/50 dark:from-slate-800 dark:to-slate-850/50",
      sidebarCollapsed ? "h-14" : "h-18"
    )}>
      <img
        src={logoUrl}
        alt="QS Logo"
        className={cn(
          "transition-all duration-300 object-contain drop-shadow-sm",
          sidebarCollapsed ? "h-10 w-auto" : "h-16 w-auto"
        )}
        style={{
          transform: `scale(${sidebarCollapsed ? 1 : logoScale})`,
          maxWidth: sidebarCollapsed ? '40px' : '90%'
        }}
      />
    </div>
  );
};

interface NavItem {
  path?: string;
  label: string;
  icon: React.ReactNode;
  section?: 'documents' | 'operations' | 'tasks' | 'system';
  moduleCode?: string;
  requiresPermission?: boolean;
  isGroup?: boolean;
  children?: NavItem[];
  defaultExpanded?: boolean;
}

  const DevReleasePanel = import.meta.env.DEV
    ? lazy(() => import('../devtools/ReleasePanel'))
    : null;
  const chatProvider = (import.meta.env.VITE_CHAT_PROVIDER || 'native').toLowerCase();

const MainLayout: React.FC = () => {
  const location = useLocation();
  const {
    theme,
    toggleTheme,
    sidebarCollapsed,
    toggleSidebar
  } = useStore();

  const { displayLanguage, setDisplayLanguage } = useLanguageStore();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Tabs Logic
  const { tabs, getTab, closeTab: closeTabStore, updateTabState, markDirty } = useTabsStore();
  const { formInstances, formTemplates, updateFormInstance, updateFormTemplate } = useStore();

  // taskbarMinimized state removed - Taskbar no longer used
  const [confirmDialog, setConfirmDialog] = useState<{ isOpen: boolean; tabId: string; title: string } | null>(null);

  // Handle tab close request
  const handleTabClose = useCallback(async (tabId: string, isDirty: boolean): Promise<boolean> => {
    if (!isDirty) return true;

    const tab = getTab(tabId);
    if (!tab) return true;

    setConfirmDialog({
      isOpen: true,
      tabId,
      title: tab.title
    });
    return false;
  }, [getTab]);

  const handleConfirmClose = useCallback(() => {
    if (confirmDialog) {
      closeTabStore(confirmDialog.tabId, true);
      setConfirmDialog(null);
    }
  }, [confirmDialog, closeTabStore]);

  const handleSaveAndClose = useCallback(async () => {
    if (!confirmDialog) return;

    const tab = getTab(confirmDialog.tabId);
    if (!tab || !tab.state) {
      handleConfirmClose();
      return;
    }

    try {
      updateTabState(tab.id, { status: 'saving' });

      if (tab.type === 'template') {
        const template = formTemplates[tab.formId];
        if (template) {
          await supabaseService.templates.updateTemplate(tab.formId, {
            ...template,
            ...tab.state,
          });
          updateFormTemplate(tab.formId, tab.state);
        }
      } else if (tab.type === 'instance') {
        // For instances, we might assume it exists. If new, handled elsewhere.
        const instance = formInstances[tab.formId];
        if (instance) {
          await supabaseService.instances.updateInstance(tab.formId, tab.state);
          await updateFormInstance(tab.formId, tab.state);
        }
      }

      markDirty(tab.id, false);
      updateTabState(tab.id, { status: 'idle' });

      closeTabStore(tab.id, true);
      setConfirmDialog(null);
    } catch (error: any) {
      console.error('Save failed', error);
      updateTabState(tab.id, { status: 'error', error: error.message || 'فشل الحفظ' });
      // Don't close dialog on error
    }
  }, [confirmDialog, getTab, formTemplates, formInstances, updateFormTemplate, updateFormInstance, updateTabState, markDirty, closeTabStore, handleConfirmClose]);

  const iconSize = sidebarCollapsed ? "w-6 h-6" : "w-5 h-5";

  // Proactive session health check on navigation
  // This prevents infinite loading by validating session before navigation attempts
  useSessionHealth({ debug: import.meta.env.DEV });

  // Module permissions hook
  const { canAccess, loading: permissionsLoading, permissions } = useModulePermissions();

  // Debug: Log permissions
  useEffect(() => {
    if (!permissionsLoading) {
      console.log('[MainLayout] Module permissions:', permissions);
      console.log('[MainLayout] Can access forms_reports:', canAccess('forms_reports'));
      console.log('[MainLayout] Can access tasks:', canAccess('tasks'));
      console.log('[MainLayout] Can access lab:', canAccess('lab'));
      console.log('[MainLayout] Can access ncr:', canAccess('ncr'));
    }
  }, [permissionsLoading, permissions, canAccess]);

  // Navigation items - hierarchical structure
  const allNavItems: NavItem[] = [
    // مجموعة إدارة الوثائق - Document Management Group
    {
      label: 'إدارة الوثائق',
      icon: <FolderOpenIcon className={iconSize} />,
      section: 'documents',
      isGroup: true,
      defaultExpanded: true,
      children: [
        {
          path: '/documents',
          label: 'التحكم بالوثائق',
          icon: <FolderOpenIcon className={iconSize} />,
          moduleCode: 'documents',
          requiresPermission: true
        },
        {
          path: '/forms&reports',
          label: 'النماذج والسجلات',
          icon: <DocumentTextIcon className={iconSize} />,
          moduleCode: 'forms_reports',
          requiresPermission: true
        },
      ]
    },
    // مجموعة العمليات - Operations Group
    {
      label: 'العمليات',
      icon: <BeakerIcon className={iconSize} />,
      section: 'operations',
      isGroup: true,
      defaultExpanded: true,
      children: [
        {
          path: '/pallet',
          label: 'نظام تتبع البالتات',
          icon: <ChartBarIcon className={iconSize} />,
          moduleCode: 'production',
          requiresPermission: false
        },
        {
          path: '/lab',
          label: 'المختبر',
          icon: <BeakerIcon className={iconSize} />,
          moduleCode: 'lab_tests',
          requiresPermission: false,
        },
        {
          path: '/ncr',
          label: 'NCR',
          icon: <ExclamationTriangleIcon className={iconSize} />,
          moduleCode: 'ncr',
          requiresPermission: true
        },
        {
          path: '/holds',
          label: 'المحتجزات (HOLD)',
          icon: <StopIcon className={iconSize} />,
          moduleCode: 'ncr',
          requiresPermission: true
        },
        {
          path: '/chat',
          label: 'الدردشة',
          icon: <ChatBubbleLeftRightIcon className={iconSize} />,
          moduleCode: 'chat',
          requiresPermission: true
        },
      ]
    },
    // المهام - Tasks (standalone)
    {
      path: '/tasks',
      label: 'المهام',
      icon: <ClipboardDocumentListIcon className={iconSize} />,
      section: 'tasks',
      moduleCode: 'tasks',
      requiresPermission: true
    },
    // الإعدادات - Settings (standalone)
    {
      path: '/settings',
      label: 'الإعدادات',
      icon: <Cog6ToothIcon className={iconSize} />,
      section: 'system',
      requiresPermission: false
    },
  ];

  // Filter nav items based on module permissions (recursively for groups)
  const filterNavItems = (items: NavItem[]): NavItem[] => {
    return items.map(item => {
      if (item.isGroup && item.children) {
        const filteredChildren = item.children.filter(child => {
          if (!child.requiresPermission) return true;
          if (permissionsLoading) return false;
          if (child.moduleCode) return canAccess(child.moduleCode);
          return true;
        });
        // Only show group if it has visible children
        if (filteredChildren.length === 0) return null;
        return { ...item, children: filteredChildren };
      }
      // Regular item
      if (!item.requiresPermission) return item;
      if (permissionsLoading) return null;
      if (item.moduleCode && !canAccess(item.moduleCode)) return null;
      return item;
    }).filter((item): item is NavItem => item !== null);
  };

  const navItems = filterNavItems(allNavItems);

  // Separate groups from standalone items
  const groupedNavItems = {
    groups: navItems.filter(i => i.isGroup),
    standalone: navItems.filter(i => !i.isGroup && i.section !== 'system'),
    system: navItems.filter(i => i.section === 'system'),
  };

  // Auth hook
  const { signOut, profile } = useSupabaseAuth();
  const navigate = useNavigate();

  // Role name lookup
  const [userRoleName, setUserRoleName] = useState<string>('');

  // State for collapsible nav groups
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['إدارة الوثائق', 'العمليات']));

  const toggleGroup = (label: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  };

  useEffect(() => {
    const fetchRoleName = async () => {
      if (!profile?.roles || profile.roles.length === 0) {
        setUserRoleName('');
        return;
      }

      const roleId = profile.roles[0];
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(roleId);

      try {
        const { supabase } = await import('../config/supabase');
        let query = supabase.from('roles').select('name, name_ar');
        if (isUUID) {
          query = query.eq('id', roleId);
        } else {
          query = query.or(`code.eq.${roleId},name.eq.${roleId}`);
        }
        const { data } = await query.single();
        if (data) {
          setUserRoleName(data.name_ar || data.name || roleId);
        } else {
          setUserRoleName(roleId);
        }
      } catch (err) {
        console.warn('Could not fetch role name:', err);
        setUserRoleName(roleId);
      }
    };
    fetchRoleName();
  }, [profile?.roles]);

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (error) {
      console.error('Failed to sign out:', error);
    }
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (userMenuOpen && !target.closest('[data-user-menu]')) {
        setUserMenuOpen(false);
      }
      if (langMenuOpen && !target.closest('[data-lang-menu]')) {
        setLangMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [userMenuOpen, langMenuOpen]);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  // Chevron icon for expand/collapse
  const ChevronIcon = ({ isOpen }: { isOpen: boolean }) => (
    <svg
      className={cn("w-4 h-4 transition-transform duration-200", isOpen && "rotate-90")}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  );

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900">
      {/* Sidebar */}
      <aside
        className={cn(
          'bg-gradient-sidebar dark:bg-gradient-sidebar-dark border-r border-slate-200/60 dark:border-slate-700/60 transition-all duration-300 ease-smooth flex flex-col print:hidden shadow-soft',
          sidebarCollapsed ? 'w-16' : 'w-64'
        )}
      >
        {/* Logo */}
        <Link
          to="/"
          className="block cursor-pointer"
          aria-label="Home"
          title="Home"
        >
          <LogoDisplay sidebarCollapsed={sidebarCollapsed} />
        </Link>

        {/* Navigation */}
        <nav className="flex-1 px-3 pt-3 pb-2 space-y-1 overflow-y-auto">
          {permissionsLoading ? (
            <div className="animate-fade-in">
              <SidebarSkeleton />
            </div>
          ) : (
            <>
              {/* Hierarchical Groups */}
              {groupedNavItems.groups.map(group => (
                <div key={group.label} className="mb-2">
                  {/* Group Header - Collapsible */}
                  <button
                    onClick={() => toggleGroup(group.label)}
                    className={cn(
                      "w-full flex items-center gap-2 px-3 py-2 rounded-corporate text-sm font-medium transition-all duration-200",
                      "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800",
                      sidebarCollapsed && "justify-center"
                    )}
                  >
                    <span className="text-slate-500 dark:text-slate-400">{group.icon}</span>
                    {!sidebarCollapsed && (
                      <>
                        <span className="flex-1 text-right">{group.label}</span>
                        <ChevronIcon isOpen={expandedGroups.has(group.label)} />
                      </>
                    )}
                  </button>

                  {/* Group Children */}
                  {(expandedGroups.has(group.label) || sidebarCollapsed) && group.children && (
                    <div className={cn("space-y-0.5", !sidebarCollapsed && "mr-2 mt-1")}>
                      {group.children.map(child => (
                        <NavLink
                          key={child.path}
                          item={child}
                          location={location}
                          sidebarCollapsed={sidebarCollapsed}
                        />
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {/* Standalone Items (Tasks, etc) */}
              {groupedNavItems.standalone.length > 0 && (
                <div className="pt-3 mt-3 border-t border-slate-200/60 dark:border-slate-700/60 space-y-0.5">
                  {groupedNavItems.standalone.map(item => (
                    <NavLink key={item.path} item={item} location={location} sidebarCollapsed={sidebarCollapsed} />
                  ))}
                </div>
              )}

              {/* Settings at bottom */}
              {groupedNavItems.system.length > 0 && (
                <div className="pt-3 mt-3 border-t border-slate-200/60 dark:border-slate-700/60 space-y-0.5">
                  {groupedNavItems.system.map(item => (
                    <NavLink key={item.path} item={item} location={location} sidebarCollapsed={sidebarCollapsed} />
                  ))}
                </div>
              )}
            </>
          )}
        </nav>

        {/* Bottom Actions */}
        <div className="p-3 border-t border-slate-200/60 dark:border-slate-700/60">
          <button
            onClick={toggleSidebar}
            className="flex items-center gap-3 px-3 py-2.5 rounded-corporate hover:bg-slate-100 dark:hover:bg-slate-800 w-full transition-all duration-200 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
          >
            <Bars3Icon className="w-5 h-5" />
            {!sidebarCollapsed && (
              <span className="text-sm font-medium">تصغير القائمة</span>
            )}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="relative h-16 bg-white/80 dark:bg-slate-800/80 backdrop-blur-glass border-b border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between px-6 print:hidden shadow-sm overflow-visible z-50">
          <div className="flex items-center gap-4 flex-1">
            {/* Search */}
            <div className="relative max-w-md w-full">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="بحث..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-corporate focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 dark:text-white placeholder-slate-400 transition-all duration-200"
              />
              <MagnifyingGlassIcon className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-corporate transition-all duration-200"
            >
              {theme === 'dark' ? (
                <SunIcon className="w-5 h-5 text-amber-500" />
              ) : (
                <MoonIcon className="w-5 h-5 text-slate-600" />
              )}
            </button>

            {/* Language Toggle */}
            <div className="relative" data-lang-menu>
              <button
                onClick={() => setLangMenuOpen(!langMenuOpen)}
                className="flex items-center gap-1.5 px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-corporate transition-all duration-200"
                title="تبديل اللغة"
              >
                <LanguageIcon className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                  {displayLanguage === 'ar' ? 'ع' : displayLanguage === 'en' ? 'EN' : 'ع/EN'}
                </span>
              </button>

              {langMenuOpen && (
                <div className="absolute left-0 mt-2 w-40 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-corporate shadow-soft-lg z-50 animate-scale-in overflow-hidden">
                  <button
                    onClick={() => { setDisplayLanguage('ar'); setLangMenuOpen(false); }}
                    className={cn(
                      "w-full px-4 py-2.5 text-right text-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors",
                      displayLanguage === 'ar' && "bg-primary-50 dark:bg-primary-900/50 text-primary-700 dark:text-primary-400"
                    )}
                  >
                    عربي فقط
                  </button>
                  <button
                    onClick={() => { setDisplayLanguage('en'); setLangMenuOpen(false); }}
                    className={cn(
                      "w-full px-4 py-2.5 text-right text-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors",
                      displayLanguage === 'en' && "bg-primary-50 dark:bg-primary-900/50 text-primary-700 dark:text-primary-400"
                    )}
                  >
                    English Only
                  </button>
                  <button
                    onClick={() => { setDisplayLanguage('both'); setLangMenuOpen(false); }}
                    className={cn(
                      "w-full px-4 py-2.5 text-right text-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors",
                      displayLanguage === 'both' && "bg-primary-50 dark:bg-primary-900/50 text-primary-700 dark:text-primary-400"
                    )}
                  >
                    كلاهما (Both)
                  </button>
                </div>
              )}
            </div>

            {/* Notifications */}
            <NotificationCenter />

            {/* User Menu */}
            <div className="relative" data-user-menu>
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-3 px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-corporate transition-all duration-200 mr-2"
              >
                {profile?.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt={profile.name || 'User'}
                    className="w-9 h-9 rounded-full object-cover ring-2 ring-white dark:ring-slate-700 shadow-sm"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white font-semibold text-sm shadow-sm">
                    {(profile?.name || 'م').charAt(0)}
                  </div>
                )}
                <div className="text-right">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    {profile?.name || 'مستخدم'}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {userRoleName || 'موظف'}
                  </p>
                </div>
              </button>

              {userMenuOpen && (
                <div className="absolute left-0 mt-2 w-52 bg-white dark:bg-slate-800 rounded-corporate-lg shadow-soft-lg border border-slate-200 dark:border-slate-700 py-1.5 z-50 animate-scale-in overflow-hidden">
                  <Link
                    to="/profile"
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 w-full text-right transition-colors text-slate-700 dark:text-slate-200"
                  >
                    <UserCircleIcon className="w-4 h-4 text-slate-500" />
                    <span>الملف الشخصي</span>
                  </Link>
                  <Link
                    to="/user-settings"
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 w-full text-right transition-colors text-slate-700 dark:text-slate-200"
                  >
                    <Cog6ToothIcon className="w-4 h-4 text-slate-500" />
                    <span>الإعدادات الشخصية</span>
                  </Link>
                  <div className="border-t border-slate-200 dark:border-slate-700 my-1.5"></div>
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-rose-50 dark:hover:bg-rose-900/20 w-full text-right transition-colors text-rose-600 dark:text-rose-400"
                  >
                    <ArrowLeftOnRectangleIcon className="w-4 h-4" />
                    <span>تسجيل الخروج</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="z-40 shrink-0 bg-slate-50 dark:bg-slate-900 border-b border-slate-200/60 dark:border-slate-700/60">
          <TabBar onTabClose={handleTabClose} />
        </div>

        <main className="flex-1 overflow-y-auto relative bg-slate-50 dark:bg-slate-900" dir="rtl">
          <Outlet />
          <ScrollRestoration />
        </main>
      </div>

      {/* Taskbar removed - using top tab bar only */}

      {/* Tab Close Confirmation Dialog */}
      <TabCloseConfirmDialog
        isOpen={!!confirmDialog}
        tabTitle={confirmDialog?.title || ''}
        onConfirm={handleConfirmClose}
        onCancel={() => setConfirmDialog(null)}
        onSave={handleSaveAndClose}
      />

      {DevReleasePanel && (
        <Suspense fallback={null}>
          <DevReleasePanel />
        </Suspense>
      )}

      {chatProvider !== 'mattermost' && <ChatDrawer />}
    </div>
  );
};

// NavLink Component
const NavLink: React.FC<{
  item: NavItem;
  location: { pathname: string };
  sidebarCollapsed: boolean;
}> = ({ item, location, sidebarCollapsed }) => {
  const path = item.path || '/';
  const isActive = location.pathname === path ||
    (path !== '/' && location.pathname.startsWith(path));

  // Don't render if no path (groups)
  if (!item.path) return null;

  return (
    <Link
      to={path}
      className={cn(
        'flex items-center gap-3 px-3 py-2.5 rounded-corporate transition-all duration-200',
        'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100',
        isActive && 'bg-primary-50 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300 shadow-sm border-r-[3px] border-primary-600 dark:border-primary-500'
      )}
      title={sidebarCollapsed ? item.label : undefined}
    >
      <span className={cn(isActive ? 'text-primary-600 dark:text-primary-400' : '')}>
        {item.icon}
      </span>
      {!sidebarCollapsed && (
        <span className="text-sm font-medium">{item.label}</span>
      )}
    </Link>
  );
};

export default MainLayout;
