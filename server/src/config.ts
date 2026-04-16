import path from "node:path";
import os from "node:os";

// ── Server ───────────────────────────────────────────────────────────
export const PORT = parseInt(process.env.PORT || "3456", 10);
export const HOST = "127.0.0.1";

// ── Claude Config Dir ────────────────────────────────────────────────

/** CLAUDE_CONFIG_DIR 환경변수 값을 반환하고, 없으면 ~/.claude 를 반환한다. */
export function getClaudeConfigDir(): string {
  return process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), ".claude");
}

/** projects/ 디렉토리의 절대 경로를 반환한다. */
export function getProjectsDir(): string {
  return path.join(getClaudeConfigDir(), "projects");
}

/**
 * 프로젝트 디렉토리명을 사람이 읽을 수 있는 이름으로 변환한다.
 *
 * 예: `-home-namgee-dev-cc-session-dashboard` → `dev/cc-session-dashboard`
 *
 * 디렉토리명에서 `-`가 경로 구분자인지 디렉토리명의 일부인지
 * 구별할 수 없으므로, 홈 디렉토리 접두사만 제거하고 나머지를 그대로 표시한다.
 */
export function getProjectDisplayName(dirName: string): string {
  const home = os.homedir(); // e.g. /home/namgee
  const homePrefix = home.replace(/\//g, "-"); // e.g. -home-namgee
  if (dirName.startsWith(homePrefix + "-")) {
    return dirName.slice(homePrefix.length + 1); // e.g. dev-cc-session-dashboard
  }
  if (dirName.startsWith(homePrefix)) {
    return dirName.slice(homePrefix.length) || "~";
  }
  return dirName;
}
