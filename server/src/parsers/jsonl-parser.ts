import { createReadStream, readFileSync } from "node:fs";
import { createInterface } from "node:readline";
import path from "node:path";

import { getProjectDisplayName } from "../config.js";
import type {
  SessionDetail,
  SessionMetadata,
  MessageEntry,
  TokenUsage,
  ToolCallEntry,
  ContentBlock,
  ToolResultBlock,
  ToolUseBlock,
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

/** raw content 배열 또는 문자열을 ContentBlock[] 로 정규화한다. */
function normalizeBlocks(rawContent: unknown): ContentBlock[] {
  if (typeof rawContent === "string") {
    return [{ kind: "text", text: rawContent }];
  }
  if (!Array.isArray(rawContent)) return [];
  const blocks: ContentBlock[] = [];
  for (const block of rawContent) {
    if (!block || typeof block !== "object") continue;
    const b = block as Record<string, unknown>;
    const t = b.type;
    if (t === "text" && typeof b.text === "string") {
      blocks.push({ kind: "text", text: b.text });
    } else if (t === "thinking" && typeof b.thinking === "string") {
      blocks.push({ kind: "thinking", thinking: b.thinking });
    } else if (
      t === "tool_use" &&
      typeof b.id === "string" &&
      typeof b.name === "string"
    ) {
      blocks.push({
        kind: "tool_use",
        id: b.id,
        name: b.name,
        input: b.input,
      });
    } else if (t === "tool_result" && typeof b.tool_use_id === "string") {
      blocks.push({
        kind: "tool_result",
        toolUseId: b.tool_use_id,
        content: b.content,
        isError: b.is_error === true,
      });
    }
  }
  return blocks;
}

/** text 를 maxLen(기본 200자)로 잘라 반환한다. */
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
 * - assistant 메시지의 content는 truncate하지 않고 원문 유지
 * - blocks[] 에 원본 ContentBlock 구조를 보존하고 tool_use ↔ tool_result 를 연결한다.
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

  for await (const record of iterJsonLines(filePath)) {
    const type = record.type as string | undefined;
    const ts = record.timestamp as string | undefined;
    const uuid = record.uuid as string | undefined;
    const parentUuid = record.parentUuid as string | undefined;
    const isSidechain = record.isSidechain === true;

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
      const blocks = normalizeBlocks(rawContent);
      const text = extractText(rawContent);

      // blocks 가 tool_result 만으로 구성된 경우: messages 에는 포함하되 messageCount 는 증가시키지 않는다
      const isToolResultOnly =
        blocks.length > 0 && blocks.every((b) => b.kind === "tool_result");

      if (!isToolResultOnly) {
        messageCount++;
        if (firstPrompt === undefined && text) {
          firstPrompt = truncate(text, 200);
        }
      }

      const entry: MessageEntry = {
        type: "user",
        timestamp: ts ?? "",
        content: truncate(text),
        uuid,
        parentUuid,
        isSidechain,
        blocks,
      };

      messages.push(entry);
    } else if (type === "assistant") {
      const msg = record.message as Record<string, unknown> | undefined;
      if (!msg) continue;

      const content = msg.content;
      const model = msg.model as string | undefined;
      const stopReason = msg.stop_reason as string | undefined;
      const usage = msg.usage as Record<string, unknown> | undefined;

      const blocks = normalizeBlocks(content);
      const text = extractText(content);

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

      // assistant 레코드당 한 번 push (text 가 비어도 blocks 에 tool_use/thinking 이 있으면 포함)
      messageCount++;

      const entry: MessageEntry = {
        type: "assistant",
        timestamp: ts ?? "",
        content: text,
        model: model ?? undefined,
        stopReason: stopReason ?? undefined,
        uuid,
        parentUuid,
        isSidechain,
        blocks,
      };

      if (usage) {
        entry.usage = {
          inputTokens: (usage.input_tokens as number) ?? 0,
          outputTokens: (usage.output_tokens as number) ?? 0,
        };
        entry.usageFull = {
          inputTokens: (usage.input_tokens as number) ?? 0,
          outputTokens: (usage.output_tokens as number) ?? 0,
          cacheCreationTokens:
            (usage.cache_creation_input_tokens as number) ?? 0,
          cacheReadTokens: (usage.cache_read_input_tokens as number) ?? 0,
        };
      }

      if (toolNames.length > 0) {
        entry.toolCalls = toolNames;
      }

      messages.push(entry);
    }
    // 기타 타입(permission-mode, attachment 등)에서는 메타데이터만 추출 (위에서 처리)
  }

  // Post-processing: tool_use ↔ tool_result 연결
  const toolResultById = new Map<string, ToolResultBlock>();
  for (const m of messages) {
    for (const b of m.blocks ?? []) {
      if (b.kind === "tool_result") toolResultById.set(b.toolUseId, b);
    }
  }
  for (const m of messages) {
    for (const b of m.blocks ?? []) {
      if (b.kind === "tool_use") {
        const r = toolResultById.get(b.id);
        if (r) (b as ToolUseBlock).result = r;
      }
    }
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

/**
 * JSONL 세션 파일에서 assistant 메시지의 model 값만 빠르게 수집한다.
 *
 * 동기 I/O를 사용하는 경량 헬퍼 — sidechain 자식 세션의 모델 배지용.
 */
export function extractModelsFromJsonl(filePath: string): string[] {
  const models = new Set<string>();
  try {
    const raw = readFileSync(filePath, "utf-8");
    const lines = raw.split(/\r?\n/);
    for (const line of lines) {
      if (!line.trim()) continue;
      let record: Record<string, unknown>;
      try {
        record = JSON.parse(line) as Record<string, unknown>;
      } catch {
        continue;
      }
      if (record.type !== "assistant") continue;
      const msg = record.message as Record<string, unknown> | undefined;
      const model = msg?.model;
      if (typeof model === "string" && model) models.add(model);
    }
  } catch {
    // ignore
  }
  return Array.from(models);
}
