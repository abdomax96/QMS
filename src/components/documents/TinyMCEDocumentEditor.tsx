import React, { useRef, useCallback, useEffect, useState, useMemo } from 'react';
import { Editor } from '@tinymce/tinymce-react';
import { useCompanyStore } from '../../store/companyStore';
import type { Variable } from '../../types/supabase'; // Import Variable type
// import { Document } from '../../types/documents'; // Removed to avoiding strict type matching issues
import './TinyMCEDocumentEditor.css';

const DESKTOP_TOOLBAR =
    'undo redo | blocks fontfamily fontsize | bold italic underline strikethrough | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | forecolor backcolor removeformat | table link image | pagebreak hr | insertVariable customPrint';

const COMPACT_TOOLBAR =
    'undo redo | blocks fontsize | bold italic underline | alignright aligncenter alignleft | bullist numlist | forecolor backcolor | table link image | pagebreak | insertVariable customPrint';

const MOBILE_TOOLBAR =
    'undo redo | bold italic underline | alignright aligncenter alignleft | bullist numlist | table link | insertVariable customPrint';

interface EditorDocumentInfo {
    document_number?: string;
    title?: string;
    version?: number | string;
    description?: string | null;
    company_name?: string;
    [key: string]: any;
}

interface TinyMCEDocumentEditorProps {
    content?: string;
    onChange?: (content: string) => void;
    editable?: boolean;
    documentInfo?: EditorDocumentInfo;
    showHeader?: boolean;
    showFooter?: boolean;
    variables?: Variable[]; // Add variables prop
}

