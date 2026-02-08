// ==================== Permission Matrix Component ====================
// Enterprise-Grade RBAC Matrix - Modern Professional UI
// Redesigned for clarity, efficiency, and ease of use

import React, { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import {
  Check,
  X,
  Minus,
  Lock,
  ChevronDown,
  ChevronRight,
  Search,
  Filter,
  Download,
  Upload,
  RotateCcw,
  Copy,
  AlertTriangle,
  Info,
  Eye,
  Plus,
  Edit3,
  Trash2,
  CheckCircle,
  Shield,
  Save,
  XCircle,
  Layers,
  Users,
  Settings,
  Grid3X3,
  List,
  ArrowUpDown,
  Maximize2,
  FileSignature,
  Printer,
  Archive,
  RefreshCw,
  Zap,
  ChevronUp,
} from 'lucide-react';
import { cn } from '../../utils';
import { useRBACStore } from '../../store/rbacStore';
import {
  MODULE_GROUPS,
  PERMISSION_ACTIONS,
  ROLE_CATEGORY_LABELS,
  ROLE_CATEGORY_COLORS,
} from '../../constants/rbac';
import type {
  Role,
  Module,
  PermissionAction,
  ModuleCategory,
  RoleCategory,
  PermissionState,
} from '../../types/rbac';

// ==================== Permission Action Icons ====================
const PermissionIcons: Record<string, React.ReactNode> = {
  view: <Eye className="w-3 h-3" />,
  create: <Plus className="w-3 h-3" />,
  edit: <Edit3 className="w-3 h-3" />,
  delete: <Trash2 className="w-3 h-3" />,
  approve: <CheckCircle className="w-3 h-3" />,
  export: <Download className="w-3 h-3" />,
  archive: <Archive className="w-3 h-3" />,
  print: <Printer className="w-3 h-3" />,
  sign: <FileSignature className="w-3 h-3" />,
  release: <Zap className="w-3 h-3" />,
  reassign: <RefreshCw className="w-3 h-3" />,
  configure: <Settings className="w-3 h-3" />,
};

const PermissionLabels: Record<string, { short: string; full: string; ar: string }> = {
  view: { short: 'V', full: 'View', ar: 'عرض' },
  create: { short: 'C', full: 'Create', ar: 'إنشاء' },
  edit: { short: 'E', full: 'Edit', ar: 'تعديل' },
  delete: { short: 'D', full: 'Delete', ar: 'حذف' },
  approve: { short: 'A', full: 'Approve', ar: 'موافقة' },
  export: { short: 'X', full: 'Export', ar: 'تصدير' },
  archive: { short: 'R', full: 'Archive', ar: 'أرشفة' },
  print: { short: 'P', full: 'Print', ar: 'طباعة' },
  sign: { short: 'S', full: 'Sign', ar: 'توقيع' },
  release: { short: 'L', full: 'Release', ar: 'إصدار' },
  reassign: { short: 'G', full: 'Reassign', ar: 'إعادة تعيين' },
  configure: { short: 'F', full: 'Configure', ar: 'تكوين' },
};

// ==================== Standard Permission Actions ====================
const STANDARD_ACTIONS: PermissionAction[] = [
  'view', 'create', 'edit', 'delete', 'approve', 'export', 'archive'
];

// ==================== Permission Cell Component ====================
interface PermissionCellProps {
  role: Role;
  module: Module;
  action: PermissionAction;
  isEditing: boolean;
  isCompact: boolean;
  onToggle: (roleId: string, moduleCode: string, action: PermissionAction) => void;
}

const PermissionCell: React.FC<PermissionCellProps> = React.memo(({
  role,
  module,
  action,
  isEditing,
  isCompact,
  onToggle,
}) => {
  const permission = role.permissions[module.code]?.[action];
  const isGranted = permission?.is_granted ?? false;
  const isLocked = role.is_locked;
  const isAvailable = module.available_permissions.includes(action);
  const isDangerous = PERMISSION_ACTIONS.find(p => p.action === action)?.is_dangerous;
  
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isEditing || isLocked || !isAvailable) return;
    onToggle(role.id, module.code, action);
  };
  
  const size = isCompact ? 'w-7 h-7' : 'w-8 h-8';
  const iconSize = isCompact ? 'w-3 h-3' : 'w-3.5 h-3.5';
  
  if (!isAvailable) {
    return (
      <td className={cn(size, 'p-0')}>
        <div className={cn(
          'flex items-center justify-center',
          size,
          'bg-slate-50 dark:bg-slate-800/30'
        )}>
          <Minus className={cn(iconSize, 'text-slate-200 dark:text-slate-700')} />
        </div>
      </td>
    );
  }
  
  const baseClasses = cn(
    'flex items-center justify-center transition-all duration-100',
    size,
    {
      'cursor-pointer hover:scale-110 active:scale-95': isEditing && !isLocked,
      'cursor-not-allowed': isLocked,
    }
  );
  
  if (isLocked) {
    return (
      <td className={cn(size, 'p-0')}>
        <div className={cn(baseClasses, 'bg-slate-100 dark:bg-slate-800')}>
          {isGranted ? (
            <div className="relative">
              <Check className={cn(iconSize, 'text-emerald-500')} />
              <Lock className="w-2 h-2 text-slate-400 absolute -bottom-0.5 -right-0.5" />
            </div>
          ) : (
            <Lock className={cn(iconSize, 'text-slate-300 dark:text-slate-600')} />
          )}
        </div>
      </td>
    );
  }
  
  return (
    <td className={cn(size, 'p-0')} onClick={handleClick}>
      <div
        className={cn(
          baseClasses,
          isGranted
            ? cn(
                'bg-emerald-500 dark:bg-emerald-600',
                isDangerous && 'ring-1 ring-amber-400 ring-inset'
              )
            : 'bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600'
        )}
        title={`${PermissionLabels[action]?.full || action}: ${isGranted ? 'Granted' : 'Denied'}`}
      >
        {isGranted ? (
          <Check className={cn(iconSize, 'text-white')} />
        ) : (
          <X className={cn(iconSize, 'text-slate-300 dark:text-slate-500')} />
        )}
      </div>
    </td>
  );
});

