import type {
  MessageEntry,
  ToolUseBlock,
  ToolResultBlock,
} from "../types.js";

const TOOL_CAPS: Record<string, number> = {
  Bash: 10_000,
  Read: 20_000,
  Write: 20_000,
  Edit: 20_000,
  Grep: 16_000,
  Glob: 16_000,
};
const DEFAULT_CAP = 8_000;
const INPUT_CAP = 128_000;

function capForTool(name: string | undefined): number {
  if (!name) return DEFAULT_CAP;
  return TOOL_CAPS[name] ?? DEFAULT_CAP;
}

function serializeContent(content: unknown): string {
  if (typeof content === "string") return content;
  if (content == null) return "";
  if (Array.isArray(content)) {
    return content
      .map((item) =>
        typeof item === "string" ? item : JSON.stringify(item),
      )
      .join("\n");
  }
  try {
    return JSON.stringify(content);
  } catch {
    return String(content);
  }
}

function applyResultCap(block: ToolResultBlock, limit: number): void {
  const raw = serializeContent(block.content);
  if (raw.length <= limit) return;
  const head = raw.slice(0, limit);
  block.content = `${head}\n…[truncated, total=${raw.length} bytes]`;
  block.truncated = true;
}

function applyInputCap(block: ToolUseBlock): void {
  try {
    const raw = JSON.stringify(block.input ?? null);
    if (raw.length <= INPUT_CAP) return;
    block.input = {
      __truncated: true,
      preview: raw.slice(0, INPUT_CAP),
      totalBytes: raw.length,
    };
    block.inputTruncated = true;
  } catch {
    // ignore
  }
}

export function applySafetyCaps(messages: MessageEntry[]): void {
  const handled = new Set<ToolResultBlock>();

  // 1) tool_use.result 에 매칭된 결과는 tool name 기준 cap
  for (const m of messages) {
    for (const b of m.blocks ?? []) {
      if (b.kind === "tool_use") {
        applyInputCap(b);
        if (b.result) {
          applyResultCap(b.result, capForTool(b.name));
          handled.add(b.result);
        }
      }
    }
  }

  // 2) 고아 tool_result (tool_use 에 매칭되지 못한 것) 는 default cap
  for (const m of messages) {
    for (const b of m.blocks ?? []) {
      if (b.kind === "tool_result" && !handled.has(b)) {
        applyResultCap(b, DEFAULT_CAP);
      }
    }
  }
}