export default function TinyMCEDocumentEditor({
    content = '',
    onChange,
    editable = true,
    documentInfo,
    showHeader = true,
    showFooter = true,
    variables = [] // Default to empty array
}: TinyMCEDocumentEditorProps) {
    const editorRef = useRef<any>(null);
    const { selectedCompany } = useCompanyStore();
    const isCompactViewportRef = useRef(
        typeof window !== 'undefined' && window.matchMedia('(max-width: 1024px)').matches
    );

    // Initial content state to ensure initialValue prop is stable
    const [initialContent] = useState(content);

    // Refs for stable callbacks and data access
    const isInitializedRef = useRef(false);
    const contentRef = useRef(content);
    const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Data refs to be accessed inside memoized (static) init
    const documentInfoRef = useRef(documentInfo);
    const selectedCompanyRef = useRef(selectedCompany);
    const onChangeRef = useRef(onChange);
    const variablesRef = useRef(variables); // Ref for variables

    // Update refs on render
    useEffect(() => {
        contentRef.current = content;
        documentInfoRef.current = documentInfo;
        selectedCompanyRef.current = selectedCompany;
        onChangeRef.current = onChange;
        variablesRef.current = variables; // Update variables ref
    }, [content, documentInfo, selectedCompany, onChange, variables]);

    // Cleanup debounce on unmount
    useEffect(() => {
        return () => {
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }
        };
    }, []);

    // Stable handler for editor changes
    const handleEditorChange = useCallback((newContent: string, editor: any) => {
        if (isInitializedRef.current && newContent !== contentRef.current) {
            contentRef.current = newContent;
            onChangeRef.current?.(newContent);
        }
    }, []);

    // Stable ref for the handler
    const handleEditorChangeRef = useRef(handleEditorChange);
    useEffect(() => {
        handleEditorChangeRef.current = handleEditorChange;
    }, [handleEditorChange]);

    // Stable debounced save function
    const debouncedSave = useCallback((editor: any) => {
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }
        debounceTimerRef.current = setTimeout(() => {
            handleEditorChangeRef.current(editor.getContent(), editor);
        }, 500);
    }, []);

    const debouncedSaveRef = useRef(debouncedSave);
    useEffect(() => {
        debouncedSaveRef.current = debouncedSave;
    }, [debouncedSave]);

    // Memoized editor configuration - NEVER changes after mount
    const editorConfig = useMemo(() => ({
        // Basic settings
        height: '100%',
        width: '100%',
        resize: false,
        menubar: !isCompactViewportRef.current,
        directionality: 'rtl' as const,
        language: 'ar',

        // Toolbar configuration
        toolbar_mode: 'sliding' as const,
        toolbar_sticky: true,
        toolbar_sticky_offset: 0,
        // Added insertVariable to toolbar
        toolbar: isCompactViewportRef.current ? COMPACT_TOOLBAR : DESKTOP_TOOLBAR,
        mobile: {
            menubar: false,
            toolbar_mode: 'sliding' as const,
            toolbar: MOBILE_TOOLBAR
        },

        // Plugins - Free Open Source Only
        plugins: [
            'advlist', 'autolink', 'lists', 'link', 'image', 'charmap', 'preview',
            'anchor', 'searchreplace', 'visualblocks', 'code', 'fullscreen',
            'insertdatetime', 'media', 'table', 'help', 'wordcount',
            'pagebreak', 'directionality', 'emoticons'
        ],

        // Content styling - A4 paper look
        content_style: `
            @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap');
            
            body {
                font-family: 'Cairo', 'Arial', 'Tahoma', sans-serif;
                font-size: 14px;
                line-height: 1.8;
                direction: rtl;
                text-align: right;
                color: #1f2937;
                background: #e5e7eb;
                margin: 0;
                padding: 20px;
                min-height: 100%;
                overflow-wrap: anywhere;
                word-break: break-word;
            }
            
            /* A4 Paper simulation */
            body > * {
                max-width: 210mm;
                margin-left: auto;
                margin-right: auto;
            }
            
            .mce-content-body {
                background: white;
                width: min(210mm, calc(100vw - 24px));
                min-height: 297mm;
                padding: 15mm 20mm;
                margin: 20px auto;
                box-shadow: 0 4px 25px rgba(0, 0, 0, 0.15);
                box-sizing: border-box;
            }

            img, video {
                max-width: 100%;
                height: auto;
            }

            @media (max-width: 1024px) {
                body {
                    padding: 8px;
                    background: #f3f4f6;
                }

                .mce-content-body {
                    width: 100%;
                    max-width: none;
                    min-height: auto;
                    padding: 12px;
                    margin: 8px auto;
                    box-shadow: 0 1px 10px rgba(0, 0, 0, 0.12);
                }
            }

            @media (max-width: 640px) {
                body {
                    font-size: 13px;
                    line-height: 1.7;
                    padding: 6px;
                }

                .mce-content-body {
                    padding: 10px;
                    margin: 4px auto;
                }
            }
            
            /* Manual Page Break Marker */
            .mce-pagebreak {
                cursor: default;
                display: block;
                border: 0;
                width: 100%;
                height: 5px;
                border-top: 2px dashed #3b82f6;
                margin: 10px 0;
                page-break-before: always;
            }
            
            p { margin: 0.5em 0; }
            h1 { font-size: 18pt; font-weight: bold; margin: 1em 0 0.5em; }
            h2 { font-size: 16pt; font-weight: bold; margin: 0.8em 0 0.4em; }
            h3 { font-size: 14pt; font-weight: bold; margin: 0.6em 0 0.3em; }
            
            ul, ol { padding-right: 2em; padding-left: 0; margin: 0.5em 0; }
            
            table { border-collapse: collapse; width: 100%; margin: 1em 0; table-layout: fixed; }
            td, th { border: 1px solid #374151; padding: 8px 12px; text-align: right; overflow-wrap: anywhere; word-break: break-word; }
            th { background: #e8e8e8; font-weight: bold; }
            
            @page {
                size: A4;
                margin: 10mm;
            }
            @media print {
                html, body {
                    margin: 0 !important;
                    padding: 0 !important;
                }
            }
        `,

        // Setup callback - uses refs to access latest handlers without re-init
        setup: (editor: any) => {
            // Mark as initialized
            editor.on('init', () => {
                isInitializedRef.current = true;
            });

            // Save on blur
            editor.on('blur', () => {
                handleEditorChangeRef.current(editor.getContent(), editor);
            });

            // Auto-save while typing (debounced)
            editor.on('input', () => {
                debouncedSaveRef.current(editor);
            });

            // Add Insert Variable Menu Button
            editor.ui.registry.addMenuButton('insertVariable', {
                text: 'إدراج متغير',
                icon: 'code-sample',
                fetch: (callback: any) => {
                    const vars = variablesRef.current || [];
                    const items = vars.map((v) => ({
                        type: 'menuitem',
                        text: `${v.name} (${v.value})`,
                        onAction: () => {
                            editor.insertContent(`{Global:${v.name}}`);
                        }
                    }));

                    if (items.length === 0) {
                        items.push({
                            type: 'menuitem',
                            text: 'لا يوجد متغيرات',
                            onAction: () => { } // No-op action
                        });
                    }

                    callback(items);
                }
            });

            // Custom Print Command
            editor.addCommand('mceCustomPrint', () => {
                let content = editor.getContent();

                // Resolve variables in content before printing
                const vars = variablesRef.current || [];
                if (vars.length > 0) {
                    vars.forEach(variable => {
                        const escapedName = variable.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                        // Replace {Global:Name}
                        const globalRegex = new RegExp(`\\{Global:${escapedName}\\}`, 'gi');
                        content = content.replace(globalRegex, String(variable.value));
                        // Replace {Name}
                        const simpleRegex = new RegExp(`\\{${escapedName}\\}`, 'gi');
                        content = content.replace(simpleRegex, String(variable.value));
                    });
                }

                const printWindow = window.open('', '_blank');
                const docInfo = documentInfoRef.current;
                const company = selectedCompanyRef.current;

                if (printWindow) {
                    printWindow.document.write(`
                        <!DOCTYPE html>
                        <html dir="rtl" lang="ar">
                        <head>
                            <meta charset="UTF-8">
                            <title>طباعة الوثيقة</title>
                            <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap" rel="stylesheet">
                            <style>
                                @page {
                                    size: A4;
                                    margin: 10mm;
                                }
                                @media print {
                                    html, body {
                                        margin: 0 !important;
                                        padding: 0 !important;
                                    }
                                    thead { display: table-header-group; } 
                                    tfoot { display: table-footer-group; }
                                    button { display: none !important; }
                                }
                                * {
                                    margin: 0;
                                    padding: 0;
                                    box-sizing: border-box;
                                }
                                body {
                                    font-family: 'Cairo', 'Arial', 'Tahoma', sans-serif;
                                    font-size: 14px;
                                    line-height: 1.8;
                                    direction: rtl;
                                    text-align: right;
                                    color: #1f2937;
                                    padding: 0;
                                }
                                /* Layout Table */
                                .print-layout {
                                    width: 100%;
                                    border-collapse: collapse;
                                }
                                
                                .print-header-content {
                                    display: flex;
                                    justify-content: space-between;
                                    align-items: center;
                                    padding: 10px 10mm;
                                    border-bottom: 2px solid #374151;
                                    margin-bottom: 20px;
                                }
                                .header-title {
                                    font-size: 14px;
                                    font-weight: bold;
                                }
                                
                                .print-footer-content {
                                    display: flex;
                                    justify-content: space-between;
                                    padding: 10px 10mm;
                                    border-top: 2px solid #374151;
                                    background: white;
                                    margin-top: 20px;
                                    font-size: 14px; /* Reduced from 18px */
                                    font-weight: bold;
                                }

                                /* Force Repeat Headers */
                                thead { display: table-header-group; }
                                tfoot { display: table-footer-group; }
                                tr { page-break-inside: avoid; break-inside: avoid; }

                                .content-wrapper {
                                    padding: 0 10mm 0 10mm;
                                }
                                
                                .content p { margin: 0.5em 0; }
                                .content h1 { font-size: 18pt; font-weight: bold; margin: 1em 0 0.5em; }
                                .content h2 { font-size: 16pt; font-weight: bold; margin: 0.8em 0 0.4em; }
                                .content h3 { font-size: 14pt; font-weight: bold; margin: 0.6em 0 0.3em; }
                                .content ul, .content ol { padding-right: 2em; margin: 0.5em 0; }
                                .content table { border-collapse: collapse; width: 100%; margin: 1em 0; }
                                .content td, .content th { border: 1px solid #374151; padding: 8px 12px; text-align: right; }
                                .content th { background: #e8e8e8; font-weight: bold; }
                                .mce-pagebreak {
                                    page-break-after: always;
                                    display: block;
                                    border: none;
                                    height: 0;
                                }
                            </style>
                        </head>
                        <body>
                            <table class="print-layout">
                                <thead>
                                    <tr>
                                        <td>
                                            <div class="print-header-content">
                                                <span>رقم الوثيقة: ${docInfo?.document_number || '---'}</span>
                                                <span class="header-title">${docInfo?.title || 'عنوان الوثيقة'}</span>
                                                <span>الإصدار: ${docInfo?.version || 1}</span>
                                            </div>
                                        </td>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td>
                                            <div class="content-wrapper content">
                                                ${content}
                                            </div>
                                        </td>
                                    </tr>
                                </tbody>
                                <tfoot>
                                    <tr>
                                        <td>
                                            <div class="print-footer-content">
                                                <span>${company?.name || docInfo?.company_name || 'الشركة'}</span>
                                                <span>تاريخ الطباعة: ${new Date().toLocaleDateString('ar-EG')}</span>
                                            </div>
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                            <script>
                                window.onload = function() {
                                    window.print();
                                    setTimeout(function() {
                                        window.close();
                                    }, 500);
                                };
                            </script>
                        </body>
                        </html>
                    `);
                    printWindow.document.close();
                }
            });

            // Add custom print button
            editor.ui.registry.addButton('customPrint', {
                icon: 'print',
                tooltip: 'طباعة مع Header/Footer',
                onAction: () => {
                    editor.execCommand('mceCustomPrint');
                }
            });
        },

        // Remove branding
        branding: false,
        promotion: false,
        statusbar: false,

        // Formats for RTL
        formats: {
            alignleft: { selector: 'p,h1,h2,h3,h4,h5,h6,td,th,div,ul,ol,li,table,img', classes: 'text-left', styles: { textAlign: 'left' } },
            aligncenter: { selector: 'p,h1,h2,h3,h4,h5,h6,td,th,div,ul,ol,li,table,img', classes: 'text-center', styles: { textAlign: 'center' } },
            alignright: { selector: 'p,h1,h2,h3,h4,h5,h6,td,th,div,ul,ol,li,table,img', classes: 'text-right', styles: { textAlign: 'right' } },
            alignjustify: { selector: 'p,h1,h2,h3,h4,h5,h6,td,th,div,ul,ol,li,table,img', classes: 'text-justify', styles: { textAlign: 'justify' } }
        }
    }), []); // Dependencies array is empty - config never updates, preventing re-init!

    return (
        <div className="tinymce-document-editor">
            {/* Print Header */}
            {showHeader && documentInfo && (
                <div className="print-header" dir="rtl">
                    <span>رقم الوثيقة: {documentInfo.document_number || '---'}</span>
                    <span className="header-title">{documentInfo.title || 'عنوان الوثيقة'}</span>
                    <span>الإصدار: {documentInfo.version || 1}</span>
                </div>
            )}

            {/* TinyMCE Editor */}
            <div className="editor-wrapper">
                <Editor
                    apiKey="ghes89p3glg86onznvrharplbw2xvpby8ferhqsj3hi9d4lm"
                    onInit={(evt, editor) => {
                        editorRef.current = editor;
                    }}
                    initialValue={initialContent}
                    disabled={!editable}
                    init={editorConfig}
                />
            </div>

            {/* Print Footer */}
            {showFooter && (
                <div className="print-footer" dir="rtl">
                    <span>{selectedCompany?.name || documentInfo?.company_name || 'الشركة'}</span>
                    <span>تاريخ الطباعة: {new Date().toLocaleDateString('ar-EG')}</span>
                </div>
            )}
        </div>
    );
}
