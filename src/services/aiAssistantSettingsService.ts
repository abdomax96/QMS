import { supabase } from '../config/supabase';
import type { AiAssistantSettings, AiAssistantSettingsSaveInput } from '../types/ai';

const DEFAULT_OPENAI_BASE_URL = 'https://api.openai.com/v1';
const DEFAULT_OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';
const DEFAULT_GOOGLE_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/openai';
const DEFAULT_ANTHROPIC_BASE_URL = 'https://api.anthropic.com/v1';

export const DEFAULT_AI_ASSISTANT_SETTINGS: AiAssistantSettings = {
  is_enabled: true,
  default_model: 'gpt-4.1-mini',
  temperature: 0.2,
  max_tokens: 1200,
  api_provider: 'openai',
  api_base_url: DEFAULT_OPENAI_BASE_URL,
  has_api_key: false,
  api_key_last4: '',
  api_key_updated_at: null,
};

function normalizeText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeApiProvider(value: unknown): AiAssistantSettings['api_provider'] {
  return value === 'openrouter' || value === 'google' || value === 'anthropic' || value === 'custom'
    ? value
    : 'openai';
}

function defaultBaseUrlForProvider(provider: AiAssistantSettings['api_provider']): string {
  if (provider === 'google') return DEFAULT_GOOGLE_BASE_URL;
  if (provider === 'openrouter') return DEFAULT_OPENROUTER_BASE_URL;
  if (provider === 'anthropic') return DEFAULT_ANTHROPIC_BASE_URL;
  return DEFAULT_OPENAI_BASE_URL;
}

function normalizeSettings(payload: any): AiAssistantSettings {
  const apiProvider = normalizeApiProvider(payload?.api_provider);
  return {
    is_enabled: payload?.is_enabled !== false,
    default_model: normalizeText(payload?.default_model) || DEFAULT_AI_ASSISTANT_SETTINGS.default_model,
    temperature: Number.isFinite(Number(payload?.temperature))
      ? Number(payload.temperature)
      : DEFAULT_AI_ASSISTANT_SETTINGS.temperature,
    max_tokens: Number.isFinite(Number(payload?.max_tokens))
      ? Number(payload.max_tokens)
      : DEFAULT_AI_ASSISTANT_SETTINGS.max_tokens,
    api_provider: apiProvider,
    api_base_url: normalizeText(payload?.api_base_url) || defaultBaseUrlForProvider(apiProvider),
    has_api_key: Boolean(payload?.has_api_key),
    api_key_last4: normalizeText(payload?.api_key_last4),
    api_key_updated_at: normalizeText(payload?.api_key_updated_at) || null,
  };
}

class AiAssistantSettingsService {
  private async resolveFunctionErrorMessage(error: any, fallback: string): Promise<string> {
    try {
      const context = error?.context;

      if (context && typeof context.clone === 'function') {
        const cloned = context.clone();
        if (typeof cloned.json === 'function') {
          const parsed = await cloned.json();
          const message = normalizeText(parsed?.error || parsed?.message);
          if (message) return message;
        }
      }
    } catch {
      // Ignore parsing errors and fall back to generic message.
    }

    return normalizeText(error?.message) || fallback;
  }

  async getSettings(): Promise<AiAssistantSettings> {
    const { data, error } = await supabase.functions.invoke('ai-assistant', {
      body: {
        action: 'get_settings',
      },
    });

    if (error) {
      const message = await this.resolveFunctionErrorMessage(error, 'Failed to load AI settings.');
      throw new Error(message);
    }

    if (!data || typeof data !== 'object' || !('settings' in data)) {
      throw new Error('AI settings endpoint returned invalid response.');
    }

    return normalizeSettings((data as any).settings);
  }

  async saveSettings(input: AiAssistantSettingsSaveInput): Promise<AiAssistantSettings> {
    const payload: Record<string, unknown> = {
      is_enabled: input.is_enabled,
      default_model: normalizeText(input.default_model),
      temperature: input.temperature,
      max_tokens: input.max_tokens,
      api_provider: input.api_provider,
      api_base_url: normalizeText(input.api_base_url),
    };

    const apiKey = normalizeText(input.api_key);
    if (apiKey) {
      payload.api_key = apiKey;
    }
    if (input.clear_api_key === true) {
      payload.clear_api_key = true;
    }

    const { data, error } = await supabase.functions.invoke('ai-assistant', {
      body: {
        action: 'save_settings',
        settings: payload,
      },
    });

    if (error) {
      const message = await this.resolveFunctionErrorMessage(error, 'Failed to save AI settings.');
      throw new Error(message);
    }

    if (!data || typeof data !== 'object' || !('settings' in data)) {
      throw new Error('AI settings endpoint returned invalid response.');
    }

    return normalizeSettings((data as any).settings);
  }
}

export const aiAssistantSettingsService = new AiAssistantSettingsService();
export default aiAssistantSettingsService;
