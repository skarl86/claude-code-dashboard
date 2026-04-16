import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";
import path from "node:path";

import { getProjectDisplayName } from "../config.js";
import type {
  SessionDetail,
  SessionMetadata,
  MessageEntry,
  TokenUsage,
  ToolCallEntry,
} from "../types.js";

// ── Internal helpers ────────────────────────────────────────────────

/** content 블록 배열 또는 문자열에서 사람이 읽을 수 있는 텍스트를 추출한다. */
function extractText(content: unknown): string {
  if (typeof content === "string") return content;

  if (Array.isArray(content)) {
    const texts: string[] = [];
    for (const block of content) {
      if (block?.type === "text" && typeof block.text === "string") {
        texts.push(block.text);
      } else if (
        block?.type === "tool_result" &&
        typeof block.content === "string"
      ) {
        texts.push(block.content);
      }
    }
    return texts.join("\n");
  }

  return "";
}

/** content를 200자로 잘라 반환한다. */
function truncate(text: string, maxLen = 200): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen) + "...";
}

/** content 블록 배열에서 tool_use 블록의 name 목록을 추출한다. */
function extractToolUseNames(content: unknown): string[] {
  if (!Array.isArray(content)) return [];

  const names: string[] = [];
  for (const block of content) {
    if (block?.type === "tool_use" && typeof block.name === "string") {
      names.push(block.name);
    }
  }
  return names;
}

// ── Line iteration helper ───────────────────────────────────────────

