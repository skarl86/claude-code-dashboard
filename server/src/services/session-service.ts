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
  OverviewStats,
  DailyActivity,
} from "../types.js";
import { readSessionsIndex } from "../parsers/index-reader.js";
import {
  parseSessionMetadata,
  parseSessionFile,
  extractModelsFromJsonl,
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
      const detail = await parseSessionFile(jsonlPath, dirName);
      try {
        await enrichSessionDetailWithSubAgents(detail, dirPath);
      } catch (err) {
        console.warn(
          `[session-service] sub-agent 링크 실패: ${sessionId}`,
          err,
        );
      }
      return detail;
    } catch {
      // 이 디렉토리에는 없음, 다음 시도
    }
  }

  return null;
}

// ── Sub-agent / sidechain linking ───────────────────────────────────

/** ISO string 이나 ms number 를 ms 로 변환. */
function toMs(value: string | number | undefined | null): number | undefined {
  if (value == null) return undefined;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const ms = Date.parse(value);
    return Number.isFinite(ms) ? ms : undefined;
  }
  return undefined;
}

/** index entry 의 실제 JSONL 파일 경로를 돌려준다. */
function indexEntryFilePath(
  entry: RawSessionIndexEntry,
  projectDirPath: string,
): string {
  if (typeof entry.fullPath === "string" && entry.fullPath) {
    return entry.fullPath;
  }
  return path.join(projectDirPath, `${entry.sessionId}.jsonl`);
}

/**
 * sidechain 엔트리의 parentSessionId 후보를 non-sidechain 엔트리들 중에서 찾는다.
 *
 * - sidechain 의 created 시각이 parent 의 [created, modified] 범위(±60s 버퍼) 안에
 *   들어가는 엔트리들 중 created 가 가장 가까운 것을 고른다.
 * - parent 의 modified 가 없으면 created 기준 ±120s 근접만 본다.
 * - 후보가 없거나 sidechain 의 created 를 ms 로 변환할 수 없으면 undefined 를 반환한다.
 *   (index 가 sidechain 항목만 있고 non-sidechain 이 없는 프로젝트는 자연스럽게 skip.)
 */
function resolveParentSessionId(
  sidechainEntry: RawSessionIndexEntry,
  nonSidechainEntries: RawSessionIndexEntry[],
  selfCreatedHint?: string,
): string | undefined {
  if (nonSidechainEntries.length === 0) return undefined;

  const selfCreatedMs =
    toMs(selfCreatedHint) ?? toMs(sidechainEntry.created);
  if (selfCreatedMs === undefined) return undefined;

  let bestParent: RawSessionIndexEntry | undefined;
  let bestDelta = Number.POSITIVE_INFINITY;

  for (const parent of nonSidechainEntries) {
    const startMs = toMs(parent.created);
    const endMs = toMs(parent.modified);
    if (startMs === undefined) continue;

    // 구간이 겹치는 후보만 고려 (modified 가 없으면 start 만 기준)
    const withinRange =
      endMs !== undefined
        ? selfCreatedMs >= startMs - 60_000 &&
          selfCreatedMs <= endMs + 60_000
        : Math.abs(selfCreatedMs - startMs) <= 120_000;
    if (!withinRange) continue;

    const delta = Math.abs(selfCreatedMs - startMs);
    if (delta < bestDelta) {
      bestDelta = delta;
      bestParent = parent;
    }
  }

  return bestParent?.sessionId;
}

/**
 * detail.messages 의 Task tool_use 블록을 같은 프로젝트의 sidechain 세션과 매칭하고,
 * 현재 세션이 sidechain 인 경우 parentSessionId 를 채운다.
 */
