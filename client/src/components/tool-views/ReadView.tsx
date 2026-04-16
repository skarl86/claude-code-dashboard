import type { ToolUseBlock } from "../../types/session";
import { BaseToolCard } from "./BaseToolCard";

interface ReadInput {
  file_path?: string;
  offset?: number;
  limit?: number;
}

function basename(path: string): string {
  return path.split("/").pop() ?? path;
}

export function ReadView({ block }: { block: ToolUseBlock }) {
  const input = block.input as ReadInput | undefined;
  const filePath = input?.file_path ?? "";
  const offset = input?.offset;
  const limit = input?.limit;

  const isError = block.result?.isError === true;

  const rangeParts: string[] = [];
  if (typeof offset === "number") rangeParts.push(`offset:${offset}`);
  if (typeof limit === "number") rangeParts.push(`limit:${limit}`);
  const rangeStr = rangeParts.length > 0 ? ` [${rangeParts.join(", ")}]` : "";
  const summary = basename(filePath) + rangeStr;

  const resultContent = block.result?.content;
  const resultText = resultContent === undefined
    ? undefined
    : typeof resultContent === "string"
      ? resultContent
      : JSON.stringify(resultContent, null, 2);

  return (
    <BaseToolCard toolName="Read" summary={summary} isError={isError}>
      <div className="space-y-2">
        <div>
          <div className="text-[11px] uppercase text-gray-400 mb-1">Path</div>
          <div className="text-xs text-gray-300 font-mono break-all">
            {filePath}
          </div>
        </div>

        {resultText !== undefined && (
          <div>
            <div className="text-[11px] uppercase text-gray-400 mb-1">
              Content {block.result?.truncated ? "(truncated)" : ""}
            </div>
            <pre className="text-xs text-gray-200 whitespace-pre-wrap break-all bg-gray-950/50 border border-gray-800 rounded px-2 py-1.5 max-h-80 overflow-auto font-mono">
              {resultText}
              {block.result?.truncated ? "\n[truncated …]" : ""}
            </pre>
          </div>
        )}
      </div>
    </BaseToolCard>
  );
}
