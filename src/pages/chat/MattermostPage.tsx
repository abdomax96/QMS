import React from 'react';

const MATTERMOST_URL = import.meta.env.VITE_MATTERMOST_URL || '';
const MATTERMOST_MODE = (import.meta.env.VITE_MATTERMOST_MODE || 'external').toLowerCase();

const MattermostPage: React.FC = () => {
    const canEmbed = MATTERMOST_MODE === 'iframe' || MATTERMOST_MODE === 'embed';

    if (!MATTERMOST_URL) {
        return (
            <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
                <div className="rounded-full bg-amber-100 px-4 py-2 text-sm font-semibold text-amber-700">
                    Mattermost غير مفعّل
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                    أضف `VITE_MATTERMOST_URL` في ملف البيئة لتفعيل الدمج.
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                    يمكنك تحديد النمط عبر `VITE_MATTERMOST_MODE=external` أو `iframe`.
                </p>
            </div>
        );
    }

    return (
        <div className="flex h-full flex-col overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-800">
                <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Mattermost</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{MATTERMOST_URL}</p>
                </div>
                <div className="flex items-center gap-2">
                    <a
                        href={MATTERMOST_URL}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-primary-700"
                    >
                        فتح في تبويب جديد
                    </a>
                </div>
            </div>

            {canEmbed ? (
                <iframe
                    title="Mattermost"
                    src={MATTERMOST_URL}
                    className="h-full w-full flex-1 border-0"
                />
            ) : (
                <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                        تم ضبط الدمج على نمط خارجي.
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                        غيّر `VITE_MATTERMOST_MODE` إلى `iframe` إذا كنت تريد عرض Mattermost داخل التطبيق
                        (يجب السماح بالـ iframe من جهة السيرفر).
                    </p>
                    <a
                        href={MATTERMOST_URL}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
                    >
                        فتح Mattermost
                    </a>
                </div>
            )}
        </div>
    );
};

export default MattermostPage;