async function enrichSessionDetailWithSubAgents(
  detail: SessionDetail,
  projectDirPath: string,
): Promise<void> {
  const entries = await readSessionsIndex(projectDirPath);
  if (entries.length === 0) return;

  const sidechainEntries = entries.filter((e) => e.isSidechain === true);
  const mainEntries = entries.filter((e) => e.isSidechain !== true);

  // 현재 세션이 sidechain 인지 index 로 교차 확인 + parentSessionId 계산
  const selfEntry = entries.find((e) => e.sessionId === detail.sessionId);
  if (selfEntry?.isSidechain) {
    detail.isSidechain = true;

    const parentId = resolveParentSessionId(
      selfEntry,
      mainEntries,
      detail.created,
    );
    if (parentId) {
      detail.parentSessionId = parentId;
    }
  }

  // Task tool_use 블록 → sidechain 자식 매칭
  if (sidechainEntries.length === 0) return;

  // 후보 sidechain 엔트리: created ms 를 미리 계산
  const sidechainCandidates = sidechainEntries
    .map((entry) => ({ entry, createdMs: toMs(entry.created) }))
    .filter(
      (c): c is { entry: RawSessionIndexEntry; createdMs: number } =>
        c.createdMs !== undefined,
    );

  const usedSessionIds = new Set<string>();

  for (const msg of detail.messages) {
    const blocks = msg.blocks;
    if (!blocks || blocks.length === 0) continue;
    const msgMs = toMs(msg.timestamp);
    if (msgMs === undefined) continue;

    for (const block of blocks) {
      if (
        block.kind !== "tool_use" ||
        (block.name !== "Task" && block.name !== "Agent")
      )
        continue;

      let bestEntry: RawSessionIndexEntry | undefined;
      let bestDelta = Number.POSITIVE_INFINITY;

      for (const { entry, createdMs } of sidechainCandidates) {
        if (usedSessionIds.has(entry.sessionId)) continue;
        const delta = Math.abs(msgMs - createdMs);
        if (delta >= 120_000) continue;
        if (delta < bestDelta) {
          bestDelta = delta;
          bestEntry = entry;
        }
      }

      if (!bestEntry) continue;
      usedSessionIds.add(bestEntry.sessionId);

      const filePath = indexEntryFilePath(bestEntry, projectDirPath);
      let models: string[] = [];
      try {
        models = extractModelsFromJsonl(filePath);
      } catch {
        models = [];
      }

      block.subAgent = {
        sessionId: bestEntry.sessionId,
        models,
      };
    }
  }
}

/**
 * 캐시된 세션 목록을 기반으로 Overview 통계를 계산한다.
 */
export async function computeOverviewStats(): Promise<OverviewStats> {
  const cacheKey = "allSessions";
  let allSessions = getCached<SessionMetadata[]>(cacheKey);
  if (!allSessions) {
    allSessions = await collectAllSessions();
    setCache(cacheKey, allSessions);
  }

  const totalSessions = allSessions.length;
  const totalMessages = allSessions.reduce((sum, s) => sum + s.messageCount, 0);

  let firstSessionDate = "";
  if (allSessions.length > 0) {
    firstSessionDate = allSessions.reduce(
      (earliest, s) => (s.created && s.created < earliest ? s.created : earliest),
      allSessions[0].created || "",
    );
  }

  // dailyActivity: created 날짜(YYYY-MM-DD, 로컬 타임존) 기준 그룹화
  const dailyMap = new Map<string, { messageCount: number; sessionCount: number }>();
  for (const session of allSessions) {
    if (!session.created) continue;
    const date = new Date(session.created).toLocaleDateString("sv-SE");
    const entry = dailyMap.get(date) ?? { messageCount: 0, sessionCount: 0 };
    entry.sessionCount += 1;
    entry.messageCount += session.messageCount;
    dailyMap.set(date, entry);
  }

  // 날짜순 정렬 + 빈 날짜 채우기 (로컬 타임존 기준)
  const dates = Array.from(dailyMap.keys()).sort();
  const dailyActivity: DailyActivity[] = [];
  if (dates.length > 0) {
    const [ys, ms, ds] = dates[0].split("-").map(Number);
    const [ye, me, de] = dates[dates.length - 1].split("-").map(Number);
    const start = new Date(ys, ms - 1, ds);
    const end = new Date(ye, me - 1, de);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const key = d.toLocaleDateString("sv-SE");
      const entry = dailyMap.get(key);
      dailyActivity.push({
        date: key,
        messageCount: entry?.messageCount ?? 0,
        sessionCount: entry?.sessionCount ?? 0,
        toolCallCount: 0,
      });
    }
  }

  return { totalSessions, totalMessages, firstSessionDate, dailyActivity };
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
