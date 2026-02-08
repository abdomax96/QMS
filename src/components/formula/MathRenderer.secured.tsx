/**
 * MathRenderer - SECURED with XSS Protection
 * 
 * Changes from original:
 * - Use textContent instead of innerHTML for error messages
 * - Sanitize KaTeX rendered output
 * - Add fallback for rendering errors
 */

import React, { useEffect, useRef } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { sanitizeHtml } from '../../utils/sanitize';

interface MathRendererProps {
    latex: string;
    displayMode?: boolean;
    className?: string;
}

const MathRenderer: React.FC<MathRendererProps> = ({
    latex,
    displayMode = false,
    className = ''
}) => {
    const containerRef = useRef<HTMLSpanElement>(null);

    useEffect(() => {
        if (!containerRef.current || !latex) return;

        try {
            // Render with KaTeX
            const rendered = katex.renderToString(latex, {
                displayMode,
                throwOnError: false,
                errorColor: '#cc0000',
                strict: 'warn'
            });

            // SECURITY FIX: Sanitize KaTeX output before setting innerHTML
            // KaTeX output should be safe, but we sanitize as defense-in-depth
            const sanitized = sanitizeHtml(rendered, 'math');
            containerRef.current.innerHTML = sanitized;

        } catch (error: any) {
            console.error('KaTeX rendering error:', error);

            // SECURITY FIX: Use textContent instead of innerHTML for error messages
            // This prevents XSS if error message contains user input
            if (containerRef.current) {
                containerRef.current.textContent = `رياضيات غير صالحة: ${error.message}`;
                containerRef.current.className = 'text-red-500 text-sm italic';
            }
        }
    }, [latex, displayMode]);

    return (
        <span
            ref={containerRef}
            className={`math-renderer ${className}`}
            style={displayMode ? { display: 'block', textAlign: 'center' } : {}}
        />
    );
};

export default MathRenderer;
