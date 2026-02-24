import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    isRouteErrorResponse,
    useLocation,
    useNavigate,
    useRouteError,
} from 'react-router-dom';
import { ExclamationTriangleIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { errorTrackingService } from '../../services/errorTrackingService';

interface NormalizedRouteError {
    title: string;
    message: string;
    status?: number;
    stack?: string;
}

const normalizeRouteError = (error: unknown): NormalizedRouteError => {
    if (isRouteErrorResponse(error)) {
        const dataMessage =
            typeof error.data === 'string'
                ? error.data
                : typeof (error.data as any)?.message === 'string'
                    ? String((error.data as any).message)
                    : '';
        return {
            title: `خطأ ${error.status}`,
            message: dataMessage || error.statusText || 'حدث خطأ أثناء تحميل الصفحة',
            status: error.status,
        };
    }

    if (error instanceof Error) {
        return {
            title: 'خطأ غير متوقع',
            message: error.message || 'حدث خطأ غير متوقع',
            stack: error.stack,
        };
    }

    return {
        title: 'خطأ غير متوقع',
        message: typeof error === 'string' ? error : 'حدث خطأ غير متوقع',
    };
};

const RouteErrorElement: React.FC = () => {
    const routeError = useRouteError();
    const location = useLocation();
    const navigate = useNavigate();
    const [copied, setCopied] = useState(false);
    const loggedRef = useRef(false);

    const normalized = useMemo(
        () => normalizeRouteError(routeError),
        [routeError]
    );

    useEffect(() => {
        if (loggedRef.current) {
            return;
        }
        loggedRef.current = true;

        const errorToLog =
            routeError instanceof Error
                ? routeError
                : new Error(normalized.message);

        errorTrackingService.logError(errorToLog, {
            type: 'component',
            severity: 'critical',
            component: 'RouteErrorElement',
            action: 'route_error',
            metadata: {
                route: location.pathname,
                status: normalized.status,
                title: normalized.title,
            },
        });

        if (import.meta.env.DEV) {
            console.error('[RouteErrorElement] Caught route error:', routeError);
        }
    }, [location.pathname, normalized.message, normalized.status, normalized.title, routeError]);

    const copyErrorDetails = async () => {
        const payload = {
            route: location.pathname,
            title: normalized.title,
            message: normalized.message,
            status: normalized.status,
            stack: normalized.stack,
            timestamp: new Date().toISOString(),
        };

        try {
            await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1800);
        } catch {
            // no-op
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4" dir="rtl">
            <div className="w-full max-w-xl bg-white dark:bg-gray-800 border border-red-200 dark:border-red-800 rounded-2xl shadow-xl p-6 sm:p-8">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-11 h-11 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                        <ExclamationTriangleIcon className="w-6 h-6 text-red-600 dark:text-red-400" />
                    </div>
                    <div>
                        <h1 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
                            {normalized.title}
                        </h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            تعذر عرض الصفحة الحالية.
                        </p>
                    </div>
                </div>

                <div className="rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-900/20 p-3 sm:p-4 text-sm text-red-700 dark:text-red-200 mb-5">
                    {normalized.message}
                </div>

                {import.meta.env.DEV && normalized.stack && (
                    <pre className="mb-5 max-h-52 overflow-auto rounded-lg bg-gray-900 text-red-200 text-xs p-3 whitespace-pre-wrap">
                        {normalized.stack}
                    </pre>
                )}

                <div className="flex flex-wrap gap-2">
                    <button
                        type="button"
                        onClick={() => navigate(-1)}
                        className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                        رجوع
                    </button>
                    <button
                        type="button"
                        onClick={() => window.location.reload()}
                        className="px-3 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700 transition-colors inline-flex items-center gap-2"
                    >
                        <ArrowPathIcon className="w-4 h-4" />
                        إعادة تحميل
                    </button>
                    <button
                        type="button"
                        onClick={copyErrorDetails}
                        className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                        {copied ? 'تم نسخ التفاصيل' : 'نسخ تفاصيل الخطأ'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default RouteErrorElement;