/** JSONL 파일을 스트리밍으로 한 줄씩 파싱된 객체를 yield한다. */
async function* iterJsonLines(
  filePath: string,
): AsyncGenerator<Record<string, unknown>> {
  const rl = createInterface({
    input: createReadStream(filePath, { encoding: "utf-8" }),
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    if (!line.trim()) continue;
    try {
      yield JSON.parse(line) as Record<string, unknown>;
    } catch {
      // 파싱 실패한 행은 무시
    }
  }
}

// ── Public API ──────────────────────────────────────────────────────

/**
 * JSONL 세션 파일을 전체 파싱하여 SessionDetail을 반환한다.
 *
 * - node:readline + node:fs createReadStream으로 스트리밍 라인별 파싱
 * - content는 보안을 위해 200자로 truncate
 */
export async function parseSessionFile(
  filePath: string,
  projectDir: string,
): Promise<SessionDetail> {
  const projectPath = projectDir;
  const projectName = getProjectDisplayName(projectDir);

  let sessionId = "";
  let gitBranch: string | undefined;
  let version: string | undefined;
  let firstPrompt: string | undefined;

  let firstTimestamp: string | undefined;
  let lastTimestamp: string | undefined;

  const messages: MessageEntry[] = [];
  const tokenUsage: TokenUsage = {
    inputTokens: 0,
    outputTokens: 0,
    cacheCreationTokens: 0,
    cacheReadTokens: 0,
  };
  const toolCountMap = new Map<string, number>();
  const modelSet = new Set<string>();
  let messageCount = 0;

  // 이미 텍스트 콘텐츠를 가진 assistant uuid를 추적하여 중복 방지
  const assistantTextSeen = new Set<string>();

  for await (const record of iterJsonLines(filePath)) {
    const type = record.type as string | undefined;
    const ts = record.timestamp as string | undefined;

    // 타임스탬프 수집
    if (ts) {
      if (!firstTimestamp) firstTimestamp = ts;
      lastTimestamp = ts;
    }

    // 메타데이터: 어떤 레코드든 sessionId, version, gitBranch를 가질 수 있다
    if (!sessionId && typeof record.sessionId === "string") {
      sessionId = record.sessionId;
    }
    if (!version && typeof record.version === "string") {
      version = record.version;
    }
    if (!gitBranch && typeof record.gitBranch === "string") {
      gitBranch = record.gitBranch;
    }

    if (type === "user") {
      const msg = record.message as Record<string, unknown> | undefined;
      if (!msg) continue;

      const rawContent = msg.content;
      const text = extractText(rawContent);

      // tool_result만 있는 user 메시지는 카운트하되 messages에는 추가하지 않는다
      if (
        Array.isArray(rawContent) &&
        rawContent.every((b: Record<string, unknown>) => b?.type === "tool_result")
      ) {
        // tool result 응답은 별도 메시지로 취급하지 않음
        continue;
      }

      messageCount++;

      if (firstPrompt === undefined && text) {
        firstPrompt = truncate(text, 200);
      }

      messages.push({
        type: "user",
        timestamp: ts ?? "",
        content: truncate(text),
      });
    } else if (type === "assistant") {
      const msg = record.message as Record<string, unknown> | undefined;
      if (!msg) continue;

      const uuid = record.uuid as string | undefined;
      const content = msg.content;
      const model = msg.model as string | undefined;
      const usage = msg.usage as Record<string, unknown> | undefined;

      // 도구 호출 추출
      const toolNames = extractToolUseNames(content);
      for (const name of toolNames) {
        toolCountMap.set(name, (toolCountMap.get(name) ?? 0) + 1);
      }

      // 모델 수집
      if (model) modelSet.add(model);

      // 토큰 집계
      if (usage) {
        tokenUsage.inputTokens += (usage.input_tokens as number) ?? 0;
        tokenUsage.outputTokens += (usage.output_tokens as number) ?? 0;
        tokenUsage.cacheCreationTokens +=
          (usage.cache_creation_input_tokens as number) ?? 0;
        tokenUsage.cacheReadTokens +=
          (usage.cache_read_input_tokens as number) ?? 0;
      }

      // 텍스트가 있는 assistant 메시지만 messages 배열에 추가 (동일 uuid 중복 방지)
      const text = extractText(content);
      if (text && uuid && !assistantTextSeen.has(uuid)) {
        assistantTextSeen.add(uuid);
        messageCount++;

        const entry: MessageEntry = {
          type: "assistant",
          timestamp: ts ?? "",
          content: truncate(text),
          model: model ?? undefined,
        };

        if (usage) {
          entry.usage = {
            inputTokens: (usage.input_tokens as number) ?? 0,
            outputTokens: (usage.output_tokens as number) ?? 0,
          };
        }

        if (toolNames.length > 0) {
          entry.toolCalls = toolNames;
        }

        messages.push(entry);
      }
    }
    // 기타 타입(permission-mode, attachment 등)에서는 메타데이터만 추출 (위에서 처리)
  }

  // durationMs 계산
  let durationMs = 0;
  if (firstTimestamp && lastTimestamp) {
    durationMs =
      new Date(lastTimestamp).getTime() - new Date(firstTimestamp).getTime();
  }

  // toolCalls 집계
  const toolCalls: ToolCallEntry[] = Array.from(toolCountMap.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  // sessionId 폴백: 파일명에서 추출
  if (!sessionId) {
    sessionId = path.basename(filePath, ".jsonl");
  }

  return {
    sessionId,
    projectDir,
    projectPath,
    projectName,
    firstPrompt,
    messageCount,
    created: firstTimestamp ?? "",
    modified: lastTimestamp ?? "",
    gitBranch,
    version,
    messages,
    tokenUsage,
    toolCalls,
    models: Array.from(modelSet),
    durationMs,
  };
}

/**
 * JSONL 세션 파일에서 빠르게 메타데이터만 추출한다.
 *
 * 전체 파일을 스트리밍으로 읽되, user/assistant 메시지 수만 카운트한다.
 */
export async function parseSessionMetadata(
  filePath: string,
  projectDir: string,
): Promise<SessionMetadata> {
  const projectPath = projectDir;
  const projectName = getProjectDisplayName(projectDir);

  let sessionId = "";
  let gitBranch: string | undefined;
  let version: string | undefined;
  let firstPrompt: string | undefined;

  let firstTimestamp: string | undefined;
  let lastTimestamp: string | undefined;
  let messageCount = 0;

  // 텍스트 콘텐츠를 가진 assistant uuid를 추적하여 중복 방지
  const assistantTextSeen = new Set<string>();

  for await (const record of iterJsonLines(filePath)) {
    const type = record.type as string | undefined;
    const ts = record.timestamp as string | undefined;

    if (ts) {
      if (!firstTimestamp) firstTimestamp = ts;
      lastTimestamp = ts;
    }

    if (!sessionId && typeof record.sessionId === "string") {
      sessionId = record.sessionId;
    }
    if (!version && typeof record.version === "string") {
      version = record.version;
    }
    if (!gitBranch && typeof record.gitBranch === "string") {
      gitBranch = record.gitBranch;
    }

    if (type === "user") {
      const msg = record.message as Record<string, unknown> | undefined;
      if (!msg) continue;

      const rawContent = msg.content;

      // tool_result만 있는 user 메시지는 카운트하지 않음
      if (
        Array.isArray(rawContent) &&
        rawContent.every((b: Record<string, unknown>) => b?.type === "tool_result")
      ) {
        continue;
      }

      messageCount++;

      if (firstPrompt === undefined) {
        const text = extractText(rawContent);
        if (text) {
          firstPrompt = truncate(text, 200);
        }
      }
    } else if (type === "assistant") {
      const msg = record.message as Record<string, unknown> | undefined;
      if (!msg) continue;

      const uuid = record.uuid as string | undefined;
      const text = extractText(msg.content);

      if (text && uuid && !assistantTextSeen.has(uuid)) {
        assistantTextSeen.add(uuid);
        messageCount++;
      }
    }
  }

  if (!sessionId) {
    sessionId = path.basename(filePath, ".jsonl");
  }

  return {
    sessionId,
    projectDir,
    projectPath,
    projectName,
    firstPrompt,
    messageCount,
    created: firstTimestamp ?? "",
    modified: lastTimestamp ?? "",
    gitBranch,
    version,
  };
}

// ── Internal utility ────────────────────────────────────────────────