PermissionCell.displayName = 'PermissionCell';

// ==================== Module Row Component ====================
interface ModuleRowProps {
  module: Module;
  roles: Role[];
  isEditing: boolean;
  isCompact: boolean;
  onTogglePermission: (roleId: string, moduleCode: string, action: PermissionAction) => void;
  isOdd: boolean;
  onBulkGrant?: (moduleCode: string, action: PermissionAction) => void;
  onBulkRevoke?: (moduleCode: string, action: PermissionAction) => void;
}

const ModuleRow: React.FC<ModuleRowProps> = React.memo(({
  module,
  roles,
  isEditing,
  isCompact,
  onTogglePermission,
  isOdd,
  onBulkGrant,
  onBulkRevoke,
}) => {
  return (
    <tr className={cn(
      'group border-b border-slate-100 dark:border-slate-800',
      isOdd ? 'bg-white dark:bg-slate-900' : 'bg-slate-50/50 dark:bg-slate-900/50'
    )}>
      {/* Module Name - Sticky */}
      <td className={cn(
        'sticky left-0 z-10 px-3 py-1.5',
        isOdd ? 'bg-white dark:bg-slate-900' : 'bg-slate-50/50 dark:bg-slate-900/50',
        'border-r border-slate-200 dark:border-slate-700'
      )}>
        <div className="flex items-center gap-2 min-w-[180px] max-w-[200px]">
          <div 
            className="w-1.5 h-1.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: module.color }}
          />
          <span className="text-xs font-medium text-slate-600 dark:text-slate-300 truncate">
            {module.name}
          </span>
        </div>
      </td>
      
      {/* Permission Cells */}
      {roles.map(role => (
        <React.Fragment key={role.id}>
          {STANDARD_ACTIONS.map(action => (
            <PermissionCell
              key={`${role.id}-${module.code}-${action}`}
              role={role}
              module={module}
              action={action}
              isEditing={isEditing}
              isCompact={isCompact}
              onToggle={onTogglePermission}
            />
          ))}
          {/* Role Separator */}
          <td className="w-px bg-slate-200 dark:bg-slate-700" />
        </React.Fragment>
      ))}
    </tr>
  );
});

