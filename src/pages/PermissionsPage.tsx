// ==================== Permissions Management Page ====================
// Enterprise-Grade RBAC Management Interface - Redesigned

import React, { useState, useEffect, useMemo } from 'react';
import {
  Shield,
  Users,
  FileText,
  Clock,
  Download,
  Upload,
  Settings,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Info,
  BarChart3,
  GitCompare,
  History,
  Plus,
  Search,
  Filter,
  ChevronRight,
  Lock,
  Unlock,
  X,
  Edit3,
  Copy,
  Trash2,
  Eye,
  Layers,
} from 'lucide-react';
import { cn } from '../utils';
import { useRBACStore } from '../store/rbacStore';
import PermissionMatrix from '../components/permissions/PermissionMatrix';
import { RoleList, RoleEditorDialog, DeleteConfirmDialog } from '../components/permissions/RoleManagement';
import { ROLE_CATEGORY_COLORS, ROLE_CATEGORY_LABELS, createFullPermissionMatrix, SYSTEM_MODULES, MODULE_GROUPS } from '../constants/rbac';
import type { Role, RoleCategory, PermissionAction } from '../types/rbac';

// ==================== Tab Type ====================
type TabType = 'matrix' | 'roles' | 'audit' | 'compare';

// ==================== Quick Stats Card ====================
interface QuickStatProps {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  color: string;
  trend?: { value: number; isUp: boolean };
}

const QuickStat: React.FC<QuickStatProps> = ({ label, value, icon, color, trend }) => (
  <div className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
    <div 
      className="w-10 h-10 rounded-lg flex items-center justify-center"
      style={{ backgroundColor: `${color}15` }}
    >
      <div style={{ color }}>{icon}</div>
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-xl font-bold text-slate-800 dark:text-slate-100">{value}</p>
      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{label}</p>
    </div>
    {trend && (
      <div className={cn(
        'text-xs font-medium px-1.5 py-0.5 rounded',
        trend.isUp ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
      )}>
        {trend.isUp ? '+' : ''}{trend.value}%
      </div>
    )}
  </div>
);

// ==================== Tab Button ====================
interface TabButtonProps {
  tab: TabType;
  activeTab: TabType;
  icon: React.ReactNode;
  label: string;
  onClick: (tab: TabType) => void;
  badge?: number;
}

const TabButton: React.FC<TabButtonProps> = ({
  tab,
  activeTab,
  icon,
  label,
  onClick,
  badge,
}) => (
  <button
    onClick={() => onClick(tab)}
    className={cn(
      'flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-all',
      activeTab === tab
        ? 'bg-blue-600 text-white shadow-sm'
        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
    )}
  >
    {icon}
    <span>{label}</span>
    {badge !== undefined && badge > 0 && (
      <span className={cn(
        'px-1.5 py-0.5 text-xs font-semibold rounded-full',
        activeTab === tab 
          ? 'bg-white/20 text-white' 
          : 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
      )}>
        {badge}
      </span>
    )}
  </button>
);

// ==================== Audit Log Entry ====================
interface AuditEntryProps {
  entry: {
    id: string;
    role_name: string;
    module_code: string;
    permission_code: string;
    action: string;
    changed_by: string;
    changed_at: string;
    reason?: string;
  };
}

