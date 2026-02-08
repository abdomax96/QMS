/**
 * RichTextEditor - SECURED with XSS Protection
 * 
 * Changes from original:
 * - Added DOMPurify sanitization on all HTML content
 * - Sanitize on input to prevent malicious content from being stored
 * - Sanitize on render to prevent XSS from stored content
 */

import React, { useRef, useEffect } from 'react';
import { sanitizeHtml, renderSafeHtml } from '../../utils/sanitize';

interface RichTextEditorProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
    disabled?: boolean;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({
    value,
    onChange,
    placeholder = 'اكتب هنا...',
    className = '',
    disabled = false
}) => {
    const editorRef = useRef<HTMLDivElement>(null);

    // Sync value to editor (SANITIZED)
    useEffect(() => {
        if (editorRef.current && editorRef.current.innerHTML !== value) {
            // SECURITY FIX: Sanitize before rendering
            renderSafeHtml(editorRef.current, value || '', 'rich');
        }
    }, [value]);

    // Handle input changes
    const handleInput = () => {
        if (!editorRef.current) return;

        // SECURITY FIX: Sanitize user input before passing to onChange
        const rawHtml = editorRef.current.innerHTML;
        const sanitizedHtml = sanitizeHtml(rawHtml, 'rich');

        onChange(sanitizedHtml);
    };

    // Handle paste events (strip formatting and sanitize)
    const handlePaste = (e: React.ClipboardEvent) => {
        e.preventDefault();

        const text = e.clipboardData.getData('text/plain');

        // Insert plain text (browser will handle HTML entity encoding)
        document.execCommand('insertText', false, text);

        // Trigger onChange with sanitized content
        handleInput();
    };

    return (
        <div
            ref={editorRef}
            contentEditable={!disabled}
            onInput={handleInput}
            onPaste={handlePaste}
            className={`
                min-h-[100px] p-3 border rounded-lg
                focus:outline-none focus:ring-2 focus:ring-primary-500
                ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}
                ${className}
            `}
            data-placeholder={placeholder}
            dir="rtl"
        />
    );
};

export default RichTextEditor;
