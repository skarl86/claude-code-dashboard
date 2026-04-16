import type { ToolUseBlock } from "../../types/session";
import { BaseToolCard } from "./BaseToolCard";

interface BashInput {
  command?: string;
  description?: string;
  timeout?: number;
  run_in_background?: boolean;
}

export function BashView({ block }: { block: ToolUseBlock }) {
  const input = block.input as BashInput | undefined;
  const command = input?.command ?? "";
  const description = input?.description;
  const timeout = input?.timeout;
  const runInBackground = input?.run_in_background === true;

  const isError = block.result?.isError === true;

  const summarySource = description || command;
  const summary = summarySource.length > 80
    ? summarySource.slice(0, 80) + "…"
    : summarySource;

  const resultContent = block.result?.content;
  const stdout = resultContent === undefined
    ? undefined
    : typeof resultContent === "string"
      ? resultContent
      : JSON.stringify(resultContent, null, 2);

  return (
    <BaseToolCard
      toolName="Bash"
      summary={summary}
      isError={isError}
    >
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          {runInBackground && (
            <span className="text-[10px] uppercase bg-indigo-900/60 text-indigo-200 rounded px-1.5 py-0.5">
              [background]
            </span>
          )}
          {typeof timeout === "number" && (
            <span className="text-[10px] uppercase bg-gray-800 text-gray-300 rounded px-1.5 py-0.5">
              timeout: {timeout}ms
            </span>
          )}
          {block.result && (
            isError ? (
              <span className="text-[10px] uppercase bg-red-800 text-red-100 rounded px-1.5 py-0.5">
                exit: error
              </span>
            ) : (
              <span className="text-[10px] uppercase bg-green-900/70 text-green-200 rounded px-1.5 py-0.5">
                exit: ok
              </span>
            )
          )}
        </div>

        <div>
          <div className="text-[11px] uppercase text-gray-400 mb-1">Command</div>
          <pre className="text-xs text-gray-200 whitespace-pre-wrap break-all bg-gray-950/50 border border-gray-800 rounded px-2 py-1.5 max-h-80 overflow-auto font-mono">
            {command}
          </pre>
        </div>

        {stdout !== undefined && (
          <div>
            <div className="text-[11px] uppercase text-gray-400 mb-1">
              Stdout {block.result?.truncated ? "(truncated)" : ""}
            </div>
            <pre className="text-xs text-gray-200 whitespace-pre-wrap break-all bg-gray-950/50 border border-gray-800 rounded px-2 py-1.5 max-h-80 overflow-auto font-mono">
              {stdout}
            </pre>
          </div>
        )}
      </div>
    </BaseToolCard>
  );
}
