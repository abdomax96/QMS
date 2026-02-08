/**
 * HTML Sanitization Utility
 * 
 * Protects against XSS attacks by sanitizing user-generated HTML content
 * before rendering it with innerHTML or dangerouslySetInnerHTML.
 * 
 * Uses DOMPurify library for comprehensive XSS protection.
 * 
 * Installation:
 *   npm install dompurify
 *   npm install --save-dev @types/dompurify
 */

import DOMPurify from 'dompurify';

/**
 * Sanitization configuration presets
 */
const SANITIZE_CONFIGS = {
    // Strict: Only allow basic formatting, no links or images
    strict: {
        ALLOWED_TAGS: ['b', 'i', 'u', 'strong', 'em', 'p', 'br', 'span'],
        ALLOWED_ATTR: ['class', 'style'],
        KEEP_CONTENT: true
    },

    // Basic: Allow common text formatting and links
    basic: {
        ALLOWED_TAGS: ['b', 'i', 'u', 'strong', 'em', 'p', 'br', 'span', 'a', 'ul', 'ol', 'li'],
        ALLOWED_ATTR: ['href', 'class', 'style', 'target', 'rel'],
        KEEP_CONTENT: true,
        ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i
    },

    // Rich: Allow rich formatting including images and tables
    rich: {
        ALLOWED_TAGS: [
            'b', 'i', 'u', 'strong', 'em', 'p', 'br', 'span', 'a',
            'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
            'table', 'thead', 'tbody', 'tr', 'th', 'td',
            'img', 'div', 'blockquote', 'code', 'pre'
        ],
        ALLOWED_ATTR: [
            'href', 'class', 'style', 'target', 'rel', 'src',
            'alt', 'title', 'width', 'height'
        ],
        KEEP_CONTENT: true
    },

    // Math: For mathematical formulas (KaTeX rendered content)
    math: {
        ALLOWED_TAGS: ['span', 'div', 'math', 'semantics', 'mrow', 'msup', 'mi', 'mn', 'mo'],
        ALLOWED_ATTR: ['class', 'style'],
        KEEP_CONTENT: true
    }
};

export type SanitizeLevel = keyof typeof SANITIZE_CONFIGS;

/**
 * Sanitize HTML string to prevent XSS attacks
 * 
 * @param dirty - Potentially unsafe HTML string
 * @param level - Sanitization level (strict, basic, rich, math)
 * @returns Safe HTML string
 * 
 * @example
 * const userInput = '<script>alert("XSS")</script><p>Hello</p>';
 * const safe = sanitizeHtml(userInput, 'basic');
 * // Result: '<p>Hello</p>'
 */
export function sanitizeHtml(
    dirty: string,
    level: SanitizeLevel = 'basic'
): string {
    if (!dirty || typeof dirty !== 'string') {
        return '';
    }

    const config = SANITIZE_CONFIGS[level];
    return DOMPurify.sanitize(dirty, config);
}

/**
 * Sanitize and render HTML to a DOM element
 * 
 * @param element - Target DOM element
 * @param html - HTML to render
 * @param level - Sanitization level
 * 
 * @example
 * const container = document.getElementById('content');
 * renderSafeHtml(container, userGeneratedHtml, 'rich');
 */
export function renderSafeHtml(
    element: HTMLElement,
    html: string,
    level: SanitizeLevel = 'basic'
): void {
    if (!element) return;

    const sanitized = sanitizeHtml(html, level);
    element.innerHTML = sanitized;
}

/**
 * Strip all HTML tags and return plain text
 * 
 * @param html - HTML string
 * @returns Plain text without any HTML
 * 
 * @example
 * stripHtml('<p>Hello <b>World</b></p>');
 * // Result: 'Hello World'
 */
export function stripHtml(html: string): string {
    if (!html || typeof html !== 'string') {
        return '';
    }

    return DOMPurify.sanitize(html, {
        ALLOWED_TAGS: [],
        KEEP_CONTENT: true
    });
}

/**
 * Validate if a URL is safe (http/https only, no javascript: protocol)
 * 
 * @param url - URL to validate
 * @returns true if safe, false otherwise
 */
export function isSafeUrl(url: string): boolean {
    if (!url || typeof url !== 'string') {
        return false;
    }

    // Block javascript: protocol and data: URIs with executable content
    const dangerousProtocols = /^(javascript|data|vbscript):/i;
    if (dangerousProtocols.test(url.trim())) {
        return false;
    }

    // Allow http, https, mailto, tel, and relative URLs
    const safePattern = /^(https?:\/\/|mailto:|tel:|\/|\.\/|#)/i;
    return safePattern.test(url.trim());
}

/**
 * Sanitize URL for use in href attributes
 * 
 * @param url - URL to sanitize
 * @returns Safe URL or '#' if invalid
 */
export function sanitizeUrl(url: string): string {
    if (!url || !isSafeUrl(url)) {
        return '#';
    }
    return url;
}

/**
 * React helper: Create safe dangerouslySetInnerHTML object
 * 
 * @param html - HTML to sanitize
 * @param level - Sanitization level
 * @returns Object for React's dangerouslySetInnerHTML prop
 * 
 * @example
 * <div dangerouslySetInnerHTML={createSafeHtml(userContent, 'rich')} />
 */
export function createSafeHtml(
    html: string,
    level: SanitizeLevel = 'basic'
): { __html: string } {
    return {
        __html: sanitizeHtml(html, level)
    };
}

// Export DOMPurify instance for advanced usage
export { DOMPurify };

// Export default sanitizeHtml as the main function
export default sanitizeHtml;
