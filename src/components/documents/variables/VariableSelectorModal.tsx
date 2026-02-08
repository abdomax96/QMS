import React, { useState } from 'react';
import { useVariables } from '../../../hooks/useVariables';
import { Search, Variable, X } from 'lucide-react';
import { type DocumentVariable } from '../../../types/variables';

interface VariableSelectorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (variable: DocumentVariable) => void;
}

export const VariableSelectorModal: React.FC<VariableSelectorModalProps> = ({
    isOpen,
    onClose,
    onSelect,
}) => {
    const { data: variables, isLoading } = useVariables();
    const [search, setSearch] = useState('');

    if (!isOpen) return null;

    const filteredVariables = variables?.filter(
        (v) =>
            v.name.toLowerCase().includes(search.toLowerCase()) ||
            v.value.toLowerCase().includes(search.toLowerCase()) ||
            (v.description && v.description.toLowerCase().includes(search.toLowerCase()))
    );

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[80vh]">
                <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
                    <h3 className="font-bold text-lg text-slate-800 dark:text-white flex items-center gap-2">
                        <Variable className="w-5 h-5 text-indigo-500" />
                        Insert Variable
                    </h3>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full text-slate-500"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-4 border-b border-slate-200 dark:border-slate-700">
                    <div className="relative">
                        <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search variables..."
                            className="w-full pl-9 pr-4 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                            autoFocus
                        />
                    </div>
                </div>

                <div className="overflow-y-auto flex-1 p-2">
                    {isLoading ? (
                        <div className="p-4 text-center text-slate-500">Loading...</div>
                    ) : !filteredVariables || filteredVariables.length === 0 ? (
                        <div className="p-8 text-center text-slate-500">
                            No variables found.
                        </div>
                    ) : (
                        <div className="grid gap-2">
                            {filteredVariables.map((variable) => (
                                <button
                                    key={variable.id}
                                    onClick={() => onSelect(variable)}
                                    className="flex items-start justify-between p-3 rounded-lg border border-slate-100 dark:border-slate-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:border-indigo-200 dark:hover:border-indigo-800 transition-all text-left group"
                                >
                                    <div>
                                        <div className="font-mono text-indigo-600 dark:text-indigo-400 font-medium group-hover:underline">
                                            {`{{${variable.name}}}`}
                                        </div>
                                        {variable.description && (
                                            <div className="text-xs text-slate-500 mt-1">{variable.description}</div>
                                        )}
                                    </div>
                                    <div className="text-right">
                                        <div className="font-medium text-slate-800 dark:text-slate-200">
                                            {variable.value}
                                        </div>
                                        {variable.unit && (
                                            <div className="text-xs text-slate-500">{variable.unit}</div>
                                        )}
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
