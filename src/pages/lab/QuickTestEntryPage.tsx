/**
 * Quick Test Entry Page
 * صفحة الإدخال السريع للفحوصات
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRightIcon } from '@heroicons/react/24/outline';
import QuickEntryForm from '../../components/lab/QuickEntryForm';

const QuickTestEntryPage: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-gray-50 py-8 px-4">
            {/* Back Button */}
            <div className="max-w-7xl mx-auto mb-4">
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center gap-2 px-4 py-2 text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 rounded-lg transition-colors border border-slate-200 dark:border-slate-700"
                >
                    <ArrowRightIcon className="w-5 h-5" />
                    <span>رجوع</span>
                </button>
            </div>
            <QuickEntryForm />
        </div>
    );
};

export default QuickTestEntryPage;
