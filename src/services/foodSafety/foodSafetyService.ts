/**
 * Food Safety Service
 * خدمة سلامة الغذاء - HACCP, Temperature, Sanitation
 */

import { supabase } from '../../config/supabase';
import type {
    ControlPoint,
    MonitoringRecord,
    CorrectiveActionRecord,
    TemperatureEquipment,
    TemperatureReading,
    SanitationArea,
    CleaningRecord,
    PreOperationCheck,
    FoodSafetyStats
} from '../../types/foodSafety';

const TABLES = {
    CONTROL_POINTS: 'control_points',
    MONITORING_RECORDS: 'monitoring_records',
    CORRECTIVE_ACTIONS: 'corrective_actions',
    TEMPERATURE_EQUIPMENT: 'temperature_equipment',
    TEMPERATURE_READINGS: 'temperature_readings',
    SANITATION_AREAS: 'sanitation_areas',
    CLEANING_RECORDS: 'cleaning_records',
    PRE_OP_CHECKS: 'pre_op_checks'
};

// ==================== Control Points (HACCP) ====================

export const controlPointsService = {
    async getAll(): Promise<ControlPoint[]> {
        const { data, error } = await supabase.from(TABLES.CONTROL_POINTS).select('id, name, type, location, hazard_type, critical_limits, monitoring_procedure, corrective_action, frequency, responsible_person, is_active, created_at, updated_at');
        if (error) throw error;
        return (data || []).map(mapToControlPoint);
    },

    async getActive(): Promise<ControlPoint[]> {
        const { data, error } = await supabase
            .from(TABLES.CONTROL_POINTS)
            .select('id, name, type, location, hazard_type, critical_limits, monitoring_procedure, corrective_action, frequency, responsible_person, is_active, created_at, updated_at')
            .eq('is_active', true);
        if (error) throw error;
        return (data || []).map(mapToControlPoint);
    },

    async create(data: Omit<ControlPoint, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
        const now = new Date().toISOString();
        const { data: inserted, error } = await supabase.from(TABLES.CONTROL_POINTS).insert({
            ...mapFromControlPoint(data),
            created_at: now,
            updated_at: now
        }).select('id').single();
        if (error) throw error;
        return inserted.id;
    },

    async update(id: string, data: Partial<ControlPoint>): Promise<void> {
        await supabase.from(TABLES.CONTROL_POINTS).update({
            ...mapFromControlPoint(data),
            updated_at: new Date().toISOString()
        }).eq('id', id);
    },

    async delete(id: string): Promise<void> {
        await supabase.from(TABLES.CONTROL_POINTS).delete().eq('id', id);
    },

    subscribe(callback: (points: ControlPoint[]) => void): () => void {
        // Initial load
        this.getAll().then(callback);

        // Subscribe to changes
        const channel = supabase
            .channel('control-points-channel')
            .on('postgres_changes', { event: '*', schema: 'public', table: TABLES.CONTROL_POINTS }, () => {
                this.getAll().then(callback);
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }
};

function mapToControlPoint(row: any): ControlPoint {
    return {
        id: row.id,
        name: row.name,
        type: row.type,
        location: row.location,
        hazardType: row.hazard_type,
        criticalLimits: row.critical_limits,
        monitoringProcedure: row.monitoring_procedure,
        correctiveAction: row.corrective_action,
        frequency: row.frequency,
        responsiblePerson: row.responsible_person,
        isActive: row.is_active,
        createdAt: row.created_at,
        updatedAt: row.updated_at
    };
}

function mapFromControlPoint(data: Partial<ControlPoint>): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    if (data.name !== undefined) result.name = data.name;
    if (data.type !== undefined) result.type = data.type;
    if (data.location !== undefined) result.location = data.location;
    if (data.hazardType !== undefined) result.hazard_type = data.hazardType;
    if (data.criticalLimits !== undefined) result.critical_limits = data.criticalLimits;
    if (data.monitoringProcedure !== undefined) result.monitoring_procedure = data.monitoringProcedure;
    if (data.correctiveAction !== undefined) result.corrective_action = data.correctiveAction;
    if (data.frequency !== undefined) result.frequency = data.frequency;
    if (data.responsiblePerson !== undefined) result.responsible_person = data.responsiblePerson;
    if (data.isActive !== undefined) result.is_active = data.isActive;
    return result;
}

// ==================== Monitoring Records ====================

export const monitoringService = {
    async getByControlPoint(controlPointId: string): Promise<MonitoringRecord[]> {
        const { data, error } = await supabase
            .from(TABLES.MONITORING_RECORDS)
            .select('id, control_point_id, recorded_at, value, unit, is_compliant, recorded_by, verified_by, verified_at, notes')
            .eq('control_point_id', controlPointId)
            .order('recorded_at', { ascending: false })
            .limit(100);
        if (error) throw error;
        return (data || []).map(mapToMonitoringRecord);
    },

    async getToday(): Promise<MonitoringRecord[]> {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const { data, error } = await supabase
            .from(TABLES.MONITORING_RECORDS)
            .select('id, control_point_id, recorded_at, value, unit, is_compliant, recorded_by, verified_by, verified_at, notes')
            .gte('recorded_at', today.toISOString())
            .order('recorded_at', { ascending: false });
        if (error) throw error;
        return (data || []).map(mapToMonitoringRecord);
    },

    async create(data: Omit<MonitoringRecord, 'id'>): Promise<string> {
        const { data: inserted, error } = await supabase.from(TABLES.MONITORING_RECORDS).insert({
            control_point_id: data.controlPointId,
            recorded_at: data.timestamp,
            value: data.value,
            unit: data.unit,
            is_compliant: data.isCompliant,
            recorded_by: data.recordedBy,
            notes: data.notes
        }).select('id').single();
        if (error) throw error;
        return inserted.id;
    },

    async verify(id: string, verifiedBy: string): Promise<void> {
        await supabase.from(TABLES.MONITORING_RECORDS).update({
            verified_by: verifiedBy,
            verified_at: new Date().toISOString()
        }).eq('id', id);
    }
};

function mapToMonitoringRecord(row: any): MonitoringRecord {
    return {
        id: row.id,
        controlPointId: row.control_point_id,
        timestamp: row.recorded_at,
        value: row.value,
        unit: row.unit,
        isCompliant: row.is_compliant,
        recordedBy: row.recorded_by,
        verifiedBy: row.verified_by,
        verifiedAt: row.verified_at,
        notes: row.notes
    };
}

// ==================== Corrective Actions ====================

export const correctiveActionsService = {
    async getPending(): Promise<CorrectiveActionRecord[]> {
        const { data, error } = await supabase
            .from(TABLES.CORRECTIVE_ACTIONS)
            .select('id, monitoring_record_id, description, action_taken, responsible_person, status, created_at, completed_at, source_type')
            .eq('source_type', 'haccp')
            .in('status', ['open', 'in_progress']);
        if (error) throw error;
        return (data || []).map(mapToCorrectiveAction);
    },

    async create(data: Omit<CorrectiveActionRecord, 'id'>): Promise<string> {
        const { data: inserted, error } = await supabase.from(TABLES.CORRECTIVE_ACTIONS).insert({
            monitoring_record_id: data.monitoringRecordId,
            description: data.description,
            action_taken: data.actionTaken,
            responsible_person: data.responsiblePerson,
            status: data.status,
            created_at: data.createdAt,
            completed_at: data.completedAt
        }).select('id').single();
        if (error) throw error;
        return inserted.id;
    },

    async updateStatus(id: string, status: CorrectiveActionRecord['status'], updates?: Partial<CorrectiveActionRecord>): Promise<void> {
        await supabase.from(TABLES.CORRECTIVE_ACTIONS).update({
            status,
            ...(updates?.completedAt ? { completed_at: updates.completedAt } : {})
        }).eq('id', id);
    }
};

function mapToCorrectiveAction(row: any): CorrectiveActionRecord {
    return {
        id: row.id,
        monitoringRecordId: row.monitoring_record_id,
        description: row.description,
        actionTaken: row.action_taken,
        responsiblePerson: row.responsible_person,
        status: row.status,
        createdAt: row.created_at,
        completedAt: row.completed_at
    };
}

// ==================== Temperature Equipment & Readings ====================

export const temperatureService = {
    async getEquipment(): Promise<TemperatureEquipment[]> {
        const { data, error } = await supabase.from(TABLES.TEMPERATURE_EQUIPMENT).select('id, name, type, location, min_temp, max_temp, unit, is_active');
        if (error) throw error;
        return (data || []).map(mapToTemperatureEquipment);
    },

    async addEquipment(data: Omit<TemperatureEquipment, 'id'>): Promise<string> {
        const { data: inserted, error } = await supabase.from(TABLES.TEMPERATURE_EQUIPMENT).insert({
            name: data.name,
            type: data.type,
            location: data.location,
            min_temp: data.minTemp,
            max_temp: data.maxTemp,
            unit: data.unit,
            is_active: data.isActive
        }).select('id').single();
        if (error) throw error;
        return inserted.id;
    },

    async recordTemperature(data: Omit<TemperatureReading, 'id'>): Promise<string> {
        const { data: inserted, error } = await supabase.from(TABLES.TEMPERATURE_READINGS).insert({
            equipment_id: data.equipmentId,
            temperature: data.temperature,
            recorded_at: data.timestamp,
            recorded_by: data.recordedBy,
            is_critical: data.isCritical,
            notes: data.notes
        }).select('id').single();
        if (error) throw error;
        return inserted.id;
    },

    async getReadings(equipmentId: string, days: number = 7): Promise<TemperatureReading[]> {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const { data, error } = await supabase
            .from(TABLES.TEMPERATURE_READINGS)
            .select('id, equipment_id, temperature, recorded_at, recorded_by, is_critical, notes')
            .eq('equipment_id', equipmentId)
            .gte('recorded_at', startDate.toISOString())
            .order('recorded_at', { ascending: false })
            .limit(200);

        if (error) throw error;
        return (data || []).map(mapToTemperatureReading);
    },

    async getTodayAlerts(): Promise<TemperatureReading[]> {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const { data, error } = await supabase
            .from(TABLES.TEMPERATURE_READINGS)
            .select('id, equipment_id, temperature, recorded_at, recorded_by, is_critical, notes')
            .eq('is_critical', true)
            .gte('recorded_at', today.toISOString());

        if (error) throw error;
        return (data || []).map(mapToTemperatureReading);
    }
};

function mapToTemperatureEquipment(row: any): TemperatureEquipment {
    return {
        id: row.id,
        name: row.name,
        type: row.type,
        location: row.location,
        minTemp: row.min_temp,
        maxTemp: row.max_temp,
        unit: row.unit,
        isActive: row.is_active
    };
}

function mapToTemperatureReading(row: any): TemperatureReading {
    return {
        id: row.id,
        equipmentId: row.equipment_id,
        temperature: row.temperature,
        timestamp: row.recorded_at,
        recordedBy: row.recorded_by,
        isCritical: row.is_critical,
        notes: row.notes
    };
}

// ==================== Sanitation ====================

export const sanitationService = {
    async getAreas(): Promise<SanitationArea[]> {
        const { data, error } = await supabase.from(TABLES.SANITATION_AREAS).select('id, name, zone, cleaning_frequency, required_chemicals, is_active');
        if (error) throw error;
        return (data || []).map(mapToSanitationArea);
    },

    async addArea(data: Omit<SanitationArea, 'id'>): Promise<string> {
        const { data: inserted, error } = await supabase.from(TABLES.SANITATION_AREAS).insert({
            name: data.name,
            zone: data.zone,
            cleaning_frequency: data.cleaningFrequency,
            required_chemicals: data.requiredChemicals,
            is_active: data.isActive
        }).select('id').single();
        if (error) throw error;
        return inserted.id;
    },

    async getPendingCleaningTasks(): Promise<CleaningRecord[]> {
        const { data, error } = await supabase
            .from(TABLES.CLEANING_RECORDS)
            .select('id, area_id, scheduled_date, completed_date, cleaned_by, verified_by, chemicals_used, status, notes')
            .in('status', ['pending', 'in_progress']);
        if (error) throw error;
        return (data || []).map(mapToCleaningRecord);
    },

    async recordCleaning(data: Omit<CleaningRecord, 'id'>): Promise<string> {
        const { data: inserted, error } = await supabase.from(TABLES.CLEANING_RECORDS).insert({
            area_id: data.areaId,
            scheduled_date: data.scheduledDate,
            completed_date: data.completedDate,
            cleaned_by: data.cleanedBy,
            verified_by: data.verifiedBy,
            chemicals_used: data.chemicalsUsed,
            status: data.status,
            notes: data.notes
        }).select('id').single();
        if (error) throw error;
        return inserted.id;
    },

    async updateCleaningStatus(id: string, updates: Partial<CleaningRecord>): Promise<void> {
        const updateData: Record<string, unknown> = {};
        if (updates.status) updateData.status = updates.status;
        if (updates.completedDate) updateData.completed_date = updates.completedDate;
        if (updates.cleanedBy) updateData.cleaned_by = updates.cleanedBy;
        if (updates.verifiedBy) updateData.verified_by = updates.verifiedBy;

        await supabase.from(TABLES.CLEANING_RECORDS).update(updateData).eq('id', id);
    },

    async recordPreOpCheck(data: Omit<PreOperationCheck, 'id'>): Promise<string> {
        const { data: inserted, error } = await supabase.from(TABLES.PRE_OP_CHECKS).insert({
            production_line: data.productionLine,
            check_date: data.date,
            shift: data.shift,
            checked_by: data.checkedBy,
            items: data.items,
            overall_result: data.overallStatus,
            notes: data.conditionsForProduction
        }).select('id').single();
        if (error) throw error;
        return inserted.id;
    }
};

function mapToSanitationArea(row: any): SanitationArea {
    return {
        id: row.id,
        name: row.name,
        zone: row.zone,
        cleaningFrequency: row.cleaning_frequency,
        requiredChemicals: row.required_chemicals,
        isActive: row.is_active
    };
}

function mapToCleaningRecord(row: any): CleaningRecord {
    return {
        id: row.id,
        areaId: row.area_id,
        scheduledDate: row.scheduled_date,
        completedDate: row.completed_date,
        cleanedBy: row.cleaned_by,
        verifiedBy: row.verified_by,
        chemicalsUsed: row.chemicals_used,
        status: row.status,
        notes: row.notes
    };
}

// ==================== Dashboard Stats ====================

export const foodSafetyStatsService = {
    async getStats(): Promise<FoodSafetyStats> {
        try {
            const [
                controlPoints,
                todayMonitoring,
                pendingActions,
                tempAlerts,
                pendingCleaning
            ] = await Promise.all([
                controlPointsService.getAll().catch(() => []),
                monitoringService.getToday().catch(() => []),
                correctiveActionsService.getPending().catch(() => []),
                temperatureService.getTodayAlerts().catch(() => []),
                sanitationService.getPendingCleaningTasks().catch(() => [])
            ]);

            const activeCCPs = controlPoints.filter(cp => cp.isActive && cp.type === 'CCP');
            const compliantRecords = todayMonitoring.filter(r => r.isCompliant);
            const complianceRate = todayMonitoring.length > 0
                ? (compliantRecords.length / todayMonitoring.length) * 100
                : 100;

            return {
                totalCCPs: controlPoints.filter(cp => cp.type === 'CCP').length,
                activeCCPs: activeCCPs.length,
                todayMonitoringRecords: todayMonitoring.length,
                pendingCorrectiveActions: pendingActions.length,
                temperatureAlerts: tempAlerts.length,
                pendingCleaningTasks: pendingCleaning.length,
                complianceRate: Math.round(complianceRate)
            };
        } catch (error) {
            console.error('Error loading food safety stats:', error);
            return {
                totalCCPs: 0,
                activeCCPs: 0,
                todayMonitoringRecords: 0,
                pendingCorrectiveActions: 0,
                temperatureAlerts: 0,
                pendingCleaningTasks: 0,
                complianceRate: 100
            };
        }
    }
};
