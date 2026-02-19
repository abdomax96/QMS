/**
 * ShareButton Component
 * زر المشاركة مع التحقق من الصلاحيات
 */

import React, { useState, lazy, Suspense } from 'react';
import { ShareIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { useModulePermissions } from '../../hooks/useModulePermissions';
import { useAuth } from '../../hooks/ncr/useAuth';

// Lazy load the ShareDocument modal
const ShareDocument = lazy(() => import('../documents/ShareDocument'));

// ==================== Types ====================
interface ShareButtonProps {
    /** Document/item ID to share */
    documentId: string;
    /** Document type */
    documentType: 'form' | 'report' | 'folder';
    /** Document title for display */
    documentTitle: string;
    /** Button variant */
    variant?: 'icon' | 'button' | 'menu-item';
    /** Custom class */
    className?: string;
    /** Disabled state */
    disabled?: boolean;
}

// ==================== Main Component ====================
const ShareButton: React.FC<ShareButtonProps> = ({
    documentId,
    documentType,
    documentTitle,
    variant = 'button',
    className = '',
    disabled = false,
}) => {
    const [showModal, setShowModal] = useState(false);
    const { canPerform, loading } = useModulePermissions();
    const { profile } = useAuth();

    // Check if user has share permission for forms_reports module
    const canShare = canPerform('forms_reports', 'share');

    // If user doesn't have permission, don't render
    if (!canShare && !loading) {
        return null;
    }

    // Loading state
    if (loading) {
        if (variant === 'icon') {
            return (
                <button disabled className={`p-2 opacity-50 ${className}`}>
                    <ArrowPathIcon className="w-5 h-5 animate-spin" />
                </button>
            );
        }
        return (
            <button disabled className={`inline-flex items-center gap-2 px-3 py-2 opacity-50 ${className}`}>
                <ArrowPathIcon className="w-4 h-4 animate-spin" />
                <span>مشاركة</span>
            </button>
        );
    }

    // User info for sharing
    const currentUserId = profile?.uid || '';
    const currentDepartmentId = undefined; // Would need to be fetched from user_departments

    // Render based on variant
    const handleClick = () => setShowModal(true);

    const renderButton = () => {
        switch (variant) {
            case 'icon':
                return (
                    <button
                        onClick={handleClick}
                        disabled={disabled}
                        className={`p-2 text-gray-500 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
                        title="مشاركة"
                    >
                        <ShareIcon className="w-5 h-5" />
                    </button>
                );

            case 'menu-item':
                return (
                    <button
                        onClick={handleClick}
                        disabled={disabled}
                        className={`w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 ${className}`}
                    >
                        <ShareIcon className="w-4 h-4" />
                        مشاركة
                    </button>
                );

            default:
                return (
                    <button
                        onClick={handleClick}
                        disabled={disabled}
                        className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
                    >
                        <ShareIcon className="w-4 h-4" />
                        مشاركة
                    </button>
                );
        }
    };

    return (
        <>
            {renderButton()}

            {/* Share Modal */}
            {showModal && (
                <Suspense
                    fallback={
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                            <div className="bg-white dark:bg-gray-800 rounded-xl p-8">
                                <ArrowPathIcon className="w-8 h-8 animate-spin text-primary-600 mx-auto" />
                            </div>
                        </div>
                    }
                >
                    <ShareDocument
                        documentId={documentId}
                        documentType={documentType}
                        documentTitle={documentTitle}
                        currentUserId={currentUserId}
                        currentDepartmentId={currentDepartmentId}
                        onClose={() => setShowModal(false)}
                        onShare={(share) => {
                            console.log('Shared:', share);
                            // Could show a toast notification here
                        }}
                    />
                </Suspense>
            )}
        </>
    );
};

export default ShareButton;











