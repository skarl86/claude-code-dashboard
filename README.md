# Claude Code Session Dashboard

Claude Code에서 수행한 작업 세션들의 활동 지표를 시각적으로 모니터링할 수 있는 웹 대시보드입니다.

## Features

- **Overview Dashboard**: 일별 활동 추이 차트(메시지/세션 수), 총 세션/메시지/프로젝트 통계
- **Session List**: 프로젝트별 필터링, 정렬, 페이지네이션이 있는 세션 목록
- **Session Detail**: 토큰 사용량 분석, 도구 사용 분포, 메시지 타임라인

## Tech Stack

- **Backend**: Node.js, Express 5, TypeScript
- **Frontend**: React 19, Vite, Recharts, Tailwind CSS v4
- **Data Source**: `$CLAUDE_CONFIG_DIR/projects/` 하위 JSONL 세션 파일

## Prerequisites

- Node.js 18+

## Quick Start

```bash
# 의존성 설치
npm install
cd server && npm install && cd ..
cd client && npm install && cd ..

# 개발 모드 (server + client 동시 실행)
npm run dev
```

## Production

```bash
npm run build
npm start
# http://127.0.0.1:3456
```

## Environment Variables

| 변수 | 설명 | 기본값 |
|------|------|--------|
| `CLAUDE_CONFIG_DIR` | Claude Code 설정 디렉토리 경로 | `~/.claude` |
| `PORT` | 서버 포트 | `3456` |

## Architecture

```
cc-session-dashboard/
├── server/                  # Express API 서버
│   └── src/
│       ├── config.ts        # 설정 및 경로 해석
│       ├── index.ts         # Express 서버 진입점
│       ├── types.ts         # TypeScript 타입 정의
│       ├── parsers/
│       │   ├── jsonl-parser.ts   # JSONL 스트리밍 파서
│       │   └── index-reader.ts   # sessions-index/stats-cache 리더
│       ├── routes/
│       │   ├── overview.ts  # GET /api/overview
│       │   └── sessions.ts  # GET /api/sessions, /api/projects
│       └── services/
│           └── session-service.ts  # 세션 검색/캐싱 서비스
├── client/                  # React SPA
│   └── src/
│       ├── App.tsx          # 라우팅
│       ├── api.ts           # API 클라이언트
│       ├── components/      # 공통 컴포넌트
│       └── pages/           # 페이지 뷰
└── package.json             # 루트 스크립트
```

## Security

- 서버는 `127.0.0.1`에만 바인딩 (외부 접근 차단)
- 대화 내용은 첫 200자만 표시 (원문 미노출)

## License

MIT
