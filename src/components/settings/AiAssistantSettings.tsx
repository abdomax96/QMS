import React, { useEffect, useState } from 'react';
import {
  SparklesIcon,
  KeyIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import { useModulePermissions } from '../../hooks/useModulePermissions';
import {
  DEFAULT_AI_ASSISTANT_SETTINGS,
  aiAssistantSettingsService,
} from '../../services/aiAssistantSettingsService';
import type { AiAssistantSettings } from '../../types/ai';

const PROVIDER_DEFAULTS: Record<
  AiAssistantSettings['api_provider'],
  {
    baseUrl: string;
    defaultModel: string;
    keyHint: string;
  }
> = {
  openai: {
    baseUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4.1-mini',
    keyHint: 'مفتاح OpenAI يبدأ عادةً بـ sk-.',
  },
  openrouter: {
    baseUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'openai/gpt-4.1-mini',
    keyHint: 'مفتاح OpenRouter يبدأ بـ sk-or-.',
  },
  google: {
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    defaultModel: 'gemini-2.5-flash',
    keyHint: 'استخدم مفتاح Google/Gemini API صالح من Google AI Studio.',
  },
  anthropic: {
    baseUrl: 'https://api.anthropic.com/v1',
    defaultModel: 'claude-sonnet-4-20250514',
    keyHint: 'استخدم مفتاح Anthropic API صالح لحساب Claude.',
  },
  custom: {
    baseUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4.1-mini',
    keyHint: 'يجب أن يكون المزود متوافقًا مع واجهة OpenAI chat/completions.',
  },
};

const CUSTOM_MODEL_OPTION = '__custom_model__';

const PROVIDER_MODEL_OPTIONS: Record<
  Exclude<AiAssistantSettings['api_provider'], 'custom'>,
  Array<{ value: string; label: string }>
> = {
  openai: [
    { value: 'gpt-4.1-mini', label: 'gpt-4.1-mini' },
    { value: 'gpt-4o-mini', label: 'gpt-4o-mini' },
    { value: 'gpt-4o', label: 'gpt-4o' },
  ],
  openrouter: [
    { value: 'openai/gpt-4.1-mini', label: 'openai/gpt-4.1-mini' },
    { value: 'openai/gpt-4o-mini', label: 'openai/gpt-4o-mini' },
    { value: 'openai/gpt-4o', label: 'openai/gpt-4o' },
  ],
  google: [
    { value: 'gemini-2.5-flash', label: 'gemini-2.5-flash' },
    { value: 'gemini-2.5-flash-lite', label: 'gemini-2.5-flash-lite' },
    { value: 'gemini-2.5-pro', label: 'gemini-2.5-pro' },
    { value: 'gemini-2.0-flash', label: 'gemini-2.0-flash' },
    { value: 'gemini-3-flash-preview', label: 'gemini-3-flash-preview' },
  ],
  anthropic: [
    { value: 'claude-sonnet-4-20250514', label: 'claude-sonnet-4-20250514' },
    { value: 'claude-opus-4-20250514', label: 'claude-opus-4-20250514' },
    { value: 'claude-3-7-sonnet-latest', label: 'claude-3-7-sonnet-latest' },
    { value: 'claude-3-5-sonnet-latest', label: 'claude-3-5-sonnet-latest' },
    { value: 'claude-3-5-haiku-latest', label: 'claude-3-5-haiku-latest' },
  ],
};

function normalizeApiKeyInput(value: string): string {
  return value.trim().replace(/^bearer\s+/i, '').trim();
}

function validateApiKeyForProvider(
  provider: AiAssistantSettings['api_provider'],
  apiKey: string
): string | null {
  const normalizedKey = normalizeApiKeyInput(apiKey);
  if (!normalizedKey) return null;

  if (provider === 'openrouter' && !/^sk-or-/i.test(normalizedKey)) {
    return 'مفتاح OpenRouter غير متوافق. يجب أن يبدأ بـ sk-or-.';
  }

  if (provider === 'openai' && (!/^sk-/i.test(normalizedKey) || /^sk-or-/i.test(normalizedKey))) {
    return 'مفتاح OpenAI غير متوافق. يجب أن يبدأ بـ sk- (وليس sk-or-).';
  }

  if (provider === 'google' && /^(sk-|sk-or-)/i.test(normalizedKey)) {
    return 'مفتاح Google Gemini غير متوافق. استخدم مفتاح Google API وليس مفتاح OpenAI/OpenRouter.';
  }

  if (provider === 'anthropic' && /^sk-or-/i.test(normalizedKey)) {
    return 'مفتاح Claude (Anthropic) غير متوافق. استخدم مفتاح Anthropic API وليس مفتاح OpenRouter.';
  }

  return null;
}

const AiAssistantSettings: React.FC = () => {
  const { loading: permissionsLoading, canPerform } = useModulePermissions();

  const canManageAiSettings = canPerform('ai_assistant', 'manage_settings');
  const canViewAi = canPerform('ai_assistant', 'view') || canManageAiSettings;

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [settings, setSettings] = useState<AiAssistantSettings>(DEFAULT_AI_ASSISTANT_SETTINGS);
  const [savedProvider, setSavedProvider] = useState<AiAssistantSettings['api_provider']>(
    DEFAULT_AI_ASSISTANT_SETTINGS.api_provider
  );
  const [apiKeyInput, setApiKeyInput] = useState('');

  const providerDefaults = PROVIDER_DEFAULTS[settings.api_provider];
  const modelOptions =
    settings.api_provider === 'custom' ? [] : PROVIDER_MODEL_OPTIONS[settings.api_provider];
  const usesPresetModel =
    settings.api_provider !== 'custom' &&
    modelOptions.some((option) => option.value === settings.default_model);
  const selectedModelValue =
    settings.api_provider === 'custom'
      ? settings.default_model
      : usesPresetModel
        ? settings.default_model
        : CUSTOM_MODEL_OPTION;
  const showCustomModelInput =
    settings.api_provider === 'custom' || selectedModelValue === CUSTOM_MODEL_OPTION;
  const canEditBaseUrl = settings.api_provider === 'custom';

  useEffect(() => {
    if (permissionsLoading) return;

    if (!canViewAi) {
      setIsLoading(false);
      return;
    }

    void loadSettings();
  }, [permissionsLoading, canViewAi]);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const loaded = await aiAssistantSettingsService.getSettings();
      setSettings(loaded);
      setSavedProvider(loaded.api_provider);
      setApiKeyInput('');
      setError(null);
    } catch (err: any) {
      console.error('Error loading AI settings:', err);
      setError(err?.message || 'تعذر تحميل إعدادات المساعد الذكي');
      setSettings(DEFAULT_AI_ASSISTANT_SETTINGS);
    } finally {
      setIsLoading(false);
    }
  };

  const saveSettings = async () => {
    if (!canManageAiSettings) return;

    const normalizedApiKey = normalizeApiKeyInput(apiKeyInput);
    const providerChanged = settings.api_provider !== savedProvider;
    if (providerChanged && settings.has_api_key && !normalizedApiKey) {
      setError('تم تغيير مزود AI. يرجى إدخال مفتاح جديد متوافق مع المزود الحالي قبل الحفظ.');
      return;
    }

    const apiKeyValidationError = validateApiKeyForProvider(settings.api_provider, normalizedApiKey);
    if (apiKeyValidationError) {
      setError(apiKeyValidationError);
      return;
    }

    setIsSaving(true);
    setSuccess(null);
    setError(null);

    try {
      const saved = await aiAssistantSettingsService.saveSettings({
        is_enabled: settings.is_enabled,
        default_model: settings.default_model,
        temperature: settings.temperature,
        max_tokens: settings.max_tokens,
        api_provider: settings.api_provider,
        api_base_url: settings.api_base_url,
        api_key: normalizedApiKey || undefined,
      });

      setSettings(saved);
      setSavedProvider(saved.api_provider);
      setApiKeyInput('');
      setError(null);
      setSuccess('تم حفظ إعدادات الذكاء الاصطناعي بنجاح');
      window.setTimeout(() => setSuccess(null), 2500);
    } catch (err: any) {
      console.error('Error saving AI settings:', err);
      setError(err?.message || 'تعذر حفظ إعدادات الذكاء الاصطناعي');
    } finally {
      setIsSaving(false);
    }
  };

  const clearApiKey = async () => {
    if (!canManageAiSettings) return;

    const confirmed = window.confirm('سيتم حذف مفتاح API الحالي. هل تريد المتابعة؟');
    if (!confirmed) return;

    setIsSaving(true);
    setSuccess(null);

    try {
      const saved = await aiAssistantSettingsService.saveSettings({
        is_enabled: settings.is_enabled,
        default_model: settings.default_model,
        temperature: settings.temperature,
        max_tokens: settings.max_tokens,
        api_provider: settings.api_provider,
        api_base_url: settings.api_base_url,
        clear_api_key: true,
      });

      setSettings(saved);
      setApiKeyInput('');
      setError(null);
      setSuccess('تم حذف مفتاح API المحفوظ');
      window.setTimeout(() => setSuccess(null), 2500);
    } catch (err: any) {
      console.error('Error clearing AI API key:', err);
      setError(err?.message || 'تعذر حذف المفتاح');
    } finally {
      setIsSaving(false);
    }
  };

  if (permissionsLoading || isLoading) {
    return (
      <div className="p-6">
        <div className="h-36 rounded-xl border border-gray-200 bg-white animate-pulse" />
      </div>
    );
  }

  if (!canViewAi) {
    return (
      <div className="p-6">
        <div className="rounded-lg border border-amber-200 bg-amber-50 text-amber-700 px-4 py-3 text-sm">
          لا تملك صلاحية عرض إعدادات المساعد الذكي.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <SparklesIcon className="w-6 h-6 text-teal-600" />
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">إعدادات الذكاء الاصطناعي</h2>
      </div>

      <p className="text-sm text-gray-600 dark:text-gray-400">
        إدارة مزود الذكاء الاصطناعي والموديل ومفتاح API المركزي للتطبيق.
      </p>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 text-red-700 px-3 py-2 text-sm flex items-start gap-2">
          <ExclamationCircleIcon className="w-5 h-5 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="rounded-lg border border-green-200 bg-green-50 text-green-700 px-3 py-2 text-sm flex items-start gap-2">
          <CheckCircleIcon className="w-5 h-5 mt-0.5" />
          <span>{success}</span>
        </div>
      )}

      {!canManageAiSettings && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 text-amber-700 px-3 py-2 text-sm">
          لديك صلاحية عرض فقط. التعديل يحتاج صلاحية `ai_assistant.manage_settings`.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="md:col-span-2 flex items-center gap-2">
          <input
            id="ai-enabled-main-settings"
            type="checkbox"
            checked={settings.is_enabled}
            onChange={(e) => setSettings((prev) => ({ ...prev, is_enabled: e.target.checked }))}
            disabled={!canManageAiSettings || isSaving}
            className="h-4 w-4 rounded border-gray-300"
          />
          <label htmlFor="ai-enabled-main-settings" className="text-sm text-gray-700 dark:text-gray-300">
            تفعيل المساعد الذكي
          </label>
        </div>

        <div>
          <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">مزود API</label>
          <select
            value={settings.api_provider}
            onChange={(e) => {
              const nextProvider = (e.target.value as AiAssistantSettings['api_provider']) || 'openai';
              const nextDefaults = PROVIDER_DEFAULTS[nextProvider];
              setSettings((prev) => ({
                ...prev,
                api_provider: nextProvider,
                api_base_url: nextDefaults.baseUrl,
                default_model: nextDefaults.defaultModel,
              }));
            }}
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700"
            disabled={!canManageAiSettings || isSaving}
          >
            <option value="openai">OpenAI</option>
            <option value="openrouter">OpenRouter</option>
            <option value="google">Google Gemini</option>
            <option value="anthropic">Claude (Anthropic)</option>
            <option value="custom">Custom (OpenAI Compatible)</option>
          </select>
          <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">{providerDefaults.keyHint}</p>
        </div>

        <div>
          <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">الموديل الافتراضي</label>
          {settings.api_provider === 'custom' ? (
            <input
              type="text"
              value={settings.default_model}
              onChange={(e) => setSettings((prev) => ({ ...prev, default_model: e.target.value }))}
              placeholder={providerDefaults.defaultModel}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700"
              disabled={!canManageAiSettings || isSaving}
            />
          ) : (
            <div className="space-y-2">
              <select
                value={selectedModelValue}
                onChange={(e) => {
                  const nextValue = e.target.value;
                  setSettings((prev) => ({
                    ...prev,
                    default_model:
                      nextValue === CUSTOM_MODEL_OPTION ? '' : nextValue,
                  }));
                }}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700"
                disabled={!canManageAiSettings || isSaving}
              >
                {modelOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
                <option value={CUSTOM_MODEL_OPTION}>موديل مخصص</option>
              </select>

              {showCustomModelInput && (
                <input
                  type="text"
                  value={settings.default_model}
                  onChange={(e) => setSettings((prev) => ({ ...prev, default_model: e.target.value }))}
                  placeholder={providerDefaults.defaultModel}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700"
                  disabled={!canManageAiSettings || isSaving}
                />
              )}
            </div>
          )}
        </div>

        <div className="md:col-span-2">
          <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">API Base URL</label>
          {canEditBaseUrl ? (
            <input
              type="text"
              value={settings.api_base_url}
              onChange={(e) => setSettings((prev) => ({ ...prev, api_base_url: e.target.value }))}
              placeholder={providerDefaults.baseUrl}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700"
              disabled={!canManageAiSettings || isSaving}
            />
          ) : (
            <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-sm text-gray-700 dark:text-gray-300">
              {providerDefaults.baseUrl}
            </div>
          )}
          <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
            {canEditBaseUrl
              ? 'هذا الحقل متاح فقط للمزودات المتوافقة المخصصة.'
              : 'يتم ضبط هذا الرابط تلقائياً حسب المزود، ولا يتغير عند تغيير الموديل.'}
          </p>
        </div>

        <div>
          <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Temperature</label>
          <input
            type="number"
            min={0}
            max={2}
            step={0.1}
            value={settings.temperature}
            onChange={(e) => {
              const nextValue = Number(e.target.value);
              if (Number.isFinite(nextValue)) {
                setSettings((prev) => ({ ...prev, temperature: nextValue }));
              }
            }}
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700"
            disabled={!canManageAiSettings || isSaving}
          />
        </div>

        <div>
          <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Max Tokens</label>
          <input
            type="number"
            min={200}
            max={6000}
            step={50}
            value={settings.max_tokens}
            onChange={(e) => {
              const nextValue = Number(e.target.value);
              if (Number.isFinite(nextValue)) {
                setSettings((prev) => ({ ...prev, max_tokens: Math.round(nextValue) }));
              }
            }}
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700"
            disabled={!canManageAiSettings || isSaving}
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1 flex items-center gap-1">
            <KeyIcon className="w-4 h-4" />
            API Key
          </label>
          <input
            type="password"
            value={apiKeyInput}
            onChange={(e) => setApiKeyInput(e.target.value)}
            placeholder="أدخل مفتاح جديد للتحديث، واتركه فارغًا للإبقاء على الحالي"
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700"
            disabled={!canManageAiSettings || isSaving}
            autoComplete="new-password"
          />
          <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
            الحالة الحالية: {settings.has_api_key ? `محفوظ (****${settings.api_key_last4})` : 'لا يوجد مفتاح محفوظ'}.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2">
        <button
          type="button"
          onClick={clearApiKey}
          disabled={!canManageAiSettings || isSaving || !settings.has_api_key}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm rounded-lg border border-rose-300 text-rose-700 hover:bg-rose-50 disabled:opacity-50"
        >
          <TrashIcon className="w-4 h-4" />
          حذف المفتاح
        </button>

        <button
          type="button"
          onClick={saveSettings}
          disabled={!canManageAiSettings || isSaving}
          className="px-4 py-2 text-sm rounded-lg bg-teal-600 text-white disabled:opacity-50"
        >
          {isSaving ? 'جاري الحفظ...' : 'حفظ إعدادات AI'}
        </button>
      </div>
    </div>
  );
};

export default AiAssistantSettings;
