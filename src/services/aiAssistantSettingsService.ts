import { supabase } from '../config/supabase';
import type { AiAssistantSettings, AiAssistantSettingsSaveInput } from '../types/ai';

export const DEFAULT_AI_ASSISTANT_SETTINGS: AiAssistantSettings = {
  is_enabled: true,
  default_model: 'gpt-4.1-mini',
  temperature: 0.2,
  max_tokens: 1200,
  api_provider: 'openai',
  api_base_url: 'https://api.openai.com/v1',
  has_api_key: false,
  api_key_last4: '',
  api_key_updated_at: null,
};

function normalizeText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeSettings(payload: any): AiAssistantSettings {
  return {
    is_enabled: payload?.is_enabled !== false,
    default_model: normalizeText(payload?.default_model) || DEFAULT_AI_ASSISTANT_SETTINGS.default_model,
    temperature: Number.isFinite(Number(payload?.temperature))
      ? Number(payload.temperature)
      : DEFAULT_AI_ASSISTANT_SETTINGS.temperature,
    max_tokens: Number.isFinite(Number(payload?.max_tokens))
      ? Number(payload.max_tokens)
      : DEFAULT_AI_ASSISTANT_SETTINGS.max_tokens,
    api_provider:
      payload?.api_provider === 'openrouter' || payload?.api_provider === 'custom'
        ? payload.api_provider
        : 'openai',
    api_base_url: normalizeText(payload?.api_base_url) || DEFAULT_AI_ASSISTANT_SETTINGS.api_base_url,
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
