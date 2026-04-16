// Client-side session types.
// NOTE: Keep in sync with server/src/types.ts — these shapes mirror the
// server response so the client can consume it in a type-safe way.

export interface SessionMetadata {
  sessionId: string;
  projectDir: string;
  projectPath: string;
  projectName: string;
  firstPrompt?: string;
  messageCount: number;
  created: string; // ISO 8601
  modified: string; // ISO 8601
  gitBranch?: string;
  version?: string;
}

export interface SessionDetail extends SessionMetadata {
  messages: MessageEntry[];
  tokenUsage: TokenUsage;
  toolCalls: ToolCallEntry[];
  models: string[];
  durationMs: number;
  isSidechain?: boolean;
  parentSessionId?: string;
}

export interface MessageEntry {
  type: "user" | "assistant";
  timestamp: string;
  content: string; // 첫 200자까지만 (보안)
  usage?: TokenUsagePerMessage;
  model?: string;
  toolCalls?: string[];
  uuid?: string;
  parentUuid?: string;
  stopReason?: string;
  isSidechain?: boolean;
  blocks?: ContentBlock[];
  usageFull?: {
    inputTokens: number;
    outputTokens: number;
    cacheCreationTokens: number;
    cacheReadTokens: number;
  };
}

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  cacheCreationTokens: number;
  cacheReadTokens: number;
}

export interface TokenUsagePerMessage {
  inputTokens: number;
  outputTokens: number;
}

export interface ToolCallEntry {
  name: string;
  count: number;
}

// ── Content Blocks ──

export interface BaseBlock {
  kind: "text" | "thinking" | "tool_use" | "tool_result";
}

export interface TextBlock extends BaseBlock {
  kind: "text";
  text: string;
}

export interface ThinkingBlock extends BaseBlock {
  kind: "thinking";
  thinking: string;
}

export interface ToolUseBlock extends BaseBlock {
  kind: "tool_use";
  id: string;
  name: string;
  input: unknown;
  inputTruncated?: boolean;
  result?: ToolResultBlock;
  subAgent?: {
    sessionId?: string;
    models?: string[];
  };
}

export interface ToolResultBlock extends BaseBlock {
  kind: "tool_result";
  toolUseId: string;
  content: unknown;
  isError?: boolean;
  truncated?: boolean;
}

export type ContentBlock =
  | TextBlock
  | ThinkingBlock
  | ToolUseBlock
  | ToolResultBlock;
