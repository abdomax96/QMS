import React, { useState, useEffect } from 'react';
import { Calendar, Plus, Search, Clock, RefreshCw, X, Save, PlayCircle, PauseCircle } from 'lucide-react';
import { supabase } from '../../config/supabase';
import { labTestConfigService } from '../../services/labTestConfigService';
import type { LabTestSchedule, LabTestConfig, TestScheduleType } from '../../types/labTests';

const TestScheduleManager: React.FC = () => {
    const [schedules, setSchedules] = useState<LabTestSchedule[]>([]);
    const [configs, setConfigs] = useState<LabTestConfig[]>([]);
    const [loading, setLoading] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [saving, setSaving] = useState(false);

    // Form State
    const [configId, setConfigId] = useState('');
    const [scheduleType, setScheduleType] = useState<TestScheduleType>('daily');
    const [frequencyValue, setFrequencyValue] = useState(1);
    const [frequencyUnit, setFrequencyUnit] = useState('days');
    const [startTime, setStartTime] = useState('09:00');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [configsData] = await Promise.all([
                labTestConfigService.getAllConfigs(),
                fetchSchedules()
            ]);
            setConfigs(configsData);
        } catch (error) {
            console.error('Failed to load data:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchSchedules = async () => {
        // Mock fetch or real fetch
        const { data, error } = await supabase
            .from('lab_test_schedules')
            .select('*, test_config:lab_test_configs(name, name_ar)')
            .order('created_at', { ascending: false });

        if (!error && data) {
            setSchedules(data as any);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);

        try {
            const { data: user } = await supabase.auth.getUser();
            const { data: settings } = await supabase.from('settings').select('main_company_id').single();

            const payload = {
                test_config_id: configId,
                schedule_type: scheduleType,
                frequency_value: frequencyValue,
                frequency_unit: frequencyUnit,
                start_time: startTime,
                company_id: settings?.main_company_id,
                created_by: user.user?.id,
                notify_before_minutes: 15,
                auto_create_run: true,
                is_active: true
            };

            const { error } = await supabase
                .from('lab_test_schedules')
                .insert(payload);

            if (error) throw error;

            await fetchSchedules();
            setIsEditing(false);
            resetForm();
        } catch (error) {
            console.error('Failed to save schedule:', error);
            alert('Failed to save schedule');
        } finally {
            setSaving(false);
        }
    };

    const resetForm = () => {
        setConfigId('');
        setScheduleType('daily');
        setFrequencyValue(1);
    };

    const toggleStatus = async (id: string, currentStatus: boolean) => {
        try {
            const { error } = await supabase
                .from('lab_test_schedules')
                .update({ is_active: !currentStatus })
                .eq('id', id);

            if (error) throw error;
            fetchSchedules();
        } catch (error) {
            console.error('Failed to toggle status:', error);
        }
    };

    if (isEditing) {
        return (
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <Clock className="h-6 w-6 text-blue-600" />
                        New Schedule
                    </h2>
                    <button onClick={() => setIsEditing(false)} className="text-gray-500 hover:text-gray-700">
                        <X className="h-6 w-6" />
                    </button>
                </div>

                <form onSubmit={handleSave} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Test Configuration *</label>
                        <select
                            required
                            value={configId}
                            onChange={e => setConfigId(e.target.value)}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">Select Test...</option>
                            {configs.map(config => (
                                <option key={config.id} value={config.id}>{config.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Schedule Type</label>
                            <select
                                required
                                value={scheduleType}
                                onChange={e => setScheduleType(e.target.value as any)}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="daily">Daily</option>
                                <option value="weekly">Weekly</option>
                                <option value="monthly">Monthly</option>
                                <option value="hourly">Hourly</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                            <input
                                type="time"
                                value={startTime}
                                onChange={e => setStartTime(e.target.value)}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t">
                        <button
                            type="button"
                            onClick={() => setIsEditing(false)}
                            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                        >
                            {saving ? 'Saving...' : <><Save className="h-4 w-4" /> Save Schedule</>}
                        </button>
                    </div>
                </form>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search schedules..."
                        className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                </div>
                <button
                    onClick={() => setIsEditing(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                    <Plus className="h-5 w-5" />
                    <span>New Schedule</span>
                </button>
            </div>

            {loading ? (
                <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                </div>
            ) : schedules.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
                    <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No active schedules</p>
                    <p className="text-sm text-gray-400 mt-1">لا توجد جداول زمنية</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {schedules.map(schedule => (
                        <div key={schedule.id} className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 relative group">
                            <div className="flex justify-between items-start mb-3">
                                <div className="p-2 bg-blue-50 rounded-lg">
                                    <Clock className="h-5 w-5 text-blue-600" />
                                </div>
                                <button
                                    onClick={() => toggleStatus(schedule.id, schedule.is_active)}
                                    className={`p-1 rounded-full ${schedule.is_active ? 'text-green-600 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-100'}`}
                                >
                                    {schedule.is_active ? <PauseCircle className="h-6 w-6" /> : <PlayCircle className="h-6 w-6" />}
                                </button>
                            </div>

                            <h3 className="font-bold text-gray-900 mb-1">{schedule.test_config?.name}</h3>
                            <p className="text-sm text-gray-500 mb-3">{schedule.test_config?.name_ar}</p>

                            <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 p-2 rounded">
                                <RefreshCw className="h-4 w-4" />
                                {schedule.schedule_type} • {schedule.start_time}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default TestScheduleManager;
