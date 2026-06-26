/**
 * New Material Receiving Page
 * صفحة تسجيل استلام مادة جديدة - تصميم احترافي محسن
 */

import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { addDays, addMonths, addYears } from 'date-fns';
import {
    ArrowRightIcon,
    TruckIcon,
    BeakerIcon,
    ArrowPathIcon,
    BuildingOfficeIcon,
    UserCircleIcon,
    DocumentTextIcon,
    PaperClipIcon,
    CheckCircleIcon,
    CubeIcon,
    CalendarDaysIcon,
    ArchiveBoxIcon,
    ClipboardDocumentListIcon
} from '@heroicons/react/24/outline';
import { FormSkeleton } from '../../components/common/LoadingStates';
import * as labService from '../../services/labService';
import * as fileStorage from '../../services/fileStorageService';
import * as packagingSettingsService from '../../services/labPackagingSettingsService';
import { getAllCompanies } from '../../services/companyService';
import { useMasterData } from '../../hooks/useMasterData';
import { useCompanyStore } from '../../store/companyStore';
import { useSupabaseAuth } from '../../hooks/useSupabaseAuth';
import type { CreateMaterialReceivingInput, MaterialDateFormat, MaterialType } from '../../domain/lab/types';
import { useMaterialRelationsAutoLoad } from '../../hooks/useMaterialRelations';
import {
    coerceStoredMaterialDateToFormat,
    materialDateInputToStored,
    materialDateToInputValue,
    normalizeStoredMaterialDate,
} from '../../utils/materialReceivingDate';
import type { LabPackagingType } from '../../services/labPackagingSettingsService';

// Reusable Section Component
const FormSection = ({ title, icon: Icon, children, color = 'blue' }: { title: string; icon: any; children: React.ReactNode; color?: string }) => {
    const colorClasses: Record<string, string> = {
        blue: 'border-blue-200 dark:border-blue-800',
        orange: 'border-orange-200 dark:border-orange-800',
        green: 'border-green-200 dark:border-green-800',
        purple: 'border-purple-200 dark:border-purple-800',
        gray: 'border-gray-200 dark:border-gray-700',
        yellow: 'border-yellow-200 dark:border-yellow-800'
    };
    const iconColors: Record<string, string> = {
        blue: 'text-blue-600',
        orange: 'text-orange-600',
        green: 'text-green-600',
        purple: 'text-purple-600',
        gray: 'text-gray-500',
        yellow: 'text-yellow-600'
    };
    return (
        <div className={`bg-white dark:bg-gray-800 rounded-xl border ${colorClasses[color]} p-4`}>
            <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-100 dark:border-gray-700">
                <Icon className={`w-5 h-5 ${iconColors[color]}`} />
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">{title}</h3>
            </div>
            {children}
        </div>
    );
};

// Compact Input Field Component - no max-width constraint, parent grid controls layout
const FormField = ({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) => {
    return (
        <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                {label}{required && <span className="text-red-500 mr-0.5">*</span>}
            </label>
            {children}
        </div>
    );
};

const parseShelfLifeValue = (value: unknown): number => {
    if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
    if (typeof value === 'string') {
        const parsed = Number(value.trim());
        return Number.isFinite(parsed) ? parsed : 0;
    }
    return 0;
};

const formatLocalIsoDate = (date: Date): string => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
};

const mapCategoryToMaterialType = (category: string): MaterialType => {
    if (category === 'packaging') return 'packaging';
    if (category === 'ingredient') return 'ingredient';
    if (category === 'chemical') return 'chemical';
    if (category === 'additive') return 'additive';
    return 'other';
};

