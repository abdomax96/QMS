// ==================== Department Store ====================
// Manages department context and data isolation
// Food Industry (Biscuits Manufacturing)

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Department, Section, Module, DepartmentModule, UserDepartment } from '../types/department';

interface DepartmentState {
  // Current context
  currentDepartmentId: string | null;
  currentSectionId: string | null;
  
  // User's departments
  userDepartments: UserDepartment[];
  primaryDepartmentId: string | null;
  
  // All data
  departments: Department[];
  sections: Section[];
  modules: Module[];
  departmentModules: DepartmentModule[];
  
  // UI State
  isLoading: boolean;
  error: string | null;
  
  // Actions
  setCurrentDepartment: (departmentId: string | null) => void;
  setCurrentSection: (sectionId: string | null) => void;
  setUserDepartments: (departments: UserDepartment[]) => void;
  setDepartments: (departments: Department[]) => void;
  setSections: (sections: Section[]) => void;
  setModules: (modules: Module[]) => void;
  setDepartmentModules: (modules: DepartmentModule[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  
  // Computed
  getCurrentDepartment: () => Department | null;
  getCurrentSection: () => Section | null;
  getDepartmentModules: (departmentId?: string) => Module[];
  canAccessModule: (moduleCode: string, permission?: string, departmentId?: string) => boolean;
  getSectionsForDepartment: (departmentId: string) => Section[];
  isAdmin: () => boolean;
  canSwitchDepartment: () => boolean;
  
  // Reset
  reset: () => void;
}

const initialState = {
  currentDepartmentId: null,
  currentSectionId: null,
  userDepartments: [],
  primaryDepartmentId: null,
  departments: [],
  sections: [],
  modules: [],
  departmentModules: [],
  isLoading: false,
  error: null,
};

export const useDepartmentStore = create<DepartmentState>()(
  persist(
    (set, get) => ({
      ...initialState,
      
      // Actions
      setCurrentDepartment: (departmentId) => {
        set({ currentDepartmentId: departmentId, currentSectionId: null });
      },
      
      setCurrentSection: (sectionId) => {
        set({ currentSectionId: sectionId });
      },
      
      setUserDepartments: (departments) => {
        const primary = departments.find(d => d.is_primary);
        set({ 
          userDepartments: departments,
          primaryDepartmentId: primary?.department_id || departments[0]?.department_id || null,
          currentDepartmentId: get().currentDepartmentId || primary?.department_id || departments[0]?.department_id || null,
        });
      },
      
      setDepartments: (departments) => set({ departments }),
      setSections: (sections) => set({ sections }),
      setModules: (modules) => set({ modules }),
      setDepartmentModules: (modules) => set({ departmentModules: modules }),
      setLoading: (loading) => set({ isLoading: loading }),
      setError: (error) => set({ error }),
      
      // Computed
      getCurrentDepartment: () => {
        const { currentDepartmentId, departments } = get();
        return departments.find(d => d.id === currentDepartmentId) || null;
      },
      
      getCurrentSection: () => {
        const { currentSectionId, sections } = get();
        return sections.find(s => s.id === currentSectionId) || null;
      },
      
      getDepartmentModules: (departmentId) => {
        const { currentDepartmentId, departmentModules, modules } = get();
        const deptId = departmentId || currentDepartmentId;
        if (!deptId) return [];
        
        const assignedModuleIds = departmentModules
          .filter(dm => dm.department_id === deptId && dm.is_active)
          .map(dm => dm.module_id);
        
        return modules.filter(m => assignedModuleIds.includes(m.id));
      },
      
      canAccessModule: (moduleCode, permission = 'view', departmentId) => {
        const { currentDepartmentId, departmentModules, modules, userDepartments } = get();
        const deptId = departmentId || currentDepartmentId;
        
        // Find the module
        const module = modules.find(m => m.code === moduleCode);
        if (!module) return false;
        
        // Non-department-scoped modules are accessible to all
        if (!module.is_department_scoped) {
          return module.available_permissions.includes(permission);
        }
        
        // Check if user has access to this department
        const userHasDepartment = userDepartments.some(
          ud => ud.department_id === deptId && ud.is_active
        );
        if (!userHasDepartment) return false;
        
        // Check department-module assignment
        const assignment = departmentModules.find(
          dm => dm.department_id === deptId && dm.module_id === module.id && dm.is_active
        );
        if (!assignment) return false;
        
        // Check if permission is granted
        return assignment.granted_permissions.includes(permission);
      },
      
      getSectionsForDepartment: (departmentId) => {
        const { sections } = get();
        return sections.filter(s => s.department_id === departmentId && s.is_active);
      },
      
      isAdmin: () => {
        const { userDepartments } = get();
        // Admin can access all departments (EXEC or IT)
        return userDepartments.some(
          ud => ['EXEC', 'IT'].includes(ud.department?.code || '') && ud.is_active
        );
      },
      
      canSwitchDepartment: () => {
        const { userDepartments } = get();
        return userDepartments.filter(ud => ud.is_active).length > 1 || get().isAdmin();
      },
      
      // Reset
      reset: () => set(initialState),
    }),
    {
      name: 'department-store',
      partialize: (state) => ({
        currentDepartmentId: state.currentDepartmentId,
        currentSectionId: state.currentSectionId,
      }),
    }
  )
);

// ==================== Selectors ====================

export const selectCurrentDepartment = (state: DepartmentState) => 
  state.departments.find(d => d.id === state.currentDepartmentId);

export const selectAvailableDepartments = (state: DepartmentState) => {
  if (state.isAdmin()) {
    return state.departments.filter(d => d.is_active);
  }
  const userDeptIds = state.userDepartments
    .filter(ud => ud.is_active)
    .map(ud => ud.department_id);
  return state.departments.filter(d => userDeptIds.includes(d.id) && d.is_active);
};

export const selectModulesByCategory = (state: DepartmentState) => {
  const accessibleModules = state.getDepartmentModules();
  return accessibleModules.reduce((acc, module) => {
    if (!acc[module.category]) {
      acc[module.category] = [];
    }
    acc[module.category].push(module);
    return acc;
  }, {} as Record<string, Module[]>);
};










