import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart3, TrendingUp, AlertTriangle, CheckCircle, XCircle, ArrowRight } from 'lucide-react';
import { labTestExecutionService } from '../../services/labTestExecutionService';
import type { TestStatistics } from '../../types/labTests';

const LabAnalyticsPage: React.FC = () => {
    const navigate = useNavigate();
    const [stats, setStats] = useState<TestStatistics | null>(null);
    const [loading, setLoading] = useState(false);
    const [dateRange, setDateRange] = useState('month'); // 'week', 'month', 'year'

    useEffect(() => {
        loadStats();
    }, [dateRange]);

    const loadStats = async () => {
        setLoading(true);
        try {
            // Simplified: In a real app, calculate date range for filters
            const data = await labTestExecutionService.getTestStatistics({});
            setStats(data);
        } catch (error) {
            console.error('Failed to load stats:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    {/* Back Button */}
                    <button
                        onClick={() => navigate(-1)}
                        className="flex items-center gap-2 px-4 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors border border-slate-200 dark:border-slate-700 mb-4"
                    >
                        <ArrowRight className="w-5 h-5" />
                        <span>رجوع</span>
                    </button>
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-100 rounded-lg">
                            <BarChart3 className="h-6 w-6 text-indigo-600" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Lab Analytics</h1>
                            <p className="text-sm text-gray-500 mt-1">تحليلات وإحصائيات المختبر</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                {/* Key Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-medium text-gray-500">Total Tests</h3>
                            <BarChart3 className="h-5 w-5 text-gray-400" />
                        </div>
                        <p className="text-3xl font-bold text-gray-900">{stats?.total_runs || 0}</p>
                        <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
                            <TrendingUp className="h-3 w-3" />
                            +12% from last month
                        </p>
                    </div>

                    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-medium text-gray-500">Pass Rate</h3>
                            <CheckCircle className="h-5 w-5 text-green-500" />
                        </div>
                        <p className="text-3xl font-bold text-gray-900">{stats?.pass_rate || 0}%</p>
                        <p className="text-xs text-gray-500 mt-2">Target: 95%</p>
                    </div>

                    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-medium text-gray-500">Fail Rate</h3>
                            <XCircle className="h-5 w-5 text-red-500" />
                        </div>
                        <p className="text-3xl font-bold text-gray-900">{stats?.fail_rate || 0}%</p>
                        <p className="text-xs text-gray-500 mt-2">Target: &lt;5%</p>
                    </div>

                    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-medium text-gray-500">Pending Actions</h3>
                            <AlertTriangle className="h-5 w-5 text-yellow-500" />
                        </div>
                        <p className="text-3xl font-bold text-gray-900">{stats?.completed || 0}</p>
                        <p className="text-xs text-yellow-600 mt-2">Needs Approval</p>
                    </div>
                </div>

                {/* Charts Area (Placeholder for Chart.js/Recharts) */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 h-80 flex flex-col items-center justify-center text-center">
                        <BarChart3 className="h-12 w-12 text-gray-300 mb-4" />
                        <h3 className="text-lg font-medium text-gray-900">Test Volume Trend</h3>
                        <p className="text-gray-500 text-sm">Chart visualization coming soon</p>
                    </div>
                    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 h-80 flex flex-col items-center justify-center text-center">
                        <XCircle className="h-12 w-12 text-gray-300 mb-4" />
                        <h3 className="text-lg font-medium text-gray-900">Failure Reasons</h3>
                        <p className="text-gray-500 text-sm">Pareto chart coming soon</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LabAnalyticsPage;
