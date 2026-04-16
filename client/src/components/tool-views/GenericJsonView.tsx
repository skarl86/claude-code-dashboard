import type { ToolUseBlock } from "../../types/session";
import { BaseToolCard } from "./BaseToolCard";

interface Props {
  block: ToolUseBlock;
}

export function GenericJsonView({ block }: Props) {
  const isError = block.result?.isError === true;

  let summary = "";
  try {
    summary = JSON.stringify(block.input).slice(0, 80);
  } catch {
    summary = "";
  }

  const resultText =
    typeof block.result?.content === "string"
      ? block.result.content
      : block.result
      ? JSON.stringify(block.result.content, null, 2)
      : null;

  return (
    <BaseToolCard toolName={block.name} summary={summary} isError={isError}>
      <div className="space-y-2">
        <div>
          <div className="text-[11px] uppercase text-gray-400 mb-1">Input</div>
          <pre className="text-xs text-gray-200 whitespace-pre-wrap break-all">
            {JSON.stringify(block.input, null, 2)}
          </pre>
        </div>
        {resultText !== null && (
          <div>
            <div className="text-[11px] uppercase text-gray-400 mb-1">
              Result{block.result?.truncated ? " (truncated)" : ""}
            </div>
            <pre className="text-xs text-gray-200 whitespace-pre-wrap break-all">
              {resultText}
            </pre>
          </div>
        )}
      </div>
    </BaseToolCard>
  );
}
