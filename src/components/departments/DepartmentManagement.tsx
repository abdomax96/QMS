// ==================== Department Management Component ====================
// Food Industry (Biscuits Manufacturing) - Redesigned Module Assignment UI

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../config/supabase';
import {
  Building2,
  Box,
  ChevronRight,
  ChevronDown,
  Check,
  Search,
  Shield,
  Layers,
  Save,
  RefreshCw,
  ToggleLeft,
  ToggleRight,
  Filter,
  Grid3X3,
  List,
  CheckCircle2,
  Circle,
  Lock,
  Unlock,
  Eye,
  Settings2,
  Sparkles,
  Package,
  FileText,
  Award,
  Factory,
  Wrench,
  Truck,
  FlaskConical,
  Thermometer,
  Lightbulb,
  ShoppingCart,
  Users,
  Leaf,
  X,
  ChevronLeft,
} from 'lucide-react';

// Types
interface Department {
  id: string;
  code: string;
  name: string;
  name_ar?: string;
  description?: string;
  color: string;
  icon: string;
  is_active: boolean;
  display_order: number;
}

interface Module {
  id: string;
  code: string;
  name: string;
  name_ar?: string;
  category: string;
  icon: string;
  color: string;
  is_department_scoped: boolean;
  available_permissions: string[];
  is_ready?: boolean;
  development_status?: 'planned' | 'in_development' | 'ready';
}

// Ready modules list (modules that are fully developed)
const READY_MODULES = [
  'forms', 'documents', 'folders', 'reports', 'templates',  // Document Management
  'tasks',                                                    // Tasks
  'lab_tests', 'material_receiving', 'suppliers', 'raw_materials', // Lab
  'ncr', 'quarantine',                                        // NCR & Holds
  'settings', 'users', 'roles', 'departments',                // Settings
];

// Default departments (fallback when Supabase is empty)
import { SettingsSkeleton, InlineLoading } from '../common/LoadingStates';

const DEFAULT_DEPARTMENTS: Department[] = [
  { id: '1', code: 'EXEC', name: 'Executive Management', name_ar: 'الإدارة التنفيذية', color: '#1E3A8A', icon: 'Building2', is_active: true, display_order: 10 },
  { id: '2', code: 'ADMIN', name: 'Administration', name_ar: 'الإدارة', color: '#334155', icon: 'Building2', is_active: true, display_order: 20 },
  { id: '3', code: 'FIN', name: 'Finance', name_ar: 'المالية', color: '#0F766E', icon: 'Wallet', is_active: true, display_order: 30 },
  { id: '4', code: 'HR', name: 'Human Resources', name_ar: 'الموارد البشرية', color: '#6B7280', icon: 'Users', is_active: true, display_order: 40 },
  { id: '5', code: 'TRAIN', name: 'Training', name_ar: 'التدريب', color: '#64748B', icon: 'GraduationCap', is_active: true, display_order: 41 },
  { id: '6', code: 'IT', name: 'Information Technology', name_ar: 'تقنية المعلومات', color: '#374151', icon: 'Server', is_active: true, display_order: 50 },
  { id: '7', code: 'QA', name: 'Quality Assurance', name_ar: 'ضمان الجودة', color: '#047857', icon: 'Award', is_active: true, display_order: 60 },
  { id: '8', code: 'QC', name: 'Quality Control', name_ar: 'مراقبة الجودة', color: '#059669', icon: 'CheckCircle', is_active: true, display_order: 61 },
  { id: '9', code: 'FS', name: 'Food Safety', name_ar: 'سلامة الغذاء', color: '#DC2626', icon: 'ShieldAlert', is_active: true, display_order: 70 },
  { id: '10', code: 'SAN', name: 'Sanitation', name_ar: 'النظافة والتعقيم', color: '#0EA5E9', icon: 'Sparkles', is_active: true, display_order: 71 },
  { id: '11', code: 'LAB', name: 'Laboratory', name_ar: 'المختبر', color: '#BE185D', icon: 'FlaskConical', is_active: true, display_order: 80 },
  { id: '12', code: 'MICRO', name: 'Microbiology', name_ar: 'الأحياء الدقيقة', color: '#C026D3', icon: 'Microscope', is_active: true, display_order: 81 },
  { id: '13', code: 'RND', name: 'Research & Development', name_ar: 'البحث والتطوير', color: '#A855F7', icon: 'Lightbulb', is_active: true, display_order: 90 },
  { id: '14', code: 'PROD', name: 'Production', name_ar: 'الإنتاج', color: '#B45309', icon: 'Factory', is_active: true, display_order: 100 },
  { id: '15', code: 'MIXING', name: 'Mixing & Dough', name_ar: 'الخلط والعجين', color: '#D97706', icon: 'Blend', is_active: true, display_order: 101 },
  { id: '16', code: 'BAKING', name: 'Baking & Oven', name_ar: 'الخبز والفرن', color: '#EA580C', icon: 'Flame', is_active: true, display_order: 102 },
  { id: '17', code: 'PACKING', name: 'Packaging', name_ar: 'التعبئة والتغليف', color: '#F59E0B', icon: 'Package', is_active: true, display_order: 103 },
  { id: '18', code: 'MAINT', name: 'Maintenance', name_ar: 'الصيانة', color: '#7C3AED', icon: 'Wrench', is_active: true, display_order: 110 },
  { id: '19', code: 'UTIL', name: 'Utilities', name_ar: 'المرافق', color: '#6D28D9', icon: 'Cog', is_active: true, display_order: 111 },
  { id: '20', code: 'WH', name: 'Warehouse', name_ar: 'المستودع', color: '#0E7490', icon: 'Warehouse', is_active: true, display_order: 120 },
  { id: '21', code: 'PROC', name: 'Procurement', name_ar: 'المشتريات', color: '#0369A1', icon: 'ShoppingCart', is_active: true, display_order: 121 },
  { id: '22', code: 'LOG', name: 'Logistics', name_ar: 'اللوجستيات', color: '#0891B2', icon: 'Truck', is_active: true, display_order: 122 },
  { id: '23', code: 'SALES', name: 'Sales', name_ar: 'المبيعات', color: '#F97316', icon: 'ShoppingBag', is_active: true, display_order: 130 },
  { id: '24', code: 'MKT', name: 'Marketing', name_ar: 'التسويق', color: '#DB2777', icon: 'Megaphone', is_active: true, display_order: 131 },
];

