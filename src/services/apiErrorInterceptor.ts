/**
 * اعتراض أخطاء API
 * API Error Interceptor - Intercepts and logs API errors
 */

import { errorTrackingService } from './errorTrackingService';
import type { ApiRequestInfo } from '../types/errorTracking';


// الخيارات الافتراضية للـ fetch
interface FetchOptions extends RequestInit {
    timeout?: number;
    skipErrorTracking?: boolean;
}

// نتيجة الـ API call
interface ApiResult<T> {
    data: T | null;
    error: Error | null;
    status: number;
    ok: boolean;
}

/**
 * Wrapper للـ fetch مع تسجيل تلقائي للأخطاء
 */
export async function wrappedFetch<T = unknown>(
    url: string,
    options: FetchOptions = {}
): Promise<ApiResult<T>> {
    const { timeout = 30000, skipErrorTracking = false, ...fetchOptions } = options;
    const startTime = Date.now();

    // إنشاء AbortController للـ timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
        const response = await fetch(url, {
            ...fetchOptions,
            signal: controller.signal,
        });

        clearTimeout(timeoutId);
        const duration = Date.now() - startTime;

        // محاولة تحويل الاستجابة إلى JSON
        let data: T | null = null;
        let responseBody: unknown = null;

        try {
            const text = await response.text();
            if (text) {
                data = JSON.parse(text) as T;
                responseBody = data;
            }
        } catch {
            // الاستجابة ليست JSON
        }

        // تسجيل الأخطاء إذا لم تكن الاستجابة ناجحة
        if (!response.ok && !skipErrorTracking) {
            const apiInfo: ApiRequestInfo = {
                url,
                method: fetchOptions.method || 'GET',
                status: response.status,
                statusText: response.statusText,
                requestBody: fetchOptions.body ? tryParseJson(fetchOptions.body) : undefined,
                responseBody,
                duration,
            };

            errorTrackingService.logError(
                new Error(`API Error: ${response.status} ${response.statusText} - ${url}`),
                {
                    type: 'api',
                    severity: response.status >= 500 ? 'critical' : 'error',
                    apiInfo,
                    action: `${fetchOptions.method || 'GET'} ${new URL(url, window.location.origin).pathname}`,
                }
            );
        }

        return {
            data,
            error: response.ok ? null : new Error(`${response.status} ${response.statusText}`),
            status: response.status,
            ok: response.ok,
        };

    } catch (error) {
        clearTimeout(timeoutId);
        const duration = Date.now() - startTime;

        // تحديد نوع الخطأ
        const isTimeout = error instanceof Error && error.name === 'AbortError';
        const isNetworkError = error instanceof TypeError;

        const errorMessage = isTimeout
            ? `Request timeout after ${timeout}ms: ${url}`
            : error instanceof Error
                ? error.message
                : String(error);

        // تسجيل الخطأ
        if (!skipErrorTracking) {
            const apiInfo: ApiRequestInfo = {
                url,
                method: options.method || 'GET',
                requestBody: options.body ? tryParseJson(options.body) : undefined,
                duration,
            };

            errorTrackingService.logError(
                new Error(errorMessage),
                {
                    type: isNetworkError ? 'network' : 'api',
                    severity: 'error',
                    apiInfo,
                    action: `${options.method || 'GET'} ${new URL(url, window.location.origin).pathname}`,
                    metadata: {
                        isTimeout,
                        isNetworkError,
                    },
                }
            );
        }

        return {
            data: null,
            error: error instanceof Error ? error : new Error(String(error)),
            status: 0,
            ok: false,
        };
    }
}

/**
 * محاولة تحويل النص إلى JSON
 */
function tryParseJson(body: BodyInit | null | undefined): unknown {
    if (!body) return undefined;
    if (typeof body === 'string') {
        try {
            return JSON.parse(body);
        } catch {
            return body;
        }
    }
    return body;
}

/**
 * إنشاء instance من API client مع تتبع الأخطاء
 */
export function createTrackedApiClient(baseUrl: string = '') {
    const request = async <T>(
        endpoint: string,
        options: FetchOptions = {}
    ): Promise<ApiResult<T>> => {
        const url = `${baseUrl}${endpoint}`;
        return wrappedFetch<T>(url, options);
    };

    return {
        get: <T>(endpoint: string, options?: FetchOptions) =>
            request<T>(endpoint, { ...options, method: 'GET' }),

        post: <T>(endpoint: string, body?: unknown, options?: FetchOptions) =>
            request<T>(endpoint, {
                ...options,
                method: 'POST',
                body: body ? JSON.stringify(body) : undefined,
                headers: {
                    'Content-Type': 'application/json',
                    ...options?.headers,
                },
            }),

        put: <T>(endpoint: string, body?: unknown, options?: FetchOptions) =>
            request<T>(endpoint, {
                ...options,
                method: 'PUT',
                body: body ? JSON.stringify(body) : undefined,
                headers: {
                    'Content-Type': 'application/json',
                    ...options?.headers,
                },
            }),

        patch: <T>(endpoint: string, body?: unknown, options?: FetchOptions) =>
            request<T>(endpoint, {
                ...options,
                method: 'PATCH',
                body: body ? JSON.stringify(body) : undefined,
                headers: {
                    'Content-Type': 'application/json',
                    ...options?.headers,
                },
            }),

        delete: <T>(endpoint: string, options?: FetchOptions) =>
            request<T>(endpoint, { ...options, method: 'DELETE' }),
    };
}

// تصدير API client جاهز للاستخدام
export const trackedApi = createTrackedApiClient();
