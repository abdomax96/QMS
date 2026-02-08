/**
 * PasswordChangeForm Component
 * تغيير كلمة مرور المستخدم
 * 
 * Implements secure password change using Supabase Auth updateUser
 */

import { useState } from 'react';
import { supabase } from '../../config/supabase';
import { useToastStore } from '../../store/toastStore';
import { Eye, EyeOff, Lock, Check, AlertCircle } from 'lucide-react';

interface PasswordChangeFormProps {
    onSuccess?: () => void;
    className?: string;
}

export function PasswordChangeForm({ onSuccess, className = '' }: PasswordChangeFormProps) {
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errors, setErrors] = useState<{ newPassword?: string; confirmPassword?: string }>({});
    const { addToast } = useToastStore();

    // Password validation
    const validatePassword = (password: string): string[] => {
        const issues: string[] = [];
        if (password.length < 6) issues.push('يجب أن تكون 6 أحرف على الأقل');
        if (password.length > 72) issues.push('يجب أن تكون أقل من 72 حرف');
        return issues;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Guard against double-submit
        if (isSubmitting) return;

        // Validate
        const newErrors: typeof errors = {};
        const passwordIssues = validatePassword(newPassword);
        if (passwordIssues.length > 0) {
            newErrors.newPassword = passwordIssues.join('، ');
        }
        if (newPassword !== confirmPassword) {
            newErrors.confirmPassword = 'كلمات المرور غير متطابقة';
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        setErrors({});
        setIsSubmitting(true);

        try {
            const { error } = await supabase.auth.updateUser({
                password: newPassword
            });

            if (error) {
                throw error;
            }

            addToast({
                type: 'success',
                title: 'نجاح',
                message: 'تم تغيير كلمة المرور بنجاح'
            });

            // Clear form
            setNewPassword('');
            setConfirmPassword('');

            onSuccess?.();
        } catch (error: any) {
            console.error('[PasswordChange] Error:', error);
            addToast({
                type: 'error',
                title: 'خطأ',
                message: error.message || 'فشل تغيير كلمة المرور'
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className={`space-y-4 ${className}`}>
            <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    كلمة المرور الجديدة
                </label>
                <div className="relative">
                    <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type={showPassword ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className={`w-full pr-10 pl-10 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${errors.newPassword ? 'border-red-500' : 'border-gray-300'
                            }`}
                        placeholder="أدخل كلمة المرور الجديدة"
                        required
                        minLength={6}
                        disabled={isSubmitting}
                    />
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                </div>
                {errors.newPassword && (
                    <p className="flex items-center gap-1 text-sm text-red-500">
                        <AlertCircle className="w-4 h-4" />
                        {errors.newPassword}
                    </p>
                )}
            </div>

            <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    تأكيد كلمة المرور
                </label>
                <div className="relative">
                    <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className={`w-full pr-10 pl-10 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${errors.confirmPassword ? 'border-red-500' : 'border-gray-300'
                            }`}
                        placeholder="أعد إدخال كلمة المرور"
                        required
                        disabled={isSubmitting}
                    />
                    <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                        {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                </div>
                {errors.confirmPassword && (
                    <p className="flex items-center gap-1 text-sm text-red-500">
                        <AlertCircle className="w-4 h-4" />
                        {errors.confirmPassword}
                    </p>
                )}
                {confirmPassword && newPassword === confirmPassword && (
                    <p className="flex items-center gap-1 text-sm text-green-500">
                        <Check className="w-4 h-4" />
                        كلمات المرور متطابقة
                    </p>
                )}
            </div>

            <button
                type="submit"
                disabled={isSubmitting || !newPassword || !confirmPassword}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
                {isSubmitting ? (
                    <>
                        <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                        جاري التغيير...
                    </>
                ) : (
                    <>
                        <Lock className="w-4 h-4" />
                        تغيير كلمة المرور
                    </>
                )}
            </button>
        </form>
    );
}

export default PasswordChangeForm;
