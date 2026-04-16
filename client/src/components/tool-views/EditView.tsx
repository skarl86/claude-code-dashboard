import { useState } from "react";
import type { ToolUseBlock } from "../../types/session";
import { BaseToolCard } from "./BaseToolCard";

interface EditInput {
  file_path: string;
  old_string: string;
  new_string: string;
  replace_all?: boolean;
}

function basename(p: string): string {
  if (!p) return "";
  const normalized = p.replace(/\\/g, "/");
  const idx = normalized.lastIndexOf("/");
  return idx === -1 ? normalized : normalized.slice(idx + 1);
}

function isEditInput(v: unknown): v is EditInput {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.file_path === "string" &&
    typeof o.old_string === "string" &&
    typeof o.new_string === "string"
  );
}

export function EditView({ block }: { block: ToolUseBlock }) {
  const [showRaw, setShowRaw] = useState(false);
  const isError = block.result?.isError === true;

  const input = isEditInput(block.input) ? block.input : null;

  const summary = input
    ? `${basename(input.file_path)}${input.replace_all ? " (all)" : ""}`
    : (() => {
        try {
          return JSON.stringify(block.input).slice(0, 80);
        } catch {
          return "";
        }
      })();

  const resultContent = block.result?.content;

  return (
    <BaseToolCard toolName={block.name} summary={summary} isError={isError}>
      <div className="space-y-2">
        {input ? (
          <>
            <div className="text-xs font-mono text-gray-300 break-all">
              {input.file_path}
              {input.replace_all && (
                <span className="ml-2 text-[10px] uppercase bg-gray-800 text-gray-300 rounded px-1.5 py-0.5">
                  replace_all
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded border border-red-900/40 bg-red-900/20 p-2">
                <div className="text-[11px] uppercase text-red-300 mb-1">before</div>
                <pre className="text-xs text-gray-100 font-mono whitespace-pre-wrap break-all max-h-80 overflow-auto">
                  {input.old_string}
                </pre>
              </div>
              <div className="rounded border border-green-900/40 bg-green-900/20 p-2">
                <div className="text-[11px] uppercase text-green-300 mb-1">after</div>
                <pre className="text-xs text-gray-100 font-mono whitespace-pre-wrap break-all max-h-80 overflow-auto">
                  {input.new_string}
                </pre>
              </div>
            </div>
            <div>
              <button
                type="button"
                onClick={() => setShowRaw((v) => !v)}
                className="text-[11px] uppercase text-gray-400 hover:text-gray-200"
              >
                {showRaw ? "▾" : "▸"} raw input
              </button>
              {showRaw && (
                <pre className="mt-1 text-xs text-gray-200 whitespace-pre-wrap break-all">
                  {JSON.stringify(block.input, null, 2)}
                </pre>
              )}
            </div>
          </>
        ) : (
          <div>
            <div className="text-[11px] uppercase text-gray-400 mb-1">Input</div>
            <pre className="text-xs text-gray-200 whitespace-pre-wrap break-all">
              {JSON.stringify(block.input, null, 2)}
            </pre>
          </div>
        )}
        {block.result && (
          <div>
            <div className="text-[11px] uppercase text-gray-400 mb-1">
              Result {block.result.truncated ? "(truncated)" : ""}
            </div>
            <pre className="text-xs text-gray-200 whitespace-pre-wrap break-all">
              {typeof resultContent === "string"
                ? resultContent
                : JSON.stringify(resultContent, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </BaseToolCard>
  );
}
