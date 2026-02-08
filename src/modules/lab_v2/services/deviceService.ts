import { supabase } from '../../../config/supabase';
import type { LabV2Device, LabV2DeviceCalibration } from '../types/device.types';
import { getLabV2Context } from './labV2Context';

export const labV2DeviceService = {
  async listDevices(filters?: { search?: string; status?: string }): Promise<LabV2Device[]> {
    const ctx = await getLabV2Context();

    let query = supabase
      .from('lab_v2_devices')
      .select('*')
      .order('created_at', { ascending: false });

    if (ctx.company_id) {
      query = query.eq('company_id', ctx.company_id);
    }

    if (filters?.status) query = query.eq('status', filters.status);
    if (filters?.search) {
      // Basic search across code/name/manufacturer/model/serial_number
      const s = filters.search.trim();
      if (s) {
        query = query.or(
          [
            `code.ilike.%${s}%`,
            `name.ilike.%${s}%`,
            `name_ar.ilike.%${s}%`,
            `manufacturer.ilike.%${s}%`,
            `model.ilike.%${s}%`,
            `serial_number.ilike.%${s}%`,
          ].join(',')
        );
      }
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data || []) as LabV2Device[];
  },

  async getDeviceById(id: string): Promise<(LabV2Device & { calibrations: LabV2DeviceCalibration[] }) | null> {
    const { data, error } = await supabase
      .from('lab_v2_devices')
      .select('*, calibrations:lab_v2_device_calibrations(*)')
      .eq('id', id)
      .single();

    if (error) throw error;
    const calibrations = ((data as any)?.calibrations || []) as LabV2DeviceCalibration[];
    calibrations.sort((a, b) => (a.calibration_date < b.calibration_date ? 1 : -1));
    return { ...(data as LabV2Device), calibrations };
  },

  async createDevice(input: Partial<LabV2Device>): Promise<LabV2Device> {
    const ctx = await getLabV2Context();
    if (!ctx.company_id) throw new Error('Company is not set');

    const { data, error } = await supabase
      .from('lab_v2_devices')
      .insert({
        ...input,
        company_id: ctx.company_id,
        created_by: ctx.user_id,
        updated_by: ctx.user_id,
      })
      .select('*')
      .single();

    if (error) throw error;
    return data as LabV2Device;
  },

  async updateDevice(id: string, updates: Partial<LabV2Device>): Promise<LabV2Device> {
    const ctx = await getLabV2Context();
    const { data, error } = await supabase
      .from('lab_v2_devices')
      .update({
        ...updates,
        updated_by: ctx.user_id,
      })
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;
    return data as LabV2Device;
  },

  async deleteDevice(id: string): Promise<void> {
    const { error } = await supabase.from('lab_v2_devices').delete().eq('id', id);
    if (error) throw error;
  },

  async addCalibration(input: Omit<LabV2DeviceCalibration, 'id' | 'created_at' | 'company_id'> & { device_id: string }): Promise<LabV2DeviceCalibration> {
    const ctx = await getLabV2Context();
    if (!ctx.company_id) throw new Error('Company is not set');

    const { data, error } = await supabase
      .from('lab_v2_device_calibrations')
      .insert({
        ...input,
        company_id: ctx.company_id,
        created_by: ctx.user_id,
      })
      .select('*')
      .single();

    if (error) throw error;

    // Keep the device "calibration_due_date" aligned to latest calibration.
    await supabase
      .from('lab_v2_devices')
      .update({ calibration_due_date: input.next_due_date, updated_by: ctx.user_id })
      .eq('id', input.device_id);

    return data as LabV2DeviceCalibration;
  },
};