const NewMaterialReceivingPage: React.FC = () => {
    const navigate = useNavigate();
    const { id: editId } = useParams<{ id: string }>();
    const isEditMode = !!editId;
    const { profile } = useSupabaseAuth();
    const { selectedCompany, companies, setCompanies, selectCompany } = useCompanyStore();
    const [targetCompanyId, setTargetCompanyId] = useState<string>(selectedCompany?.id || '');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoadingEdit, setIsLoadingEdit] = useState(isEditMode);
    const [coaFile, setCoaFile] = useState<File | null>(null);
    const [isUploadingCoa, setIsUploadingCoa] = useState(false);
    const [coaUploaded, setCoaUploaded] = useState(false);
    const [packagingTypes, setPackagingTypes] = useState<LabPackagingType[]>([]);
    const [packagingSettingsError, setPackagingSettingsError] = useState<string | null>(null);
    const [selectedPackagingTypeId, setSelectedPackagingTypeId] = useState('');
    const [selectedPackagingSubtypeId, setSelectedPackagingSubtypeId] = useState('');

    // Auto-load companies if empty
    React.useEffect(() => {
        if (companies.length === 0) {
            getAllCompanies().then(setCompanies);
        }
    }, [companies.length, setCompanies]);

    // Load raw materials and suppliers
    const { materials: rawMaterials, suppliers: allSuppliers, isLoading: masterDataLoading } = useMasterData(targetCompanyId);

    useEffect(() => {
        const loadPackagingSettings = async () => {
            try {
                const tree = await packagingSettingsService.getLabPackagingSettingsTree({ includeInactive: true });
                setPackagingTypes(tree);
                setPackagingSettingsError(null);
            } catch (error) {
                console.error('Error loading packaging settings:', error);
                setPackagingTypes([]);
                setPackagingSettingsError('تعذر تحميل إعدادات مواد التعبئة');
            }
        };

        loadPackagingSettings();
    }, []);

    const [selectedRawMaterialId, setSelectedRawMaterialId] = useState<string | null>(null);

    const { approvedSuppliers, requiredTests } = useMaterialRelationsAutoLoad(selectedRawMaterialId, targetCompanyId);

    // Track test results - key: "testIndex-paramIndex", value: result string
    const [testResults, setTestResults] = useState<Record<string, string>>({});

    // Vehicle Inspection State
    const [vehicleInspection, setVehicleInspection] = useState({
        vehicleType: '',
        cleanliness: 'pass' as 'pass' | 'fail' | '',
        noOdors: 'pass' as 'pass' | 'fail' | '',
        noContaminants: 'pass' as 'pass' | 'fail' | '',
        packagingIntact: 'pass' as 'pass' | 'fail' | '',
        temperatureOk: 'pass' as 'pass' | 'fail' | 'na' | '',
        temperature: '',
        vehicleNotes: ''
    });

    // Overall result
    const [overallResult, setOverallResult] = useState<'pending' | 'accepted' | 'rejected'>('pending');
    const [hasRejectedQuantity, setHasRejectedQuantity] = useState(false);

    // Track if initial load is complete (for edit mode)
    const [initialLoadComplete, setInitialLoadComplete] = useState(!isEditMode);

    // Reset test results when material changes (only if not loading edit data)
    React.useEffect(() => {
        if (initialLoadComplete) {
            setTestResults({});
        }
    }, [selectedRawMaterialId, initialLoadComplete]);

    const [formData, setFormData] = useState<CreateMaterialReceivingInput>({
        materialType: 'ingredient',
        rawMaterialId: '',
        materialName: '',
        materialCode: '',
        batchNumber: '',
        lotNumber: '',
        supplierId: '',
        supplierName: '',
        quantity: 0,
        unit: 'كجم',
        packagingType: '',
        productionDate: '',
        expiryDate: '',
        receivedAt: formatLocalIsoDate(new Date()),
        productionDateFormat: 'dmy',
        expiryDateFormat: 'dmy',
        deliveryNoteNumber: '',
        invoiceNumber: '',
        certificateOfAnalysis: '',
        inspectionRequired: true,
        storageLocation: '',
        storageCondition: '',
        notes: '',
        acceptedQuantity: 0,
        rejectedQuantity: 0,
        rejectionReason: ''
    });

    // Load existing data in edit mode
    useEffect(() => {
        if (!isEditMode || !editId) return;

        const loadExistingData = async () => {
            setIsLoadingEdit(true);
            try {
                const receiving = await labService.getMaterialReceivingById(editId);
                if (receiving) {
                    const loadedDateFormat = (receiving.productionDateFormat || receiving.expiryDateFormat || 'dmy') as MaterialDateFormat;
                    const normalizedProductionDate = normalizeStoredMaterialDate(receiving.productionDate);
                    const normalizedExpiryDate = normalizeStoredMaterialDate(receiving.expiryDate);
                    const savedCategory = String(receiving.materialType || '');

                    if ([
                        'ingredient',
                        'packaging',
                        'chemical',
                        'additive',
                        'flavors',
                        'colorants',
                        'preservatives',
                        'other'
                    ].includes(savedCategory)) {
                        setSelectedCategory(savedCategory);
                    }

                    if (receiving.companyId) {
                        setTargetCompanyId(receiving.companyId);
                        selectCompany(receiving.companyId);
                    }
                    if (receiving.rawMaterialId) setSelectedRawMaterialId(receiving.rawMaterialId);

                    setFormData({
                        materialType: (receiving.materialType as MaterialType) || 'ingredient',
                        rawMaterialId: receiving.rawMaterialId || '',
                        materialName: receiving.materialName || '',
                        materialCode: receiving.materialCode || '',
                        batchNumber: receiving.batchNumber || '',
                        lotNumber: receiving.lotNumber || '',
                        supplierId: receiving.supplierId || '',
                        supplierName: receiving.supplierName || '',
                        quantity: receiving.quantity || 0,
                        unit: receiving.unit || 'كجم',
                        packagingType: receiving.packagingType || '',
                        productionDate: normalizedProductionDate
                            ? coerceStoredMaterialDateToFormat(normalizedProductionDate, loadedDateFormat)
                            : '',
                        expiryDate: normalizedExpiryDate
                            ? coerceStoredMaterialDateToFormat(normalizedExpiryDate, loadedDateFormat)
                            : '',
                        receivedAt: receiving.receivedAt
                            ? formatLocalIsoDate(new Date(receiving.receivedAt))
                            : formatLocalIsoDate(new Date()),
                        productionDateFormat: loadedDateFormat,
                        expiryDateFormat: loadedDateFormat,
                        deliveryNoteNumber: receiving.deliveryNoteNumber || '',
                        invoiceNumber: receiving.invoiceNumber || '',
                        certificateOfAnalysis: receiving.certificateOfAnalysis || '',
                        inspectionRequired: receiving.inspectionRequired ?? true,
                        storageLocation: receiving.storageLocation || '',
                        storageCondition: receiving.storageCondition || '',
                        notes: receiving.notes || '',
                        acceptedQuantity: receiving.acceptedQuantity ?? receiving.quantity ?? 0,
                        rejectedQuantity: receiving.rejectedQuantity ?? 0,
                        rejectionReason: receiving.rejectionReason || ''
                    });

                    setHasRejectedQuantity((receiving.rejectedQuantity ?? 0) > 0);

                    if (receiving.status === 'accepted') setOverallResult('accepted');
                    else if (receiving.status === 'rejected') setOverallResult('rejected');
                    else setOverallResult('pending');

                    // Load test results - handle both formats
                    if (receiving.testResults) {
                        if (typeof receiving.testResults === 'object' && !Array.isArray(receiving.testResults)) {
                            // Simple format: {"0-0": "12.5", "1-0": "24.2"}
                            setTestResults(receiving.testResults as Record<string, string>);
                        } else if (Array.isArray(receiving.testResults)) {
                            // Array format (legacy)
                            const loadedResults: Record<string, string> = {};
                            receiving.testResults.forEach((test: any, testIndex: number) => {
                                if (test.results && Array.isArray(test.results)) {
                                    test.results.forEach((result: any, paramIndex: number) => {
                                        if (result.value !== undefined && result.value !== '') {
                                            loadedResults[`${testIndex}-${paramIndex}`] = String(result.value);
                                        }
                                    });
                                }
                            });
                            setTestResults(loadedResults);
                        }
                    }

                    // Load vehicle inspection data
                    if (receiving.vehicleInspection) {
                        setVehicleInspection({
                            vehicleType: receiving.vehicleInspection.vehicleType || '',
                            cleanliness: receiving.vehicleInspection.cleanliness || 'pass',
                            noOdors: receiving.vehicleInspection.noOdors || 'pass',
                            noContaminants: receiving.vehicleInspection.noContaminants || 'pass',
                            packagingIntact: receiving.vehicleInspection.packagingIntact || 'pass',
                            temperatureOk: receiving.vehicleInspection.temperatureOk || 'pass',
                            temperature: receiving.vehicleInspection.temperature || '',
                            vehicleNotes: receiving.vehicleInspection.vehicleNotes || ''
                        });
                    }

                    if (receiving.certificateOfAnalysis) setCoaUploaded(true);
                } else {
                    navigate('/lab/receiving');
                }
            } catch (error) {
                console.error('Error loading receiving data:', error);
                navigate('/lab/receiving');
            } finally {
                setIsLoadingEdit(false);
                setInitialLoadComplete(true);
            }
        };

        loadExistingData();
    }, [editId, isEditMode, navigate, selectCompany]);

    // Fixed category list
    const standardCategories = [
        { value: 'ingredient', label: 'مكون غذائي' },
        { value: 'packaging', label: 'مواد تعبئة' },
        { value: 'chemical', label: 'مواد كيميائية' },
        { value: 'additive', label: 'مضافات' },
        { value: 'flavors', label: 'نكهات' },
        { value: 'colorants', label: 'ملونات' },
        { value: 'preservatives', label: 'مواد حافظة' },
        { value: 'other', label: 'أخرى' }
    ];

    const [selectedCategory, setSelectedCategory] = useState<string>('');

    const selectedPackagingType = useMemo(
        () => packagingTypes.find((type) => type.id === selectedPackagingTypeId),
        [packagingTypes, selectedPackagingTypeId]
    );

    const filteredPackagingSubtypes = useMemo(() => {
        if (!selectedPackagingType) return [];
        return selectedPackagingType.subtypes.filter(
            (subtype) => subtype.isActive || subtype.id === selectedPackagingSubtypeId
        );
    }, [selectedPackagingSubtypeId, selectedPackagingType]);

    const selectedPackagingSubtype = useMemo(
        () => filteredPackagingSubtypes.find((subtype) => subtype.id === selectedPackagingSubtypeId),
        [filteredPackagingSubtypes, selectedPackagingSubtypeId]
    );
    const hasFilteredPackagingSubtypes = filteredPackagingSubtypes.length > 0;

    React.useEffect(() => {
        if (!hasFilteredPackagingSubtypes && selectedPackagingSubtypeId) {
            setSelectedPackagingSubtypeId('');
        }
    }, [hasFilteredPackagingSubtypes, selectedPackagingSubtypeId]);

    const filteredRawMaterials = useMemo(() => {
        const baseFiltered = !selectedCategory
            ? rawMaterials.filter((material) => material.active)
            : rawMaterials.filter((material) => material.active && material.category === selectedCategory);

        if (selectedCategory !== 'packaging') {
            return baseFiltered;
        }

        if (!selectedPackagingTypeId) {
            return [];
        }

        return baseFiltered.filter(
            (material) =>
                material.packagingTypeId === selectedPackagingTypeId &&
                (!selectedPackagingSubtypeId || material.packagingSubtypeId === selectedPackagingSubtypeId)
        );
    }, [rawMaterials, selectedCategory, selectedPackagingTypeId, selectedPackagingSubtypeId]);

    const availableSuppliers = useMemo(() => {
        if (!selectedRawMaterialId) return [];
        if (approvedSuppliers.length > 0) return approvedSuppliers;
        return allSuppliers.filter(s => s.approved);
    }, [selectedRawMaterialId, approvedSuppliers, allSuppliers]);

    React.useEffect(() => {
        if (availableSuppliers.length === 1) {
            const supplier = availableSuppliers[0];
            setFormData(prev => ({ ...prev, supplierId: supplier.id, supplierName: supplier.name }));
        } else if (availableSuppliers.length === 0) {
            setFormData(prev => ({ ...prev, supplierId: '', supplierName: '' }));
        }
    }, [availableSuppliers]);

    // Keep category in sync with selected raw material (especially in edit mode after async load)
    React.useEffect(() => {
        if (!selectedRawMaterialId) return;
        const selectedMaterial = rawMaterials.find((m) => m.id === selectedRawMaterialId);
        const materialCategory = String(selectedMaterial?.category || '');
        if (!materialCategory) return;
        if (selectedCategory !== materialCategory) {
            setSelectedCategory(materialCategory);
        }

        if (materialCategory === 'packaging') {
            setSelectedPackagingTypeId(selectedMaterial?.packagingTypeId || '');
            setSelectedPackagingSubtypeId(selectedMaterial?.packagingSubtypeId || '');
        }
    }, [selectedRawMaterialId, rawMaterials, selectedCategory]);

    React.useEffect(() => {
        if (selectedCategory !== 'packaging') return;
        const subtypeName = selectedPackagingSubtype?.name || selectedPackagingType?.name || '';
        setFormData((prev) => (
            prev.packagingType === subtypeName
                ? prev
                : { ...prev, packagingType: subtypeName }
        ));
    }, [selectedCategory, selectedPackagingSubtype, selectedPackagingType]);

    const handleMaterialSelect = (materialId: string) => {
        const material = rawMaterials.find(m => m.id === materialId);
        if (material) {
            setSelectedRawMaterialId(materialId);
            if (material.category) {
                setSelectedCategory(material.category);
            }

            const matchedPackagingType = packagingTypes.find((type) => type.id === material.packagingTypeId);
            const matchedPackagingSubtypeName = matchedPackagingType
                ?.subtypes.find((subtype) => subtype.id === material.packagingSubtypeId)
                ?.name;
            const resolvedPackagingLabel = matchedPackagingSubtypeName || matchedPackagingType?.name || '';

            if (material.category === 'packaging') {
                setSelectedPackagingTypeId(material.packagingTypeId || '');
                setSelectedPackagingSubtypeId(material.packagingSubtypeId || '');
            }

            setFormData(prev => ({
                ...prev,
                materialType: mapCategoryToMaterialType(String(material.category || 'ingredient')),
                rawMaterialId: materialId,
                materialName: material.name,
                materialCode: material.code,
                unit: material.unit || 'كجم',
                storageCondition: material.storageCondition || '',
                inspectionRequired: material.requiresLabTest,
                supplierId: '',
                supplierName: '',
                packagingType: material.category === 'packaging'
                    ? (resolvedPackagingLabel || prev.packagingType)
                    : '',
                expiryDate: '',
                acceptedQuantity: prev.quantity,
                rejectedQuantity: 0,
                rejectionReason: ''
            }));
        }
    };

    const handlePackagingTypeSelect = (typeId: string) => {
        const typeName = packagingTypes.find((type) => type.id === typeId)?.name || '';
        setSelectedPackagingTypeId(typeId);
        setSelectedPackagingSubtypeId('');
        setSelectedRawMaterialId(null);
        setFormData((prev) => ({
            ...prev,
            rawMaterialId: '',
            materialName: '',
            materialCode: '',
            supplierId: '',
            supplierName: '',
            packagingType: typeName,
            expiryDate: '',
        }));
    };

    const handlePackagingSubtypeSelect = (subtypeId: string) => {
        setSelectedPackagingSubtypeId(subtypeId);
        const subtypeName = selectedPackagingType?.subtypes.find((subtype) => subtype.id === subtypeId)?.name || '';
        const fallbackTypeName = selectedPackagingType?.name || '';
        setSelectedRawMaterialId(null);
        setFormData((prev) => ({
            ...prev,
            rawMaterialId: '',
            materialName: '',
            materialCode: '',
            supplierId: '',
            supplierName: '',
            packagingType: subtypeName || fallbackTypeName,
            expiryDate: '',
        }));
    };

    const handleQuantityChange = (rawValue: string) => {
        const nextQuantity = Math.max(0, Number.parseFloat(rawValue) || 0);
        setFormData((prev) => {
            const currentRejected = hasRejectedQuantity ? Number(prev.rejectedQuantity) || 0 : 0;
            const clampedRejected = Math.min(Math.max(currentRejected, 0), nextQuantity);
            return {
                ...prev,
                quantity: nextQuantity,
                rejectedQuantity: clampedRejected,
                acceptedQuantity: Math.max(nextQuantity - clampedRejected, 0),
            };
        });
    };

    const handleRejectedQuantityChange = (rawValue: string) => {
        const requestedRejected = Math.max(0, Number.parseFloat(rawValue) || 0);
        setFormData((prev) => {
            const totalQuantity = Math.max(0, Number(prev.quantity) || 0);
            const clampedRejected = Math.min(requestedRejected, totalQuantity);
            return {
                ...prev,
                rejectedQuantity: clampedRejected,
                acceptedQuantity: Math.max(totalQuantity - clampedRejected, 0),
            };
        });
    };

    const handleRejectedQuantityToggle = (checked: boolean) => {
        setHasRejectedQuantity(checked);
        setFormData((prev) => {
            const totalQuantity = Math.max(0, Number(prev.quantity) || 0);
            if (!checked) {
                return {
                    ...prev,
                    rejectedQuantity: 0,
                    acceptedQuantity: totalQuantity,
                    rejectionReason: ''
                };
            }

            const currentRejected = Math.max(0, Number(prev.rejectedQuantity) || 0);
            const clampedRejected = Math.min(currentRejected, totalQuantity);
            return {
                ...prev,
                rejectedQuantity: clampedRejected,
                acceptedQuantity: Math.max(totalQuantity - clampedRejected, 0),
            };
        });
    };

    const getUnifiedDateFormat = (): MaterialDateFormat => {
        return (formData.productionDateFormat || formData.expiryDateFormat || 'dmy') as MaterialDateFormat;
    };

    const handleUnifiedDateFormatChange = (dateFormat: MaterialDateFormat) => {
        setFormData(prev => {
            const currentProductionDate = typeof prev.productionDate === 'string' ? prev.productionDate : '';
            const currentExpiryDate = typeof prev.expiryDate === 'string' ? prev.expiryDate : '';

            return {
                ...prev,
                productionDateFormat: dateFormat,
                expiryDateFormat: dateFormat,
                productionDate: currentProductionDate
                    ? coerceStoredMaterialDateToFormat(currentProductionDate, dateFormat)
                    : '',
                expiryDate: currentExpiryDate
                    ? coerceStoredMaterialDateToFormat(currentExpiryDate, dateFormat)
                    : '',
            };
        });
    };

    const handleDateValueChange = (
        dateField: 'productionDate' | 'expiryDate',
        rawValue: string
    ) => {
        const activeFormat = getUnifiedDateFormat();
        const storedDate = materialDateInputToStored(rawValue, activeFormat);
        setFormData(prev => ({ ...prev, [dateField]: storedDate }));
    };

    React.useEffect(() => {
        if (!selectedRawMaterialId) return;

        const material = rawMaterials.find(m => m.id === selectedRawMaterialId);
        if (!material) return;

        const activeDateFormat = getUnifiedDateFormat();
        const shelfLifeValue = parseShelfLifeValue(material.shelfLife);
        const normalizedProductionDate = normalizeStoredMaterialDate(formData.productionDate);

        if (!normalizedProductionDate || shelfLifeValue <= 0) {
            setFormData(prev => {
                if (!prev.expiryDate) return prev;
                return { ...prev, expiryDate: '' };
            });
            return;
        }

        const prodDate = new Date(`${normalizedProductionDate}T12:00:00`);
        if (Number.isNaN(prodDate.getTime())) return;

        const shelfLifeUnit = material.shelfLifeUnit || 'days';
        const expirySubtractDays = Math.max(0, Math.trunc(parseShelfLifeValue(material.expirySubtractDays)));
        let expiryDate = new Date(prodDate);

        if (shelfLifeUnit === 'months') {
            expiryDate = addMonths(prodDate, shelfLifeValue);
            if (expirySubtractDays > 0) {
                expiryDate = addDays(expiryDate, -expirySubtractDays);
            }
        } else if (shelfLifeUnit === 'years') {
            expiryDate = addYears(prodDate, shelfLifeValue);
            if (expirySubtractDays > 0) {
                expiryDate = addDays(expiryDate, -expirySubtractDays);
            }
        } else {
            expiryDate = addDays(prodDate, shelfLifeValue);
        }

        const calculatedDate = formatLocalIsoDate(expiryDate);
        const storedExpiryDate = activeDateFormat === 'my'
            ? coerceStoredMaterialDateToFormat(calculatedDate, 'my')
            : calculatedDate;

        setFormData(prev => {
            if (
                prev.expiryDate === storedExpiryDate &&
                prev.productionDateFormat === activeDateFormat &&
                prev.expiryDateFormat === activeDateFormat
            ) {
                return prev;
            }

            return {
                ...prev,
                expiryDate: storedExpiryDate,
                productionDateFormat: activeDateFormat,
                expiryDateFormat: activeDateFormat,
            };
        });
    }, [
        formData.productionDate,
        formData.productionDateFormat,
        formData.expiryDateFormat,
        selectedRawMaterialId,
        rawMaterials
    ]);

    const buildTestResultsForSubmission = () => {
        return requiredTests.map((test, testIndex) => ({
            testName: test.testName,
            testNameEn: test.testNameEn,
            testType: test.testType,
            required: test.required,
            results: test.parameters?.map((param: any, paramIndex: number) => ({
                paramName: param.name,
                paramUnit: param.unit,
                min: param.min,
                max: param.max,
                value: testResults[`${testIndex}-${paramIndex}`] || ''
            })) || []
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.materialName || !formData.batchNumber || isSubmitting) return;

        if (selectedCategory === 'packaging') {
            if (!selectedPackagingTypeId) {
                window.alert('يجب اختيار النوع الرئيسي لمواد التعبئة قبل اختيار المادة والحفظ');
                return;
            }
        }

        const resolvedPackagingType = selectedCategory === 'packaging'
            ? (selectedPackagingSubtype?.name || selectedPackagingType?.name || formData.packagingType || '')
            : formData.packagingType;

        setIsSubmitting(true);
        try {
            const initialTestResults = buildTestResultsForSubmission();
            const totalQty = Math.max(0, Number(formData.quantity) || 0);
            const rejectedQty = hasRejectedQuantity
                ? Math.min(Math.max(Number(formData.rejectedQuantity) || 0, 0), totalQty)
                : 0;
            const acceptedQty = Math.max(totalQty - rejectedQty, 0);
            const rejectionReason = hasRejectedQuantity && rejectedQty > 0
                ? (formData.rejectionReason?.trim() || undefined)
                : undefined;

            if (isEditMode && editId) {
                const success = await labService.updateMaterialReceiving(editId, {
                    batchNumber: formData.batchNumber,
                    lotNumber: formData.lotNumber,
                    quantity: formData.quantity,
                    unit: formData.unit,
                    productionDate: formData.productionDate || undefined,
                    expiryDate: formData.expiryDate || undefined,
                    receivedAt: formData.receivedAt || undefined,
                    productionDateFormat: formData.productionDateFormat || 'dmy',
                    expiryDateFormat: formData.expiryDateFormat || 'dmy',
                    supplierName: formData.supplierName,
                    supplierId: formData.supplierId,
                    invoiceNumber: formData.invoiceNumber,
                    deliveryNoteNumber: formData.deliveryNoteNumber,
                    packagingType: resolvedPackagingType,
                    storageLocation: formData.storageLocation,
                    storageCondition: formData.storageCondition,
                    acceptedQuantity: acceptedQty,
                    rejectedQuantity: rejectedQty,
                    rejectionReason,
                    notes: formData.notes,
                    testResults: initialTestResults,
                    vehicleInspection
                });

                if (overallResult !== 'pending') {
                    await labService.updateMaterialReceivingStatus(editId, overallResult, formData.notes);
                }

                if (success) navigate(`/lab/receiving/${editId}`);
            } else {
                const material = await labService.createMaterialReceiving(
                    {
                        ...formData,
                        packagingType: resolvedPackagingType,
                        acceptedQuantity: acceptedQty,
                        rejectedQuantity: rejectedQty,
                        rejectionReason,
                        initialTestResults,
                        vehicleInspection,
                        overallResult
                    },
                    profile?.uid || '',
                    profile?.name || profile?.email || '',
                    targetCompanyId || undefined
                );
                if (material) navigate('/lab/receiving');
            }
        } catch (error) {
            console.error('Error saving material receiving:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleTestResultChange = (testIndex: number, paramIndex: number, value: string) => {
        setTestResults(prev => ({ ...prev, [`${testIndex}-${paramIndex}`]: value }));
    };

    const selectedMaterial = rawMaterials.find(m => m.id === selectedRawMaterialId);
    const totalQuantity = Math.max(0, Number(formData.quantity) || 0);
    const normalizedRejectedQuantity = hasRejectedQuantity
        ? Math.min(Math.max(Number(formData.rejectedQuantity) || 0, 0), totalQuantity)
        : 0;
    const normalizedAcceptedQuantity = Math.max(totalQuantity - normalizedRejectedQuantity, 0);

    const inputClass = "w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500";
    const selectClass = inputClass;

    if (masterDataLoading || isLoadingEdit) {
        return <FormSkeleton />;
    }

    return (
        <div className="p-4 max-w-5xl mx-auto h-full overflow-y-auto" dir="rtl">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate(isEditMode ? `/lab/receiving/${editId}` : '/lab/receiving')} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                        <ArrowRightIcon className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <BeakerIcon className="w-6 h-6 text-blue-600" />
                            {isEditMode ? 'تعديل بيانات الاستلام' : 'استلام مادة خام جديدة'}
                        </h1>
                        <p className="text-xs text-gray-500 mt-0.5">تسجيل وفحص المواد الخام الواردة</p>
                    </div>
                </div>
                {isEditMode && (
                    <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-3 py-1 rounded-full font-medium">
                        وضع التعديل
                    </span>
                )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Row 1: Company Selection (if multiple) */}
                {companies.length > 1 && (
                    <div className="flex items-center gap-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                        <BuildingOfficeIcon className="w-5 h-5 text-gray-400" />
                        <label className="text-sm font-medium whitespace-nowrap">الشركة:</label>
                        <select
                            value={targetCompanyId}
                            onChange={(e) => {
                                const nextCompanyId = e.target.value;
                                setTargetCompanyId(nextCompanyId);
                                selectCompany(nextCompanyId);
                                setSelectedRawMaterialId(null);
                                setFormData(prev => ({ ...prev, rawMaterialId: '', materialName: '', supplierId: '', supplierName: '' }));
                            }}
                            className="max-w-xs px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700"
                        >
                            <option value="">اختر الشركة...</option>
                            {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>
                )}

                {/* Section 1: Material & Supplier Info */}
                <FormSection title="معلومات المادة والمورد" icon={CubeIcon} color="blue">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <FormField label="تصنيف المادة" required>
                            <select
                                value={selectedCategory}
                                onChange={(e) => {
                                    const nextCategory = e.target.value;
                                    setSelectedCategory(nextCategory);
                                    setSelectedRawMaterialId(null);

                                    if (nextCategory !== 'packaging') {
                                        setSelectedPackagingTypeId('');
                                        setSelectedPackagingSubtypeId('');
                                    }

                                    setFormData((prev) => ({
                                        ...prev,
                                        materialType: mapCategoryToMaterialType(nextCategory),
                                        rawMaterialId: '',
                                        materialName: '',
                                        materialCode: '',
                                        supplierId: '',
                                        supplierName: '',
                                        packagingType: '',
                                    }));
                                }}
                                className={selectClass}
                                required
                            >
                                <option value="">اختر التصنيف</option>
                                {standardCategories.map(cat => <option key={cat.value} value={cat.value}>{cat.label}</option>)}
                            </select>
                        </FormField>

                        {selectedCategory === 'packaging' && (
                            <FormField label="النوع الرئيسي" required>
                                <select
                                    value={selectedPackagingTypeId}
                                    onChange={(e) => handlePackagingTypeSelect(e.target.value)}
                                    className={selectClass}
                                    required
                                >
                                    <option value="">اختر النوع الرئيسي</option>
                                    {packagingTypes
                                        .filter((type) => type.isActive || type.id === selectedPackagingTypeId)
                                        .map((type) => (
                                            <option key={type.id} value={type.id}>
                                                {type.name}{type.isActive ? '' : ' (غير نشط)'}
                                            </option>
                                        ))}
                                </select>
                                {packagingSettingsError && (
                                    <p className="mt-1 text-xs text-red-600 dark:text-red-400">{packagingSettingsError}</p>
                                )}
                            </FormField>
                        )}

                        {selectedCategory === 'packaging' && hasFilteredPackagingSubtypes && (
                            <FormField label="النوع الفرعي (اختياري)">
                                <select
                                    value={selectedPackagingSubtypeId}
                                    onChange={(e) => handlePackagingSubtypeSelect(e.target.value)}
                                    className={selectClass}
                                    disabled={!selectedPackagingTypeId}
                                >
                                    <option value="">بدون نوع فرعي</option>
                                    {filteredPackagingSubtypes.map((subtype) => (
                                        <option key={subtype.id} value={subtype.id}>
                                            {subtype.name}{subtype.isActive ? '' : ' (غير نشط)'}
                                        </option>
                                    ))}
                                </select>
                            </FormField>
                        )}

                        <FormField label="المادة الخام" required>
                            <select
                                value={selectedRawMaterialId || ''}
                                onChange={(e) => handleMaterialSelect(e.target.value)}
                                className={selectClass}
                                required
                                disabled={
                                    !selectedCategory ||
                                    (selectedCategory === 'packaging' && !selectedPackagingTypeId)
                                }
                            >
                                <option value="">اختر المادة</option>
                                {filteredRawMaterials.map(m => <option key={m.id} value={m.id}>{m.name} ({m.code})</option>)}
                            </select>
                            {selectedCategory === 'packaging' && !selectedPackagingTypeId && (
                                <p className="mt-1 text-xs text-gray-500">اختر النوع الرئيسي أولاً</p>
                            )}
                        </FormField>
                        <FormField label="المورد" required>
                            <select value={formData.supplierId} onChange={(e) => { const s = availableSuppliers.find(x => x.id === e.target.value); setFormData({ ...formData, supplierId: e.target.value, supplierName: s?.name || '' }); }} className={selectClass} required disabled={!selectedRawMaterialId}>
                                <option value="">اختر المورد</option>
                                {availableSuppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                        </FormField>
                        <FormField label="رقم الدفعة (Batch)" required>
                            <input type="text" value={formData.batchNumber} onChange={(e) => setFormData({ ...formData, batchNumber: e.target.value })} placeholder="B2024-001" className={inputClass} required />
                        </FormField>
                    </div>
                </FormSection>

                {/* Section 2: Quantity & Dates */}
                <FormSection title="الكمية والتواريخ" icon={CalendarDaysIcon} color="green">
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        <FormField label="الكمية" required>
                            <div className="flex gap-1">
                                <input type="number" value={formData.quantity || ''} onChange={(e) => handleQuantityChange(e.target.value)} className="w-20 px-2 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700" required min="0" />
                                <select value={formData.unit} onChange={(e) => setFormData({ ...formData, unit: e.target.value })} className="w-16 px-1 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700">
                                    <option value="كجم">كجم</option><option value="جم">جم</option><option value="لتر">لتر</option><option value="قطعة">قطعة</option>
                                </select>
                            </div>
                        </FormField>
                        <FormField label="صيغة التاريخ (الإنتاج/الانتهاء)">
                            <select
                                value={getUnifiedDateFormat()}
                                onChange={(e) => handleUnifiedDateFormatChange(e.target.value as MaterialDateFormat)}
                                className={selectClass}
                            >
                                <option value="dmy">يوم / شهر / سنة</option>
                                <option value="my">شهر / سنة</option>
                            </select>
                        </FormField>
                        <FormField label="تاريخ الإنتاج">
                            <input
                                type={getUnifiedDateFormat() === 'my' ? 'month' : 'date'}
                                value={materialDateToInputValue(formData.productionDate, getUnifiedDateFormat())}
                                onChange={(e) => handleDateValueChange('productionDate', e.target.value)}
                                className={inputClass}
                            />
                        </FormField>
                        <FormField label="تاريخ الانتهاء">
                            <input
                                type={getUnifiedDateFormat() === 'my' ? 'month' : 'date'}
                                value={materialDateToInputValue(formData.expiryDate, getUnifiedDateFormat())}
                                readOnly
                                className={`${inputClass} bg-gray-100 dark:bg-gray-600 cursor-not-allowed`}
                            />
                        </FormField>
                        <FormField label="نوع التعبئة">
                            {selectedCategory === 'packaging' ? (
                                <input
                                    type="text"
                                    value={selectedPackagingSubtype?.name || selectedPackagingType?.name || formData.packagingType || ''}
                                    readOnly
                                    className={`${inputClass} bg-gray-100 dark:bg-gray-600 cursor-not-allowed`}
                                    placeholder="يتم تحديده من النوع الرئيسي أو الفرعي"
                                />
                            ) : (
                                <select value={formData.packagingType} onChange={(e) => setFormData({ ...formData, packagingType: e.target.value })} className={selectClass} disabled={!selectedMaterial?.packagingOptions?.length}>
                                    <option value="">اختر</option>
                                    {selectedMaterial?.packagingOptions?.map(o => <option key={o} value={o}>{o}</option>)}
                                </select>
                            )}
                        </FormField>
                    </div>
                    <div className="mt-4 rounded-lg border border-amber-200 dark:border-amber-700 bg-amber-50/40 dark:bg-amber-900/10 p-3">
                        <label className="flex items-center gap-2 text-sm font-medium text-gray-800 dark:text-gray-200">
                            <input
                                type="checkbox"
                                checked={hasRejectedQuantity}
                                onChange={(e) => handleRejectedQuantityToggle(e.target.checked)}
                                className="h-4 w-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                            />
                            يوجد كمية تم رفضها
                        </label>

                        {hasRejectedQuantity && (
                            <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
                                <FormField label="الكمية المرفوضة">
                                    <input
                                        type="number"
                                        min="0"
                                        max={totalQuantity}
                                        step="0.001"
                                        value={normalizedRejectedQuantity || ''}
                                        onChange={(e) => handleRejectedQuantityChange(e.target.value)}
                                        className={inputClass}
                                    />
                                </FormField>
                                <FormField label="الكمية المقبولة (تلقائي)">
                                    <input
                                        type="number"
                                        readOnly
                                        value={normalizedAcceptedQuantity}
                                        className={`${inputClass} bg-gray-100 dark:bg-gray-600 cursor-not-allowed`}
                                    />
                                </FormField>
                                <FormField label="سبب الرفض (اختياري)">
                                    <input
                                        type="text"
                                        value={formData.rejectionReason || ''}
                                        onChange={(e) => setFormData({ ...formData, rejectionReason: e.target.value })}
                                        placeholder="سبب رفض جزء من الكمية"
                                        className={inputClass}
                                    />
                                </FormField>
                            </div>
                        )}
                    </div>
                </FormSection>

                {/* Section 3: Documents */}
                <FormSection title="المستندات" icon={DocumentTextIcon} color="purple">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 items-end">
                        <FormField label="رقم الفاتورة">
                            <input type="text" value={formData.invoiceNumber} onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })} placeholder="INV-001" className={inputClass} />
                        </FormField>
                        <FormField label="إذن التسليم">
                            <input type="text" value={formData.deliveryNoteNumber} onChange={(e) => setFormData({ ...formData, deliveryNoteNumber: e.target.value })} placeholder="DN-001" className={inputClass} />
                        </FormField>
                        <div className="md:col-span-2">
                            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">شهادة التحليل (COA)</label>
                            <div className="flex items-center gap-2">
                                <input type="file" accept=".pdf,.jpg,.jpeg,.png" id="coa-upload" className="hidden"
                                    onChange={async (e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                            setCoaFile(file);
                                            setIsUploadingCoa(true);
                                            setCoaUploaded(false);
                                            const tempName = `COA_${formData.batchNumber || Date.now()}`;
                                            const url = await fileStorage.uploadCOA(file, tempName);
                                            if (url) {
                                                setFormData({ ...formData, certificateOfAnalysis: url });
                                                setCoaUploaded(true);
                                            } else {
                                                alert('فشل في رفع الملف.');
                                                setCoaFile(null);
                                            }
                                            setIsUploadingCoa(false);
                                        }
                                    }}
                                />
                                <label htmlFor="coa-upload" className={`inline-flex items-center gap-2 px-3 py-2 text-sm rounded-lg cursor-pointer border ${isUploadingCoa ? 'bg-gray-200 cursor-wait' : 'bg-gray-100 hover:bg-gray-200'} text-gray-700 border-gray-300`}>
                                    {isUploadingCoa ? <><ArrowPathIcon className="w-4 h-4 animate-spin" />جاري الرفع...</> : <><PaperClipIcon className="w-4 h-4" />رفع ملف</>}
                                </label>
                                {coaFile && coaUploaded && (
                                    <div className="flex items-center gap-2 px-2 py-1 bg-green-50 text-green-700 rounded text-xs">
                                        <CheckCircleIcon className="w-4 h-4" />
                                        <span className="truncate max-w-[150px]">{coaFile.name}</span>
                                        <button type="button" onClick={() => { setFormData({ ...formData, certificateOfAnalysis: '' }); setCoaFile(null); setCoaUploaded(false); }} className="text-red-500 hover:text-red-700">✕</button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </FormSection>

                {/* Section 4: Storage */}
                <FormSection title="التخزين" icon={ArchiveBoxIcon} color="gray">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <FormField label="موقع التخزين">
                            <input type="text" value={formData.storageLocation} onChange={(e) => setFormData({ ...formData, storageLocation: e.target.value })} placeholder="مستودع A" className={inputClass} />
                        </FormField>
                        <FormField label="ظروف التخزين">
                            <select value={formData.storageCondition} onChange={(e) => setFormData({ ...formData, storageCondition: e.target.value })} className={selectClass}>
                                <option value="">اختر</option>
                                <option value="درجة حرارة الغرفة">درجة حرارة الغرفة</option>
                                <option value="تبريد (2-8°C)">تبريد (2-8°C)</option>
                                <option value="تجميد (-18°C)">تجميد (-18°C)</option>
                            </select>
                        </FormField>
                    </div>
                </FormSection>

                {/* Section 5: Vehicle Inspection */}
                <FormSection title="فحص سيارة النقل" icon={TruckIcon} color="orange">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                        <FormField label="نوع السيارة">
                            <select
                                value={vehicleInspection.vehicleType}
                                onChange={(e) => {
                                    const nextVehicleType = e.target.value;
                                    setVehicleInspection(prev => ({
                                        ...prev,
                                        vehicleType: nextVehicleType,
                                        temperature: nextVehicleType === 'سيارة مبردة' ? prev.temperature : ''
                                    }));
                                }}
                                className={selectClass}
                            >
                                <option value="">اختر</option>
                                <option value="شاحنة">شاحنة</option>
                                <option value="سيارة مبردة">سيارة مبردة</option>
                                <option value="سيارة عادية">سيارة عادية</option>
                                <option value="صهريج">صهريج</option>
                            </select>
                        </FormField>
                        {vehicleInspection.vehicleType === 'سيارة مبردة' && (
                            <FormField label="درجة الحرارة °C">
                                <input type="number" value={vehicleInspection.temperature} onChange={(e) => setVehicleInspection({ ...vehicleInspection, temperature: e.target.value })} placeholder="4" className={inputClass} />
                            </FormField>
                        )}
                    </div>
                    {/* Visual Checks - Compact */}
                    <div className="grid grid-cols-5 gap-2">
                        {[
                            { key: 'cleanliness', label: 'نظافة السيارة' },
                            { key: 'noOdors', label: 'خالية من الروائح' },
                            { key: 'noContaminants', label: 'خالية من الملوثات' },
                            { key: 'packagingIntact', label: 'سلامة التعبئة' },
                            { key: 'temperatureOk', label: 'الحرارة مناسبة' }
                        ].map(item => (
                            <div key={item.key} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-2 text-center">
                                <label className="block text-[10px] text-gray-500 mb-1">{item.label}</label>
                                <div className="flex gap-1 justify-center">
                                    <button type="button" onClick={() => setVehicleInspection({ ...vehicleInspection, [item.key]: 'pass' })}
                                        className={`w-8 h-8 text-sm rounded-lg font-bold ${vehicleInspection[item.key as keyof typeof vehicleInspection] === 'pass' ? 'bg-green-500 text-white' : 'bg-white border border-gray-300 text-gray-500'}`}>✓</button>
                                    <button type="button" onClick={() => setVehicleInspection({ ...vehicleInspection, [item.key]: 'fail' })}
                                        className={`w-8 h-8 text-sm rounded-lg font-bold ${vehicleInspection[item.key as keyof typeof vehicleInspection] === 'fail' ? 'bg-red-500 text-white' : 'bg-white border border-gray-300 text-gray-500'}`}>✗</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </FormSection>

                {/* Section 6: Required Tests (if any) */}
                {selectedRawMaterialId && requiredTests.length > 0 && (
                    <FormSection title={`معايير الفحص (${requiredTests.length})`} icon={ClipboardDocumentListIcon} color="blue">
                        <div className="overflow-x-auto">
                            <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${Math.min(requiredTests.length, 4)}, minmax(200px, 1fr))` }}>
                                {requiredTests.map((test, testIndex) => (
                                    <div key={test.testName || testIndex} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg overflow-hidden">
                                        <div className={`px-3 py-2 border-b-2 ${test.testType === 'chemical' ? 'border-blue-400 bg-blue-50' : test.testType === 'physical' ? 'border-green-400 bg-green-50' : test.testType === 'microbiological' ? 'border-purple-400 bg-purple-50' : 'border-orange-400 bg-orange-50'}`}>
                                            <span className="text-xs font-semibold text-gray-900">{test.testName}</span>
                                            {test.required && <span className="text-[10px] bg-red-100 text-red-600 px-1 rounded mr-1">مطلوب</span>}
                                        </div>
                                        <div className="p-2 space-y-2">
                                            {test.parameters?.map((param: any, paramIndex: number) => {
                                                const resultKey = `${testIndex}-${paramIndex}`;
                                                const currentValue = testResults[resultKey] || '';
                                                const paramType = param.type || 'numeric';
                                                const isOutOfRange = paramType === 'numeric' && currentValue !== '' && !isNaN(parseFloat(currentValue)) && (
                                                    (param.min !== undefined && parseFloat(currentValue) < parseFloat(param.min)) ||
                                                    (param.max !== undefined && parseFloat(currentValue) > parseFloat(param.max))
                                                );
                                                return (
                                                    <div key={param.name || paramIndex} className="bg-white dark:bg-gray-800 rounded p-2 border border-gray-200">
                                                        <label className="block text-[10px] text-gray-500 mb-1">
                                                            {param.name} {param.unit && <span className="text-gray-400">({param.unit})</span>}
                                                            {(param.min || param.max) && <span className="text-gray-400 mr-1" dir="ltr">[{param.min ?? '∞'}-{param.max ?? '∞'}]</span>}
                                                        </label>
                                                        {paramType === 'numeric' && (
                                                            <input type="text" placeholder="النتيجة" value={currentValue} onChange={(e) => handleTestResultChange(testIndex, paramIndex, e.target.value)}
                                                                className={`w-full px-2 py-1 text-sm border rounded ${isOutOfRange ? 'border-red-500 bg-red-50' : 'border-gray-300'}`} />
                                                        )}
                                                        {paramType === 'passfail' && (
                                                            <div className="flex gap-1">
                                                                <button type="button" onClick={() => handleTestResultChange(testIndex, paramIndex, 'pass')}
                                                                    className={`flex-1 py-1 text-xs rounded ${currentValue === 'pass' ? 'bg-green-100 border border-green-500 text-green-700' : 'border border-gray-300'}`}>✓</button>
                                                                <button type="button" onClick={() => handleTestResultChange(testIndex, paramIndex, 'fail')}
                                                                    className={`flex-1 py-1 text-xs rounded ${currentValue === 'fail' ? 'bg-red-100 border border-red-500 text-red-700' : 'border border-gray-300'}`}>✗</button>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </FormSection>
                )}

                {/* Section 7: Notes (Bottom, Separate) */}
                <FormSection title="ملاحظات عامة" icon={DocumentTextIcon} color="yellow">
                    <textarea
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        rows={3}
                        placeholder="أي ملاحظات إضافية على الاستلام أو المادة..."
                        className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 focus:ring-2 focus:ring-yellow-500"
                    />
                </FormSection>

                {/* Section 8: Final Decision & Actions */}
                <div className="bg-white dark:bg-gray-800 rounded-xl border-2 border-gray-300 dark:border-gray-600 p-4">
                    <div className="flex items-center justify-between flex-wrap gap-4">
                        <div className="flex items-center gap-3">
                            <UserCircleIcon className="w-5 h-5 text-gray-400" />
                            <div className="text-sm">
                                <span className="text-gray-500">المستلم: </span>
                                <span className="font-medium text-gray-900 dark:text-white">{profile?.name || profile?.email?.split('@')[0] || 'غير محدد'}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                                <span className="text-gray-500">تاريخ الاستلام: </span>
                                <input
                                    type="date"
                                    value={formData.receivedAt || ''}
                                    onChange={(e) => setFormData({ ...formData, receivedAt: e.target.value })}
                                    className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 text-gray-900 dark:text-white"
                                />
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">النتيجة:</span>
                            <div className="flex gap-1">
                                <button type="button" onClick={() => setOverallResult('pending')}
                                    className={`px-3 py-1.5 text-xs rounded-lg border font-medium ${overallResult === 'pending' ? 'bg-yellow-100 border-yellow-400 text-yellow-700' : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'}`}>
                                    ⏳ معلق
                                </button>
                                <button type="button" onClick={() => setOverallResult('accepted')}
                                    className={`px-3 py-1.5 text-xs rounded-lg border font-medium ${overallResult === 'accepted' ? 'bg-green-100 border-green-400 text-green-700' : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'}`}>
                                    ✓ مقبول
                                </button>
                                <button type="button" onClick={() => setOverallResult('rejected')}
                                    className={`px-3 py-1.5 text-xs rounded-lg border font-medium ${overallResult === 'rejected' ? 'bg-red-100 border-red-400 text-red-700' : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'}`}>
                                    ✗ مرفوض
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Submit Buttons */}
                <div className="flex justify-end gap-3 pt-2 pb-4">
                    <button type="button" onClick={() => navigate(isEditMode ? `/lab/receiving/${editId}` : '/lab/receiving')} disabled={isSubmitting}
                        className="px-5 py-2.5 text-sm text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg font-medium transition-colors">
                        إلغاء
                    </button>
                    <button type="submit" disabled={isSubmitting || !formData.materialName || !formData.batchNumber}
                        className={`px-6 py-2.5 text-sm text-white rounded-lg flex items-center gap-2 font-medium disabled:opacity-50 transition-colors ${isEditMode ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'}`}>
                        {isSubmitting ? (
                            <><ArrowPathIcon className="w-4 h-4 animate-spin" />جاري الحفظ...</>
                        ) : isEditMode ? (
                            <><CheckCircleIcon className="w-4 h-4" />حفظ التعديلات</>
                        ) : (
                            <><TruckIcon className="w-4 h-4" />تسجيل الاستلام</>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default NewMaterialReceivingPage;
