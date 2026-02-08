/**
 * Test Config List Component (الإصدار الصحيح)
 * قائمة تكوينات الفحوصات
 */

import React, { useState, useEffect } from 'react';
import { Plus, Search, FlaskConical, Clock, Settings2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { labTestConfigService } from '../../services/labTestConfigService';
import type { LabTestConfig } from '../../types/labTests';

const TestConfigList: React.FC = () => {
    const navigate = useNavigate();
    const [configs, setConfigs] = useState<LabTestConfig[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        loadConfigs();
    }, []);

    const loadConfigs = async () => {
        setLoading(true);
        try {
            const data = await labTestConfigService.getAllConfigs();
            setConfigs(data);
        } catch (error) {
            console.error('Failed to load configs:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = async (query: string) => {
        setSearchQuery(query);
        if (query.trim() === '') {
            loadConfigs();
            return;
        }

        setLoading(true);
        try {
            const data = await labTestConfigService.searchConfigs(query);
            setConfigs(data);
        } catch (error) {
            console.error('Search failed:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-xl font-semibold text-gray-900">Test Configurations</h2>
                    <p className="text-sm text-gray-500 mt-1">تكوينات الفحوصات</p>
                </div>
                <button
                    onClick={() => navigate('/lab/config/new')}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                    <Plus className="h-5 w-5" />
                    <span>New Test Config</span>
                </button>
            </div>

            {/* Search Bar */}
            <div className="mb-6">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search tests... (ابحث عن فحص...)"
                        value={searchQuery}
                        onChange={(e) => handleSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                </div>
            </div>

            {/* Configs List */}
            {loading ? (
                <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
                    <p className="text-gray-500 mt-4">Loading...</p>
                </div>
            ) : configs.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                    <FlaskConical className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">
                        {searchQuery ? 'No tests found' : 'No test configurations yet'}
                    </p>
                    <p className="text-sm text-gray-400 mt-1">
                        {searchQuery ? 'لا توجد نتائج' : 'لا توجد تكوينات بعد'}
                    </p>
                    {!searchQuery && (
                        <button
                            onClick={() => navigate('/lab/config/new')}
                            className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                        >
                            Create First Test Config
                        </button>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {configs.map((config) => (
                        <div
                            key={config.id}
                            onClick={() => navigate(`/lab/config/${config.id}`)}
                            className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-lg hover:border-purple-300 transition-all cursor-pointer group"
                        >
                            {/* Header */}
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-purple-100 rounded-lg group-hover:bg-purple-200 transition-colors">
                                        <FlaskConical className="h-5 w-5 text-purple-600" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-gray-900 group-hover:text-purple-600 transition-colors">
                                            {config.name}
                                        </h3>
                                        <p className="text-sm text-gray-500">{config.name_ar}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Category & Type */}
                            <div className="mb-3">
                                <div className="flex items-center gap-2 text-xs text-gray-600">
                                    <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded">
                                        {config.test_type?.category?.name}
                                    </span>
                                    <span>›</span>
                                    <span className="px-2 py-1 bg-green-50 text-green-700 rounded">
                                        {config.test_type?.name}
                                    </span>
                                </div>
                            </div>

                            {/* Code */}
                            <p className="text-xs text-gray-500 mb-3">Code: {config.code}</p>

                            {/* Metadata */}
                            <div className="flex items-center gap-4 text-xs text-gray-600">
                                {config.fields && (
                                    <div className="flex items-center gap-1">
                                        <Settings2 className="h-3.5 w-3.5" />
                                        <span>{config.fields.length} fields</span>
                                    </div>
                                )}
                                {config.estimated_duration_minutes && (
                                    <div className="flex items-center gap-1">
                                        <Clock className="h-3.5 w-3.5" />
                                        <span>{config.estimated_duration_minutes} min</span>
                                    </div>
                                )}
                                {config.requires_approval && (
                                    <div className="px-1.5 py-0.5 bg-yellow-50 text-yellow-700 rounded text-xs">
                                        Approval Required
                                    </div>
                                )}
                            </div>

                            {/* Method */}
                            {config.method && (
                                <p className="text-xs text-gray-500 mt-3 line-clamp-2">
                                    Method: {config.method}
                                </p>
                            )}

                            {/* Status */}
                            {!config.is_active && (
                                <div className="mt-3 px-2 py-1 bg-red-50 text-red-700 text-xs rounded inline-block">
                                    Inactive
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Summary */}
            {configs.length > 0 && (
                <div className="mt-6 text-sm text-gray-500 text-center">
                    Showing {configs.length} test configuration{configs.length !== 1 ? 's' : ''}
                </div>
            )}
        </div>
    );
};

export default TestConfigList;
