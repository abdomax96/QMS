import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Copy, Check } from 'lucide-react';
import { errorTrackingService } from '../../services/errorTrackingService';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
    componentName?: string;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
    errorId: string | null;
    copied: boolean;
}

/**
 * Error Boundary محسّن مع تكامل نظام تتبع الأخطاء
 * Enhanced Error Boundary with Error Tracking integration
 */
class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
        errorInfo: null,
        errorId: null,
        copied: false,
    };

    public static getDerivedStateFromError(error: Error): Partial<State> {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        // تسجيل الخطأ في نظام التتبع
        const record = errorTrackingService.logComponentError(
            error,
            errorInfo.componentStack || undefined,
            this.props.componentName
        );

        this.setState({
            errorInfo,
            errorId: record.id,
        });

        // طباعة للتطوير
        if (import.meta.env.DEV) {
            console.error('ErrorBoundary caught an error:', error, errorInfo);
        }
    }

    private handleReload = () => {
        window.location.reload();
    };

    private handleReset = () => {
        this.setState({
            hasError: false,
            error: null,
            errorInfo: null,
            errorId: null,
            copied: false,
        });
    };

    private handleCopyErrorDetails = async () => {
        const { error, errorInfo, errorId } = this.state;

        const details = {
            id: errorId,
            time: new Date().toISOString(),
            error: error?.toString(),
            stack: error?.stack,
            componentStack: errorInfo?.componentStack,
            url: window.location.href,
            userAgent: navigator.userAgent,
        };

        try {
            await navigator.clipboard.writeText(JSON.stringify(details, null, 2));
            this.setState({ copied: true });
            setTimeout(() => this.setState({ copied: false }), 2000);
        } catch {
            // Fallback للمتصفحات القديمة
            console.log('Error details:', details);
        }
    };

    public render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            const { error, errorInfo, errorId, copied } = this.state;

            return (
                <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4" dir="rtl">
                    <div className="max-w-lg w-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
                        {/* أيقونة الخطأ */}
                        <div className="flex items-center justify-center w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-red-100 to-red-200 dark:from-red-900/50 dark:to-red-800/50 rounded-full">
                            <AlertTriangle className="w-10 h-10 text-red-600 dark:text-red-400" />
                        </div>

                        {/* العنوان */}
                        <h2 className="text-2xl font-bold text-center text-gray-900 dark:text-white mb-3">
                            حدث خطأ غير متوقع
                        </h2>

                        <p className="text-gray-600 dark:text-gray-400 text-center mb-6">
                            نعتذر عن هذا الخطأ. تم تسجيله تلقائيًا وسيتم مراجعته.
                        </p>

                        {/* معرف الخطأ */}
                        {errorId && (
                            <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-center">
                                <span className="text-xs text-gray-500 dark:text-gray-400">معرف الخطأ:</span>
                                <p className="font-mono text-sm text-gray-700 dark:text-gray-300">{errorId}</p>
                            </div>
                        )}

                        {/* تفاصيل الخطأ (وضع التطوير فقط) */}
                        {import.meta.env.DEV && error && (
                            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl overflow-auto max-h-48">
                                <p className="text-sm font-mono text-red-600 dark:text-red-400 font-medium mb-2">
                                    {error.toString()}
                                </p>
                                {errorInfo && (
                                    <pre className="text-xs text-red-500/80 dark:text-red-400/60 whitespace-pre-wrap">
                                        {errorInfo.componentStack}
                                    </pre>
                                )}
                            </div>
                        )}

                        {/* الأزرار */}
                        <div className="flex flex-col gap-3">
                            <div className="flex gap-3">
                                <button
                                    onClick={this.handleReset}
                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors font-medium"
                                >
                                    حاول مرة أخرى
                                </button>
                                <button
                                    onClick={this.handleReload}
                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors font-medium"
                                >
                                    <RefreshCw className="w-4 h-4" />
                                    إعادة تحميل
                                </button>
                            </div>

                            {/* زر نسخ التفاصيل */}
                            <button
                                onClick={this.handleCopyErrorDetails}
                                className="flex items-center justify-center gap-2 px-4 py-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                            >
                                {copied ? (
                                    <>
                                        <Check className="w-4 h-4 text-green-500" />
                                        <span className="text-green-500">تم النسخ!</span>
                                    </>
                                ) : (
                                    <>
                                        <Copy className="w-4 h-4" />
                                        نسخ تفاصيل الخطأ
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;

