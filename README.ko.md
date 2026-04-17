<p align="right">
  <a href="./README.md">English</a> ·
  <strong>한국어</strong> ·
  <a href="./README.zh.md">中文</a> ·
  <a href="./README.ja.md">日本語</a>
</p>

<div align="center">
  <h1>cc-dashboard</h1>
  <p><strong>Claude Code 세션을 모니터링하는 무설정 로컬 대시보드 CLI.</strong></p>
  <p>
    <a href="https://www.npmjs.com/package/@skarl86/cc-session-dashboard"><img src="https://img.shields.io/npm/v/@skarl86/cc-session-dashboard?color=cb3837&logo=npm&logoColor=white" alt="npm version"></a>
    <a href="https://www.npmjs.com/package/@skarl86/cc-session-dashboard"><img src="https://img.shields.io/npm/dw/@skarl86/cc-session-dashboard?color=success" alt="npm downloads"></a>
    <a href="#requirements"><img src="https://img.shields.io/node/v/@skarl86/cc-session-dashboard?color=43853d&logo=node.js&logoColor=white" alt="node version"></a>
    <a href="./LICENSE"><img src="https://img.shields.io/npm/l/@skarl86/cc-session-dashboard?color=blue" alt="license"></a>
    <a href="https://github.com/skarl86/claude-code-dashboard/actions/workflows/release-please.yml"><img src="https://github.com/skarl86/claude-code-dashboard/actions/workflows/release-please.yml/badge.svg" alt="release"></a>
  </p>
</div>

---

```bash
npx @skarl86/cc-session-dashboard
```

이게 전부입니다. 대시보드가 `http://127.0.0.1:3939`에서 열리고 `~/.claude/projects/`의 세션을 읽습니다.

## ✨ 특징

- **🚀 제로 설정** — `npx` 한 줄이면 끝. 설정 파일도, 셋업도 없음.
- **📊 활동 개요** — 일별 메시지/세션 추이 차트.
- **🧭 프로젝트별 뷰** — 필터링, 정렬, 페이지네이션.
- **🔬 세션 상세** — 토큰 사용량, 도구 분포, 메시지 타임라인.
- **🔒 로컬 우선** — 기본 `127.0.0.1` 바인딩. 데이터가 외부로 나가지 않습니다.
- **🌐 크로스 플랫폼** — macOS, Linux, Windows (WSL).

## 📦 설치

```bash
# 설치 없이 즉시 실행
npx @skarl86/cc-session-dashboard

# 또는 글로벌 설치
npm i -g @skarl86/cc-session-dashboard
cc-dashboard
```

## 🛠 CLI 옵션

| 플래그 | 설명 | 기본값 |
|---|---|---|
| `--port <n>` | 바인딩 포트. 사용 중이면 다음 빈 포트로 자동 폴백. | `3939` |
| `--host <h>` | 바인딩 호스트. `0.0.0.0`은 경고 후 로컬 네트워크 노출. | `127.0.0.1` |
| `--projects-dir <path>` | Claude 설정 디렉토리 오버라이드. | `$CLAUDE_CONFIG_DIR` 또는 `~/.claude` |
| `--no-open` | 브라우저 자동 오픈 비활성화. | off |
| `-v, --version` | 버전 출력. | |
| `-h, --help` | 도움말 출력. | |

```bash
cc-dashboard --port 8080
cc-dashboard --projects-dir /custom/.claude
cc-dashboard --no-open
```

## 🔧 환경 설정

경로 해석 우선순위: **`--projects-dir` > `$CLAUDE_CONFIG_DIR` > `~/.claude`**

| 환경변수 | 설명 |
|---|---|
| `CLAUDE_CONFIG_DIR` | Claude Code 설정 디렉토리 |
| `PORT` | 기본 포트 (`--port`가 우선) |

## <a id="requirements"></a>📋 요구사항

- Node.js **18 이상**
- Claude Code를 최소 1회 이상 실행해 `~/.claude/projects/` 가 생성된 상태

## 🔍 문제 해결

<details>
<summary><b>3939 포트가 이미 사용 중</b></summary>

CLI가 다음 빈 포트(3940, 3941, …)로 자동 폴백하고 경고를 출력합니다. 특정 포트를 고정하려면 `--port 8080`을 명시하세요.
</details>

<details>
<summary><b>브라우저가 안 열림 (WSL / 헤드리스)</b></summary>

CLI가 URL을 출력하고 계속 실행됩니다. 직접 접속하거나 `--no-open`을 쓰세요.
</details>

<details>
<summary><b><code>~/.claude/projects/</code> 가 없음</b></summary>

Claude Code를 아직 실행하지 않았거나, 설정이 다른 위치에 있을 수 있습니다. `--projects-dir /path/to/.claude` 로 지정하세요.
</details>

<details>
<summary><b><code>cc-dashboard requires Node.js >= 18</code></b></summary>

[nvm](https://github.com/nvm-sh/nvm), [volta](https://volta.sh/), asdf 등으로 업그레이드하세요.
</details>

## 🛡 보안

- 기본적으로 `127.0.0.1`에만 바인딩 — 네트워크에 노출되지 않음.
- `--host 0.0.0.0`은 노출 전에 경고 출력.
- UI에서 대화 내용은 첫 200자만 표시 (원문 비노출).

## 🏗 개발

```bash
git clone https://github.com/skarl86/claude-code-dashboard.git
cd claude-code-dashboard
npm install && (cd client && npm install) && (cd server && npm install)

npm run dev    # HMR 개발 모드 (서버 + Vite)
npm run build  # tsup + Vite 프로덕션 빌드
./bin/cc-dashboard.js
```

빌드 산출 레이아웃:

```
dist/
├── server/    ← tsup ESM 번들 (index.js + cli.js)
└── public/    ← Vite로 빌드한 React SPA
```

릴리즈는 [release-please](https://github.com/googleapis/release-please)로 자동화됩니다. [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `docs:`)를 사용하세요.

## 📜 라이선스

[MIT](./LICENSE) © skarl86