// Default modules (fallback when Supabase is empty)
const DEFAULT_MODULES: Module[] = [
  // Document Management - Ready
  { id: '1', code: 'forms', name: 'Forms & Checklists', name_ar: 'النماذج والقوائم', category: 'document_management', icon: 'ClipboardList', color: '#3B82F6', is_department_scoped: true, available_permissions: ['view', 'create', 'edit', 'delete'] },
  { id: '2', code: 'documents', name: 'Document Library', name_ar: 'مكتبة الوثائق', category: 'document_management', icon: 'FileText', color: '#10B981', is_department_scoped: true, available_permissions: ['view', 'create', 'edit', 'delete'] },
  { id: '3', code: 'folders', name: 'Folder Structure', name_ar: 'هيكل المجلدات', category: 'document_management', icon: 'FolderTree', color: '#F59E0B', is_department_scoped: true, available_permissions: ['view', 'create', 'edit', 'delete'] },
  { id: '4', code: 'reports', name: 'Reports & Analytics', name_ar: 'التقارير والتحليلات', category: 'document_management', icon: 'BarChart3', color: '#8B5CF6', is_department_scoped: true, available_permissions: ['view', 'create', 'export'] },
  { id: '5', code: 'templates', name: 'Document Templates', name_ar: 'قوالب الوثائق', category: 'document_management', icon: 'FileCode', color: '#6366F1', is_department_scoped: true, available_permissions: ['view', 'create', 'edit', 'delete'] },

  // Core System - Ready
  { id: '6', code: 'tasks', name: 'Task Management', name_ar: 'إدارة المهام', category: 'core_system', icon: 'CheckCircle', color: '#10B981', is_department_scoped: true, available_permissions: ['view', 'create', 'edit', 'delete'] },
  { id: '7', code: 'settings', name: 'System Settings', name_ar: 'إعدادات النظام', category: 'core_system', icon: 'Settings', color: '#6B7280', is_department_scoped: false, available_permissions: ['view', 'edit'] },
  { id: '8', code: 'users', name: 'User Management', name_ar: 'إدارة المستخدمين', category: 'core_system', icon: 'Users', color: '#06B6D4', is_department_scoped: false, available_permissions: ['view', 'create', 'edit', 'delete'] },
  { id: '9', code: 'roles', name: 'Roles & Permissions', name_ar: 'الأدوار والصلاحيات', category: 'core_system', icon: 'Shield', color: '#EC4899', is_department_scoped: false, available_permissions: ['view', 'create', 'edit', 'delete'] },
  { id: '10', code: 'departments', name: 'Departments', name_ar: 'الأقسام', category: 'core_system', icon: 'Building2', color: '#8B5CF6', is_department_scoped: false, available_permissions: ['view', 'create', 'edit', 'delete'] },

  // Quality Management - Ready
  { id: '11', code: 'ncr', name: 'Non-Conformance Reports', name_ar: 'تقارير عدم المطابقة', category: 'quality_management', icon: 'XCircle', color: '#DC2626', is_department_scoped: true, available_permissions: ['view', 'create', 'edit', 'delete', 'approve'] },
  { id: '12', code: 'quarantine', name: 'Quarantine', name_ar: 'المحتجزات', category: 'inventory', icon: 'Lock', color: '#EF4444', is_department_scoped: true, available_permissions: ['view', 'create', 'edit', 'release'] },

  // Laboratory - Ready
  { id: '13', code: 'lab_tests', name: 'Laboratory Tests', name_ar: 'الاختبارات المعملية', category: 'laboratory', icon: 'FlaskConical', color: '#8B5CF6', is_department_scoped: true, available_permissions: ['view', 'create', 'edit', 'delete', 'approve'] },
  { id: '14', code: 'material_receiving', name: 'Material Receiving', name_ar: 'استلام المواد', category: 'inventory', icon: 'PackageCheck', color: '#10B981', is_department_scoped: true, available_permissions: ['view', 'create', 'edit', 'delete', 'release'] },
  { id: '15', code: 'suppliers', name: 'Supplier Directory', name_ar: 'دليل الموردين', category: 'supplier_management', icon: 'Building2', color: '#6B7280', is_department_scoped: true, available_permissions: ['view', 'create', 'edit', 'delete'] },
  { id: '16', code: 'raw_materials', name: 'Raw Materials', name_ar: 'المواد الخام', category: 'inventory', icon: 'Boxes', color: '#EC4899', is_department_scoped: true, available_permissions: ['view', 'create', 'edit', 'delete'] },

  // Quality Management - In Development
  { id: '17', code: 'capa', name: 'CAPA', name_ar: 'الإجراءات التصحيحية', category: 'quality_management', icon: 'AlertTriangle', color: '#EF4444', is_department_scoped: true, available_permissions: ['view', 'create', 'edit', 'delete', 'approve'] },
  { id: '18', code: 'deviations', name: 'Deviations', name_ar: 'الانحرافات', category: 'quality_management', icon: 'TrendingDown', color: '#F59E0B', is_department_scoped: true, available_permissions: ['view', 'create', 'edit', 'delete', 'approve'] },
  { id: '19', code: 'internal_audits', name: 'Internal Audits', name_ar: 'التدقيق الداخلي', category: 'quality_management', icon: 'ClipboardCheck', color: '#10B981', is_department_scoped: true, available_permissions: ['view', 'create', 'edit', 'delete', 'approve'] },

  // Manufacturing - In Development
  { id: '20', code: 'production_orders', name: 'Production Orders', name_ar: 'أوامر الإنتاج', category: 'manufacturing', icon: 'Factory', color: '#10B981', is_department_scoped: true, available_permissions: ['view', 'create', 'edit', 'delete', 'approve'] },
  { id: '21', code: 'batch_records', name: 'Batch Records', name_ar: 'سجلات الدُفعات', category: 'manufacturing', icon: 'Layers', color: '#3B82F6', is_department_scoped: true, available_permissions: ['view', 'create', 'edit', 'delete', 'approve'] },

  // Maintenance - In Development
  { id: '22', code: 'equipment', name: 'Equipment Master', name_ar: 'بيانات المعدات', category: 'maintenance', icon: 'Cog', color: '#6B7280', is_department_scoped: true, available_permissions: ['view', 'create', 'edit', 'delete'] },
  { id: '23', code: 'preventive_maintenance', name: 'Preventive Maintenance', name_ar: 'الصيانة الوقائية', category: 'maintenance', icon: 'Wrench', color: '#F59E0B', is_department_scoped: true, available_permissions: ['view', 'create', 'edit', 'delete', 'approve'] },
  { id: '24', code: 'calibration', name: 'Calibration', name_ar: 'المعايرة', category: 'maintenance', icon: 'Ruler', color: '#8B5CF6', is_department_scoped: true, available_permissions: ['view', 'create', 'edit', 'delete', 'approve'] },

  // Food Safety - In Development
  { id: '25', code: 'haccp', name: 'HACCP Plans', name_ar: 'خطط الهاسب', category: 'food_safety', icon: 'Thermometer', color: '#EF4444', is_department_scoped: true, available_permissions: ['view', 'create', 'edit', 'delete', 'approve'] },
  { id: '26', code: 'sanitation', name: 'Sanitation Records', name_ar: 'سجلات التعقيم', category: 'food_safety', icon: 'Sparkles', color: '#06B6D4', is_department_scoped: true, available_permissions: ['view', 'create', 'edit', 'delete', 'approve'] },
  { id: '27', code: 'allergen', name: 'Allergen Management', name_ar: 'إدارة مسببات الحساسية', category: 'food_safety', icon: 'AlertTriangle', color: '#F59E0B', is_department_scoped: true, available_permissions: ['view', 'create', 'edit', 'delete'] },

  // Training - In Development
  { id: '28', code: 'training', name: 'Training Records', name_ar: 'سجلات التدريب', category: 'training', icon: 'GraduationCap', color: '#3B82F6', is_department_scoped: true, available_permissions: ['view', 'create', 'edit', 'delete', 'approve'] },
  { id: '29', code: 'competency', name: 'Competency Assessment', name_ar: 'تقييم الكفاءة', category: 'training', icon: 'Award', color: '#10B981', is_department_scoped: true, available_permissions: ['view', 'create', 'edit', 'delete', 'approve'] },
];

