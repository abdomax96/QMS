import React from 'react';
import { VariablesManager } from '../../components/documents/variables/VariablesManager';

const VariablesPage: React.FC = () => {
    return (
        <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6">
            <div className="mb-6">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-white">متغيرات الوثائق</h1>
                <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400">إدارة المتغيرات الديناميكية المستخدمة داخل الوثائق.</p>
            </div>
            <VariablesManager />
        </div>
    );
};

export default VariablesPage;
