/**
 * Laboratory Store - Zustand
 * إدارة حالة المختبر
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
    LabTest,
    LabTestStatus,
    MaterialReceiving,
    MaterialReceivingStatus,
    CreateLabTestInput,
    CreateMaterialReceivingInput,
    LabFilters,
    MaterialFilters,
    LabTestParameter
} from '../domain/lab/types';
import {
    generateLabTestNumber,
    generateReceivingNumber,
    generateSampleNumber
} from '../domain/lab/types';

interface LabState {
    // Lab Tests
    labTests: LabTest[];
    labFilters: LabFilters;
    selectedLabTestId: string | null;

    // Material Receiving
    materials: MaterialReceiving[];
    materialFilters: MaterialFilters;
    selectedMaterialId: string | null;

    // Loading
    isLoading: boolean;
}

interface LabActions {
    // Lab Test CRUD
    addLabTest: (input: CreateLabTestInput, userId: string, userName: string) => LabTest;
    updateLabTestStatus: (testId: string, status: LabTestStatus, userId: string, userName: string) => void;
    updateTestParameter: (testId: string, parameterId: string, result: string | number, status: 'pass' | 'fail', userId: string) => void;
    assignLabTest: (testId: string, userId: string, userName: string) => void;
    approveLabTest: (testId: string, approved: boolean, notes: string, userId: string, userName: string) => void;
    deleteLabTest: (testId: string) => void;

    // Material Receiving CRUD
    addMaterialReceiving: (input: CreateMaterialReceivingInput, userId: string, userName: string) => MaterialReceiving;
    updateMaterialStatus: (materialId: string, status: MaterialReceivingStatus, notes?: string) => void;
    inspectMaterial: (materialId: string, accepted: boolean, acceptedQty: number, rejectedQty: number, notes: string, userId: string) => void;
    linkLabTest: (materialId: string, labTestId: string) => void;
    deleteMaterial: (materialId: string) => void;

    // Filters
    setLabFilters: (filters: LabFilters) => void;
    clearLabFilters: () => void;
    setMaterialFilters: (filters: MaterialFilters) => void;
    clearMaterialFilters: () => void;

    // Selection
    setSelectedLabTest: (testId: string | null) => void;
    setSelectedMaterial: (materialId: string | null) => void;

    // Getters
    getLabTestById: (testId: string) => LabTest | undefined;
    getMaterialById: (materialId: string) => MaterialReceiving | undefined;
    getFilteredLabTests: () => LabTest[];
    getFilteredMaterials: () => MaterialReceiving[];
    getPendingLabTests: () => LabTest[];
    getPendingMaterials: () => MaterialReceiving[];
}

const initialState: LabState = {
    labTests: [],
    labFilters: {},
    selectedLabTestId: null,
    materials: [],
    materialFilters: {},
    selectedMaterialId: null,
    isLoading: false
};

export const useLabStore = create<LabState & LabActions>()(
    persist(
        (set, get) => ({
            ...initialState,

            // ============ Lab Test CRUD ============

            addLabTest: (input, userId, userName) => {
                const now = new Date().toISOString();
                const newTest: LabTest = {
                    id: `lab_${Date.now()}`,
                    testNumber: generateLabTestNumber(),
                    testType: input.testType,
                    status: 'pending',
                    sample: {
                        ...input.sample,
                        id: `sample_${Date.now()}`,
                        sampleNumber: generateSampleNumber()
                    },
                    parameters: input.parameters.map((p, i) => ({
                        ...p,
                        id: `param_${Date.now()}_${i}`,
                        status: 'pending' as const
                    })),
                    requestedBy: userId,
                    requestedByName: userName,
                    requestedAt: now,
                    priority: input.priority,
                    dueDate: input.dueDate,
                    notes: input.notes,
                    assignedTo: input.assignedTo,
                    createdAt: now,
                    updatedAt: now
                };

                set(state => ({ labTests: [newTest, ...state.labTests] }));
                return newTest;
            },

            updateLabTestStatus: (testId, status, userId, userName) => {
                const now = new Date().toISOString();
                set(state => ({
                    labTests: state.labTests.map(test => {
                        if (test.id !== testId) return test;
                        return {
                            ...test,
                            status,
                            updatedAt: now,
                            startedAt: status === 'in_progress' && !test.startedAt ? now : test.startedAt,
                            completedAt: status === 'completed' ? now : test.completedAt
                        };
                    })
                }));
            },

            updateTestParameter: (testId, parameterId, result, status, userId) => {
                const now = new Date().toISOString();
                set(state => ({
                    labTests: state.labTests.map(test => {
                        if (test.id !== testId) return test;
                        return {
                            ...test,
                            updatedAt: now,
                            parameters: test.parameters.map(param => {
                                if (param.id !== parameterId) return param;
                                return {
                                    ...param,
                                    result,
                                    status,
                                    testedBy: userId,
                                    testedAt: now
                                };
                            })
                        };
                    })
                }));
            },

            assignLabTest: (testId, userId, userName) => {
                set(state => ({
                    labTests: state.labTests.map(test => {
                        if (test.id !== testId) return test;
                        return {
                            ...test,
                            assignedTo: userId,
                            assignedToName: userName,
                            updatedAt: new Date().toISOString()
                        };
                    })
                }));
            },

            approveLabTest: (testId, approved, notes, userId, userName) => {
                const now = new Date().toISOString();
                set(state => ({
                    labTests: state.labTests.map(test => {
                        if (test.id !== testId) return test;
                        return {
                            ...test,
                            status: approved ? 'approved' : 'rejected',
                            approvedBy: userId,
                            approvedByName: userName,
                            approvedAt: now,
                            approvalNotes: notes,
                            updatedAt: now
                        };
                    })
                }));
            },

            deleteLabTest: (testId) => {
                set(state => ({
                    labTests: state.labTests.filter(t => t.id !== testId)
                }));
            },

            // ============ Material Receiving CRUD ============

            addMaterialReceiving: (input, userId, userName) => {
                const now = new Date().toISOString();
                const newMaterial: MaterialReceiving = {
                    id: `material_${Date.now()}`,
                    receivingNumber: generateReceivingNumber(),
                    materialType: input.materialType,
                    status: 'pending',
                    materialName: input.materialName,
                    materialCode: input.materialCode,
                    batchNumber: input.batchNumber,
                    lotNumber: input.lotNumber,
                    supplierId: input.supplierId,
                    supplierName: input.supplierName,
                    quantity: input.quantity,
                    unit: input.unit,
                    packagingType: input.packagingType,
                    productionDate: input.productionDate,
                    expiryDate: input.expiryDate,
                    receivedAt: now,
                    receivedBy: userId,
                    receivedByName: userName,
                    deliveryNoteNumber: input.deliveryNoteNumber,
                    invoiceNumber: input.invoiceNumber,
                    certificateOfAnalysis: input.certificateOfAnalysis,
                    inspectionRequired: input.inspectionRequired,
                    storageLocation: input.storageLocation,
                    storageCondition: input.storageCondition,
                    notes: input.notes,
                    createdAt: now,
                    updatedAt: now
                };

                set(state => ({ materials: [newMaterial, ...state.materials] }));
                return newMaterial;
            },

            updateMaterialStatus: (materialId, status, notes) => {
                set(state => ({
                    materials: state.materials.map(m => {
                        if (m.id !== materialId) return m;
                        return {
                            ...m,
                            status,
                            inspectionNotes: notes || m.inspectionNotes,
                            updatedAt: new Date().toISOString()
                        };
                    })
                }));
            },

            inspectMaterial: (materialId, accepted, acceptedQty, rejectedQty, notes, userId) => {
                const now = new Date().toISOString();
                set(state => ({
                    materials: state.materials.map(m => {
                        if (m.id !== materialId) return m;
                        return {
                            ...m,
                            status: accepted ? 'accepted' : rejectedQty > 0 && acceptedQty > 0 ? 'accepted' : 'rejected',
                            inspectedBy: userId,
                            inspectedAt: now,
                            acceptedQuantity: acceptedQty,
                            rejectedQuantity: rejectedQty,
                            rejectionReason: rejectedQty > 0 ? notes : undefined,
                            inspectionNotes: notes,
                            updatedAt: now
                        };
                    })
                }));
            },

            linkLabTest: (materialId, labTestId) => {
                const labTest = get().labTests.find(t => t.id === labTestId);
                set(state => ({
                    materials: state.materials.map(m => {
                        if (m.id !== materialId) return m;
                        return {
                            ...m,
                            labTestId,
                            labTestStatus: labTest?.status,
                            updatedAt: new Date().toISOString()
                        };
                    })
                }));
            },

            deleteMaterial: (materialId) => {
                set(state => ({
                    materials: state.materials.filter(m => m.id !== materialId)
                }));
            },

            // ============ Filters ============

            setLabFilters: (filters) => set({ labFilters: filters }),
            clearLabFilters: () => set({ labFilters: {} }),
            setMaterialFilters: (filters) => set({ materialFilters: filters }),
            clearMaterialFilters: () => set({ materialFilters: {} }),

            // ============ Selection ============

            setSelectedLabTest: (selectedLabTestId) => set({ selectedLabTestId }),
            setSelectedMaterial: (selectedMaterialId) => set({ selectedMaterialId }),

            // ============ Getters ============

            getLabTestById: (testId) => get().labTests.find(t => t.id === testId),
            getMaterialById: (materialId) => get().materials.find(m => m.id === materialId),

            getFilteredLabTests: () => {
                const { labTests, labFilters } = get();

                return labTests.filter(test => {
                    if (labFilters.testType?.length && !labFilters.testType.includes(test.testType)) return false;
                    if (labFilters.status?.length && !labFilters.status.includes(test.status)) return false;
                    if (labFilters.priority?.length && !labFilters.priority.includes(test.priority)) return false;
                    if (labFilters.search) {
                        const search = labFilters.search.toLowerCase();
                        if (!test.testNumber.toLowerCase().includes(search) &&
                            !test.sample.sourceName.toLowerCase().includes(search)) return false;
                    }
                    return true;
                });
            },

            getFilteredMaterials: () => {
                const { materials, materialFilters } = get();

                return materials.filter(material => {
                    if (materialFilters.materialType?.length && !materialFilters.materialType.includes(material.materialType)) return false;
                    if (materialFilters.status?.length && !materialFilters.status.includes(material.status)) return false;
                    if (materialFilters.supplierId && material.supplierId !== materialFilters.supplierId) return false;
                    if (materialFilters.search) {
                        const search = materialFilters.search.toLowerCase();
                        if (!material.materialName.toLowerCase().includes(search) &&
                            !material.receivingNumber.toLowerCase().includes(search) &&
                            !material.batchNumber.toLowerCase().includes(search)) return false;
                    }
                    return true;
                });
            },

            getPendingLabTests: () => get().labTests.filter(t => t.status === 'pending' || t.status === 'in_progress'),
            getPendingMaterials: () => get().materials.filter(m => m.status === 'pending' || m.status === 'inspecting')
        }),
        {
            name: 'lab-store',
            partialize: (state) => ({
                labTests: state.labTests,
                materials: state.materials
            })
        }
    )
);

export default useLabStore;
