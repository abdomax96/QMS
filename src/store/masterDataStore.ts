/**
 * Master Data Store - Zustand
 * إدارة بيانات الموردين والخامات
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
    Supplier,
    RawMaterial,
    CreateSupplierInput,
    CreateMaterialInput,
    SupplierType,
    MaterialCategory
} from '../domain/masterData/types';
import {
    generateSupplierCode,
    generateMaterialCode
} from '../domain/masterData/types';

interface MasterDataState {
    // Suppliers
    suppliers: Supplier[];
    selectedSupplierId: string | null;

    // Materials
    materials: RawMaterial[];
    selectedMaterialId: string | null;

    // Loading
    isLoading: boolean;
}

interface MasterDataActions {
    // Supplier CRUD
    addSupplier: (input: CreateSupplierInput, userId?: string) => Supplier;
    updateSupplier: (id: string, updates: Partial<Supplier>) => void;
    deleteSupplier: (id: string) => void;
    toggleSupplierApproval: (id: string) => void;
    toggleSupplierActive: (id: string) => void;

    // Material CRUD
    addMaterial: (input: CreateMaterialInput, userId?: string) => RawMaterial;
    updateMaterial: (id: string, updates: Partial<RawMaterial>) => void;
    deleteMaterial: (id: string) => void;
    toggleMaterialActive: (id: string) => void;

    // Selection
    setSelectedSupplier: (id: string | null) => void;
    setSelectedMaterial: (id: string | null) => void;

    // Getters
    getSupplierById: (id: string) => Supplier | undefined;
    getMaterialById: (id: string) => RawMaterial | undefined;
    getActiveSuppliers: () => Supplier[];
    getApprovedSuppliers: () => Supplier[];
    getActiveMaterials: () => RawMaterial[];
    getSuppliersByType: (type: SupplierType) => Supplier[];
    getMaterialsByCategory: (category: MaterialCategory) => RawMaterial[];
}

const initialState: MasterDataState = {
    suppliers: [],
    selectedSupplierId: null,
    materials: [],
    selectedMaterialId: null,
    isLoading: false
};

export const useMasterDataStore = create<MasterDataState & MasterDataActions>()(
    persist(
        (set, get) => ({
            ...initialState,

            // ============ Supplier CRUD ============

            addSupplier: (input, userId) => {
                const now = new Date().toISOString();
                const newSupplier: Supplier = {
                    id: `supplier_${Date.now()}`,
                    code: input.code || generateSupplierCode(),
                    name: input.name,
                    nameEn: input.nameEn,
                    type: input.type,
                    contactPerson: input.contactPerson,
                    phone: input.phone,
                    mobile: input.mobile,
                    email: input.email,
                    address: input.address,
                    city: input.city,
                    country: input.country,
                    taxNumber: input.taxNumber,
                    commercialRegister: input.commercialRegister,
                    approved: input.approved ?? false,
                    active: true,
                    notes: input.notes,
                    createdAt: now,
                    updatedAt: now,
                    createdBy: userId
                };

                set(state => ({ suppliers: [newSupplier, ...state.suppliers] }));
                return newSupplier;
            },

            updateSupplier: (id, updates) => {
                set(state => ({
                    suppliers: state.suppliers.map(s =>
                        s.id === id ? { ...s, ...updates, updatedAt: new Date().toISOString() } : s
                    )
                }));
            },

            deleteSupplier: (id) => {
                set(state => ({
                    suppliers: state.suppliers.filter(s => s.id !== id)
                }));
            },

            toggleSupplierApproval: (id) => {
                set(state => ({
                    suppliers: state.suppliers.map(s =>
                        s.id === id ? { ...s, approved: !s.approved, updatedAt: new Date().toISOString() } : s
                    )
                }));
            },

            toggleSupplierActive: (id) => {
                set(state => ({
                    suppliers: state.suppliers.map(s =>
                        s.id === id ? { ...s, active: !s.active, updatedAt: new Date().toISOString() } : s
                    )
                }));
            },

            // ============ Material CRUD ============

            addMaterial: (input, userId) => {
                const now = new Date().toISOString();
                const newMaterial: RawMaterial = {
                    id: `material_${Date.now()}`,
                    code: input.code || generateMaterialCode(input.category),
                    name: input.name,
                    nameEn: input.nameEn,
                    category: input.category,
                    unit: input.unit,
                    specifications: input.specifications,
                    shelfLife: input.shelfLife,
                    storageCondition: input.storageCondition,
                    storageTemperature: input.storageTemperature,
                    requiresLabTest: input.requiresLabTest ?? true,
                    qualityParameters: input.qualityParameters,
                    approvedSuppliers: input.approvedSuppliers,
                    containsAllergens: input.containsAllergens,
                    mayContainAllergens: input.mayContainAllergens,
                    active: true,
                    notes: input.notes,
                    createdAt: now,
                    updatedAt: now,
                    createdBy: userId
                };

                set(state => ({ materials: [newMaterial, ...state.materials] }));
                return newMaterial;
            },

            updateMaterial: (id, updates) => {
                set(state => ({
                    materials: state.materials.map(m =>
                        m.id === id ? { ...m, ...updates, updatedAt: new Date().toISOString() } : m
                    )
                }));
            },

            deleteMaterial: (id) => {
                set(state => ({
                    materials: state.materials.filter(m => m.id !== id)
                }));
            },

            toggleMaterialActive: (id) => {
                set(state => ({
                    materials: state.materials.map(m =>
                        m.id === id ? { ...m, active: !m.active, updatedAt: new Date().toISOString() } : m
                    )
                }));
            },

            // ============ Selection ============

            setSelectedSupplier: (selectedSupplierId) => set({ selectedSupplierId }),
            setSelectedMaterial: (selectedMaterialId) => set({ selectedMaterialId }),

            // ============ Getters ============

            getSupplierById: (id) => get().suppliers.find(s => s.id === id),
            getMaterialById: (id) => get().materials.find(m => m.id === id),

            getActiveSuppliers: () => get().suppliers.filter(s => s.active),
            getApprovedSuppliers: () => get().suppliers.filter(s => s.active && s.approved),
            getActiveMaterials: () => get().materials.filter(m => m.active),

            getSuppliersByType: (type) => get().suppliers.filter(s => s.type === type && s.active),
            getMaterialsByCategory: (category) => get().materials.filter(m => m.category === category && m.active)
        }),
        {
            name: 'master-data-store',
            partialize: (state) => ({
                suppliers: state.suppliers,
                materials: state.materials
            })
        }
    )
);

export default useMasterDataStore;
