import { useState, type ReactNode } from "react";

interface Props {
  toolName: string;
  summary: ReactNode;
  isError?: boolean;
  children?: ReactNode;
  defaultExpanded?: boolean;
  headerRight?: ReactNode;
}

export function BaseToolCard({
  toolName,
  summary,
  isError,
  children,
  defaultExpanded = false,
  headerRight,
}: Props) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  return (
    <div
      className={
        "rounded border text-sm " +
        (isError
          ? "border-red-700/60 bg-red-950/30"
          : "border-gray-700/60 bg-gray-900/40")
      }
    >
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-gray-800/40"
      >
        <span className="text-[10px] uppercase font-mono bg-gray-800 text-gray-200 rounded px-1.5 py-0.5">
          {toolName}
        </span>
        <span className="text-xs text-gray-300 truncate flex-1">{summary}</span>
        {isError && (
          <span className="text-[10px] uppercase bg-red-800 text-red-100 rounded px-1.5 py-0.5">
            error
          </span>
        )}
        {headerRight}
        <span className="text-gray-500 text-xs">{expanded ? "▾" : "▸"}</span>
      </button>
      {expanded && <div className="px-3 pb-3 pt-1 border-t border-gray-800">{children}</div>}
    </div>
  );
}
