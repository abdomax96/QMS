import { supabase } from '../config/supabase';
import type { AiActionProposal, AiChatFunctionResult, AiMessage, AiThread } from '../types/ai';

type SendAiMessageInput = {
  threadId?: string | null;
  message: string;
  moduleHint?: string | null;
  locale?: string;
};

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

  async getProposals(threadId: string, limit = 40): Promise<AiActionProposal[]> {
    const { data, error } = await supabase
      .from('ai_action_proposals')
      .select('id, thread_id, message_id, tool_name, summary, risk_level, status, action_payload, execution_result, created_at')
      .eq('thread_id', threadId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return (data || []) as AiActionProposal[];
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
      throw new Error(error.message || 'Failed to call AI assistant function.');
    }

    if (!data || typeof data !== 'object' || !data.thread) {
      throw new Error('AI assistant returned invalid response.');
    }

    return data as AiChatFunctionResult;
  }
}

export const aiAssistantService = new AiAssistantService();
export default aiAssistantService;
