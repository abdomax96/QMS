/**
 * Quill Document Editor - A4 style document editor (100% Free)
 * Fixed toolbar with proper scroll behavior
 */

import React, { useRef, useCallback, useMemo } from 'react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import './QuillDocumentEditor.css';

interface DocumentInfo {
    document_number?: string;
    title?: string;
    version?: number;
    company_name?: string;
}

interface QuillDocumentEditorProps {
    content?: string;
    onChange?: (content: string) => void;
    editable?: boolean;
    documentInfo?: DocumentInfo;
    showHeader?: boolean;
    showFooter?: boolean;
}

// Custom toolbar configuration
const toolbarOptions = [
    [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
    [{ 'font': [] }],
    [{ 'size': ['small', false, 'large', 'huge'] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ 'color': [] }, { 'background': [] }],
    [{ 'align': [] }],
    [{ 'list': 'ordered' }, { 'list': 'bullet' }],
    [{ 'indent': '-1' }, { 'indent': '+1' }],
    [{ 'direction': 'rtl' }],
    ['link', 'image', 'video'],
    ['blockquote', 'code-block'],
    ['clean']
];

export default function QuillDocumentEditor({
    content = '',
    onChange,
    editable = true,
    documentInfo,
    showHeader = true,
    showFooter = true
}: QuillDocumentEditorProps) {
    const quillRef = useRef<ReactQuill>(null);

    const handleChange = useCallback((value: string) => {
        onChange?.(value);
    }, [onChange]);

    const modules = useMemo(() => ({
        toolbar: {
            container: toolbarOptions
        },
        clipboard: {
            matchVisual: false
        }
    }), []);

    const formats = [
        'header', 'font', 'size',
        'bold', 'italic', 'underline', 'strike',
        'color', 'background',
        'align', 'direction',
        'list', 'bullet', 'indent',
        'link', 'image', 'video',
        'blockquote', 'code-block'
    ];

    return (
        <div className="quill-document-editor">
            {/* Print Header */}
            {showHeader && documentInfo && (
                <div className="print-header" dir="rtl">
                    <span>رقم الوثيقة: {documentInfo.document_number || '---'}</span>
                    <span className="header-title">{documentInfo.title || 'عنوان الوثيقة'}</span>
                    <span>الإصدار: {documentInfo.version || 1}</span>
                </div>
            )}

            {/* Quill Editor */}
            <div className="editor-container">
                <ReactQuill
                    ref={quillRef}
                    theme="snow"
                    value={content}
                    onChange={handleChange}
                    modules={modules}
                    formats={formats}
                    readOnly={!editable}
                    placeholder="ابدأ الكتابة هنا..."
                />
            </div>

            {/* Print Footer */}
            {showFooter && documentInfo && (
                <div className="print-footer" dir="rtl">
                    <span>{documentInfo.company_name || 'اسم الشركة'}</span>
                    <span>صفحة 1 من 1</span>
                    <span>{new Date().toLocaleDateString('ar-EG')}</span>
                </div>
            )}
        </div>
    );
}
