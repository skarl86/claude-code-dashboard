import fs from "node:fs/promises";
import path from "node:path";

import {
  getProjectsDir,
  getProjectDisplayName,
} from "../config.js";
import type {
  ProjectInfo,
  SessionMetadata,
  SessionDetail,
  RawSessionIndexEntry,
} from "../types.js";
import { readSessionsIndex } from "../parsers/index-reader.js";
import {
  parseSessionMetadata,
  parseSessionFile,
} from "../parsers/jsonl-parser.js";

// ── Cache ───────────────────────────────────────────────────────────

interface CacheEntry<T> {
  data: T;
  storedAt: number;
}

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

const cache = new Map<string, CacheEntry<unknown>>();

function getCached<T>(key: string): T | undefined {
  const entry = cache.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.storedAt + CACHE_TTL_MS) {
    cache.delete(key);
    return undefined;
  }
  return entry.data as T;
}

function setCache<T>(key: string, data: T): void {
  cache.set(key, { data, storedAt: Date.now() });
}

// ── Helpers ─────────────────────────────────────────────────────────

/** 디렉토리인지 확인한다. */
async function isDirectory(fullPath: string): Promise<boolean> {
  try {
    const stat = await fs.stat(fullPath);
    return stat.isDirectory();
  } catch {
    return false;
  }
}

/** 디렉토리 내 *.jsonl 파일 목록을 반환한다 (서브디렉토리 제외). */
async function listJsonlFiles(dirPath: string): Promise<string[]> {
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    return entries
      .filter((e) => e.isFile() && e.name.endsWith(".jsonl"))
      .map((e) => e.name);
  } catch {
    return [];
  }
}

/** RawSessionIndexEntry를 SessionMetadata로 변환한다. */
function indexEntryToMetadata(
  entry: RawSessionIndexEntry,
  projectDir: string,
): SessionMetadata {
  const projectName = getProjectDisplayName(projectDir);

  return {
    sessionId: entry.sessionId,
    projectDir,
    projectPath: projectDir,
    projectName,
    firstPrompt: entry.firstPrompt || undefined,
    messageCount: entry.messageCount,
    created: entry.created,
    modified: entry.modified,
    gitBranch: entry.gitBranch || undefined,
  };
}

// ── Public API ──────────────────────────────────────────────────────

/**
 * 모든 프로젝트 목록을 반환한다.
 */
export async function getAllProjects(): Promise<ProjectInfo[]> {
  const projectsDir = getProjectsDir();

  let dirNames: string[];
  try {
    dirNames = await fs.readdir(projectsDir);
  } catch {
    return [];
  }

  const results: ProjectInfo[] = [];

  for (const dirName of dirNames) {
    const fullPath = path.join(projectsDir, dirName);
    if (!(await isDirectory(fullPath))) continue;

    const jsonlFiles = await listJsonlFiles(fullPath);
    const projectName = getProjectDisplayName(dirName);

    results.push({
      dirName,
      projectPath: dirName,
      projectName,
      sessionCount: jsonlFiles.length,
    });
  }

  return results;
}

/**
 * 모든 세션 메타데이터를 반환한다.
 */
export async function getAllSessions(
  options?: {
    project?: string;
    sort?: string;
    order?: "asc" | "desc";
    limit?: number;
    offset?: number;
  },
): Promise<{ sessions: SessionMetadata[]; total: number }> {
  const cacheKey = "allSessions";

  let allSessions = getCached<SessionMetadata[]>(cacheKey);

  if (!allSessions) {
    allSessions = await collectAllSessions();
    setCache(cacheKey, allSessions);
  }

  // project 필터링
  let filtered = allSessions;
  if (options?.project) {
    filtered = filtered.filter((s) => s.projectDir === options.project);
  }

  // sort / order
  const sortField = options?.sort ?? "modified";
  const order = options?.order ?? "desc";

  filtered.sort((a, b) => {
    let aVal: string | number;
    let bVal: string | number;

    switch (sortField) {
      case "created":
        aVal = a.created;
        bVal = b.created;
        break;
      case "messageCount":
        aVal = a.messageCount;
        bVal = b.messageCount;
        break;
      case "projectName":
        aVal = a.projectName;
        bVal = b.projectName;
        break;
      default: // modified
        aVal = a.modified;
        bVal = b.modified;
        break;
    }

    if (aVal < bVal) return order === "asc" ? -1 : 1;
    if (aVal > bVal) return order === "asc" ? 1 : -1;
    return 0;
  });

  const total = filtered.length;

  // limit / offset
  const limit = options?.limit ?? 50;
  const offset = options?.offset ?? 0;
  const sessions = filtered.slice(offset, offset + limit);

  return { sessions, total };
}

/**
 * 세션 상세 정보를 반환한다.
 */
export async function getSessionDetail(
  sessionId: string,
): Promise<SessionDetail | null> {
  const projectsDir = getProjectsDir();

  let dirNames: string[];
  try {
    dirNames = await fs.readdir(projectsDir);
  } catch {
    return null;
  }

  for (const dirName of dirNames) {
    const dirPath = path.join(projectsDir, dirName);
    if (!(await isDirectory(dirPath))) continue;

    const jsonlPath = path.join(dirPath, `${sessionId}.jsonl`);
    try {
      await fs.access(jsonlPath);
      return await parseSessionFile(jsonlPath, dirName);
    } catch {
      // 이 디렉토리에는 없음, 다음 시도
    }
  }

  return null;
}

// ── Internal ────────────────────────────────────────────────────────

/**
 * 모든 프로젝트 디렉토리를 스캔하여 세션 메타데이터를 수집한다.
 */
async function collectAllSessions(): Promise<SessionMetadata[]> {
  const projectsDir = getProjectsDir();

  let dirNames: string[];
  try {
    dirNames = await fs.readdir(projectsDir);
  } catch {
    return [];
  }

  const allSessions: SessionMetadata[] = [];

  for (const dirName of dirNames) {
    const dirPath = path.join(projectsDir, dirName);
    if (!(await isDirectory(dirPath))) continue;

    // sessions-index.json 시도
    const indexEntries = await readSessionsIndex(dirPath);

    if (indexEntries.length > 0) {
      // index에서 변환 (isSidechain 제외)
      for (const entry of indexEntries) {
        if (entry.isSidechain) continue;
        allSessions.push(indexEntryToMetadata(entry, dirName));
      }
    } else {
      // index가 없으면 jsonl 파일 직접 파싱
      const jsonlFiles = await listJsonlFiles(dirPath);

      for (const fileName of jsonlFiles) {
        const filePath = path.join(dirPath, fileName);
        try {
          const metadata = await parseSessionMetadata(filePath, dirName);
          allSessions.push(metadata);
        } catch (err) {
          console.error(
            `[session-service] 세션 메타데이터 파싱 실패: ${filePath}`,
            err,
          );
        }
      }
    }
  }

  return allSessions;
}
