import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useSupabaseAuth } from '../../hooks/useSupabaseAuth';
import { useAppSettingsStore } from '../../store/appSettingsStore';
import { supabase } from '../../config/supabase';
import { FullPageLoading } from '../../components/common/LoadingStates';

const LoginPage: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams] = useSearchParams();
    const { signIn, loading } = useSupabaseAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [accountDeletedMessage, setAccountDeletedMessage] = useState('');

    // Get logo from app settings
    const logoUrl = useAppSettingsStore((state) => state.logoUrl);
    const logoScale = useAppSettingsStore((state) => state.logoScale);

    // Initialize app settings when login page loads
    useEffect(() => {
        // Load settings from database
        const loadSettings = async () => {
            try {
                const { data } = await supabase
                    .from('settings')
                    .select('logo_url, logo_scale')
                    .eq('id', 'global')
                    .single();

                if (data?.logo_url) {
                    useAppSettingsStore.getState().setLogoUrl(data.logo_url);
                }
                if (data?.logo_scale) {
                    useAppSettingsStore.getState().setLogoScale(data.logo_scale);
                }
            } catch (error) {
                console.error('Error loading logo settings:', error);
            }
        };
        loadSettings();
    }, []);

    // Check if user was redirected due to account deletion
    useEffect(() => {
        const reason = searchParams.get('reason');
        if (reason === 'account_deleted') {
            setAccountDeletedMessage('تم حذف حسابك بواسطة مسؤول النظام. يرجى التواصل مع الإدارة للمزيد من المعلومات.');
            // Clean up URL
            window.history.replaceState({}, '', '/login');
        }
    }, [searchParams]);

    // Get the page user was trying to access before being redirected to login
    const from = (location.state as any)?.from?.pathname || '/';

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !password) {
            setError('الرجاء إدخال البريد الإلكتروني وكلمة المرور');
            return;
        }

        setIsSubmitting(true);
        setError('');
        setAccountDeletedMessage('');

        try {
            await signIn(email, password);
            // Navigate to the page user originally wanted, or home as fallback
            navigate(from, { replace: true });
        } catch (err: any) {
            console.error('Login error:', err);
            setError(err.message || 'فشل تسجيل الدخول. تحقق من البيانات المدخلة.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
                <FullPageLoading />
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 via-primary-50/30 to-slate-100 dark:from-slate-900 dark:via-primary-950/20 dark:to-slate-900 p-4" dir="rtl">
            <div className="w-full max-w-md">
                <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-glass rounded-corporate-xl shadow-soft-xl p-8 border border-slate-200/60 dark:border-slate-700/60">
                    {/* Header */}
                    <div className="text-center mb-8">
                        {logoUrl && (
                            <div className="mb-6 flex justify-center">
                                <img
                                    src={logoUrl}
                                    alt="شعار الشركة"
                                    className="h-24 max-w-[200px] object-contain drop-shadow-sm"
                                    style={{ transform: `scale(${logoScale})` }}
                                />
                            </div>
                        )}
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-primary-700 to-primary-500 bg-clip-text text-transparent mb-2">
                            نظام إدارة الجودة
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400">
                            تسجيل الدخول إلى حسابك
                        </p>
                    </div>

                    {/* Account Deleted Warning */}
                    {accountDeletedMessage && (
                        <div className="mb-4 p-4 bg-amber-50 dark:bg-amber-900/30 border border-amber-300 dark:border-amber-700 rounded-corporate text-amber-700 dark:text-amber-400 text-sm flex items-start gap-3">
                            <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            <span>{accountDeletedMessage}</span>
                        </div>
                    )}

                    {/* Error Message */}
                    {error && (
                        <div className="mb-4 p-3.5 bg-rose-50 dark:bg-rose-900/30 border border-rose-200 dark:border-rose-800 rounded-corporate text-rose-600 dark:text-rose-400 text-sm">
                            {error}
                        </div>
                    )}

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                البريد الإلكتروني
                            </label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="example@company.com"
                                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-corporate focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 dark:text-white placeholder-slate-400 transition-all duration-200"
                                dir="ltr"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                كلمة المرور
                            </label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-corporate focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 dark:text-white placeholder-slate-400 transition-all duration-200"
                                dir="ltr"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full py-3.5 bg-gradient-to-r from-primary-600 to-primary-500 text-white rounded-corporate hover:from-primary-700 hover:to-primary-600 focus:ring-4 focus:ring-primary-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 font-medium shadow-soft hover:shadow-soft-lg hover:-translate-y-0.5 disabled:hover:translate-y-0"
                        >
                            {isSubmitting ? 'جاري تسجيل الدخول...' : 'تسجيل الدخول'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
