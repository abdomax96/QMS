/**
 * Security Utilities
 * أدوات الأمان والحماية من الاختراق
 */

/**
 * منع XSS (Cross-Site Scripting)
 * تنظيف النصوص من HTML و JavaScript
 */
export function sanitizeInput(input: string): string {
    if (!input) return '';

    return input
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;');
}

/**
 * التحقق من صحة البريد الإلكتروني
 */
export function isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * التحقق من قوة كلمة المرور
 * يجب أن تحتوي على:
 * - 8 أحرف على الأقل
 * - حرف كبير وحرف صغير
 * - رقم
 * - رمز خاص
 */
export function isStrongPassword(password: string): {
    isStrong: boolean;
    message: string;
} {
    if (password.length < 8) {
        return { isStrong: false, message: 'كلمة المرور يجب أن تكون 8 أحرف على الأقل' };
    }

    if (!/[a-z]/.test(password)) {
        return { isStrong: false, message: 'يجب أن تحتوي على حرف صغير' };
    }

    if (!/[A-Z]/.test(password)) {
        return { isStrong: false, message: 'يجب أن تحتوي على حرف كبير' };
    }

    if (!/[0-9]/.test(password)) {
        return { isStrong: false, message: 'يجب أن تحتوي على رقم' };
    }

    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
        return { isStrong: false, message: 'يجب أن تحتوي على رمز خاص (!@#$...)' };
    }

    return { isStrong: true, message: 'كلمة مرور قوية' };
}

/**
 * منع SQL Injection في الاستعلامات
 * (Supabase يحمي تلقائياً، هذا فقط للطبقة الإضافية)
 */
export function escapeSQL(value: string): string {
    if (!value) return '';
    return value.replace(/'/g, "''");
}

/**
 * تحديد معدل الطلبات (Rate Limiting)
 * منع الطلبات المتعددة السريعة
 */
class RateLimiter {
    private attempts: Map<string, number[]> = new Map();
    private maxAttempts: number;
    private windowMs: number;

    constructor(maxAttempts: number = 5, windowMs: number = 60000) {
        this.maxAttempts = maxAttempts;
        this.windowMs = windowMs;
    }

    isAllowed(key: string): boolean {
        const now = Date.now();
        const attempts = this.attempts.get(key) || [];

        // تنظيف المحاولات القديمة
        const recentAttempts = attempts.filter(time => now - time < this.windowMs);

        if (recentAttempts.length >= this.maxAttempts) {
            return false;
        }

        recentAttempts.push(now);
        this.attempts.set(key, recentAttempts);
        return true;
    }

    reset(key: string): void {
        this.attempts.delete(key);
    }
}

// Rate limiter لتسجيل الدخول
export const loginRateLimiter = new RateLimiter(5, 5 * 60 * 1000); // 5 محاولات كل 5 دقائق

/**
 * التحقق من صلاحية الجلسة (Session)
 */
export function isSessionValid(expiresAt: string | null): boolean {
    if (!expiresAt) return false;
    return new Date(expiresAt) > new Date();
}

/**
 * إنشاء CSRF Token
 */
export function generateCSRFToken(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

/**
 * التحقق من الأذونات
 */
export function hasPermission(
    userRoles: string[],
    requiredRoles: string[]
): boolean {
    if (userRoles.includes('admin')) return true;
    return requiredRoles.some(role => userRoles.includes(role));
}

/**
 * تشفير البيانات الحساسة في LocalStorage
 */
export function encryptData(data: string, key: string): string {
    // تشفير بسيط - للإنتاج استخدم crypto-js أو مكتبة تشفير قوية
    let encrypted = '';
    for (let i = 0; i < data.length; i++) {
        encrypted += String.fromCharCode(
            data.charCodeAt(i) ^ key.charCodeAt(i % key.length)
        );
    }
    return btoa(encrypted);
}

export function decryptData(encrypted: string, key: string): string {
    try {
        const decoded = atob(encrypted);
        let decrypted = '';
        for (let i = 0; i < decoded.length; i++) {
            decrypted += String.fromCharCode(
                decoded.charCodeAt(i) ^ key.charCodeAt(i % key.length)
            );
        }
        return decrypted;
    } catch {
        return '';
    }
}

/**
 * منع Clickjacking
 */
export function preventClickjacking(): void {
    if (window.self !== window.top) {
        window.top!.location.href = window.self.location.href;
    }
}

/**
 * تنظيف البيانات عند تسجيل الخروج
 */
export function clearSensitiveData(): void {
    // حذف البيانات الحساسة من localStorage
    const keysToRemove = [
        'supabase.auth.token',
        'user_session',
        'csrf_token'
    ];

    keysToRemove.forEach(key => {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
    });
}

/**
 * التحقق من URL آمن
 */
export function isSecureURL(url: string): boolean {
    try {
        const parsed = new URL(url);
        return parsed.protocol === 'https:' ||
            parsed.hostname === 'localhost' ||
            parsed.hostname === '127.0.0.1';
    } catch {
        return false;
    }
}

/**
 * منع DevTools في الإنتاج
 * (اختياري - يمكن إزعاج المطورين الشرعيين)
 */
export function detectDevTools(): boolean {
    const threshold = 160;
    const widthThreshold = window.outerWidth - window.innerWidth > threshold;
    const heightThreshold = window.outerHeight - window.innerHeight > threshold;

    return widthThreshold || heightThreshold;
}

/**
 * تسجيل محاولات الوصول المشبوهة
 */
export async function logSuspiciousActivity(
    action: string,
    details: Record<string, any>
): Promise<void> {
    // يمكن إرسالها إلى سيرفر لوقينق أو Supabase
    console.warn('[Security Alert]', {
        timestamp: new Date().toISOString(),
        action,
        ...details,
        userAgent: navigator.userAgent,
        ip: 'client-side' // في الإنتاج، احصل عليه من السيرفر
    });
}

export default {
    sanitizeInput,
    isValidEmail,
    isStrongPassword,
    escapeSQL,
    loginRateLimiter,
    isSessionValid,
    generateCSRFToken,
    hasPermission,
    encryptData,
    decryptData,
    preventClickjacking,
    clearSensitiveData,
    isSecureURL,
    detectDevTools,
    logSuspiciousActivity
};
