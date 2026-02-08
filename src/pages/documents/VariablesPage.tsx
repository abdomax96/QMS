import React from 'react';
import { VariablesManager } from '../../components/documents/variables/VariablesManager';

const VariablesPage: React.FC = () => {
    return (
        <div className="container mx-auto px-4 py-6">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Document Variables</h1>
                <p className="text-slate-500 dark:text-slate-400">Manage dynamic variables for use in your documents.</p>
            </div>
            <VariablesManager />
        </div>
    );
};

export default VariablesPage;
