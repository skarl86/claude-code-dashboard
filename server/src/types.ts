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
}

export interface MessageEntry {
  type: "user" | "assistant";
  timestamp: string;
  content: string; // 첫 200자까지만 (보안)
  usage?: TokenUsagePerMessage;
  model?: string;
  toolCalls?: string[];
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

export interface DailyStats {
  date: string;
  messageCount: number;
  sessionCount: number;
  toolCallCount: number;
  modelTokens?: Record<string, { input: number; output: number }>;
}

export interface ProjectInfo {
  dirName: string;
  projectPath: string;
  projectName: string;
  sessionCount: number;
}

// ── Raw sessions-index.json 항목 ────────────────────────────────────
/** sessions-index.json 파일의 entries 배열 항목 (파일 원본 구조) */
export interface RawSessionIndexEntry {
  sessionId: string;
  fullPath: string;
  fileMtime: number;
  firstPrompt: string;
  summary: string;
  messageCount: number;
  created: string; // ISO 8601
  modified: string; // ISO 8601
  gitBranch: string;
  projectPath: string;
  isSidechain: boolean;
}

// ── Stats Cache ─────────────────────────────────────────────────────

export interface DailyActivity {
  date: string; // YYYY-MM-DD
  messageCount: number;
  sessionCount: number;
  toolCallCount: number;
}

export interface DailyModelTokens {
  date: string; // YYYY-MM-DD
  tokensByModel: Record<string, number>;
}

export interface ModelUsage {
  inputTokens: number;
  outputTokens: number;
  cacheReadInputTokens: number;
  cacheCreationInputTokens: number;
  webSearchRequests: number;
  costUSD: number;
  contextWindow: number;
  maxOutputTokens?: number;
}

export interface LongestSession {
  sessionId: string;
  duration: number;
  messageCount: number;
  timestamp: string;
}

export interface StatsCache {
  version: number;
  lastComputedDate: string;
  dailyActivity: DailyActivity[];
  dailyModelTokens: DailyModelTokens[];
  modelUsage: Record<string, ModelUsage>;
  totalSessions: number;
  totalMessages: number;
  longestSession: LongestSession;
  firstSessionDate: string;
  hourCounts: Record<string, number>;
}
