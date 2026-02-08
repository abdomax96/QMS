// ==================== Role Management Components ====================
// Enterprise-Grade Role CRUD and Management UI

import React, { useState, useMemo } from 'react';
import {
  Shield,
  Plus,
  Edit3,
  Trash2,
  Copy,
  ChevronDown,
  ChevronRight,
  Search,
  Filter,
  AlertTriangle,
  Lock,
  Archive,
  MoreVertical,
  Users,
  Check,
  X,
  Info,
} from 'lucide-react';
import { cn } from '../../utils';
import { useRBACStore } from '../../store/rbacStore';
import {
  ROLE_CATEGORY_LABELS,
  ROLE_CATEGORY_COLORS,
  SYSTEM_MODULES,
  createFullPermissionMatrix,
} from '../../constants/rbac';
import type {
  Role,
  RoleCategory,
  PermissionAction,
} from '../../types/rbac';

// ==================== Role Card Component ====================
interface RoleCardProps {
  role: Role;
  isSelected: boolean;
  onSelect: (role: Role) => void;
  onEdit: (role: Role) => void;
  onDuplicate: (role: Role) => void;
  onDelete: (role: Role) => void;
  onDeprecate: (role: Role) => void;
}

const RoleCard: React.FC<RoleCardProps> = ({
  role,
  isSelected,
  onSelect,
  onEdit,
  onDuplicate,
  onDelete,
  onDeprecate,
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const { userRoleAssignments } = useRBACStore();
  
  // Count users with this role
  const userCount = useMemo(() => {
    return userRoleAssignments.filter(a => a.role_id === role.id).length;
  }, [userRoleAssignments, role.id]);
  
  // Count granted permissions
  const permissionCount = useMemo(() => {
    let count = 0;
    Object.values(role.permissions).forEach(modulePerms => {
      Object.values(modulePerms).forEach(perm => {
        if (perm?.is_granted) count++;
      });
    });
    return count;
  }, [role.permissions]);
  
  return (
    <div
      className={cn(
        'relative group p-4 rounded-lg border transition-all cursor-pointer',
        isSelected
          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 ring-2 ring-blue-500/20'
          : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-sm',
        role.is_deprecated && 'opacity-60'
      )}
      onClick={() => onSelect(role)}
    >
      {/* Status Badges */}
      <div className="absolute top-2 right-2 flex items-center gap-1">
        {role.is_system && (
          <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded">
            System
          </span>
        )}
        {role.is_locked && (
          <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 rounded">
            <Lock className="w-2.5 h-2.5 mr-0.5" />
            Locked
          </span>
        )}
        {role.is_deprecated && (
          <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 rounded">
            Deprecated
          </span>
        )}
      </div>
      
      {/* Role Info */}
      <div className="flex items-start gap-3 mb-3">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
          style={{ backgroundColor: role.color }}
        >
          {role.name.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-slate-800 dark:text-slate-100 truncate">
            {role.name}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
            {role.code}
          </p>
        </div>
      </div>
      
      {/* Description */}
      {role.description && (
        <p className="text-xs text-slate-600 dark:text-slate-400 mb-3 line-clamp-2">
          {role.description}
        </p>
      )}
      
      {/* Stats */}
      <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-1">
          <Users className="w-3.5 h-3.5" />
          <span>{userCount} users</span>
        </div>
        <div className="flex items-center gap-1">
          <Shield className="w-3.5 h-3.5" />
          <span>{permissionCount} permissions</span>
        </div>
      </div>
      
      {/* Category Badge */}
      <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
        <span
          className="inline-flex items-center px-2 py-0.5 text-[10px] font-medium rounded-full"
          style={{
            backgroundColor: `${ROLE_CATEGORY_COLORS[role.category]}15`,
            color: ROLE_CATEGORY_COLORS[role.category],
          }}
        >
          {ROLE_CATEGORY_LABELS[role.category]?.en || role.category}
        </span>
      </div>
      
      {/* Action Menu */}
      <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            className="p-1.5 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700"
          >
            <MoreVertical className="w-4 h-4 text-slate-500" />
          </button>
          
          {showMenu && (
            <div className="absolute right-0 bottom-full mb-1 w-40 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 py-1 z-50">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(role);
                  setShowMenu(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                <Edit3 className="w-4 h-4" />
                Edit Role
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDuplicate(role);
                  setShowMenu(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                <Copy className="w-4 h-4" />
                Duplicate
              </button>
              {!role.is_system && (
                <>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeprecate(role);
                      setShowMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20"
                  >
                    <Archive className="w-4 h-4" />
                    Deprecate
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(role);
                      setShowMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ==================== Role List Sidebar ====================
interface RoleListProps {
  selectedRole: Role | null;
  onSelectRole: (role: Role) => void;
  onCreateRole: () => void;
  onEditRole: (role: Role) => void;
  onDuplicateRole: (role: Role) => void;
  onDeleteRole: (role: Role) => void;
}

export const RoleList: React.FC<RoleListProps> = ({
  selectedRole,
  onSelectRole,
  onCreateRole,
  onEditRole,
  onDuplicateRole,
  onDeleteRole,
}) => {
  const { roles, deprecateRole } = useRBACStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<RoleCategory | 'all'>('all');
  const [expandedCategories, setExpandedCategories] = useState<Set<RoleCategory>>(
    new Set(['executive', 'quality', 'production'] as RoleCategory[])
  );
  
  // Group roles by category
  const groupedRoles = useMemo(() => {
    const filtered = roles.filter(role => {
      const matchesSearch = 
        role.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        role.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        role.description?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = categoryFilter === 'all' || role.category === categoryFilter;
      return matchesSearch && matchesCategory && !role.is_deprecated;
    });
    
    const groups: Record<RoleCategory, Role[]> = {
      executive: [],
      quality: [],
      production: [],
      maintenance: [],
      supply_chain: [],
      laboratory: [],
      support: [],
      special: [],
    };
    
    filtered.forEach(role => {
      groups[role.category].push(role);
    });
    
    return groups;
  }, [roles, searchQuery, categoryFilter]);
  
  const toggleCategory = (category: RoleCategory) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };
  
  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-700">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
            Roles
          </h2>
          <button
            onClick={onCreateRole}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Role
          </button>
        </div>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search roles..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>
      
      {/* Role List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {(Object.entries(groupedRoles) as [RoleCategory, Role[]][])
          .filter(([_, roles]) => roles.length > 0)
          .map(([category, categoryRoles]) => (
            <div key={category}>
              {/* Category Header */}
              <button
                onClick={() => toggleCategory(category)}
                className="w-full flex items-center gap-2 px-2 py-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider hover:text-slate-700 dark:hover:text-slate-200"
              >
                {expandedCategories.has(category) ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: ROLE_CATEGORY_COLORS[category] }}
                />
                {ROLE_CATEGORY_LABELS[category]?.en}
                <span className="ml-auto text-slate-400 font-normal">
                  {categoryRoles.length}
                </span>
              </button>
              
              {/* Category Roles */}
              {expandedCategories.has(category) && (
                <div className="mt-2 space-y-2">
                  {categoryRoles.map(role => (
                    <RoleCard
                      key={role.id}
                      role={role}
                      isSelected={selectedRole?.id === role.id}
                      onSelect={onSelectRole}
                      onEdit={onEditRole}
                      onDuplicate={onDuplicateRole}
                      onDelete={onDeleteRole}
                      onDeprecate={(r) => deprecateRole(r.id, undefined, 'Deprecated by admin')}
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
      </div>
    </div>
  );
};

// ==================== Role Editor Dialog ====================
interface RoleEditorDialogProps {
  role?: Role | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (roleData: Partial<Role>) => void;
  mode: 'create' | 'edit' | 'duplicate';
}

export const RoleEditorDialog: React.FC<RoleEditorDialogProps> = ({
  role,
  isOpen,
  onClose,
  onSave,
  mode,
}) => {
  const [formData, setFormData] = useState({
    name: role?.name || '',
    name_ar: role?.name_ar || '',
    code: role?.code || '',
    description: role?.description || '',
    description_ar: role?.description_ar || '',
    category: role?.category || 'support' as RoleCategory,
    color: role?.color || '#6B7280',
    priority: role?.priority || 50,
    department: role?.department || '',
    department_ar: role?.department_ar || '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const { getRoleByCode } = useRBACStore();
  
  if (!isOpen) return null;
  
  const validate = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Role name is required';
    }
    
    if (!formData.code.trim()) {
      newErrors.code = 'Role code is required';
    } else if (!/^[A-Z][A-Z0-9_]*$/.test(formData.code)) {
      newErrors.code = 'Code must start with letter and contain only uppercase letters, numbers, and underscores';
    } else if (mode !== 'edit' && getRoleByCode(formData.code)) {
      newErrors.code = 'Role code already exists';
    }
    
    if (formData.priority < 1 || formData.priority > 100) {
      newErrors.priority = 'Priority must be between 1 and 100';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onSave(formData);
      onClose();
    }
  };
  
  const title = {
    create: 'Create New Role',
    edit: 'Edit Role',
    duplicate: 'Duplicate Role',
  }[mode];
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Dialog */}
      <div className="relative w-full max-w-2xl max-h-[90vh] bg-white dark:bg-slate-900 rounded-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>
        
        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Role Name (English) *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className={cn(
                  'w-full px-3 py-2 border rounded-lg text-sm',
                  'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200',
                  'focus:ring-2 focus:ring-blue-500 focus:border-transparent',
                  errors.name
                    ? 'border-red-300 dark:border-red-700'
                    : 'border-slate-200 dark:border-slate-600'
                )}
                placeholder="e.g., Quality Inspector"
              />
              {errors.name && (
                <p className="mt-1 text-xs text-red-500">{errors.name}</p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Role Name (Arabic)
              </label>
              <input
                type="text"
                value={formData.name_ar}
                onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="مثال: مفتش الجودة"
                dir="rtl"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Role Code *
              </label>
              <input
                type="text"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                className={cn(
                  'w-full px-3 py-2 border rounded-lg text-sm font-mono',
                  'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200',
                  'focus:ring-2 focus:ring-blue-500 focus:border-transparent',
                  errors.code
                    ? 'border-red-300 dark:border-red-700'
                    : 'border-slate-200 dark:border-slate-600'
                )}
                placeholder="e.g., QA_INSPECTOR"
                disabled={mode === 'edit'}
              />
              {errors.code && (
                <p className="mt-1 text-xs text-red-500">{errors.code}</p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Category *
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value as RoleCategory })}
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {Object.entries(ROLE_CATEGORY_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label.en}</option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Description (English)
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                placeholder="Brief description of this role's responsibilities..."
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Description (Arabic)
              </label>
              <textarea
                value={formData.description_ar}
                onChange={(e) => setFormData({ ...formData, description_ar: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                placeholder="وصف مختصر لمسؤوليات هذا الدور..."
                dir="rtl"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Color
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="w-10 h-10 rounded border border-slate-200 dark:border-slate-600 cursor-pointer"
                />
                <input
                  type="text"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="flex-1 px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm font-mono bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Priority (1-100)
              </label>
              <input
                type="number"
                min="1"
                max="100"
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 50 })}
                className={cn(
                  'w-full px-3 py-2 border rounded-lg text-sm',
                  'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200',
                  'focus:ring-2 focus:ring-blue-500 focus:border-transparent',
                  errors.priority
                    ? 'border-red-300 dark:border-red-700'
                    : 'border-slate-200 dark:border-slate-600'
                )}
              />
              <p className="mt-1 text-xs text-slate-500">Lower = higher authority</p>
              {errors.priority && (
                <p className="mt-1 text-xs text-red-500">{errors.priority}</p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Department
              </label>
              <input
                type="text"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., Quality"
              />
            </div>
          </div>
          
          {/* Info Box */}
          <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-700 dark:text-blue-300">
              <p className="font-medium mb-1">About Role Priority</p>
              <p className="text-blue-600 dark:text-blue-400">
                Priority determines role hierarchy. Lower numbers have higher authority.
                System Administrator = 1, Viewer = 100. Users with lower priority can manage users with higher priority numbers.
              </p>
            </div>
          </div>
        </form>
        
        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            {mode === 'edit' ? 'Save Changes' : 'Create Role'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ==================== Delete Confirmation Dialog ====================
interface DeleteConfirmDialogProps {
  role: Role | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const DeleteConfirmDialog: React.FC<DeleteConfirmDialogProps> = ({
  role,
  isOpen,
  onClose,
  onConfirm,
}) => {
  const [confirmText, setConfirmText] = useState('');
  
  if (!isOpen || !role) return null;
  
  const canDelete = confirmText === role.code;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-xl shadow-2xl overflow-hidden">
        <div className="p-6">
          <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 rounded-full bg-red-100 dark:bg-red-900/30">
            <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
          </div>
          
          <h3 className="text-lg font-semibold text-center text-slate-800 dark:text-slate-100 mb-2">
            Delete Role
          </h3>
          
          <p className="text-sm text-center text-slate-600 dark:text-slate-400 mb-4">
            Are you sure you want to delete the role <strong>{role.name}</strong>?
            This action cannot be undone.
          </p>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Type <code className="px-1 py-0.5 bg-slate-100 dark:bg-slate-800 rounded">{role.code}</code> to confirm
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-red-500 focus:border-transparent"
              placeholder={role.code}
            />
          </div>
        </div>
        
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={!canDelete}
            className="px-4 py-2 text-sm font-medium bg-red-600 hover:bg-red-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
          >
            Delete Role
          </button>
        </div>
      </div>
    </div>
  );
};

export default RoleList;

