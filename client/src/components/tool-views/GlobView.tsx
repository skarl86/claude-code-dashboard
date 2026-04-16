import type { ToolUseBlock } from "../../types/session";
import { BaseToolCard } from "./BaseToolCard";

interface GlobInput {
  pattern?: string;
  path?: string;
}

function extractGlobInput(input: unknown): GlobInput {
  if (!input || typeof input !== "object") return {};
  return input as GlobInput;
}

const MAX_LINES = 50;

export function GlobView({ block }: { block: ToolUseBlock }) {
  const isError = block.result?.isError === true;
  const { pattern, path } = extractGlobInput(block.input);
  const summary = (pattern ?? "").slice(0, 80);

  const resultContent = block.result?.content;
  const isStringContent = typeof resultContent === "string";
  const lines = isStringContent
    ? (resultContent as string).split("\n").filter((l) => l.length > 0)
    : [];
  const shown = lines.slice(0, MAX_LINES);
  const remaining = lines.length - shown.length;

  return (
    <BaseToolCard toolName={block.name} summary={summary} isError={isError}>
      <div className="space-y-2">
        {path && (
          <div className="text-xs text-gray-300">
            <span className="text-[11px] uppercase text-gray-400 mr-2">
              Path
            </span>
            <span className="font-mono">{path}</span>
          </div>
        )}
        {block.result && (
          <div>
            <div className="text-[11px] uppercase text-gray-400 mb-1">
              Result {block.result.truncated ? "(truncated)" : ""}
            </div>
            {isStringContent ? (
              lines.length === 0 ? (
                <div className="text-xs text-gray-400">No matches.</div>
              ) : (
                <ul className="text-xs text-gray-200 font-mono space-y-0.5 max-h-80 overflow-auto">
                  {shown.map((line, idx) => (
                    <li key={idx} className="break-all">
                      {line}
                    </li>
                  ))}
                  {remaining > 0 && (
                    <li className="text-gray-400 italic">
                      ... {remaining} more
                    </li>
                  )}
                </ul>
              )
            ) : (
              <pre className="text-xs text-gray-200 whitespace-pre-wrap break-all max-h-80 overflow-auto">
                {resultContent !== undefined
                  ? JSON.stringify(resultContent, null, 2)
                  : ""}
              </pre>
            )}
          </div>
        )}
      </div>
    </BaseToolCard>
  );
}
