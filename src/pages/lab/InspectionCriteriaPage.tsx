/**
 * Inspection Criteria Management Page - Hierarchical View
 * صفحة إدارة معايير الفحص - عرض هرمي
 * الشركات ← المواد ← معايير الفحص ← المعلمات
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
    BeakerIcon,
    PlusIcon,
    PencilIcon,
    TrashIcon,
    ArrowPathIcon,
    XMarkIcon,
    ArrowRightIcon,
    MagnifyingGlassIcon,
    ExclamationTriangleIcon,
    DocumentDuplicateIcon,
    BuildingOfficeIcon,
    ChevronDownIcon,
    ChevronLeftIcon,
    CubeIcon
} from '@heroicons/react/24/outline';
import { TableSkeleton } from '../../components/common/LoadingStates';
import { useCompanyStore } from '../../store/companyStore';
import { useRawMaterials } from '../../hooks/useMasterData';
import * as masterDataService from '../../services/masterDataService';
import { getAllCompanies } from '../../services/companyService';
import type { RawMaterialTest } from '../../domain/masterData/types';

const TEST_TYPES = [
    { id: 'chemical', name: 'كيميائي', color: 'bg-blue-500', textColor: 'text-blue-600' },
    { id: 'physical', name: 'فيزيائي', color: 'bg-green-500', textColor: 'text-green-600' },
    { id: 'microbiological', name: 'ميكروبيولوجي', color: 'bg-purple-500', textColor: 'text-purple-600' },
    { id: 'sensory', name: 'حسي', color: 'bg-orange-500', textColor: 'text-orange-600' }
];

const PARAM_TYPES = [
    { id: 'numeric', name: 'رقمي (حد أدنى/أقصى)', icon: '📊' },
    { id: 'passfail', name: 'مطابق/غير مطابق', icon: '✓✗' },
    { id: 'yesno', name: 'نعم/لا', icon: '👍' },
    { id: 'text', name: 'نص وصفي', icon: '📝' },
    { id: 'options', name: 'اختيارات محددة', icon: '📋' }
];

interface Parameter {
    name: string;
    type: 'numeric' | 'passfail' | 'yesno' | 'text' | 'options';
    unit?: string;
    min?: string;
    max?: string;
    expectedValue?: string;
    options?: string[];
}

interface LinkedTest extends RawMaterialTest {
    materialName?: string;
}

interface GroupedData {
    [companyId: string]: {
        companyName: string;
        materials: {
            [materialId: string]: {
                materialName: string;
                tests: LinkedTest[];
            };
        };
    };
}

const InspectionCriteriaPage: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { selectedCompanyId } = useCompanyStore();
    const { materials } = useRawMaterials(selectedCompanyId || undefined);

    const [linkedTests, setLinkedTests] = useState<LinkedTest[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showExportModal, setShowExportModal] = useState(false);
    const [editingTest, setEditingTest] = useState<LinkedTest | null>(null);
    const [testToDelete, setTestToDelete] = useState<LinkedTest | null>(null);
    const [testToExport, setTestToExport] = useState<LinkedTest | null>(null);

    // Companies
    const [companies, setCompanies] = useState<{ id: string; name: string }[]>([]);
    const [targetCompanyId, setTargetCompanyId] = useState<string>('');
    const [exportTargetCompanies, setExportTargetCompanies] = useState<string[]>([]);
    // Use selectedCompanyId from store as default filter
    const [filterCompanyId, setFilterCompanyId] = useState<string>(selectedCompanyId || 'all');

    // Accordion state
    const [expandedCompanies, setExpandedCompanies] = useState<Set<string>>(new Set());
    const [expandedMaterials, setExpandedMaterials] = useState<Set<string>>(new Set());

    // Search
    const [searchTerm, setSearchTerm] = useState('');

    // Form State
    const [formData, setFormData] = useState({
        rawMaterialId: '',
        testType: 'chemical' as string,
        testName: '',
        testNameEn: '',
        testMethod: '',
        required: true,
        parameters: [] as Parameter[]
    });

    const [paramData, setParamData] = useState<Parameter>({
        name: '', type: 'numeric', unit: '', min: '', max: '', expectedValue: 'pass', options: []
    });
    const [optionInput, setOptionInput] = useState('');

    useEffect(() => {
        loadData();
        loadCompanies();
    }, []);

    // Update filter when selectedCompanyId changes
    useEffect(() => {
        if (selectedCompanyId) {
            setFilterCompanyId(selectedCompanyId);
        }
    }, [selectedCompanyId]);

    // Auto-open modal when materialId is passed in URL
    useEffect(() => {
        const materialIdFromUrl = searchParams.get('materialId');
        if (materialIdFromUrl && materials.length > 0) {
            // Find the material to verify it exists
            const material = materials.find(m => m.id === materialIdFromUrl);
            if (material) {
                // Open modal with pre-selected material
                setEditingTest(null);
                setTargetCompanyId(selectedCompanyId || '');
                setFormData({
                    rawMaterialId: materialIdFromUrl,
                    testType: 'chemical',
                    testName: '',
                    testNameEn: '',
                    testMethod: '',
                    required: true,
                    parameters: []
                });
                setParamData({ name: '', type: 'numeric', unit: '', min: '', max: '', expectedValue: 'pass', options: [] });
                setOptionInput('');
                setShowModal(true);
            }
        }
    }, [searchParams, materials, selectedCompanyId]);

    const loadCompanies = async () => {
        try {
            const companiesData = await getAllCompanies();
            setCompanies(companiesData.map(c => ({ id: c.id, name: c.name })));
        } catch (error) {
            console.error('Error loading companies:', error);
        }
    };

    const loadData = async () => {
        setIsLoading(true);
        try {
            // Load all tests without company filter to show hierarchy
            const data = await masterDataService.getAllLinkedTests();
            setLinkedTests(data);
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // Group tests by company and material
    const groupedData = useMemo(() => {
        const groups: GroupedData = {};

        linkedTests.forEach(test => {
            const companyId = test.companyId || 'unknown';
            const materialId = test.rawMaterialId || 'unknown';
            const company = companies.find(c => c.id === companyId);

            // Apply filters
            if (filterCompanyId !== 'all' && companyId !== filterCompanyId) return;
            if (searchTerm && !test.testName.toLowerCase().includes(searchTerm.toLowerCase()) &&
                !(test.materialName?.toLowerCase().includes(searchTerm.toLowerCase()))) return;

            if (!groups[companyId]) {
                groups[companyId] = {
                    companyName: company?.name || 'شركة غير معروفة',
                    materials: {}
                };
            }

            if (!groups[companyId].materials[materialId]) {
                groups[companyId].materials[materialId] = {
                    materialName: test.materialName || 'مادة غير معروفة',
                    tests: []
                };
            }

            groups[companyId].materials[materialId].tests.push(test);
        });

        return groups;
    }, [linkedTests, companies, filterCompanyId, searchTerm]);

    const toggleCompany = (id: string) => {
        const newSet = new Set(expandedCompanies);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setExpandedCompanies(newSet);
    };

    const toggleMaterial = (id: string) => {
        const newSet = new Set(expandedMaterials);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setExpandedMaterials(newSet);
    };

    const expandAll = () => {
        setExpandedCompanies(new Set(Object.keys(groupedData)));
        const allMaterials = new Set<string>();
        Object.values(groupedData).forEach(company => {
            Object.keys(company.materials).forEach(id => allMaterials.add(id));
        });
        setExpandedMaterials(allMaterials);
    };

    const collapseAll = () => {
        setExpandedCompanies(new Set());
        setExpandedMaterials(new Set());
    };

    const getTestTypeInfo = (type: string) => TEST_TYPES.find(t => t.id === type) || TEST_TYPES[0];

    const renderParamValue = (p: Parameter) => {
        switch (p.type) {
            case 'numeric': return `${p.min || '∞'} - ${p.max || '∞'} ${p.unit || ''}`;
            case 'passfail': return 'مطابق/غير مطابق';
            case 'yesno': return 'نعم/لا';
            case 'text': return 'نص';
            case 'options': return p.options?.join(' | ') || '-';
            default: return '-';
        }
    };

    // Handlers
    const handleOpenModal = (test?: LinkedTest, materialId?: string, companyId?: string) => {
        if (test) {
            setEditingTest(test);
            setTargetCompanyId(test.companyId || '');
            setFormData({
                rawMaterialId: test.rawMaterialId || '',
                testType: test.testType,
                testName: test.testName,
                testNameEn: test.testNameEn || '',
                testMethod: test.testMethod || '',
                required: test.required,
                parameters: (test.parameters || []).map((p: any) => ({
                    name: p.name || '', type: p.type || 'numeric', unit: p.unit || '',
                    min: p.min?.toString() || '', max: p.max?.toString() || '',
                    expectedValue: p.expectedValue || 'pass', options: p.options || []
                }))
            });
        } else {
            setEditingTest(null);
            setTargetCompanyId(companyId || selectedCompanyId || '');
            setFormData({
                rawMaterialId: materialId || '',
                testType: 'chemical', testName: '', testNameEn: '', testMethod: '',
                required: true, parameters: []
            });
        }
        setParamData({ name: '', type: 'numeric', unit: '', min: '', max: '', expectedValue: 'pass', options: [] });
        setOptionInput('');
        setShowModal(true);
    };

    const handleAddOption = () => {
        if (optionInput.trim()) {
            setParamData({ ...paramData, options: [...(paramData.options || []), optionInput.trim()] });
            setOptionInput('');
        }
    };

    const handleRemoveOption = (idx: number) => {
        setParamData({ ...paramData, options: paramData.options?.filter((_, i) => i !== idx) });
    };

    const handleAddParameter = () => {
        if (!paramData.name.trim()) return;
        setFormData(prev => ({ ...prev, parameters: [...prev.parameters, { ...paramData }] }));
        setParamData({ name: '', type: 'numeric', unit: '', min: '', max: '', expectedValue: 'pass', options: [] });
    };

    const handleRemoveParameter = (index: number) => {
        setFormData(prev => ({ ...prev, parameters: prev.parameters.filter((_, i) => i !== index) }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.rawMaterialId || !formData.testName || !targetCompanyId) {
            alert('الرجاء ملء جميع الحقول المطلوبة');
            return;
        }
        try {
            if (editingTest) {
                await masterDataService.updateTestRequirement(editingTest.id, {
                    testType: formData.testType, testName: formData.testName,
                    testNameEn: formData.testNameEn, testMethod: formData.testMethod,
                    required: formData.required, parameters: formData.parameters
                });
            } else {
                await masterDataService.addTestRequirementForMaterial(formData.rawMaterialId, targetCompanyId, {
                    testType: formData.testType, testName: formData.testName,
                    testNameEn: formData.testNameEn, testMethod: formData.testMethod,
                    required: formData.required, parameters: formData.parameters
                });
            }
            loadData();
            setShowModal(false);
        } catch (error) {
            console.error('Error saving test:', error);
            alert('حدث خطأ أثناء الحفظ');
        }
    };

    const handleExportTest = (test: LinkedTest) => {
        setTestToExport(test);
        setExportTargetCompanies([]);
        setShowExportModal(true);
    };

    const handleConfirmExport = async () => {
        if (!testToExport || exportTargetCompanies.length === 0) return;
        try {
            for (const companyId of exportTargetCompanies) {
                await masterDataService.addTestRequirementForMaterial(
                    testToExport.rawMaterialId || '', companyId,
                    {
                        testType: testToExport.testType, testName: testToExport.testName,
                        testNameEn: testToExport.testNameEn, testMethod: testToExport.testMethod,
                        required: testToExport.required, parameters: testToExport.parameters || []
                    }
                );
            }
            alert(`تم تصدير المعيار إلى ${exportTargetCompanies.length} شركة بنجاح`);
            setShowExportModal(false);
            loadData();
        } catch (error) {
            console.error('Error exporting:', error);
            alert('حدث خطأ أثناء التصدير');
        }
    };

    const handleDeleteClick = (test: LinkedTest) => {
        setTestToDelete(test);
        setShowDeleteModal(true);
    };

    const handleConfirmDelete = async () => {
        if (!testToDelete) return;
        try {
            await masterDataService.removeTestRequirementFromMaterial(testToDelete.id);
            loadData();
            setShowDeleteModal(false);
        } catch (error) {
            console.error('Error deleting:', error);
        }
    };

    // Stats
    const stats = useMemo(() => {
        const companyCount = Object.keys(groupedData).length;
        let materialCount = 0, testCount = 0;
        Object.values(groupedData).forEach(c => {
            materialCount += Object.keys(c.materials).length;
            Object.values(c.materials).forEach(m => testCount += m.tests.length);
        });
        return { companyCount, materialCount, testCount };
    }, [groupedData]);

    if (isLoading) {
        return <TableSkeleton />;
    }

    return (
        <div className="p-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate('/lab')} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                        <ArrowRightIcon className="w-5 h-5" />
                    </button>
                    <BeakerIcon className="w-6 h-6 text-primary-600" />
                    <h1 className="text-xl font-bold">إدارة معايير الفحص</h1>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={loadData} className="p-2 hover:bg-gray-100 rounded-lg" title="تحديث">
                        <ArrowPathIcon className="w-5 h-5" />
                    </button>
                    <button onClick={() => handleOpenModal()} className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700">
                        <PlusIcon className="w-4 h-4" />
                        إضافة معيار
                    </button>
                </div>
            </div>

            {/* Stats & Filters */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border p-4 mb-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    {/* Stats */}
                    <div className="flex gap-6 text-sm">
                        <div className="flex items-center gap-2">
                            <BuildingOfficeIcon className="w-5 h-5 text-blue-500" />
                            <span className="font-bold text-lg">{stats.companyCount}</span>
                            <span className="text-gray-500">شركة</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <CubeIcon className="w-5 h-5 text-green-500" />
                            <span className="font-bold text-lg">{stats.materialCount}</span>
                            <span className="text-gray-500">مادة</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <BeakerIcon className="w-5 h-5 text-purple-500" />
                            <span className="font-bold text-lg">{stats.testCount}</span>
                            <span className="text-gray-500">معيار</span>
                        </div>
                    </div>

                    {/* Filters */}
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <MagnifyingGlassIcon className="w-4 h-4 absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                            <input
                                type="text" placeholder="بحث..."
                                value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                                className="pl-3 pr-9 py-2 text-sm border rounded-lg w-48 dark:bg-gray-700"
                            />
                        </div>
                        <select value={filterCompanyId} onChange={e => setFilterCompanyId(e.target.value)}
                            className="px-3 py-2 text-sm border rounded-lg dark:bg-gray-700">
                            <option value="all">كل الشركات</option>
                            {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                        <button onClick={expandAll} className="px-3 py-2 text-xs bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200">توسيع الكل</button>
                        <button onClick={collapseAll} className="px-3 py-2 text-xs bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200">طي الكل</button>
                    </div>
                </div>
            </div>

            {/* Hierarchical View */}
            <div className="space-y-3">
                {Object.entries(groupedData).map(([companyId, companyData]) => (
                    <div key={companyId} className="bg-white dark:bg-gray-800 rounded-xl border overflow-hidden">
                        {/* Company Header */}
                        <button
                            onClick={() => toggleCompany(companyId)}
                            className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                        >
                            <div className="flex items-center gap-3">
                                {expandedCompanies.has(companyId) ?
                                    <ChevronDownIcon className="w-5 h-5 text-gray-400" /> :
                                    <ChevronLeftIcon className="w-5 h-5 text-gray-400" />
                                }
                                <BuildingOfficeIcon className="w-6 h-6 text-blue-600" />
                                <span className="font-bold text-lg">{companyData.companyName}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-sm bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-3 py-1 rounded-full">
                                    {Object.keys(companyData.materials).length} مادة
                                </span>
                            </div>
                        </button>

                        {/* Materials */}
                        {expandedCompanies.has(companyId) && (
                            <div className="border-t px-4 pb-4 space-y-2">
                                {Object.entries(companyData.materials).map(([materialId, materialData]) => (
                                    <div key={materialId} className="bg-gray-50 dark:bg-gray-700/30 rounded-lg overflow-hidden mt-3">
                                        {/* Material Header */}
                                        <div
                                            onClick={() => toggleMaterial(materialId)}
                                            className="w-full flex items-center justify-between p-3 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                                        >
                                            <div className="flex items-center gap-3">
                                                {expandedMaterials.has(materialId) ?
                                                    <ChevronDownIcon className="w-4 h-4 text-gray-400" /> :
                                                    <ChevronLeftIcon className="w-4 h-4 text-gray-400" />
                                                }
                                                <CubeIcon className="w-5 h-5 text-green-600" />
                                                <span className="font-medium">{materialData.materialName}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 px-2 py-0.5 rounded-full">
                                                    {materialData.tests.length} معيار
                                                </span>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleOpenModal(undefined, materialId, companyId); }}
                                                    className="p-1 text-primary-600 hover:bg-primary-50 rounded"
                                                    title="إضافة معيار لهذه المادة"
                                                >
                                                    <PlusIcon className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Tests */}
                                        {expandedMaterials.has(materialId) && (
                                            <div className="border-t border-gray-200 dark:border-gray-600 p-3 space-y-2">
                                                {materialData.tests.map(test => {
                                                    const typeInfo = getTestTypeInfo(test.testType);
                                                    return (
                                                        <div key={test.id} className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-600">
                                                            <div className="flex items-start justify-between">
                                                                <div className="flex items-start gap-3">
                                                                    <span className={`w-2 h-2 rounded-full mt-2 ${typeInfo.color}`} />
                                                                    <div>
                                                                        <div className="flex items-center gap-2">
                                                                            <span className="font-medium">{test.testName}</span>
                                                                            <span className={`text-xs px-2 py-0.5 rounded ${typeInfo.color} text-white`}>
                                                                                {typeInfo.name}
                                                                            </span>
                                                                            {test.required && (
                                                                                <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded">مطلوب</span>
                                                                            )}
                                                                        </div>
                                                                        {test.testNameEn && (
                                                                            <div className="text-xs text-gray-400" dir="ltr">{test.testNameEn}</div>
                                                                        )}
                                                                        {/* Parameters */}
                                                                        {test.parameters && test.parameters.length > 0 && (
                                                                            <div className="mt-2 flex flex-wrap gap-2">
                                                                                {test.parameters.map((p: any, i: number) => (
                                                                                    <span key={i} className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                                                                                        <span className="font-medium">{p.name}:</span> {renderParamValue(p)}
                                                                                    </span>
                                                                                ))}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                                <div className="flex gap-1">
                                                                    <button onClick={() => handleOpenModal(test)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded" title="تعديل">
                                                                        <PencilIcon className="w-4 h-4" />
                                                                    </button>
                                                                    <button onClick={() => handleExportTest(test)} className="p-1.5 text-green-600 hover:bg-green-50 rounded" title="تصدير">
                                                                        <DocumentDuplicateIcon className="w-4 h-4" />
                                                                    </button>
                                                                    <button onClick={() => handleDeleteClick(test)} className="p-1.5 text-red-600 hover:bg-red-50 rounded" title="حذف">
                                                                        <TrashIcon className="w-4 h-4" />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ))}

                {Object.keys(groupedData).length === 0 && (
                    <div className="text-center py-12 text-gray-500">
                        <BeakerIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p>لا توجد معايير فحص</p>
                        <button onClick={() => handleOpenModal()} className="mt-3 text-primary-600 hover:underline">
                            إضافة معيار جديد
                        </button>
                    </div>
                )}
            </div>

            {/* Add/Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                        <div className="p-4 border-b flex justify-between items-center">
                            <h2 className="font-bold">{editingTest ? 'تعديل معيار الفحص' : 'إضافة معيار فحص جديد'}</h2>
                            <button onClick={() => setShowModal(false)}><XMarkIcon className="w-5 h-5" /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-4 space-y-4 overflow-y-auto flex-1">
                            {/* Company */}
                            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-200">
                                <label className="flex items-center gap-2 text-sm font-medium mb-2 text-blue-700">
                                    <BuildingOfficeIcon className="w-4 h-4" /> الشركة *
                                </label>
                                <select value={targetCompanyId} onChange={e => setTargetCompanyId(e.target.value)}
                                    disabled className="w-full px-3 py-2 text-sm border rounded-lg bg-gray-100 dark:bg-gray-700 cursor-not-allowed" required>
                                    <option value="">اختر الشركة</option>
                                    {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                                <p className="text-xs text-gray-500 mt-1">يتم تحديد الشركة تلقائياً من الاختيار المسبق</p>
                            </div>

                            {/* Material */}
                            <div>
                                <label className="block text-sm font-medium mb-1">المادة الخام *</label>
                                <select value={formData.rawMaterialId} onChange={e => setFormData({ ...formData, rawMaterialId: e.target.value })}
                                    disabled={!!editingTest} className="w-full px-3 py-2 text-sm border rounded-lg disabled:opacity-50" required>
                                    <option value="">اختر المادة</option>
                                    {materials.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium mb-1">اسم الفحص *</label>
                                    <input type="text" required value={formData.testName}
                                        onChange={e => setFormData({ ...formData, testName: e.target.value })}
                                        className="w-full px-3 py-2 text-sm border rounded-lg" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">الاسم (EN)</label>
                                    <input type="text" dir="ltr" value={formData.testNameEn}
                                        onChange={e => setFormData({ ...formData, testNameEn: e.target.value })}
                                        className="w-full px-3 py-2 text-sm border rounded-lg" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">نوع الفحص</label>
                                    <select value={formData.testType} onChange={e => setFormData({ ...formData, testType: e.target.value })}
                                        className="w-full px-3 py-2 text-sm border rounded-lg">
                                        {TEST_TYPES.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">طريقة الفحص</label>
                                    <input type="text" value={formData.testMethod}
                                        onChange={e => setFormData({ ...formData, testMethod: e.target.value })}
                                        className="w-full px-3 py-2 text-sm border rounded-lg" placeholder="AOAC" />
                                </div>
                            </div>

                            <label className="flex items-center gap-2 text-sm">
                                <input type="checkbox" checked={formData.required}
                                    onChange={e => setFormData({ ...formData, required: e.target.checked })} className="rounded" />
                                فحص مطلوب
                            </label>

                            {/* Parameters */}
                            <div className="border rounded-lg p-3 bg-gray-50 dark:bg-gray-700/30">
                                <h3 className="font-medium mb-3">المعلمات</h3>
                                <div className="space-y-2 mb-3">
                                    <div className="flex gap-2">
                                        <input placeholder="اسم المعلمة" value={paramData.name}
                                            onChange={e => setParamData({ ...paramData, name: e.target.value })}
                                            className="flex-1 px-2 py-1.5 text-sm border rounded" />
                                        <select value={paramData.type} onChange={e => setParamData({ ...paramData, type: e.target.value as any })}
                                            className="px-2 py-1.5 text-sm border rounded">
                                            {PARAM_TYPES.map(t => <option key={t.id} value={t.id}>{t.icon} {t.name}</option>)}
                                        </select>
                                    </div>
                                    {paramData.type === 'numeric' && (
                                        <div className="flex gap-2">
                                            <input placeholder="الوحدة" value={paramData.unit}
                                                onChange={e => setParamData({ ...paramData, unit: e.target.value })}
                                                className="w-20 px-2 py-1.5 text-sm border rounded" />
                                            <input placeholder="Min" value={paramData.min}
                                                onChange={e => setParamData({ ...paramData, min: e.target.value })}
                                                className="w-20 px-2 py-1.5 text-sm border rounded" dir="ltr" />
                                            <input placeholder="Max" value={paramData.max}
                                                onChange={e => setParamData({ ...paramData, max: e.target.value })}
                                                className="w-20 px-2 py-1.5 text-sm border rounded" dir="ltr" />
                                        </div>
                                    )}
                                    {paramData.type === 'options' && (
                                        <div>
                                            <div className="flex gap-2 mb-2">
                                                <input placeholder="إضافة خيار" value={optionInput}
                                                    onChange={e => setOptionInput(e.target.value)}
                                                    className="flex-1 px-2 py-1.5 text-sm border rounded" />
                                                <button type="button" onClick={handleAddOption}
                                                    className="px-3 py-1.5 text-sm bg-gray-200 rounded">+</button>
                                            </div>
                                            <div className="flex flex-wrap gap-1">
                                                {paramData.options?.map((opt, i) => (
                                                    <span key={i} className="text-xs bg-gray-100 px-2 py-1 rounded flex items-center gap-1">
                                                        {opt}
                                                        <button type="button" onClick={() => handleRemoveOption(i)} className="text-red-500">×</button>
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    <button type="button" onClick={handleAddParameter}
                                        className="w-full py-1.5 text-sm bg-primary-100 text-primary-700 rounded hover:bg-primary-200">
                                        + إضافة معلمة
                                    </button>
                                </div>

                                {formData.parameters.length > 0 && (
                                    <div className="space-y-1">
                                        {formData.parameters.map((p, i) => (
                                            <div key={i} className="flex items-center justify-between bg-white dark:bg-gray-800 p-2 rounded border text-sm">
                                                <span><strong>{p.name}</strong>: {renderParamValue(p)}</span>
                                                <button type="button" onClick={() => handleRemoveParameter(i)} className="text-red-500">
                                                    <TrashIcon className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <button type="submit" className="w-full py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
                                {editingTest ? 'تحديث' : 'إضافة'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Modal */}
            {showDeleteModal && testToDelete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-sm p-5 text-center">
                        <ExclamationTriangleIcon className="w-12 h-12 mx-auto text-red-500 mb-3" />
                        <h3 className="font-bold mb-2">حذف "{testToDelete.testName}"؟</h3>
                        <p className="text-sm text-gray-500 mb-4">من مادة "{testToDelete.materialName}"</p>
                        <div className="flex justify-center gap-3">
                            <button onClick={() => setShowDeleteModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">إلغاء</button>
                            <button onClick={handleConfirmDelete} className="px-4 py-2 bg-red-600 text-white rounded-lg">حذف</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Export Modal */}
            {showExportModal && testToExport && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-md overflow-hidden">
                        <div className="p-4 border-b flex justify-between items-center">
                            <h2 className="font-bold flex items-center gap-2">
                                <DocumentDuplicateIcon className="w-5 h-5 text-green-600" />
                                تصدير المعيار
                            </h2>
                            <button onClick={() => setShowExportModal(false)}><XMarkIcon className="w-5 h-5" /></button>
                        </div>
                        <div className="p-4">
                            <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg mb-4">
                                <p className="text-sm font-medium">{testToExport.testName}</p>
                                <p className="text-xs text-gray-500">للمادة: {testToExport.materialName}</p>
                            </div>
                            <p className="text-sm mb-3">اختر الشركات للتصدير:</p>
                            <div className="max-h-60 overflow-y-auto space-y-2">
                                {companies.filter(c => c.id !== testToExport.companyId).map(company => (
                                    <label key={company.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                                        <input type="checkbox" checked={exportTargetCompanies.includes(company.id)}
                                            onChange={(e) => {
                                                if (e.target.checked) setExportTargetCompanies([...exportTargetCompanies, company.id]);
                                                else setExportTargetCompanies(exportTargetCompanies.filter(id => id !== company.id));
                                            }} className="rounded" />
                                        <BuildingOfficeIcon className="w-4 h-4 text-gray-400" />
                                        <span className="text-sm">{company.name}</span>
                                    </label>
                                ))}
                            </div>
                            <div className="flex justify-end gap-3 mt-4">
                                <button onClick={() => setShowExportModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">إلغاء</button>
                                <button onClick={handleConfirmExport} disabled={exportTargetCompanies.length === 0}
                                    className="px-4 py-2 bg-green-600 text-white rounded-lg disabled:opacity-50">
                                    تصدير ({exportTargetCompanies.length})
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default InspectionCriteriaPage;
