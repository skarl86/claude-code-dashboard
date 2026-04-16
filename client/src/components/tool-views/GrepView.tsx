import type { ToolUseBlock } from "../../types/session";
import { BaseToolCard } from "./BaseToolCard";

interface GrepInput {
  pattern?: string;
  path?: string;
  glob?: string;
  output_mode?: string;
}

function extractGrepInput(input: unknown): GrepInput {
  if (!input || typeof input !== "object") return {};
  return input as GrepInput;
}

export function GrepView({ block }: { block: ToolUseBlock }) {
  const isError = block.result?.isError === true;
  const { pattern, path } = extractGrepInput(block.input);
  const summary = `"${pattern ?? ""}" in ${path ?? "."}`;

  let inputJson = "";
  try {
    inputJson = JSON.stringify(block.input, null, 2);
  } catch {
    inputJson = "";
  }

  const resultContent = block.result?.content;
  const resultText =
    typeof resultContent === "string"
      ? resultContent
      : resultContent !== undefined
        ? JSON.stringify(resultContent, null, 2)
        : "";

  return (
    <BaseToolCard toolName={block.name} summary={summary} isError={isError}>
      <div className="space-y-2">
        <div>
          <div className="text-[11px] uppercase text-gray-400 mb-1">Input</div>
          <pre className="text-[11px] text-gray-300 whitespace-pre-wrap break-all">
            {inputJson}
          </pre>
        </div>
        {block.result && (
          <div>
            <div className="text-[11px] uppercase text-gray-400 mb-1">
              Result {block.result.truncated ? "(truncated)" : ""}
            </div>
            <pre className="text-xs text-gray-200 whitespace-pre-wrap break-all font-mono max-h-80 overflow-auto">
              {resultText}
            </pre>
          </div>
        )}
      </div>
    </BaseToolCard>
  );
}
