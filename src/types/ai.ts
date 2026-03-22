export type AiMessageRole = 'user' | 'assistant' | 'system' | 'tool';
export type AiRiskLevel = 'low' | 'medium' | 'high';
export type AiProposalStatus = 'proposed' | 'approved' | 'rejected' | 'executed' | 'error';
export type AiApiProvider = 'openai' | 'openrouter' | 'custom';

export interface AiThread {
  id: string;
  title: string;
  module_hint: string | null;
  last_message_at: string;
  created_at: string;
  updated_at: string;
  is_archived?: boolean;
}

export interface AiMessage {
  id: string;
  thread_id: string;
  role: AiMessageRole;
  content: string;
  created_at: string;
  created_by?: string | null;
  metadata?: Record<string, unknown>;
}

export interface AiActionProposal {
  id: string;
  thread_id: string;
  message_id: string | null;
  tool_name: string;
  summary: string;
  risk_level: AiRiskLevel;
  status: AiProposalStatus;
  action_payload: Record<string, unknown>;
  execution_result?: Record<string, unknown> | null;
  created_at: string;
}

export interface AiChatFunctionResult {
  mode: 'propose_only' | 'execute';
  thread: AiThread;
  user_message: AiMessage;
  assistant_message: AiMessage;
  reply: string;
  model: string;
  usage: Record<string, unknown> | null;
  proposals: AiActionProposal[];
}

export interface AiAssistantSettings {
  is_enabled: boolean;
  default_model: string;
  temperature: number;
  max_tokens: number;
  api_provider: AiApiProvider;
  api_base_url: string;
  has_api_key: boolean;
  api_key_last4: string;
  api_key_updated_at: string | null;
}

export interface AiAssistantSettingsSaveInput {
  is_enabled: boolean;
  default_model: string;
  temperature: number;
  max_tokens: number;
  api_provider: AiApiProvider;
  api_base_url: string;
  api_key?: string;
  clear_api_key?: boolean;
}