interface DepartmentModule {
  id: string;
  department_id: string;
  module_code: string;
  is_enabled: boolean;
  granted_actions: string[];  // Changed from granted_permissions
  stage_code?: string;        // New field from Phase 1
  visibility_departments?: string[];  // New field from Phase 1
}

// Category Icons
const getCategoryIcon = (category: string) => {
  const icons: Record<string, React.ReactNode> = {
    core_system: <Settings2 className="w-4 h-4" />,
    document_management: <FileText className="w-4 h-4" />,
    quality_management: <Award className="w-4 h-4" />,
    training: <Users className="w-4 h-4" />,
    manufacturing: <Factory className="w-4 h-4" />,
    maintenance: <Wrench className="w-4 h-4" />,
    inventory: <Package className="w-4 h-4" />,
    supplier_management: <Truck className="w-4 h-4" />,
    laboratory: <FlaskConical className="w-4 h-4" />,
    food_safety: <Thermometer className="w-4 h-4" />,
    rnd: <Lightbulb className="w-4 h-4" />,
    sales: <ShoppingCart className="w-4 h-4" />,
    hr: <Users className="w-4 h-4" />,
    environmental: <Leaf className="w-4 h-4" />,
  };
  return icons[category] || <Box className="w-4 h-4" />;
};

