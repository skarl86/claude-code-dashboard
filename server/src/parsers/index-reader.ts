import fs from "node:fs/promises";
import path from "node:path";

import type { RawSessionIndexEntry } from "../types.js";

// ── sessions-index.json ─────────────────────────────────────────────

interface SessionsIndexFile {
  version: number;
  entries: RawSessionIndexEntry[];
}

/**
 * 프로젝트 디렉토리에서 sessions-index.json 을 읽어 RawSessionIndexEntry[] 를 반환한다.
 *
 * 파일이 없거나 파싱에 실패하면 빈 배열을 반환한다.
 */
export async function readSessionsIndex(
  projectDir: string,
): Promise<RawSessionIndexEntry[]> {
  const filePath = path.join(projectDir, "sessions-index.json");

  try {
    const raw = await fs.readFile(filePath, "utf-8");
    const parsed: SessionsIndexFile = JSON.parse(raw);
    return parsed.entries ?? [];
  } catch (err) {
    if (isFileNotFound(err)) return [];
    console.error(`[index-reader] sessions-index.json 읽기 실패: ${filePath}`, err);
    return [];
  }
}

// ── helpers ─────────────────────────────────────────────────────────

function isFileNotFound(err: unknown): boolean {
  return (
    err instanceof Error &&
    "code" in err &&
    (err as NodeJS.ErrnoException).code === "ENOENT"
  );
}
