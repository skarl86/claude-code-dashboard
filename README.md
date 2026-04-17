# Claude Code Session Dashboard

Claude Code에서 수행한 작업 세션들의 활동 지표를 시각적으로 모니터링하는 로컬 대시보드 CLI입니다.

## Features

- **Overview Dashboard**: 일별 활동 추이 차트(메시지/세션 수), 총 세션/메시지/프로젝트 통계
- **Session List**: 프로젝트별 필터링, 정렬, 페이지네이션
- **Session Detail**: 토큰 사용량 분석, 도구 사용 분포, 메시지 타임라인

## Tech Stack

- **Backend**: Node.js 18+, Express 5, TypeScript, tsup 번들
- **Frontend**: React 19, Vite, Recharts, Tailwind CSS v4
- **Data Source**: `$CLAUDE_CONFIG_DIR/projects/` 하위 JSONL 세션 파일

## Prerequisites

- Node.js 18 이상
- Claude Code를 최소 1회 실행해 `~/.claude/projects/`가 생성된 상태

## Quick Start

```bash
# 설치 없이 바로 실행
npx @skarl86/cc-session-dashboard

# 또는 글로벌 설치
npm i -g @skarl86/cc-session-dashboard
cc-dashboard
```

실행하면 기본 브라우저가 `http://127.0.0.1:3939`에 자동으로 열립니다. 종료는 `Ctrl+C`.

## CLI Options

| 플래그 | 설명 | 기본값 |
|---|---|---|
| `--port <n>` | 바인딩할 포트. 사용 중이면 다음 빈 포트로 자동 폴백 | `3939` |
| `--host <h>` | 바인딩 호스트. `0.0.0.0` 지정 시 경고 출력 | `127.0.0.1` |
| `--projects-dir <path>` | Claude 설정 디렉토리 오버라이드 | `$CLAUDE_CONFIG_DIR` 또는 `~/.claude` |
| `--no-open` | 브라우저 자동 오픈 비활성화 (URL만 출력) | off |
| `-v, --version` | 버전 출력 | |
| `-h, --help` | 도움말 출력 | |

예시:

```bash
cc-dashboard --port 8080
cc-dashboard --projects-dir /path/to/.claude
cc-dashboard --no-open
cc-dashboard --host 0.0.0.0        # ⚠  로컬 네트워크에 노출됨
```

## Environment Variables

| 변수 | 설명 | 우선순위 |
|---|---|---|
| `CLAUDE_CONFIG_DIR` | Claude Code 설정 디렉토리 | `--projects-dir` 플래그보다 낮음, `~/.claude` 기본값보다 높음 |
| `PORT` | 서버 기본 포트 | CLI `--port` 플래그보다 낮음 |

경로 해석 우선순위: **`--projects-dir` > `CLAUDE_CONFIG_DIR` > `~/.claude`**

## Troubleshooting

**포트 충돌** — 지정한 포트가 이미 사용 중이면 `cc-dashboard`는 자동으로 다음 20개 포트 범위에서 빈 포트를 찾아 폴백합니다. 특정 포트를 고정하려면 `--port 8080`처럼 명시하고 충돌 시 에러를 확인하세요.

**`~/.claude/projects/`가 없음** — Claude Code를 한 번 이상 실행해야 세션 파일이 생성됩니다. 경로가 다르면 `--projects-dir`로 지정할 수 있습니다.

**브라우저가 열리지 않음 (WSL / 헤드리스 서버)** — `open` 호출이 실패하면 자동 폴백으로 URL을 출력합니다. 수동으로 해당 URL을 접속하거나 `--no-open` 플래그를 명시해 주세요.

**`cc-dashboard requires Node.js >= 18`** — nvm / volta / asdf 등으로 Node 18 이상으로 업그레이드하세요.

**정적 자산 누락 에러** — 패키지가 손상된 경우이므로 재설치(`npm i -g @skarl86/cc-session-dashboard`)하세요.

## Security

- 기본적으로 `127.0.0.1`에만 바인딩 (외부 네트워크 접근 차단).
- `--host 0.0.0.0` 지정 시 경고를 출력합니다 — 신뢰하는 네트워크에서만 사용하세요.
- 대화 내용은 첫 200자만 표시 (원문 미노출).

## Development

기여자용 로컬 개발 워크플로우:

```bash
# 저장소 클론 후
npm install
cd server && npm install && cd ..
cd client && npm install && cd ..

# HMR 개발 모드 (server + Vite 동시)
npm run dev

# 프로덕션 빌드 (tsup + Vite)
npm run build

# 빌드된 CLI를 로컬 실행
./bin/cc-dashboard.js
# 또는
node dist/server/cli.js
```

빌드 산출 레이아웃:

```
dist/
├── server/
│   ├── index.js       # startServer 팩토리
│   ├── cli.js         # CLI 엔트리 (cac + open + get-port)
│   └── *.map
└── public/            # Vite로 빌드한 React SPA
    ├── index.html
    └── assets/
```

### Architecture

```
cc-session-dashboard/
├── bin/
│   └── cc-dashboard.js         # CLI shim (shebang + import dist/server/cli.js)
├── server/
│   └── src/
│       ├── config.ts           # PORT, getClaudeConfigDir, setClaudeConfigDirOverride
│       ├── index.ts            # startServer(opts) Express 팩토리
│       ├── cli.ts              # cac 기반 CLI 엔트리
│       ├── parsers/            # JSONL 파서, caps, index reader
│       ├── routes/             # overview, sessions, projects
│       └── services/           # session-service (5분 메모리 캐시)
├── client/
│   └── src/                    # React SPA
├── tsup.config.ts              # server 번들 설정
└── package.json                # @skarl86/cc-session-dashboard
```

## License

MIT
