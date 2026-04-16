import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";

import { getClaudeConfigDir } from "../config.js";
import type { RawSessionIndexEntry, StatsCache } from "../types.js";

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

// ── stats-cache.json ────────────────────────────────────────────────

const STATS_CACHE_FILENAME = "stats-cache.json";

/**
 * stats-cache.json 을 읽어 StatsCache 를 반환한다.
 *
 * 탐색 순서:
 *   1. getClaudeConfigDir() (CLAUDE_CONFIG_DIR 또는 ~/.claude)
 *   2. ~/.claude (환경변수가 별도 경로를 가리키는 경우 폴백)
 *
 * 파일이 없거나 파싱에 실패하면 null 을 반환한다.
 */
export async function readStatsCache(): Promise<StatsCache | null> {
  const candidates: string[] = [];

  const configDir = getClaudeConfigDir();
  candidates.push(path.join(configDir, STATS_CACHE_FILENAME));

  const defaultDir = path.join(os.homedir(), ".claude");
  if (configDir !== defaultDir) {
    candidates.push(path.join(defaultDir, STATS_CACHE_FILENAME));
  }

  for (const filePath of candidates) {
    try {
      const raw = await fs.readFile(filePath, "utf-8");
      const parsed: StatsCache = JSON.parse(raw);
      return parsed;
    } catch (err) {
      if (!isFileNotFound(err)) {
        console.error(
          `[index-reader] stats-cache.json 읽기 실패: ${filePath}`,
          err,
        );
      }
      // 다음 후보 시도
    }
  }

  return null;
}

// ── helpers ─────────────────────────────────────────────────────────

function isFileNotFound(err: unknown): boolean {
  return (
    err instanceof Error &&
    "code" in err &&
    (err as NodeJS.ErrnoException).code === "ENOENT"
  );
}