// Module Categories
const MODULE_CATEGORIES: Record<string, { name: string; name_ar: string; color: string; gradient: string }> = {
  core_system: { name: 'Core System', name_ar: 'النظام الأساسي', color: '#3B82F6', gradient: 'from-blue-500 to-blue-600' },
  document_management: { name: 'Documents', name_ar: 'الوثائق', color: '#10B981', gradient: 'from-emerald-500 to-emerald-600' },
  quality_management: { name: 'Quality', name_ar: 'الجودة', color: '#EF4444', gradient: 'from-red-500 to-red-600' },
  training: { name: 'Training', name_ar: 'التدريب', color: '#8B5CF6', gradient: 'from-violet-500 to-violet-600' },
  manufacturing: { name: 'Manufacturing', name_ar: 'التصنيع', color: '#F59E0B', gradient: 'from-amber-500 to-amber-600' },
  maintenance: { name: 'Maintenance', name_ar: 'الصيانة', color: '#6B7280', gradient: 'from-gray-500 to-gray-600' },
  inventory: { name: 'Inventory', name_ar: 'المخزون', color: '#06B6D4', gradient: 'from-cyan-500 to-cyan-600' },
  supplier_management: { name: 'Suppliers', name_ar: 'الموردين', color: '#EC4899', gradient: 'from-pink-500 to-pink-600' },
  laboratory: { name: 'Laboratory', name_ar: 'المختبر', color: '#7C3AED', gradient: 'from-purple-500 to-purple-600' },
  food_safety: { name: 'Food Safety', name_ar: 'سلامة الغذاء', color: '#DC2626', gradient: 'from-rose-500 to-rose-600' },
  rnd: { name: 'R&D', name_ar: 'البحث والتطوير', color: '#F472B6', gradient: 'from-pink-400 to-pink-500' },
  sales: { name: 'Sales', name_ar: 'المبيعات', color: '#F97316', gradient: 'from-orange-500 to-orange-600' },
  hr: { name: 'HR', name_ar: 'الموارد البشرية', color: '#64748B', gradient: 'from-slate-500 to-slate-600' },
  environmental: { name: 'Environmental', name_ar: 'البيئة', color: '#22C55E', gradient: 'from-green-500 to-green-600' },
};