ModuleRow.displayName = 'ModuleRow';

// ==================== Category Section Component ====================
interface CategorySectionProps {
  category: string;
  name: string;
  nameAr: string;
  color: string;
  modules: Module[];
  roles: Role[];
  isExpanded: boolean;
  isEditing: boolean;
  isCompact: boolean;
  onToggle: () => void;
  onTogglePermission: (roleId: string, moduleCode: string, action: PermissionAction) => void;
}

const CategorySection: React.FC<CategorySectionProps> = ({
  category,
  name,
  nameAr,
  color,
  modules,
  roles,
  isExpanded,
  isEditing,
  isCompact,
  onToggle,
  onTogglePermission,
}) => {
  const grantedCount = useMemo(() => {
    let count = 0;
    modules.forEach(module => {
      roles.forEach(role => {
        STANDARD_ACTIONS.forEach(action => {
          if (role.permissions[module.code]?.[action]?.is_granted) {
            count++;
          }
        });
      });
    });
    return count;
  }, [modules, roles]);
  
  const totalPossible = modules.length * roles.length * STANDARD_ACTIONS.length;
  const percentage = totalPossible > 0 ? Math.round((grantedCount / totalPossible) * 100) : 0;
  
  return (
    <>
      {/* Category Header */}
      <tr 
        className="sticky top-[72px] z-20 cursor-pointer select-none"
        onClick={onToggle}
      >
        <td 
          colSpan={100}
          className="p-0"
        >
          <div 
            className={cn(
              'flex items-center gap-3 px-3 py-2',
              'bg-gradient-to-r from-slate-100 to-slate-50',
              'dark:from-slate-800 dark:to-slate-800/80',
              'border-y border-slate-200 dark:border-slate-700'
            )}
            style={{ borderLeftWidth: '3px', borderLeftColor: color }}
          >
            <div className={cn(
              'flex items-center justify-center w-5 h-5 rounded',
              'bg-white dark:bg-slate-700 shadow-sm'
            )}>
              {isExpanded ? (
                <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
              )}
            </div>
            
            <div className="flex-1 flex items-center gap-2">
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                {name}
              </span>
              <span className="text-xs text-slate-400 dark:text-slate-500">
                {nameAr}
              </span>
            </div>
            
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {modules.length} modules
              </span>
              <div className="flex items-center gap-1.5">
                <div className="w-16 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-emerald-500 rounded-full transition-all"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <span className="text-[10px] font-medium text-slate-400 w-8">
                  {percentage}%
                </span>
              </div>
            </div>
          </div>
        </td>
      </tr>
      
      {/* Module Rows */}
      {isExpanded && modules.map((module, idx) => (
        <ModuleRow
          key={module.id}
          module={module}
          roles={roles}
          isEditing={isEditing}
          isCompact={isCompact}
          onTogglePermission={onTogglePermission}
          isOdd={idx % 2 === 0}
        />
      ))}
    </>
  );
};

// ==================== Role Column Header ====================
interface RoleColumnHeaderProps {
  role: Role;
  isCompact: boolean;
  onRoleClick: (roleId: string) => void;
}

const RoleColumnHeader: React.FC<RoleColumnHeaderProps> = ({
  role,
  isCompact,
  onRoleClick,
}) => {
  const grantedCount = useMemo(() => {
    let count = 0;
    Object.values(role.permissions).forEach(modulePerms => {
      STANDARD_ACTIONS.forEach(action => {
        if (modulePerms[action]?.is_granted) count++;
      });
    });
    return count;
  }, [role.permissions]);
  
  return (
    <>
      {/* Role Name */}
      <th
        colSpan={STANDARD_ACTIONS.length}
        className={cn(
          'px-1 py-2 text-center border-b-2 cursor-pointer',
          'bg-white dark:bg-slate-900',
          'hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors'
        )}
        style={{ borderBottomColor: role.color }}
        onClick={() => onRoleClick(role.id)}
      >
        <div className="flex flex-col items-center gap-0.5">
          <div className="flex items-center gap-1">
            {role.is_system && <Shield className="w-3 h-3 text-blue-500" />}
            {role.is_locked && <Lock className="w-2.5 h-2.5 text-amber-500" />}
            <span className={cn(
              'font-semibold truncate',
              isCompact ? 'text-[10px] max-w-[80px]' : 'text-xs max-w-[100px]'
            )}>
              {role.name}
            </span>
          </div>
          <span className="text-[9px] text-slate-400 font-mono">
            {grantedCount} granted
          </span>
        </div>
      </th>
      {/* Separator */}
      <th className="w-px bg-slate-200 dark:bg-slate-700 p-0" />
    </>
  );
};

