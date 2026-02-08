import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    PlusIcon,
    PlayIcon,
    StopIcon,
    ClockIcon,
    ArchiveBoxIcon,
    BeakerIcon
} from '@heroicons/react/24/outline';
import { productionService, type ProductionBatch } from '../../services/productionService';
import { useToastStore } from '../../store/toastStore';
import { InlineLoading, FullPageLoading } from '../../components/common/LoadingStates';
import { cn } from '../../utils';

export default function ProductionDashboard() {
    const navigate = useNavigate();
    const { error: toastError } = useToastStore();
    const [activeBatches, setActiveBatches] = useState<ProductionBatch[]>([]);
    const [loading, setLoading] = useState(true);

    const loadData = async () => {
        setLoading(true);
        try {
            const data = await productionService.getActiveBatches();
            setActiveBatches(data);
        } catch (error) {
            console.error(error);
            toastError('خطأ', 'فشل تحميل التشغيلات النشطة');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const getShiftColor = (shift: string) => {
        switch (shift) {
            case 'A': return 'bg-blue-100 text-blue-800 border-blue-200';
            case 'B': return 'bg-purple-100 text-purple-800 border-purple-200';
            case 'C': return 'bg-orange-100 text-orange-800 border-orange-200';
            default: return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <BeakerIcon className="w-8 h-8 text-primary-600" />
                        سجلات الإنتاج
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                        إدارة وتتبع تشغيلات الإنتاج والورديات
                    </p>
                </div>
                <div className="flex gap-2">
                    <button
                        // onClick={() => setShowNewModal(true)} // TODO: Implement Modal
                        onClick={() => navigate('/production/new')}
                        className="btn-primary flex items-center gap-2"
                    >
                        <PlusIcon className="w-5 h-5" />
                        تشغيلة جديدة
                    </button>
                    <button
                        onClick={() => navigate('/production/history')}
                        className="btn-secondary flex items-center gap-2"
                    >
                        <ArchiveBoxIcon className="w-5 h-5" />
                        الأرشيف
                    </button>
                </div>
            </div>

            {/* Active Batches Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {loading ? (
                    <div className="col-span-full flex justify-center py-12">
                        <FullPageLoading />
                    </div>
                ) : activeBatches.length > 0 ? (
                    activeBatches.map(batch => (
                        <div
                            key={batch.id}
                            onClick={() => navigate(`/production/${batch.id}`)}
                            className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 cursor-pointer hover:shadow-md transition-shadow relative overflow-hidden group"
                        >
                            {/* Running Indicator */}
                            <div className="absolute top-0 left-0 w-1 h-full bg-green-500"></div>

                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <h3 className="font-bold text-lg text-gray-900 dark:text-white">
                                        {batch.product_name}
                                    </h3>
                                    <p className="text-xs text-gray-500 font-mono mt-1">
                                        #{batch.batch_number}
                                    </p>
                                </div>
                                <span className={cn(
                                    "px-2 py-1 rounded text-xs font-bold border",
                                    getShiftColor(batch.shift)
                                )}>
                                    وردية {batch.shift}
                                </span>
                            </div>

                            <div className="space-y-2 mb-4">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">الكمية المنتجة:</span>
                                    <span className="font-bold text-gray-900 dark:text-white">
                                        {batch.actual_quantity} {batch.uom}
                                    </span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">مشرف الوردية:</span>
                                    <span className="text-gray-900 dark:text-white truncate max-w-[150px]">
                                        {batch.operator_name || '-'}
                                    </span>
                                </div>
                            </div>

                            <div className="pt-3 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center">
                                <span className="text-xs text-gray-400 flex items-center gap-1">
                                    <ClockIcon className="w-3.5 h-3.5" />
                                    {new Date(batch.created_at).toLocaleTimeString('ar-EG')}
                                </span>
                                <span className="text-xs font-medium text-green-600 flex items-center gap-1 animate-pulse">
                                    <PlayIcon className="w-3.5 h-3.5" />
                                    جاري التشغيل
                                </span>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="col-span-full py-12 text-center bg-gray-50 dark:bg-gray-800/50 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700">
                        <BeakerIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white">لا توجد تشغيلات نشطة</h3>
                        <p className="text-gray-500 dark:text-gray-400">ابدأ وردية جديدة لتسجيل الإنتاج</p>
                    </div>
                )}
            </div>
        </div>
    );
}
