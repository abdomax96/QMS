/**
 * JoditDocumentEditor - Simple A4 document editor
 * Toolbar inside Jodit (natural behavior)
 * Header/Footer: PRINT ONLY
 */

import React, { useRef, useMemo, useCallback } from 'react';
import JoditEditor from 'jodit-react';
import './JoditDocumentEditor.css';
import { VariableSelectorModal } from './variables/VariableSelectorModal';
import { type DocumentVariable } from '../../types/variables';
import { useState } from 'react';

interface DocumentInfo {
    document_number?: string;
    title?: string;
    version?: number;
    company_name?: string;
}

interface JoditDocumentEditorProps {
    content?: string;
    onChange?: (content: string) => void;
    editable?: boolean;
    documentInfo?: DocumentInfo;
    showHeader?: boolean;
    showFooter?: boolean;
}

export default function JoditDocumentEditor({
    content = '',
    onChange,
    editable = true,
    documentInfo,
    showHeader = true,
    showFooter = true
}: JoditDocumentEditorProps) {
    const editorRef = useRef<any>(null);
    const [isVariableSelectorOpen, setIsVariableSelectorOpen] = useState(false);

    const config = useMemo(() => ({
        readonly: !editable,
        placeholder: 'ابدأ الكتابة هنا...',
        direction: 'rtl' as const,
        language: 'ar',

        toolbar: true,
        toolbarSticky: true,
        toolbarStickyOffset: 0,
        toolbarButtonSize: 'middle' as const,
        toolbarAdaptive: false,

        width: '100%',
        height: 'auto',
        minHeight: 500,

        buttons: [
            'bold', 'italic', 'underline', 'strikethrough', '|',
            'font', 'fontsize', 'brush', '|',
            'paragraph', 'align', '|',
            'ul', 'ol', '|',
            'table', 'link', 'image', '|',
            'hr', 'symbols', '|',
            'undo', 'redo', '|',
            {
                name: 'insertVariable',
                tooltip: 'إدراج متغير',
                icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 21s-4-3-4-9 4-9 4-9"/><path d="M16 3s4 3 4 9-4 9-4 9"/><line x1="15" x2="9" y1="9" y2="15"/><line x1="9" x2="15" y1="9" y2="15"/></svg>',
                exec: (editor: any) => {
                    setIsVariableSelectorOpen(true);
                }
            }
        ],

        showCharsCounter: false,
        showWordsCounter: false,
        showXPathInStatusbar: false,
        statusbar: false,

        style: {
            fontFamily: 'Arial, Tahoma, sans-serif',
            fontSize: '14px',
            textAlign: 'right',
            direction: 'rtl'
        },

        imageDefaultWidth: 300,
        askBeforePasteHTML: false,
        askBeforePasteFromWord: false,
        spellcheck: false,
    }), [editable]);

    const handleChange = useCallback((newContent: string) => {
        onChange?.(newContent);
    }, [onChange]);

    return (
        <div className="jodit-document-editor">
            {/* Print Header */}
            {showHeader && documentInfo && (
                <div className="print-header" dir="rtl">
                    <span>رقم الوثيقة: {documentInfo.document_number || '---'}</span>
                    <span className="header-title">{documentInfo.title || 'عنوان الوثيقة'}</span>
                    <span>الإصدار: {documentInfo.version || 1}</span>
                </div>
            )}

            {/* Jodit Editor */}
            <JoditEditor
                ref={editorRef}
                value={content}
                config={config}
                onBlur={handleChange}
                onChange={() => { }}
            />

            {/* Print Footer */}
            {showFooter && documentInfo && (
                <div className="print-footer" dir="rtl">
                    <span>{documentInfo.company_name || 'اسم الشركة'}</span>
                    <span>صفحة 1 من 1</span>
                    <span>{new Date().toLocaleDateString('ar-EG')}</span>
                </div>
            )}

            <VariableSelectorModal
                isOpen={isVariableSelectorOpen}
                onClose={() => setIsVariableSelectorOpen(false)}
                onSelect={(variable) => {
                    if (editorRef.current) {
                        editorRef.current.selection.insertHTML(`{{${variable.name}}}`);
                    }
                    setIsVariableSelectorOpen(false);
                }}
            />
        </div>
    );
}