// ==================== Action Headers Row ====================
interface ActionHeadersRowProps {
  roles: Role[];
  isCompact: boolean;
}

const ActionHeadersRow: React.FC<ActionHeadersRowProps> = ({ roles, isCompact }) => {
  const size = isCompact ? 'w-7' : 'w-8';
  
  return (
    <tr className="bg-slate-50 dark:bg-slate-800/80">
      <th className={cn(
        'sticky left-0 z-30 px-3 py-1.5 text-left',
        'bg-slate-50 dark:bg-slate-800/80',
        'border-r border-b border-slate-200 dark:border-slate-700'
      )}>
        <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
          Module / Action
        </span>
      </th>
      
      {roles.map(role => (
        <React.Fragment key={role.id}>
          {STANDARD_ACTIONS.map(action => (
            <th
              key={`${role.id}-${action}`}
              className={cn(
                size,
                'p-0 border-b border-slate-200 dark:border-slate-700'
              )}
              title={PermissionLabels[action]?.full || action}
            >
              <div className={cn(
                'flex items-center justify-center',
                size,
                'h-6 text-slate-400 dark:text-slate-500'
              )}>
                {PermissionIcons[action] || (
                  <span className="text-[9px] font-bold">
                    {PermissionLabels[action]?.short || action[0].toUpperCase()}
                  </span>
                )}
              </div>
            </th>
          ))}
          <th className="w-px bg-slate-200 dark:bg-slate-700 border-b border-slate-200 dark:border-slate-700 p-0" />
        </React.Fragment>
      ))}
    </tr>
  );
};

// ==================== Main Permission Matrix Component ====================
interface PermissionMatrixProps {
  className?: string;
}

