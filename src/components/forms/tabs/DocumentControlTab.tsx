import React from 'react';
import type { FormTemplate } from '../../../types';

interface DocumentControlTabProps {
    template: FormTemplate;
    onChange: (updates: Partial<FormTemplate>) => void;
}

const formatDateForDisplay = (value?: string): string => {
    const trimmed = (value || '').trim();
    if (!trimmed) {
        return '';
    }

    const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (isoMatch) {
        return `${isoMatch[3]}/${isoMatch[2]}/${isoMatch[1]}`;
    }

    return trimmed;
};

const toDateInputValue = (value?: string): string => {
    const trimmed = (value || '').trim();
    if (!trimmed) {
        return '';
    }

    const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (isoMatch) {
        return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
    }

    const slashMatch = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (slashMatch) {
        return `${slashMatch[3]}-${slashMatch[2]}-${slashMatch[1]}`;
    }

    return '';
};

const fromDateInputValue = (value: string): string => {
    const trimmed = value.trim();
    if (!trimmed) {
        return '';
    }

    const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!isoMatch) {
        return '';
    }

    return `${isoMatch[3]}/${isoMatch[2]}/${isoMatch[1]}`;
};

const blockManualDateEntry = (event: React.KeyboardEvent<HTMLInputElement>) => {
    event.preventDefault();
};

const preventDatePasteDrop = (
    event: React.ClipboardEvent<HTMLInputElement> | React.DragEvent<HTMLInputElement>
) => {
    event.preventDefault();
};

const showNativeDatePicker = (
    event: React.FocusEvent<HTMLInputElement> | React.MouseEvent<HTMLInputElement>
) => {
    const input = event.currentTarget as HTMLInputElement & { showPicker?: () => void };
    if (typeof input.showPicker === 'function') {
        input.showPicker();
    }
};

const DocumentControlTab: React.FC<DocumentControlTabProps> = ({ template, onChange }) => {
    const handleDocumentChange = (field: string, value: string) => {
        onChange({
            document_control: {
                ...template.document_control,
                [field]: value,
            } as any,
        });
    };

    return (
        <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    التحكم في الوثيقة
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            رمز الوثيقة
                        </label>
                        <input
                            type="text"
                            value={template.document_control?.doc_code || ''}
                            onChange={(e) => handleDocumentChange('doc_code', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                            placeholder="QA-FM-01"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            رقم الإصدار
                        </label>
                        <input
                            type="text"
                            value={template.document_control?.issue_no || ''}
                            onChange={(e) => handleDocumentChange('issue_no', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                            placeholder="01"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            رقم المراجعة
                        </label>
                        <input
                            type="text"
                            value={template.document_control?.review_no || ''}
                            onChange={(e) => handleDocumentChange('review_no', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                            placeholder="00"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            تاريخ الإصدار
                        </label>
                        <input
                            type="date"
                            value={toDateInputValue(template.document_control?.issue_date)}
                            onChange={(e) => handleDocumentChange('issue_date', fromDateInputValue(e.target.value))}
                            onKeyDown={blockManualDateEntry}
                            onPaste={preventDatePasteDrop}
                            onDrop={preventDatePasteDrop}
                            onFocus={showNativeDatePicker}
                            onClick={showNativeDatePicker}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            تاريخ المراجعة
                        </label>
                        <input
                            type="date"
                            value={toDateInputValue(template.document_control?.review_date)}
                            onChange={(e) => handleDocumentChange('review_date', fromDateInputValue(e.target.value))}
                            onKeyDown={blockManualDateEntry}
                            onPaste={preventDatePasteDrop}
                            onDrop={preventDatePasteDrop}
                            onFocus={showNativeDatePicker}
                            onClick={showNativeDatePicker}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                        />
                    </div>
                </div>
            </div>

            {/* Preview of Document Header */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    معاينة رأس الوثيقة
                </h3>

                <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-4 bg-gray-50 dark:bg-gray-900">
                    <div className="grid grid-cols-5 gap-2 text-sm">
                        <div className="text-center p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800">
                            <div className="text-gray-500 dark:text-gray-400 text-xs">رمز الوثيقة</div>
                            <div className="font-semibold text-gray-900 dark:text-white">
                                {template.document_control?.doc_code || '-'}
                            </div>
                        </div>
                        <div className="text-center p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800">
                            <div className="text-gray-500 dark:text-gray-400 text-xs">رقم الإصدار</div>
                            <div className="font-semibold text-gray-900 dark:text-white">
                                {template.document_control?.issue_no || '-'}
                            </div>
                        </div>
                        <div className="text-center p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800">
                            <div className="text-gray-500 dark:text-gray-400 text-xs">رقم المراجعة</div>
                            <div className="font-semibold text-gray-900 dark:text-white">
                                {template.document_control?.review_no || '-'}
                            </div>
                        </div>
                        <div className="text-center p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800">
                            <div className="text-gray-500 dark:text-gray-400 text-xs">تاريخ الإصدار</div>
                            <div className="font-semibold text-gray-900 dark:text-white">
                                {formatDateForDisplay(template.document_control?.issue_date) || '-'}
                            </div>
                        </div>
                        <div className="text-center p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800">
                            <div className="text-gray-500 dark:text-gray-400 text-xs">تاريخ المراجعة</div>
                            <div className="font-semibold text-gray-900 dark:text-white">
                                {formatDateForDisplay(template.document_control?.review_date) || '-'}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DocumentControlTab;
