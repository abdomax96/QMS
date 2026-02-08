import React from 'react';
import type { FormTemplate } from '../../../types';
import RichTextEditor from '../../common/RichTextEditor';

interface NotesTabProps {
    template: FormTemplate;
    onChange: (updates: Partial<FormTemplate>) => void;
}

const NotesTab: React.FC<NotesTabProps> = ({ template, onChange }) => {
    return (
        <div className="p-6">
            <div className="max-w-4xl mx-auto">
                <div className="mb-6">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                        ملاحظات النموذج
                    </h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        أضف أي ملاحظات أو تعليمات هامة ستظهر للمستخدم في بداية النموذج وفي تقرير الطباعة
                    </p>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        محتوى الملاحظات
                    </label>
                    <RichTextEditor
                        value={template.notes || ''}
                        onChange={(value) => onChange({ notes: value })}
                        placeholder="اكتب ملاحظاتك هنا..."
                        className="min-h-[400px]"
                    />
                </div>
            </div>
        </div>
    );
};

export default NotesTab;