const AuditEntry: React.FC<AuditEntryProps> = ({ entry }) => {
  const isGrant = entry.action === 'grant' || entry.action === 'bulk_grant';
  
  return (
    <div className="flex items-start gap-3 p-3 border-b border-slate-100 dark:border-slate-800 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
      <div
        className={cn(
          'w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5',
          isGrant
            ? 'bg-emerald-100 dark:bg-emerald-900/30'
            : 'bg-red-100 dark:bg-red-900/30'
        )}
      >
        {isGrant ? (
          <CheckCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
        ) : (
          <AlertTriangle className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
        )}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            {entry.role_name}
          </span>
          <ChevronRight className="w-3 h-3 text-slate-400" />
          <span className={cn(
            'inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold rounded uppercase',
            isGrant
              ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
              : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
          )}>
            {isGrant ? 'Grant' : 'Revoke'}
          </span>
          <code className="px-1.5 py-0.5 text-xs bg-slate-100 dark:bg-slate-700 rounded text-slate-600 dark:text-slate-300">
            {entry.module_code}.{entry.permission_code}
          </code>
        </div>
        
        <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500 dark:text-slate-400">
          <span>by {entry.changed_by || 'System'}</span>
          <span>•</span>
          <span>{new Date(entry.changed_at).toLocaleString()}</span>
          {entry.reason && (
            <>
              <span>•</span>
              <span className="italic truncate max-w-[200px]">"{entry.reason}"</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// ==================== Role Comparison Panel ====================
interface RoleComparisonProps {
  roleA: Role | null;
  roleB: Role | null;
  onSelectRoleA: (role: Role | null) => void;
  onSelectRoleB: (role: Role | null) => void;
}

const RoleComparison: React.FC<RoleComparisonProps> = ({
  roleA,
  roleB,
  onSelectRoleA,
  onSelectRoleB,
}) => {
  const { roles, compareRoles } = useRBACStore();
  
  const comparison = roleA && roleB ? compareRoles(roleA.id, roleB.id) : null;
  const activeRoles = roles.filter(r => r.is_active && !r.is_deprecated);
  
  return (
    <div className="h-full flex flex-col bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <GitCompare className="w-5 h-5 text-blue-600" />
          Compare Roles
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Select two roles to see permission differences
        </p>
      </div>
      
      {/* Role Selectors */}
      <div className="flex-shrink-0 grid grid-cols-2 gap-4 p-4 border-b border-slate-200 dark:border-slate-700">
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
            Role A
          </label>
          <select
            value={roleA?.id || ''}
            onChange={(e) => {
              const role = roles.find(r => r.id === e.target.value);
              onSelectRoleA(role || null);
            }}
            className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200"
          >
            <option value="">Select role...</option>
            {activeRoles.filter(r => r.id !== roleB?.id).map(role => (
              <option key={role.id} value={role.id}>{role.name}</option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
            Role B
          </label>
          <select
            value={roleB?.id || ''}
            onChange={(e) => {
              const role = roles.find(r => r.id === e.target.value);
              onSelectRoleB(role || null);
            }}
            className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200"
          >
            <option value="">Select role...</option>
            {activeRoles.filter(r => r.id !== roleA?.id).map(role => (
              <option key={role.id} value={role.id}>{role.name}</option>
            ))}
          </select>
        </div>
      </div>
      
      {/* Comparison Results */}
      <div className="flex-1 overflow-auto p-4">
        {comparison && roleA && roleB ? (
          <>
            {/* Stats */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
                <p className="text-xs font-medium text-blue-700 dark:text-blue-300 mb-0.5">
                  Only in {roleA.name}
                </p>
                <p className="text-2xl font-bold text-blue-800 dark:text-blue-200">
                  {comparison.onlyInA.length}
                </p>
              </div>
              
              <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-700">
                <p className="text-xs font-medium text-emerald-700 dark:text-emerald-300 mb-0.5">
                  Common
                </p>
                <p className="text-2xl font-bold text-emerald-800 dark:text-emerald-200">
                  {comparison.common.length}
                </p>
              </div>
              
              <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-700">
                <p className="text-xs font-medium text-purple-700 dark:text-purple-300 mb-0.5">
                  Only in {roleB.name}
                </p>
                <p className="text-2xl font-bold text-purple-800 dark:text-purple-200">
                  {comparison.onlyInB.length}
                </p>
              </div>
            </div>
            
            {/* Permission Lists */}
            <div className="grid grid-cols-2 gap-4">
              {comparison.onlyInA.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">
                    Only in {roleA.name}
                  </h4>
                  <div className="space-y-1 max-h-64 overflow-y-auto">
                    {comparison.onlyInA.map((perm, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2 px-2 py-1 text-xs bg-blue-50 dark:bg-blue-900/20 rounded"
                      >
                        <code className="text-blue-700 dark:text-blue-300">
                          {perm.module}.{perm.action}
                        </code>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {comparison.onlyInB.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">
                    Only in {roleB.name}
                  </h4>
                  <div className="space-y-1 max-h-64 overflow-y-auto">
                    {comparison.onlyInB.map((perm, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2 px-2 py-1 text-xs bg-purple-50 dark:bg-purple-900/20 rounded"
                      >
                        <code className="text-purple-700 dark:text-purple-300">
                          {perm.module}.{perm.action}
                        </code>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 py-12">
            <GitCompare className="w-16 h-16 mb-4 opacity-30" />
            <p className="text-sm font-medium">Select two roles to compare</p>
            <p className="text-xs mt-1">You'll see permission differences side by side</p>
          </div>
        )}
      </div>
    </div>
  );
};

// ==================== Role Detail Panel ====================
interface RoleDetailPanelProps {
  role: Role | null;
  onEdit: (role: Role) => void;
  onDuplicate: (role: Role) => void;
  onDelete: (role: Role) => void;
}

const RoleDetailPanel: React.FC<RoleDetailPanelProps> = ({
  role,
  onEdit,
  onDuplicate,
  onDelete,
}) => {
  if (!role) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
        <Shield className="w-16 h-16 mb-4 opacity-20" />
        <p className="text-sm font-medium">Select a role to view details</p>
        <p className="text-xs mt-1">Or create a new custom role</p>
      </div>
    );
  }
  
  // Count granted permissions
  const grantedByModule = useMemo(() => {
    const result: Record<string, { granted: number; total: number }> = {};
    const actions: PermissionAction[] = ['view', 'create', 'edit', 'delete', 'approve', 'export', 'archive'];
    
    SYSTEM_MODULES.forEach(module => {
      const modulePerms = role.permissions[module.code];
      const granted = modulePerms 
        ? actions.filter(a => modulePerms[a]?.is_granted).length 
        : 0;
      if (granted > 0) {
        result[module.code] = { granted, total: module.available_permissions.length };
      }
    });
    
    return result;
  }, [role.permissions]);
  
  const totalGranted = Object.values(grantedByModule).reduce((sum, m) => sum + m.granted, 0);
  
  return (
    <div className="h-full flex flex-col bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
      {/* Header */}
      <div 
        className="flex-shrink-0 p-4 border-b border-slate-200 dark:border-slate-700"
        style={{ borderTopWidth: '4px', borderTopColor: role.color }}
      >
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              {role.is_system && <Shield className="w-4 h-4 text-blue-500" />}
              {role.is_locked && <Lock className="w-3.5 h-3.5 text-amber-500" />}
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                {role.name}
              </h2>
            </div>
            <p className="text-xs font-mono text-slate-500 dark:text-slate-400 mt-0.5">
              {role.code}
            </p>
            {role.description && (
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 line-clamp-2">
                {role.description}
              </p>
            )}
          </div>
          
          <div className="flex items-center gap-1">
            <button
              onClick={() => onEdit(role)}
              disabled={role.is_locked}
              className={cn(
                'p-1.5 rounded-lg transition-colors',
                role.is_locked
                  ? 'text-slate-300 cursor-not-allowed'
                  : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
              )}
              title="Edit Role"
            >
              <Edit3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => onDuplicate(role)}
              className="p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              title="Duplicate Role"
            >
              <Copy className="w-4 h-4" />
            </button>
            <button
              onClick={() => onDelete(role)}
              disabled={role.is_system}
              className={cn(
                'p-1.5 rounded-lg transition-colors',
                role.is_system
                  ? 'text-slate-300 cursor-not-allowed'
                  : 'text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20'
              )}
              title="Delete Role"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        {/* Quick Stats */}
        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-1.5">
            <CheckCircle className="w-4 h-4 text-emerald-500" />
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {totalGranted} permissions
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-blue-500" />
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {Object.keys(grantedByModule).length} modules
            </span>
          </div>
          {role.category && ROLE_CATEGORY_LABELS[role.category] && (
            <span 
              className="px-2 py-0.5 text-xs font-medium rounded-full"
              style={{ 
                backgroundColor: `${ROLE_CATEGORY_COLORS[role.category]}15`,
                color: ROLE_CATEGORY_COLORS[role.category]
              }}
            >
              {ROLE_CATEGORY_LABELS[role.category].en}
            </span>
          )}
        </div>
      </div>
      
      {/* Permission Summary */}
      <div className="flex-1 overflow-y-auto p-4">
        <h3 className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-3">
          Permission Summary
        </h3>
        
        <div className="space-y-2">
          {MODULE_GROUPS.map(group => {
            const groupModules = group.modules.filter(m => grantedByModule[m.code]);
            if (groupModules.length === 0) return null;
            
            return (
              <div key={group.category} className="mb-4">
                <div 
                  className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5 flex items-center gap-1.5"
                  style={{ color: group.color }}
                >
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: group.color }} />
                  {group.name}
                </div>
                
                <div className="space-y-1 ml-3.5">
                  {groupModules.map(module => {
                    const stats = grantedByModule[module.code];
                    const modulePerms = role.permissions[module.code];
                    
                    return (
                      <div
                        key={module.code}
                        className="flex items-center justify-between py-1.5 px-2 bg-slate-50 dark:bg-slate-800 rounded"
                      >
                        <span className="text-xs text-slate-600 dark:text-slate-300">
                          {module.name}
                        </span>
                        <div className="flex items-center gap-0.5">
                          {['view', 'create', 'edit', 'delete', 'approve', 'export', 'archive'].map(action => {
                            const isGranted = modulePerms?.[action as PermissionAction]?.is_granted;
                            if (!module.available_permissions.includes(action as PermissionAction)) return null;
                            
                            return (
                              <span
                                key={action}
                                className={cn(
                                  'w-5 h-5 flex items-center justify-center rounded text-[10px] font-bold',
                                  isGranted
                                    ? 'bg-emerald-500 text-white'
                                    : 'bg-slate-200 dark:bg-slate-700 text-slate-400'
                                )}
                                title={`${action}: ${isGranted ? 'Granted' : 'Denied'}`}
                              >
                                {action[0].toUpperCase()}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ==================== Main Permissions Page ====================
const PermissionsPage: React.FC = () => {
  const {
    roles,
    modules,
    auditLog,
    userRoleAssignments,
    createRole,
    updateRole,
    deleteRole,
    duplicateRole,
    initializeDefaults,
  } = useRBACStore();
  
  const [activeTab, setActiveTab] = useState<TabType>('matrix');
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [showRoleEditor, setShowRoleEditor] = useState(false);
  const [editorMode, setEditorMode] = useState<'create' | 'edit' | 'duplicate'>('create');
  const [roleToDelete, setRoleToDelete] = useState<Role | null>(null);
  const [compareRoleA, setCompareRoleA] = useState<Role | null>(null);
  const [compareRoleB, setCompareRoleB] = useState<Role | null>(null);
  
  // Initialize defaults
  useEffect(() => {
    initializeDefaults();
  }, [initializeDefaults]);
  
  // Calculate stats
  const stats = useMemo(() => ({
    totalRoles: roles.filter(r => r.is_active && !r.is_deprecated).length,
    systemRoles: roles.filter(r => r.is_system).length,
    customRoles: roles.filter(r => !r.is_system && !r.is_deprecated).length,
    totalModules: modules.length,
    assignedUsers: new Set(userRoleAssignments.map(a => a.user_id)).size,
    recentChanges: auditLog.filter(
      log => new Date(log.changed_at) > new Date(Date.now() - 24 * 60 * 60 * 1000)
    ).length,
  }), [roles, modules, userRoleAssignments, auditLog]);
  
  // Handlers
  const handleCreateRole = () => {
    setSelectedRole(null);
    setEditorMode('create');
    setShowRoleEditor(true);
  };
  
  const handleEditRole = (role: Role) => {
    setSelectedRole(role);
    setEditorMode('edit');
    setShowRoleEditor(true);
  };
  
  const handleDuplicateRole = (role: Role) => {
    setSelectedRole(role);
    setEditorMode('duplicate');
    setShowRoleEditor(true);
  };
  
  const handleDeleteRole = (role: Role) => {
    setRoleToDelete(role);
  };
  
  const handleSaveRole = (roleData: Partial<Role>) => {
    if (editorMode === 'create') {
      createRole({
        ...roleData,
        type: 'custom',
        is_system: false,
        is_locked: false,
        is_active: true,
        is_deprecated: false,
        priority: roleData.priority || 50,
        min_edit_priority: roleData.priority ? roleData.priority - 10 : 40,
        permissions: createFullPermissionMatrix(SYSTEM_MODULES, false),
      } as Omit<Role, 'id' | 'created_at' | 'updated_at'>);
    } else if (editorMode === 'edit' && selectedRole) {
      updateRole(selectedRole.id, roleData);
    } else if (editorMode === 'duplicate' && selectedRole) {
      duplicateRole(
        selectedRole.id,
        roleData.name || `${selectedRole.name} (Copy)`,
        roleData.code || `${selectedRole.code}_COPY`
      );
    }
    setShowRoleEditor(false);
  };
  
  const handleConfirmDelete = () => {
    if (roleToDelete) {
      deleteRole(roleToDelete.id);
      setRoleToDelete(null);
      if (selectedRole?.id === roleToDelete.id) {
        setSelectedRole(null);
      }
    }
  };
  
  return (
    <div className="flex flex-col h-full bg-slate-100 dark:bg-slate-950">
      {/* ===== PAGE HEADER ===== */}
      <div className="flex-shrink-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <div className="px-6 py-4">
          {/* Title Row */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-white" />
                </div>
                Permission Management
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Role-Based Access Control for QMS & Manufacturing Operations
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={initializeDefaults}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Reset
              </button>
              <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                <Upload className="w-3.5 h-3.5" />
                Import
              </button>
              <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                <Download className="w-3.5 h-3.5" />
                Export
              </button>
            </div>
          </div>
          
          {/* Quick Stats */}
          <div className="grid grid-cols-6 gap-3">
            <QuickStat
              icon={<Shield className="w-5 h-5" />}
              label="Total Roles"
              value={stats.totalRoles}
              color="#3B82F6"
            />
            <QuickStat
              icon={<Lock className="w-5 h-5" />}
              label="System Roles"
              value={stats.systemRoles}
              color="#8B5CF6"
            />
            <QuickStat
              icon={<Users className="w-5 h-5" />}
              label="Custom Roles"
              value={stats.customRoles}
              color="#10B981"
            />
            <QuickStat
              icon={<Layers className="w-5 h-5" />}
              label="Modules"
              value={stats.totalModules}
              color="#F59E0B"
            />
            <QuickStat
              icon={<Users className="w-5 h-5" />}
              label="Assigned Users"
              value={stats.assignedUsers}
              color="#EC4899"
            />
            <QuickStat
              icon={<History className="w-5 h-5" />}
              label="Changes (24h)"
              value={stats.recentChanges}
              color="#6B7280"
            />
          </div>
        </div>
        
        {/* Tab Navigation */}
        <div className="px-6 pb-0 flex items-center gap-1">
          <TabButton
            tab="matrix"
            activeTab={activeTab}
            icon={<FileText className="w-4 h-4" />}
            label="Permission Matrix"
            onClick={setActiveTab}
          />
          <TabButton
            tab="roles"
            activeTab={activeTab}
            icon={<Users className="w-4 h-4" />}
            label="Role Management"
            onClick={setActiveTab}
            badge={stats.customRoles}
          />
          <TabButton
            tab="compare"
            activeTab={activeTab}
            icon={<GitCompare className="w-4 h-4" />}
            label="Compare Roles"
            onClick={setActiveTab}
          />
          <TabButton
            tab="audit"
            activeTab={activeTab}
            icon={<History className="w-4 h-4" />}
            label="Audit Log"
            onClick={setActiveTab}
            badge={stats.recentChanges}
          />
        </div>
      </div>
      
      {/* ===== TAB CONTENT ===== */}
      <div className="flex-1 overflow-hidden p-4">
        {activeTab === 'matrix' && (
          <PermissionMatrix className="h-full" />
        )}
        
        {activeTab === 'roles' && (
          <div className="h-full flex gap-4">
            {/* Role List */}
            <div className="w-80 flex-shrink-0">
              <RoleList
                selectedRole={selectedRole}
                onSelectRole={setSelectedRole}
                onCreateRole={handleCreateRole}
                onEditRole={handleEditRole}
                onDuplicateRole={handleDuplicateRole}
                onDeleteRole={handleDeleteRole}
              />
            </div>
            
            {/* Role Details */}
            <div className="flex-1">
              <RoleDetailPanel
                role={selectedRole}
                onEdit={handleEditRole}
                onDuplicate={handleDuplicateRole}
                onDelete={handleDeleteRole}
              />
            </div>
          </div>
        )}
        
        {activeTab === 'compare' && (
          <RoleComparison
            roleA={compareRoleA}
            roleB={compareRoleB}
            onSelectRoleA={setCompareRoleA}
            onSelectRoleB={setCompareRoleB}
          />
        )}
        
        {activeTab === 'audit' && (
          <div className="h-full bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col">
            <div className="flex-shrink-0 p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                    <History className="w-5 h-5 text-slate-500" />
                    Permission Audit Log
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                    Complete audit trail of all permission changes
                  </p>
                </div>
                <div className="text-xs text-slate-500">
                  {auditLog.length} entries
                </div>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto">
              {auditLog.length > 0 ? (
                auditLog.slice(0, 100).map(entry => (
                  <AuditEntry key={entry.id} entry={entry} />
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-slate-400 dark:text-slate-500">
                  <History className="w-12 h-12 mb-3 opacity-30" />
                  <p className="text-sm font-medium">No audit entries yet</p>
                  <p className="text-xs mt-1">Changes to permissions will be logged here</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      
      {/* ===== DIALOGS ===== */}
      <RoleEditorDialog
        role={selectedRole}
        isOpen={showRoleEditor}
        onClose={() => setShowRoleEditor(false)}
        onSave={handleSaveRole}
        mode={editorMode}
      />
      
      <DeleteConfirmDialog
        role={roleToDelete}
        isOpen={!!roleToDelete}
        onClose={() => setRoleToDelete(null)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
};

export default PermissionsPage;
