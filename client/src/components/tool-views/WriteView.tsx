import type { ToolUseBlock } from "../../types/session";
import { BaseToolCard } from "./BaseToolCard";

interface WriteInput {
  file_path?: string;
  content?: string;
}

function basename(path: string): string {
  return path.split("/").pop() ?? path;
}

const PREVIEW_LIMIT = 10 * 1024; // 10KB

export function WriteView({ block }: { block: ToolUseBlock }) {
  const input = block.input as WriteInput | undefined;
  const filePath = input?.file_path ?? "";
  const content = input?.content ?? "";

  const isError = block.result?.isError === true;

  // Use UTF-8 byte length for "Nbytes"
  const byteLength = new TextEncoder().encode(content).length;
  const summary = `${basename(filePath)} (${byteLength}bytes)`;

  const isOverLimit = content.length > PREVIEW_LIMIT;
  const preview = isOverLimit ? content.slice(0, PREVIEW_LIMIT) : content;

  return (
    <BaseToolCard toolName="Write" summary={summary} isError={isError}>
      <div className="space-y-2">
        <div>
          <div className="text-[11px] uppercase text-gray-400 mb-1">Path</div>
          <div className="text-xs text-gray-300 font-mono break-all">
            {filePath}
          </div>
        </div>

        <div>
          <div className="text-[11px] uppercase text-gray-400 mb-1">Content</div>
          <pre className="text-xs text-gray-200 whitespace-pre-wrap break-all bg-gray-950/50 border border-gray-800 rounded px-2 py-1.5 max-h-80 overflow-auto font-mono">
            {preview}
            {isOverLimit ? `\n[... ${byteLength} bytes total]` : ""}
          </pre>
        </div>
      </div>
    </BaseToolCard>
  );
}
