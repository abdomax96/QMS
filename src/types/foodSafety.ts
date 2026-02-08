/**
 * Food Safety Types
 * أنواع سلامة الغذاء - HACCP, Temperature, Sanitation
 */

// ==================== HACCP Types ====================

export type HazardType = 'biological' | 'chemical' | 'physical' | 'allergen';
export type ControlPointType = 'CCP' | 'OPRP' | 'PRP' | 'ccp' | 'oprp' | 'prp';
export type MonitoringFrequency = 'continuous' | 'hourly' | 'every_2_hours' | 'every_4_hours' | 'per_batch' | 'daily';

export interface CriticalLimit {
    parameter: string;
    unit: string;
    minValue?: number;
    maxValue?: number;
    targetValue?: number;
}

export interface ControlPoint {
    id: string;
    name: string;
    type: ControlPointType;
    location: string;
    hazardType: HazardType;
    hazardDescription?: string;
    criticalLimits?: CriticalLimit[];
    monitoringProcedure?: string;
    frequency: string; // Changed from monitoringFrequency to match Service
    correctiveAction?: string;
    verificationProcedure?: string;
    responsiblePerson: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface MonitoringRecord {
    id: string;
    controlPointId: string;
    timestamp: string;
    value: number; // Added to match Service
    unit: string; // Added to match Service
    isCompliant: boolean;
    recordedBy: string;
    verifiedBy?: string;
    verifiedAt?: string;
    notes?: string;
}

export interface CorrectiveActionRecord {
    id: string;
    monitoringRecordId?: string;
    description: string;
    actionTaken: string;
    responsiblePerson: string; // Added
    status: 'open' | 'in_progress' | 'completed' | 'verified';
    createdAt: string; // Added
    completedAt?: string;
}

export type EquipmentType = 'refrigerator' | 'freezer' | 'cold_room' | 'hot_holding' | 'cooking' | 'transport';

export interface TemperatureEquipment {
    id: string;
    name: string;
    type: EquipmentType;
    location: string;
    minTemp: number;
    maxTemp: number;
    unit: string; // Added
    monitoringFrequency?: MonitoringFrequency;
    isActive: boolean;
}

export interface TemperatureReading {
    id: string;
    equipmentId: string;
    timestamp: string;
    temperature: number;
    isCritical: boolean;
    recordedBy: string;
    notes?: string;
}
// ==================== Sanitation ====================

export type CleaningFrequency = 'after_use' | 'daily' | 'weekly' | 'monthly' | 'quarterly';
export type CleaningStatus = 'pending' | 'in_progress' | 'completed' | 'verified';

export interface SanitationArea {
    id: string;
    name: string;
    location?: string; // Added for compatibility
    zone: string;
    cleaningFrequency: CleaningFrequency | string;
    requiredChemicals: string[];
    chemicals?: string[]; // Added for compatibility
    responsibleTeam?: string; // Optional
    isActive: boolean;
}

export interface CleaningRecord {
    id: string;
    areaId: string;
    scheduledDate: string;
    completedDate?: string;
    status: CleaningStatus;
    cleanedBy?: string;
    verifiedBy?: string;
    verificationMethod?: string;
    chemicalsUsed?: string[];
    notes?: string;
    issues?: string;
}

export interface PreOperationCheck {
    id: string;
    date: string;
    shift: string;
    productionLine: string;
    items: {
        name: string;
        isOk: boolean;
        notes?: string;
    }[];
    overallStatus: 'pass' | 'fail' | 'conditional';
    conditionsForProduction?: string;
    checkedBy: string;
    approvedBy?: string;
}

// ==================== Allergen Management ====================

export const COMMON_ALLERGENS = [
    'قمح (جلوتين)',
    'حليب ومنتجات الألبان',
    'بيض',
    'سمك',
    'قشريات',
    'مكسرات',
    'فول سوداني',
    'صويا',
    'سمسم',
    'كرفس',
    'خردل',
    'كبريتات'
] as const;

export interface AllergenProfile {
    id: string;
    productName: string;
    productCode: string;
    containsAllergens: string[];
    mayContainAllergens: string[];
    productionLineSharedWith?: string[];
    cleaningVerificationRequired: boolean;
    lastUpdated: string;
    updatedBy: string;
}

// ==================== Dashboard Stats ====================

export interface FoodSafetyStats {
    totalCCPs: number;
    activeCCPs: number;
    todayMonitoringRecords: number;
    pendingCorrectiveActions: number;
    temperatureAlerts: number;
    pendingCleaningTasks: number;
    complianceRate: number;
}
