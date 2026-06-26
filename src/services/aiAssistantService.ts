import { supabase } from '../config/supabase';
import type { AiChatFunctionResult, AiExecuteFunctionResult, AiMessage, AiThread } from '../types/ai';

type SendAiMessageInput = {
  threadId?: string | null;
  message: string;
  moduleHint?: string | null;
  locale?: string;
};

type ExecuteProposalInput = {
  proposalId: string;
  confirmationToken?: string;
  locale?: string;
};

async function extractFunctionErrorMessage(error: unknown, data: unknown): Promise<string> {
  const dataError =
    data && typeof data === 'object' && 'error' in data ? String((data as { error?: string }).error || '') : '';
  if (dataError) return dataError;

  if (error && typeof error === 'object' && 'context' in error) {
    const context = (error as { context?: Response }).context;
    if (context) {
      try {
        const json = await context.clone().json() as { error?: string };
        if (typeof json?.error === 'string' && json.error.trim()) return json.error.trim();
      } catch {
        try {
          const text = (await context.clone().text()).trim();
          if (text) return text;
        } catch {
          // Ignore response parsing issues and fall back to SDK error message.
        }
      }
    }
  }

  return error instanceof Error ? error.message : '';
}

class AiAssistantService {
  async listThreads(limit = 40): Promise<AiThread[]> {
    const { data, error } = await supabase
      .from('ai_threads')
      .select('id, title, module_hint, last_message_at, created_at, updated_at, is_archived')
      .eq('is_archived', false)
      .order('last_message_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return (data || []) as AiThread[];
  }

  async getMessages(threadId: string, limit = 120): Promise<AiMessage[]> {
    const { data, error } = await supabase
      .from('ai_messages')
      .select('id, thread_id, role, content, created_at, created_by, metadata')
      .eq('thread_id', threadId)
      .order('created_at', { ascending: true })
      .limit(limit);

    if (error) throw error;
    return (data || []) as AiMessage[];
  }

  async archiveThread(threadId: string): Promise<void> {
    const { error } = await supabase
      .from('ai_threads')
      .update({ is_archived: true })
      .eq('id', threadId);

    if (error) throw error;
  }

  async sendMessage(input: SendAiMessageInput): Promise<AiChatFunctionResult> {
    const { data, error } = await supabase.functions.invoke('ai-assistant', {
      body: {
        action: 'chat',
        threadId: input.threadId || null,
        message: input.message,
        moduleHint: input.moduleHint || null,
        locale: input.locale || 'ar',
        mode: 'propose',
      },
    });

    if (error) {
      const functionError = await extractFunctionErrorMessage(error, data);
      throw new Error(functionError || error.message || 'Failed to call AI assistant function.');
    }

    if (!data || typeof data !== 'object' || !data.thread) {
      throw new Error('AI assistant returned invalid response.');
    }

    return data as AiChatFunctionResult;
  }

  async executeProposal(input: ExecuteProposalInput): Promise<AiExecuteFunctionResult> {
    const body: Record<string, unknown> = {
      action: 'execute',
      proposalId: input.proposalId,
      locale: input.locale || 'ar',
    };
    if (input.confirmationToken?.trim()) {
      body.confirmationToken = input.confirmationToken.trim();
    }

    const { data, error } = await supabase.functions.invoke('ai-assistant', {
      body,
    });

    if (error) {
      const functionError = await extractFunctionErrorMessage(error, data);
      throw new Error(functionError || error.message || 'Failed to execute AI assistant action.');
    }

    if (!data || typeof data !== 'object' || !data.proposal || !data.assistant_message) {
      throw new Error('AI assistant returned invalid execution response.');
    }

    return data as AiExecuteFunctionResult;
  }
}

export const aiAssistantService = new AiAssistantService();
export default aiAssistantService;
