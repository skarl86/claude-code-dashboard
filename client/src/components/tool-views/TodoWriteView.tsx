import type { ToolUseBlock } from "../../types/session";
import { BaseToolCard } from "./BaseToolCard";

interface TodoItem {
  content: string;
  status: "pending" | "in_progress" | "completed";
  activeForm?: string;
}

interface TodoWriteInput {
  todos?: TodoItem[];
}

function isTodoItem(value: unknown): value is TodoItem {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.content === "string" &&
    (v.status === "pending" ||
      v.status === "in_progress" ||
      v.status === "completed")
  );
}

function extractTodos(input: unknown): TodoItem[] {
  if (!input || typeof input !== "object") return [];
  const { todos } = input as TodoWriteInput;
  if (!Array.isArray(todos)) return [];
  return todos.filter(isTodoItem);
}

export function TodoWriteView({ block }: { block: ToolUseBlock }) {
  const isError = block.result?.isError === true;
  const todos = extractTodos(block.input);
  const total = todos.length;
  const done = todos.filter((t) => t.status === "completed").length;
  const summary = `Todos: ${total} (done ${done})`;

  return (
    <BaseToolCard toolName={block.name} summary={summary} isError={isError}>
      {todos.length === 0 ? (
        <div className="text-xs text-gray-400">No todos.</div>
      ) : (
        <ul className="space-y-1">
          {todos.map((todo, idx) => {
            let icon = "○";
            let colorClass = "text-gray-400";
            if (todo.status === "completed") {
              icon = "✓";
              colorClass = "text-green-300";
            } else if (todo.status === "in_progress") {
              icon = "●";
              colorClass = "text-blue-300";
            }
            const label =
              todo.status === "in_progress" && todo.activeForm
                ? todo.activeForm
                : todo.content;
            return (
              <li
                key={idx}
                className={"flex items-start gap-2 text-xs " + colorClass}
              >
                <span className="font-mono select-none">{icon}</span>
                <span className="break-words whitespace-pre-wrap">{label}</span>
              </li>
            );
          })}
        </ul>
      )}
    </BaseToolCard>
  );
}
