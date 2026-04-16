import { Link } from "react-router-dom";
import type { ToolUseBlock } from "../../types/session";
import { BaseToolCard } from "./BaseToolCard";

interface TaskInput {
  description?: string;
  prompt?: string;
  subagent_type?: string;
}

export function TaskView({ block }: { block: ToolUseBlock }) {
  const input = block.input as TaskInput | undefined;
  const description = input?.description ?? "";
  const prompt = input?.prompt ?? "";
  const subagentType = input?.subagent_type;

  const isError = block.result?.isError === true;

  const subAgent = block.subAgent;
  const models = subAgent?.models ?? [];
  const childSessionId = subAgent?.sessionId;

  const summarySource = description || subagentType || "Task";
  const summary =
    summarySource.length > 80 ? summarySource.slice(0, 80) + "…" : summarySource;

  const resultContent = block.result?.content;
  const resultText =
    resultContent === undefined
      ? undefined
      : typeof resultContent === "string"
        ? resultContent
        : JSON.stringify(resultContent, null, 2);

  const headerRight =
    models.length > 0 ? (
      <span className="flex items-center gap-1">
        {models.map((m) => (
          <span
            key={m}
            className="text-[10px] uppercase bg-purple-900/60 text-purple-200 rounded px-1.5 py-0.5 font-mono"
          >
            {m}
          </span>
        ))}
      </span>
    ) : null;

  return (
    <BaseToolCard
      toolName="Task"
      summary={summary}
      isError={isError}
      headerRight={headerRight}
    >
      <div className="space-y-2">
        {subagentType && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] uppercase bg-indigo-900/60 text-indigo-200 rounded px-1.5 py-0.5">
              subagent: {subagentType}
            </span>
          </div>
        )}

        {description && (
          <div>
            <div className="text-[11px] uppercase text-gray-400 mb-1">
              Description
            </div>
            <div className="text-xs text-gray-200 whitespace-pre-wrap break-words">
              {description}
            </div>
          </div>
        )}

        {prompt && (
          <div>
            <div className="text-[11px] uppercase text-gray-400 mb-1">Prompt</div>
            <pre className="text-xs text-gray-200 whitespace-pre-wrap break-words bg-gray-950/50 border border-gray-800 rounded px-2 py-1.5 max-h-96 overflow-auto font-mono">
              {prompt}
            </pre>
          </div>
        )}

        <div>
          {childSessionId ? (
            <Link
              to={`/sessions/${childSessionId}`}
              className="inline-flex items-center gap-1 text-xs text-purple-300 hover:text-purple-200 underline"
            >
              <span aria-hidden>▸</span> Open subagent session
            </Link>
          ) : (
            <div className="text-xs text-gray-500 italic">
              No subagent session detected
            </div>
          )}
        </div>

        {resultText !== undefined && (
          <div>
            <div className="text-[11px] uppercase text-gray-400 mb-1">
              Result {block.result?.truncated ? "(truncated)" : ""}
            </div>
            <pre className="text-xs text-gray-200 whitespace-pre-wrap break-words bg-gray-950/50 border border-gray-800 rounded px-2 py-1.5 max-h-96 overflow-auto font-mono">
              {resultText}
            </pre>
          </div>
        )}
      </div>
    </BaseToolCard>
  );
}
