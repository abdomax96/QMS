export type AiMessageRole = 'user' | 'assistant' | 'system' | 'tool';
export type AiRiskLevel = 'low' | 'medium' | 'high';
export type AiProposalStatus = 'proposed' | 'approved' | 'rejected' | 'executed' | 'error';
export type AiApiProvider = 'openai' | 'openrouter' | 'google' | 'anthropic' | 'custom';

export interface AiEntityRef {
  table: string;
  id?: string | null;
  label?: string | null;
  display?: string | null;
}

export interface AiPageInfo {
  page_size: number;
  returned_count: number;
  has_more: boolean;
  next_cursor?: string | null;
  scanned_tables?: string[];
}

export interface AiActionProposal {
  id: string;
  thread_id: string;
  message_id: string | null;
  tool_name: string;
  capability_name?: string | null;
  summary: string;
  risk_level: AiRiskLevel;
  resolved_risk?: AiRiskLevel | null;
  status: AiProposalStatus;
  action_payload: Record<string, unknown>;
  payload_summary?: string | null;
  permission_snapshot?: Record<string, unknown> | null;
  confirmation_token?: string | null;
  entity_refs?: AiEntityRef[];
  execution_result?: Record<string, unknown> | null;
  created_at: string;
}

export interface AiMessageMetadata {
  mode?: 'propose_only' | 'execute';
  model?: string;
  usage?: Record<string, unknown> | null;
  provider?: AiApiProvider;
  ai_status?: string | null;
  ai_error_summary?: string | null;
  tool_name?: string | null;
  tool_kind?: 'read' | 'write' | null;
  grounded?: boolean;
  capability?: string | null;
  entity_refs?: AiEntityRef[];
  page_info?: AiPageInfo | null;
  truncated?: boolean;
  proposals?: AiActionProposal[];
  execution?: Record<string, unknown> | null;
  [key: string]: unknown;
}

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
  metadata?: AiMessageMetadata;
}

export interface AiChatFunctionResult {
  mode: 'propose_only' | 'execute';
  thread: AiThread;
  user_message: AiMessage;
  assistant_message: AiMessage;
  reply: string;
  model: string;
  usage: Record<string, unknown> | null;
  capability?: string | null;
  entity_refs?: AiEntityRef[];
  grounded?: boolean;
  page_info?: AiPageInfo | null;
  truncated?: boolean;
  proposals: AiActionProposal[];
}

export interface AiExecuteFunctionResult {
  mode: 'execute';
  thread: AiThread;
  proposal: AiActionProposal;
  assistant_message: AiMessage;
  result_summary: string;
  result_payload: Record<string, unknown> | null;
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