export default function DepartmentManagement() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [departmentModules, setDepartmentModules] = useState<DepartmentModule[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<Map<string, boolean>>(new Map());
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filterEnabled, setFilterEnabled] = useState<'all' | 'enabled' | 'disabled'>('all');
  const [filterReady, setFilterReady] = useState<'all' | 'ready' | 'development'>('all');

  // Fetch data on mount
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [deptRes, modRes, dmRes] = await Promise.all([
        supabase.from('departments').select('id, code, name, name_ar, description, color, icon, is_active, display_order').order('display_order'),
        supabase.from('app_modules').select('id, code, name, name_ar, category, icon, color, is_department_scoped, available_permissions, is_ready, development_status, is_active, display_order').eq('is_active', true).order('display_order'),
        supabase.from('department_module_access').select('id, department_id, module_code, is_enabled, granted_actions, stage_code, visibility_departments'),
      ]);

      // Use data from Supabase or fallback to defaults
      if (deptRes.data && deptRes.data.length > 0) {
        setDepartments(deptRes.data);
      } else {
        // Fallback default departments
        setDepartments(DEFAULT_DEPARTMENTS);
      }

      if (modRes.data && modRes.data.length > 0) {
        setModules(modRes.data);
      } else {
        // Fallback default modules
        setModules(DEFAULT_MODULES);
      }

      if (dmRes.data) {
        // Map field names from new schema
        setDepartmentModules(dmRes.data.map((dm: any) => ({
          ...dm,
          granted_actions: dm.granted_actions || ['view'],
        })));
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      // On error, use fallback data
      setDepartments(DEFAULT_DEPARTMENTS);
      setModules(DEFAULT_MODULES);
    } finally {
      setLoading(false);
    }
  };

  // Get module status for selected department
  const getDepartmentModuleStatus = (moduleCode: string): boolean => {
    if (!selectedDepartment) return false;
    const key = `${selectedDepartment.id}-${moduleCode}`;
    if (pendingChanges.has(key)) return pendingChanges.get(key)!;
    const dm = departmentModules.find(
      d => d.department_id === selectedDepartment.id && d.module_code === moduleCode
    );
    return dm?.is_enabled ?? false;
  };

  // Toggle module
  const toggleModule = (moduleCode: string) => {
    if (!selectedDepartment) return;
    const key = `${selectedDepartment.id}-${moduleCode}`;
    const currentStatus = getDepartmentModuleStatus(moduleCode);
    setPendingChanges(prev => new Map(prev).set(key, !currentStatus));
  };

  // Enable all modules in category
  const enableAllInCategory = (category: string) => {
    if (!selectedDepartment) return;
    const categoryModules = modules.filter(m => m.category === category);
    setPendingChanges(prev => {
      const next = new Map(prev);
      categoryModules.forEach(m => {
        next.set(`${selectedDepartment.id}-${m.code}`, true);
      });
      return next;
    });
  };

  // Disable all modules in category
  const disableAllInCategory = (category: string) => {
    if (!selectedDepartment) return;
    const categoryModules = modules.filter(m => m.category === category);
    setPendingChanges(prev => {
      const next = new Map(prev);
      categoryModules.forEach(m => {
        next.set(`${selectedDepartment.id}-${m.code}`, false);
      });
      return next;
    });
  };

  // Save changes
  const saveChanges = async () => {
    if (!selectedDepartment || pendingChanges.size === 0) return;
    setSaving(true);
    try {
      for (const [key, enabled] of pendingChanges) {
        const [deptId, moduleCode] = key.split('-');
        const module = modules.find(m => m.code === moduleCode);

        const { data: existing } = await supabase
          .from('department_module_access')  // Changed from 'department_modules'
          .select('id')
          .eq('department_id', deptId)
          .eq('module_code', moduleCode)
          .is('stage_code', null)  // Only match records without stage_code for module-level access
          .maybeSingle();

        if (existing) {
          await supabase
            .from('department_module_access')  // Changed from 'department_modules'
            .update({
              is_enabled: enabled,
              granted_actions: module?.available_permissions || ['view'],  // Changed field name
              updated_at: new Date().toISOString(),
            })
            .eq('id', existing.id);
        } else if (enabled) {
          await supabase
            .from('department_module_access')  // Changed from 'department_modules'
            .insert({
              department_id: deptId,
              module_code: moduleCode,
              is_enabled: true,
              granted_actions: module?.available_permissions || ['view'],  // Changed field name
            });
        }
      }
      await fetchData();
      setPendingChanges(new Map());
    } catch (error) {
      console.error('Error saving changes:', error);
    } finally {
      setSaving(false);
    }
  };

  // Group modules by category
  const groupedModules = useMemo(() => {
    return modules.reduce((acc, module) => {
      const category = module.category || 'other';
      if (!acc[category]) acc[category] = [];
      acc[category].push(module);
      return acc;
    }, {} as Record<string, Module[]>);
  }, [modules]);

  // Get filtered modules
  const getFilteredModules = (categoryModules: Module[]) => {
    let filtered = categoryModules;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(m =>
        m.name.toLowerCase().includes(term) ||
        m.name_ar?.toLowerCase().includes(term) ||
        m.code.toLowerCase().includes(term)
      );
    }

    if (filterEnabled !== 'all' && selectedDepartment) {
      filtered = filtered.filter(m => {
        const isEnabled = getDepartmentModuleStatus(m.code);
        return filterEnabled === 'enabled' ? isEnabled : !isEnabled;
      });
    }

    // Filter by ready status
    if (filterReady !== 'all') {
      filtered = filtered.filter(m => {
        const isReady = READY_MODULES.includes(m.code);
        return filterReady === 'ready' ? isReady : !isReady;
      });
    }

    return filtered;
  };

  // Count stats
  const countEnabledModules = (deptId: string) =>
    departmentModules.filter(dm => dm.department_id === deptId && dm.is_enabled).length;

  const getCategoryStats = (category: string) => {
    if (!selectedDepartment) return { enabled: 0, total: 0 };
    const categoryModules = groupedModules[category] || [];
    const enabled = categoryModules.filter(m => getDepartmentModuleStatus(m.code)).length;
    return { enabled, total: categoryModules.length };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-gradient-to-br from-slate-50 to-slate-100 dark:from-gray-900 dark:to-gray-800">
        <div className="p-8">
          <SettingsSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full bg-gradient-to-br from-slate-50 to-slate-100 dark:from-gray-900 dark:to-gray-800">
      {/* Right Sidebar - Departments */}
      <div className="w-72 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 flex flex-col shadow-lg">
        {/* Header */}
        <div className="p-4 bg-gradient-to-l from-blue-600 to-indigo-600 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold">الأقسام</h2>
              <p className="text-xs text-blue-100">{departments.length} قسم</p>
            </div>
          </div>
        </div>

        {/* Department List */}
        <div className="flex-1 overflow-y-auto p-2">
          {departments.map(dept => {
            const enabledCount = countEnabledModules(dept.id);
            const isSelected = selectedDepartment?.id === dept.id;

            return (
              <button
                key={dept.id}
                onClick={() => {
                  setSelectedDepartment(dept);
                  setSelectedCategory(null);
                }}
                className={`w-full text-right p-3 rounded-xl mb-2 transition-all duration-200 group ${isSelected
                  ? 'bg-gradient-to-l from-blue-500 to-indigo-500 text-white shadow-lg shadow-blue-500/25'
                  : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                  }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${isSelected ? 'bg-white/20' : 'bg-gray-100 dark:bg-gray-700'
                      }`}
                    style={{ backgroundColor: isSelected ? undefined : `${dept.color}15` }}
                  >
                    <Building2
                      className="w-5 h-5"
                      style={{ color: isSelected ? 'white' : dept.color }}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className={`font-medium text-sm truncate ${isSelected ? 'text-white' : 'text-gray-900 dark:text-white'
                        }`}>
                        {dept.name_ar || dept.name}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${isSelected
                        ? 'bg-white/20 text-white'
                        : enabledCount > 0
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-500'
                        }`}>
                        {enabledCount}
                      </span>
                    </div>
                    <p className={`text-xs mt-0.5 truncate ${isSelected ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'
                      }`}>
                      {dept.code}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Middle - Category Sidebar */}
      {selectedDepartment && (
        <div className="w-56 bg-white/80 dark:bg-gray-800/80 backdrop-blur border-l border-gray-200 dark:border-gray-700 flex flex-col">
          <div className="p-3 border-b border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold text-gray-900 dark:text-white text-sm">التصنيفات</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {/* All Modules */}
            <button
              onClick={() => setSelectedCategory(null)}
              className={`w-full text-right p-2.5 rounded-lg mb-1 transition-all flex items-center gap-2 ${selectedCategory === null
                ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                : 'hover:bg-gray-50 dark:hover:bg-gray-700/50 text-gray-700 dark:text-gray-300'
                }`}
            >
              <Grid3X3 className="w-4 h-4" />
              <span className="flex-1 text-sm">جميع الوحدات</span>
              <span className="text-xs bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded">
                {modules.length}
              </span>
            </button>

            <div className="my-2 border-t border-gray-200 dark:border-gray-700" />

            {/* Categories */}
            {Object.entries(groupedModules).map(([category, categoryModules]) => {
              const categoryInfo = MODULE_CATEGORIES[category] || { name: category, name_ar: category, color: '#6B7280' };
              const stats = getCategoryStats(category);
              const isSelected = selectedCategory === category;

              return (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`w-full text-right p-2.5 rounded-lg mb-1 transition-all ${isSelected
                    ? 'bg-gradient-to-l text-white shadow-md'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                    }`}
                  style={isSelected ? {
                    backgroundImage: `linear-gradient(to left, ${categoryInfo.color}, ${categoryInfo.color}dd)`
                  } : undefined}
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${isSelected ? 'bg-white/20' : ''
                      }`} style={{ backgroundColor: isSelected ? undefined : `${categoryInfo.color}15` }}>
                      <span style={{ color: isSelected ? 'white' : categoryInfo.color }}>
                        {getCategoryIcon(category)}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${isSelected ? 'text-white' : 'text-gray-900 dark:text-white'
                        }`}>
                        {categoryInfo.name_ar}
                      </p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <div className={`flex-1 h-1 rounded-full ${isSelected ? 'bg-white/30' : 'bg-gray-200 dark:bg-gray-600'
                          }`}>
                          <div
                            className={`h-full rounded-full ${isSelected ? 'bg-white' : ''}`}
                            style={{
                              width: `${stats.total > 0 ? (stats.enabled / stats.total) * 100 : 0}%`,
                              backgroundColor: isSelected ? undefined : categoryInfo.color
                            }}
                          />
                        </div>
                        <span className={`text-[10px] ${isSelected ? 'text-white/80' : 'text-gray-500'
                          }`}>
                          {stats.enabled}/{stats.total}
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {selectedDepartment ? (
          <>
            {/* Header */}
            <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: `${selectedDepartment.color}15` }}
                  >
                    <Building2 className="w-6 h-6" style={{ color: selectedDepartment.color }} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                      {selectedDepartment.name_ar || selectedDepartment.name}
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {selectedCategory
                        ? MODULE_CATEGORIES[selectedCategory]?.name_ar || selectedCategory
                        : 'جميع الوحدات'
                      } • {
                        selectedCategory
                          ? getFilteredModules(groupedModules[selectedCategory] || []).length
                          : modules.length
                      } وحدة
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="بحث..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pr-9 pl-4 py-2 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white text-sm w-48 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  {/* Filter by Status */}
                  <select
                    value={filterEnabled}
                    onChange={(e) => setFilterEnabled(e.target.value as any)}
                    className="px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">الكل</option>
                    <option value="enabled">المفعّلة</option>
                    <option value="disabled">المعطّلة</option>
                  </select>

                  {/* Filter by Ready Status */}
                  <select
                    value={filterReady}
                    onChange={(e) => setFilterReady(e.target.value as any)}
                    className="px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">كل الوحدات</option>
                    <option value="ready">الجاهزة فقط</option>
                    <option value="development">قيد التطوير</option>
                  </select>

                  {/* View Mode */}
                  <div className="flex bg-gray-100 dark:bg-gray-700 rounded-xl p-1">
                    <button
                      onClick={() => setViewMode('grid')}
                      className={`p-2 rounded-lg transition-all ${viewMode === 'grid'
                        ? 'bg-white dark:bg-gray-600 shadow-sm'
                        : 'hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                    >
                      <Grid3X3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setViewMode('list')}
                      className={`p-2 rounded-lg transition-all ${viewMode === 'list'
                        ? 'bg-white dark:bg-gray-600 shadow-sm'
                        : 'hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                    >
                      <List className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Save Button */}
                  {pendingChanges.size > 0 && (
                    <button
                      onClick={saveChanges}
                      disabled={saving}
                      className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-l from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl transition-all shadow-lg shadow-blue-500/25 disabled:opacity-50"
                    >
                      {saving ? (
                        <InlineLoading text="" className="text-white" />
                      ) : (
                        <Save className="w-4 h-4" />
                      )}
                      <span>حفظ ({pendingChanges.size})</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Modules Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {(selectedCategory ? [selectedCategory] : Object.keys(groupedModules)).map(category => {
                const categoryModules = groupedModules[category] || [];
                const filteredModules = getFilteredModules(categoryModules);
                if (filteredModules.length === 0) return null;

                const categoryInfo = MODULE_CATEGORIES[category] || { name: category, name_ar: category, color: '#6B7280' };
                const stats = getCategoryStats(category);

                return (
                  <div key={category} className="mb-6">
                    {/* Category Header - Only show if viewing all */}
                    {!selectedCategory && (
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center"
                            style={{ backgroundColor: `${categoryInfo.color}15` }}
                          >
                            <span style={{ color: categoryInfo.color }}>
                              {getCategoryIcon(category)}
                            </span>
                          </div>
                          <div>
                            <h3 className="font-bold text-gray-900 dark:text-white">
                              {categoryInfo.name_ar}
                            </h3>
                            <p className="text-xs text-gray-500">
                              {stats.enabled} من {stats.total} مفعّل
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => enableAllInCategory(category)}
                            className="text-xs px-3 py-1.5 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/50 transition-colors"
                          >
                            تفعيل الكل
                          </button>
                          <button
                            onClick={() => disableAllInCategory(category)}
                            className="text-xs px-3 py-1.5 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors"
                          >
                            إلغاء الكل
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Modules Grid/List */}
                    <div className={viewMode === 'grid'
                      ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3'
                      : 'space-y-2'
                    }>
                      {filteredModules.map(module => {
                        const isEnabled = getDepartmentModuleStatus(module.code);
                        const key = `${selectedDepartment.id}-${module.code}`;
                        const hasChange = pendingChanges.has(key);

                        const isReadyList = READY_MODULES.includes(module.code);

                        if (viewMode === 'list') {
                          return (
                            <div
                              key={module.id}
                              onClick={() => toggleModule(module.code)}
                              className={`flex items-center gap-4 p-4 bg-white dark:bg-gray-800 rounded-xl border-2 cursor-pointer transition-all hover:shadow-md ${isEnabled
                                ? 'border-green-400 dark:border-green-500'
                                : 'border-gray-200 dark:border-gray-700'
                                } ${hasChange ? 'ring-2 ring-yellow-400' : ''} ${!isReadyList ? 'opacity-60' : ''}`}
                            >
                              <div
                                className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${!isReadyList ? 'grayscale-[30%]' : ''}`}
                                style={{ backgroundColor: `${module.color}15` }}
                              >
                                <Box className="w-5 h-5" style={{ color: module.color }} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className={`font-medium truncate ${isReadyList ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>
                                    {module.name_ar || module.name}
                                  </p>
                                  {isReadyList ? (
                                    <span className="text-[9px] px-1.5 py-0.5 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 rounded font-medium flex-shrink-0">
                                      جاهز
                                    </span>
                                  ) : (
                                    <span className="text-[9px] px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 rounded font-medium flex-shrink-0">
                                      قيد التطوير
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                  {module.code}
                                </p>
                              </div>
                              <div className="flex items-center gap-3">
                                {module.is_department_scoped && (
                                  <span className="text-xs px-2 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg flex items-center gap-1">
                                    <Lock className="w-3 h-3" />
                                    معزول
                                  </span>
                                )}
                                <div className={`w-12 h-7 rounded-full p-1 transition-all cursor-pointer ${isEnabled
                                  ? 'bg-green-500'
                                  : 'bg-gray-300 dark:bg-gray-600'
                                  }`}>
                                  <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${isEnabled ? 'translate-x-0' : 'translate-x-5'
                                    }`} />
                                </div>
                              </div>
                            </div>
                          );
                        }

                        const isReady = READY_MODULES.includes(module.code);

                        return (
                          <div
                            key={module.id}
                            onClick={() => toggleModule(module.code)}
                            className={`relative p-4 bg-white dark:bg-gray-800 rounded-xl border-2 cursor-pointer transition-all hover:shadow-lg group ${isEnabled
                              ? 'border-green-400 dark:border-green-500 shadow-green-100 dark:shadow-green-900/20'
                              : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                              } ${hasChange ? 'ring-2 ring-yellow-400 ring-offset-2' : ''} ${!isReady ? 'opacity-60' : ''}`}
                          >
                            {/* Status indicator */}
                            <div className={`absolute top-3 left-3 w-3 h-3 rounded-full ${isEnabled ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
                              }`}>
                              {isEnabled && (
                                <div className="absolute inset-0 rounded-full bg-green-500 animate-ping opacity-50" />
                              )}
                            </div>

                            {/* Ready/Development Badge */}
                            <div className="absolute top-3 right-3">
                              {isReady ? (
                                <span className="text-[9px] px-1.5 py-0.5 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 rounded font-medium">
                                  جاهز
                                </span>
                              ) : (
                                <span className="text-[9px] px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 rounded font-medium">
                                  قيد التطوير
                                </span>
                              )}
                            </div>

                            <div className="flex items-start gap-3 mt-4">
                              <div
                                className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-all ${isEnabled ? 'scale-105' : 'group-hover:scale-105'
                                  } ${!isReady ? 'grayscale-[30%]' : ''}`}
                                style={{ backgroundColor: `${module.color}${isEnabled ? '25' : '15'}` }}
                              >
                                <Box className="w-5 h-5" style={{ color: module.color }} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className={`font-semibold text-sm truncate ${isReady ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>
                                  {module.name_ar || module.name}
                                </p>
                                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 font-mono truncate">
                                  {module.code}
                                </p>
                              </div>
                            </div>

                            <div className="mt-3 flex items-center justify-between">
                              <div className="flex items-center gap-1.5">
                                {module.is_department_scoped ? (
                                  <span className="text-[10px] px-2 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-md flex items-center gap-1">
                                    <Lock className="w-3 h-3" />
                                    بيانات معزولة
                                  </span>
                                ) : (
                                  <span className="text-[10px] px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-md flex items-center gap-1">
                                    <Unlock className="w-3 h-3" />
                                    مشترك
                                  </span>
                                )}
                              </div>

                              <div className={`flex items-center gap-1 text-xs ${isEnabled ? 'text-green-600 dark:text-green-400' : 'text-gray-400'
                                }`}>
                                {isEnabled ? (
                                  <>
                                    <CheckCircle2 className="w-4 h-4" />
                                    <span>مفعّل</span>
                                  </>
                                ) : (
                                  <>
                                    <Circle className="w-4 h-4" />
                                    <span>معطّل</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer Stats */}
            <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-6 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-6 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
                      <Box className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">الإجمالي</p>
                      <p className="font-bold text-gray-900 dark:text-white">{modules.length}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center">
                      <Sparkles className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">جاهزة</p>
                      <p className="font-bold text-emerald-600">{modules.filter(m => READY_MODULES.includes(m.code)).length}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center">
                      <Settings2 className="w-4 h-4 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">قيد التطوير</p>
                      <p className="font-bold text-amber-600">{modules.filter(m => !READY_MODULES.includes(m.code)).length}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-green-50 dark:bg-green-900/30 flex items-center justify-center">
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">المفعّلة للقسم</p>
                      <p className="font-bold text-green-600">{countEnabledModules(selectedDepartment.id)}</p>
                    </div>
                  </div>
                </div>

                {pendingChanges.size > 0 && (
                  <div className="flex items-center gap-2 text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/30 px-4 py-2 rounded-xl">
                    <span className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
                    <span className="text-sm font-medium">{pendingChanges.size} تغييرات غير محفوظة</span>
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          // Empty State
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-3xl flex items-center justify-center mb-6">
              <Layers className="w-12 h-12 text-blue-500" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              اختر قسماً للبدء
            </h3>
            <p className="text-gray-500 dark:text-gray-400 max-w-md">
              اختر قسماً من القائمة الجانبية لعرض وتعديل الوحدات والصلاحيات المتاحة له
            </p>
            <div className="mt-8 flex items-center gap-4 text-sm text-gray-400">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                <span>{departments.length} قسم</span>
              </div>
              <div className="w-1 h-1 rounded-full bg-gray-300" />
              <div className="flex items-center gap-2">
                <Box className="w-4 h-4" />
                <span>{modules.length} وحدة</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
