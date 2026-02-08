/**
 * CKEditor 5 Document Editor - A4 style with pagination support
 * Decoupled Document Editor with Custom Page Break Button
 * 100% Free and open source
 */

import React, { useRef, useCallback, useState } from 'react';
import { CKEditor } from '@ckeditor/ckeditor5-react';
import DecoupledEditor from '@ckeditor/ckeditor5-build-decoupled-document';
import './CKEditorDocumentEditor.css';

interface DocumentInfo {
    document_number?: string;
    title?: string;
    version?: number;
    company_name?: string;
}

interface CKEditorDocumentEditorProps {
    content?: string;
    onChange?: (content: string) => void;
    editable?: boolean;
    documentInfo?: DocumentInfo;
    showHeader?: boolean;
    showFooter?: boolean;
}

export default function CKEditorDocumentEditor({
    content = '',
    onChange,
    editable = true,
    documentInfo,
    showHeader = true,
    showFooter = true
}: CKEditorDocumentEditorProps) {
    const editorRef = useRef<any>(null);
    const toolbarRef = useRef<HTMLDivElement>(null);
    const [isReady, setIsReady] = useState(false);

    // Insert Page Break function - injects hr element into content
    const insertPageBreak = useCallback(() => {
        if (editorRef.current) {
            const editor = editorRef.current;
            // Get current content and add hr for page break
            const currentData = editor.getData();
            const pageBreakHtml = '<hr>';

            // If editor is empty or has placeholder, just set the hr
            if (!currentData || currentData.trim() === '' || currentData === '<p>&nbsp;</p>') {
                editor.setData('<p>&nbsp;</p>' + pageBreakHtml + '<p>&nbsp;</p>');
            } else {
                // Append page break at the end of current content
                editor.setData(currentData + pageBreakHtml + '<p>&nbsp;</p>');
            }

            // Notify change
            if (onChange) {
                onChange(editor.getData());
            }
        }
    }, [onChange]);

    const handleReady = useCallback((editor: any) => {
        editorRef.current = editor;

        // Insert the toolbar into our custom container
        if (toolbarRef.current) {
            toolbarRef.current.innerHTML = '';
            toolbarRef.current.appendChild(editor.ui.view.toolbar.element);
        }

        // Set RTL direction
        editor.editing.view.change((writer: any) => {
            writer.setAttribute('dir', 'rtl', editor.editing.view.document.getRoot());
        });

        setIsReady(true);
    }, []);

    const handleChange = useCallback((event: any, editor: any) => {
        const data = editor.getData();
        onChange?.(data);
    }, [onChange]);

    const handleError = useCallback((error: any, { willEditorRestart }: any) => {
        console.error('CKEditor error:', error);
        if (willEditorRestart) {
            if (editorRef.current?.ui?.view?.toolbar?.element) {
                editorRef.current.ui.view.toolbar.element.remove();
            }
        }
    }, []);

    return (
        <div className="ckeditor-document-editor">
            {/* Print Header */}
            {showHeader && documentInfo && (
                <div className="print-header" dir="rtl">
                    <span>رقم الوثيقة: {documentInfo.document_number || '---'}</span>
                    <span className="header-title">{documentInfo.title || 'عنوان الوثيقة'}</span>
                    <span>الإصدار: {documentInfo.version || 1}</span>
                </div>
            )}

            {/* Custom Toolbar with Page Break Button */}
            <div className="custom-toolbar-wrapper">
                {/* CKEditor Toolbar Container */}
                <div className="toolbar-container" ref={toolbarRef}></div>

                {/* Custom Page Break Button */}
                {isReady && editable && (
                    <div className="custom-buttons">
                        <button
                            type="button"
                            onClick={insertPageBreak}
                            className="page-break-btn"
                            title="إدراج فاصل صفحة"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                                <path d="M4 12h16M4 12l4-4M4 12l4 4M20 12l-4-4M20 12l-4 4" />
                            </svg>
                            <span>فاصل صفحة</span>
                        </button>
                    </div>
                )}
            </div>

            {/* Editor Container - Scrollable */}
            <div className="editor-container">
                <div className="editor-wrapper">
                    <CKEditor
                        editor={DecoupledEditor as any}
                        data={content}
                        onReady={handleReady}
                        onChange={handleChange}
                        onError={handleError}
                        disabled={!editable}
                        config={{
                            language: {
                                ui: 'ar',
                                content: 'ar'
                            },
                            toolbar: {
                                items: [
                                    'undo', 'redo',
                                    '|',
                                    'heading',
                                    '|',
                                    'fontFamily', 'fontSize', 'fontColor', 'fontBackgroundColor',
                                    '|',
                                    'bold', 'italic', 'underline', 'strikethrough',
                                    '|',
                                    'alignment',
                                    '|',
                                    'numberedList', 'bulletedList',
                                    '|',
                                    'outdent', 'indent',
                                    '|',
                                    'link', 'insertImage', 'insertTable',
                                    '|',
                                    'blockQuote', 'horizontalLine'
                                ],
                                shouldNotGroupWhenFull: true
                            },
                            heading: {
                                options: [
                                    { model: 'paragraph', title: 'فقرة', class: 'ck-heading_paragraph' },
                                    { model: 'heading1', view: 'h1', title: 'عنوان 1', class: 'ck-heading_heading1' },
                                    { model: 'heading2', view: 'h2', title: 'عنوان 2', class: 'ck-heading_heading2' },
                                    { model: 'heading3', view: 'h3', title: 'عنوان 3', class: 'ck-heading_heading3' }
                                ]
                            },
                            fontFamily: {
                                options: [
                                    'Cairo, Arial, sans-serif',
                                    'Arial, Helvetica, sans-serif',
                                    'Tahoma, Geneva, sans-serif',
                                    'Times New Roman, Times, serif',
                                    'Georgia, serif'
                                ]
                            },
                            fontSize: {
                                options: [10, 12, 14, 16, 18, 20, 24, 28, 32, 36]
                            },
                            placeholder: 'ابدأ الكتابة هنا...'
                        }}
                    />
                </div>
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