const PermissionMatrix: React.FC<PermissionMatrixProps> = ({ className }) => {
  const {
    roles,
    modules,
    uiState,
    setUIState,
    toggleCategoryExpanded,
    getPermissionForRole,
    setPermission,
    addPendingChange,
    clearPendingChanges,
    applyPendingChanges,
    getRolesByCategory,
    validatePermissionMatrix,
  } = useRBACStore();
  
  // Local State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoleIds, setSelectedRoleIds] = useState<Set<string>>(new Set());
  const [categoryFilter, setCategoryFilter] = useState<RoleCategory | 'all'>('all');
  const [isCompact, setIsCompact] = useState(true);
  const [showOnlyGranted, setShowOnlyGranted] = useState(false);
  const [sortBy, setSortBy] = useState<'name' | 'priority' | 'category'>('priority');
  const tableRef = useRef<HTMLDivElement>(null);
  
  // Expand all categories by default
  useEffect(() => {
    const allCategories = MODULE_GROUPS.map(g => g.category);
    const currentExpanded = uiState.expandedCategories;
    if (currentExpanded.size === 0) {
      allCategories.forEach(cat => toggleCategoryExpanded(cat));
    }
  }, []);
  
  // Filter and sort roles
  const filteredRoles = useMemo(() => {
    let result = roles.filter(r => r.is_active && !r.is_deprecated);
    
    // Category filter
    if (categoryFilter !== 'all') {
      result = result.filter(r => r.category === categoryFilter);
    }
    
    // Selected filter
    if (selectedRoleIds.size > 0) {
      result = result.filter(r => selectedRoleIds.has(r.id));
    }
    
    // Sort
    switch (sortBy) {
      case 'name':
        result.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'category':
        result.sort((a, b) => a.category.localeCompare(b.category) || a.priority - b.priority);
        break;
      case 'priority':
      default:
        result.sort((a, b) => a.priority - b.priority);
    }
    
    return result;
  }, [roles, categoryFilter, selectedRoleIds, sortBy]);
  
  // Filter modules based on search
  const filteredModuleGroups = useMemo(() => {
    return MODULE_GROUPS.map(group => ({
      ...group,
      modules: group.modules.filter(m => {
        const matchesSearch = !searchQuery || 
          m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          m.name_ar?.includes(searchQuery) ||
          m.code.toLowerCase().includes(searchQuery.toLowerCase());
        
        if (showOnlyGranted && matchesSearch) {
          // Check if any filtered role has any permission granted for this module
          return filteredRoles.some(role => 
            STANDARD_ACTIONS.some(action => 
              role.permissions[m.code]?.[action]?.is_granted
            )
          );
        }
        
        return matchesSearch;
      }),
    })).filter(group => group.modules.length > 0);
  }, [searchQuery, showOnlyGranted, filteredRoles]);
  
  // Handle permission toggle
  const handleTogglePermission = useCallback((
    roleId: string,
    moduleCode: string,
    action: PermissionAction
  ) => {
    const currentValue = getPermissionForRole(roleId, moduleCode, action);
    
    if (uiState.isEditing) {
      addPendingChange({
        role_id: roleId,
        module_code: moduleCode,
        permission_action: action,
        new_value: !currentValue,
        previous_value: currentValue,
      });
      // Also update immediately for visual feedback
      setPermission(roleId, moduleCode, action, !currentValue);
    }
  }, [uiState.isEditing, getPermissionForRole, addPendingChange, setPermission]);
  
  // Toggle edit mode
  const toggleEditMode = () => {
    if (uiState.isEditing && uiState.pendingChanges.length > 0) {
      if (confirm('You have unsaved changes. Discard them?')) {
        clearPendingChanges();
      } else {
        return;
      }
    }
    setUIState({ isEditing: !uiState.isEditing });
  };
  
  // Save changes
  const handleSaveChanges = async () => {
    try {
      await applyPendingChanges('current-user', 'Permission matrix update');
      setUIState({ isEditing: false });
    } catch (error) {
      console.error('[PermissionMatrix] Save failed:', error);
    }
  };
  
  // Cancel changes
  const handleCancelChanges = () => {
    clearPendingChanges();
    setUIState({ isEditing: false });
  };
  
  // Handle role selection toggle
  const handleRoleClick = (roleId: string) => {
    setSelectedRoleIds(prev => {
      const next = new Set(prev);
      if (next.has(roleId)) {
        next.delete(roleId);
      } else {
        next.add(roleId);
      }
      return next;
    });
  };
  
  // Role categories for quick filter
  const roleCategories = useMemo(() => {
    const cats = new Map<RoleCategory, number>();
    roles.filter(r => r.is_active && !r.is_deprecated).forEach(r => {
      cats.set(r.category, (cats.get(r.category) || 0) + 1);
    });
    return cats;
  }, [roles]);
  
  return (
    <div className={cn(
      'flex flex-col h-full bg-white dark:bg-slate-900',
      'rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden',
      className
    )}>
      {/* ===== TOOLBAR ===== */}
      <div className="flex-shrink-0 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-slate-50 to-white dark:from-slate-800/50 dark:to-slate-900">
        <div className="flex items-center justify-between gap-4 px-4 py-3">
          {/* Left Section - Search & Filters */}
          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search modules..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={cn(
                  'pl-8 pr-3 py-1.5 w-48 text-sm rounded-lg',
                  'border border-slate-200 dark:border-slate-600',
                  'bg-white dark:bg-slate-800',
                  'text-slate-700 dark:text-slate-200',
                  'placeholder-slate-400',
                  'focus:ring-2 focus:ring-blue-500 focus:border-transparent',
                  'transition-all'
                )}
              />
            </div>
            
            {/* Category Filter */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as RoleCategory | 'all')}
              className={cn(
                'px-3 py-1.5 text-sm rounded-lg',
                'border border-slate-200 dark:border-slate-600',
                'bg-white dark:bg-slate-800',
                'text-slate-700 dark:text-slate-200'
              )}
            >
              <option value="all">All Categories ({roles.filter(r => r.is_active).length})</option>
              {Array.from(roleCategories.entries()).map(([cat, count]) => (
                <option key={cat} value={cat}>
                  {ROLE_CATEGORY_LABELS[cat]?.en || cat} ({count})
                </option>
              ))}
            </select>
            
            {/* Quick Toggles */}
            <div className="flex items-center gap-1 px-1 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg">
              <button
                onClick={() => setShowOnlyGranted(!showOnlyGranted)}
                className={cn(
                  'flex items-center gap-1.5 px-2 py-1 text-xs font-medium rounded-md transition-colors',
                  showOnlyGranted
                    ? 'bg-emerald-500 text-white'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-700'
                )}
              >
                <Check className="w-3 h-3" />
                Granted
              </button>
              <button
                onClick={() => setIsCompact(!isCompact)}
                className={cn(
                  'flex items-center gap-1.5 px-2 py-1 text-xs font-medium rounded-md transition-colors',
                  isCompact
                    ? 'bg-blue-500 text-white'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-700'
                )}
              >
                <Grid3X3 className="w-3 h-3" />
                Compact
              </button>
            </div>
            
            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'name' | 'priority' | 'category')}
              className={cn(
                'px-2 py-1.5 text-xs rounded-lg',
                'border border-slate-200 dark:border-slate-600',
                'bg-white dark:bg-slate-800',
                'text-slate-600 dark:text-slate-300'
              )}
            >
              <option value="priority">Sort: Priority</option>
              <option value="name">Sort: Name</option>
              <option value="category">Sort: Category</option>
            </select>
          </div>
          
          {/* Right Section - Actions */}
          <div className="flex items-center gap-2">
            {/* Pending Changes Badge */}
            {uiState.pendingChanges.length > 0 && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded-full">
                <AlertTriangle className="w-3.5 h-3.5" />
                {uiState.pendingChanges.length} changes
              </div>
            )}
            
            {/* Edit/Save Buttons */}
            {!uiState.isEditing ? (
              <button
                onClick={toggleEditMode}
                className={cn(
                  'flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg',
                  'bg-blue-600 hover:bg-blue-700 text-white',
                  'transition-colors shadow-sm'
                )}
              >
                <Edit3 className="w-4 h-4" />
                Edit Mode
              </button>
            ) : (
              <>
                <button
                  onClick={handleCancelChanges}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg',
                    'border border-slate-200 dark:border-slate-600',
                    'text-slate-600 dark:text-slate-300',
                    'hover:bg-slate-100 dark:hover:bg-slate-700',
                    'transition-colors'
                  )}
                >
                  <XCircle className="w-4 h-4" />
                  Cancel
                </button>
                <button
                  onClick={handleSaveChanges}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg',
                    'bg-emerald-600 hover:bg-emerald-700 text-white',
                    'transition-colors shadow-sm'
                  )}
                >
                  <Save className="w-4 h-4" />
                  Save
                </button>
              </>
            )}
            
            {/* Export */}
            <button
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1.5 text-sm font-medium rounded-lg',
                'border border-slate-200 dark:border-slate-600',
                'text-slate-500 dark:text-slate-400',
                'hover:bg-slate-100 dark:hover:bg-slate-700',
                'transition-colors'
              )}
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        {/* Edit Mode Banner */}
        {uiState.isEditing && (
          <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 dark:bg-amber-900/20 border-t border-amber-100 dark:border-amber-800">
            <Info className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <span className="text-xs text-amber-700 dark:text-amber-300">
              <strong>Edit Mode Active</strong> — Click cells to toggle permissions. Changes are tracked and can be saved or discarded.
            </span>
          </div>
        )}
        
        {/* Selected Roles */}
        {selectedRoleIds.size > 0 && (
          <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 border-t border-blue-100 dark:border-blue-800">
            <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
              Filtering {selectedRoleIds.size} role{selectedRoleIds.size > 1 ? 's' : ''}:
            </span>
            <div className="flex flex-wrap gap-1">
              {Array.from(selectedRoleIds).map(id => {
                const role = roles.find(r => r.id === id);
                return role ? (
                  <span
                    key={id}
                    className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600"
                    style={{ borderLeftWidth: '2px', borderLeftColor: role.color }}
                  >
                    {role.name}
                    <button
                      onClick={() => handleRoleClick(id)}
                      className="hover:text-red-500"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ) : null;
              })}
            </div>
            <button
              onClick={() => setSelectedRoleIds(new Set())}
              className="ml-auto text-xs text-blue-600 dark:text-blue-400 hover:underline"
            >
              Clear all
            </button>
          </div>
        )}
      </div>
      
      {/* ===== MATRIX TABLE ===== */}
      <div ref={tableRef} className="flex-1 overflow-auto">
        <table className="w-full border-collapse">
          <thead className="sticky top-0 z-30">
            {/* Role Headers */}
            <tr className="bg-white dark:bg-slate-900">
              <th className={cn(
                'sticky left-0 z-40 px-3 py-2.5 text-left',
                'bg-white dark:bg-slate-900',
                'border-r border-b border-slate-200 dark:border-slate-700'
              )}>
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                    Roles ({filteredRoles.length})
                  </span>
                </div>
              </th>
              
              {filteredRoles.map(role => (
                <RoleColumnHeader
                  key={role.id}
                  role={role}
                  isCompact={isCompact}
                  onRoleClick={handleRoleClick}
                />
              ))}
            </tr>
            
            {/* Action Headers */}
            <ActionHeadersRow roles={filteredRoles} isCompact={isCompact} />
          </thead>
          
          <tbody>
            {filteredModuleGroups.map(group => (
              <CategorySection
                key={group.category}
                category={group.category}
                name={group.name}
                nameAr={group.name_ar}
                color={group.color}
                modules={group.modules}
                roles={filteredRoles}
                isExpanded={uiState.expandedCategories.has(group.category)}
                isEditing={uiState.isEditing}
                isCompact={isCompact}
                onToggle={() => toggleCategoryExpanded(group.category)}
                onTogglePermission={handleTogglePermission}
              />
            ))}
          </tbody>
        </table>
        
        {/* Empty State */}
        {filteredModuleGroups.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400 dark:text-slate-500">
            <Search className="w-12 h-12 mb-3 opacity-50" />
            <p className="text-sm font-medium">No modules found</p>
            <p className="text-xs mt-1">Try adjusting your search or filters</p>
          </div>
        )}
      </div>
      
      {/* ===== FOOTER LEGEND ===== */}
      <div className="flex-shrink-0 flex items-center justify-between gap-4 px-4 py-2 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded flex items-center justify-center bg-emerald-500">
              <Check className="w-3 h-3 text-white" />
            </div>
            <span className="text-slate-600 dark:text-slate-400">Granted</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded flex items-center justify-center bg-slate-100 dark:bg-slate-700">
              <X className="w-3 h-3 text-slate-300 dark:text-slate-500" />
            </div>
            <span className="text-slate-600 dark:text-slate-400">Denied</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded flex items-center justify-center bg-slate-100 dark:bg-slate-800">
              <Lock className="w-3 h-3 text-slate-400" />
            </div>
            <span className="text-slate-600 dark:text-slate-400">Locked</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded flex items-center justify-center bg-slate-50 dark:bg-slate-800/30">
              <Minus className="w-3 h-3 text-slate-200" />
            </div>
            <span className="text-slate-600 dark:text-slate-400">N/A</span>
          </div>
        </div>
        
        <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
          <span>{filteredRoles.length} roles × {modules.length} modules</span>
          <span className="text-slate-300 dark:text-slate-600">|</span>
          <div className="flex items-center gap-1">
            {STANDARD_ACTIONS.slice(0, 5).map(action => (
              <span key={action} className="flex items-center gap-0.5" title={PermissionLabels[action]?.full}>
                {PermissionIcons[action]}
              </span>
            ))}
            <span className="text-slate-300 ml-1">+{STANDARD_ACTIONS.length - 5}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PermissionMatrix;
