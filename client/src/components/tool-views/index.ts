import type { FC } from "react";
import type { ToolUseBlock } from "../../types/session";

import { BashView } from "./BashView";
import { EditView } from "./EditView";
import { GenericJsonView } from "./GenericJsonView";
import { GlobView } from "./GlobView";
import { GrepView } from "./GrepView";
import { ReadView } from "./ReadView";
import { TaskView } from "./TaskView";
import { TodoWriteView } from "./TodoWriteView";
import { WriteView } from "./WriteView";

export type ToolViewProps = { block: ToolUseBlock };
export type ToolView = FC<ToolViewProps>;

export function getToolView(name: string): ToolView {
  switch (name) {
    case "Bash":
      return BashView;
    case "Read":
      return ReadView;
    case "Write":
      return WriteView;
    case "Edit":
      return EditView;
    case "TodoWrite":
      return TodoWriteView;
    case "Grep":
      return GrepView;
    case "Glob":
      return GlobView;
    case "Task":
      return TaskView;
    default:
      return GenericJsonView;
  }
}
