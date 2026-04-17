<p align="right">
  <strong>English</strong> ·
  <a href="./README.ko.md">한국어</a> ·
  <a href="./README.zh.md">中文</a> ·
  <a href="./README.ja.md">日本語</a>
</p>

<div align="center">
  <h1>cc-dashboard</h1>
  <p><strong>A zero-config local dashboard CLI for monitoring your Claude Code sessions.</strong></p>
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

That's it. The dashboard opens at `http://127.0.0.1:3939` and reads sessions from `~/.claude/projects/`.

## ✨ Features

- **🚀 Zero config** — `npx` and you're in. No setup, no config files.
- **📊 Activity overview** — Daily message and session trends with charts.
- **🧭 Per-project view** — Filter, sort, paginate sessions by project.
- **🔬 Deep session detail** — Token usage breakdown, tool distribution, message timeline.
- **🔒 Local-first** — Binds to `127.0.0.1` by default. Your data never leaves your machine.
- **🌐 Cross-platform** — macOS, Linux, Windows (WSL).

## 📦 Install

```bash
# Run without installing
npx @skarl86/cc-session-dashboard

# Or install globally
npm i -g @skarl86/cc-session-dashboard
cc-dashboard
```

## 🛠 CLI Options

| Flag | Description | Default |
|---|---|---|
| `--port <n>` | Port to bind. Auto-falls back to next free port if busy. | `3939` |
| `--host <h>` | Bind host. `0.0.0.0` exposes on local network (with warning). | `127.0.0.1` |
| `--projects-dir <path>` | Override Claude config directory. | `$CLAUDE_CONFIG_DIR` or `~/.claude` |
| `--no-open` | Don't open the browser automatically. | off |
| `-v, --version` | Print version. | |
| `-h, --help` | Print help. | |

```bash
cc-dashboard --port 8080
cc-dashboard --projects-dir /custom/.claude
cc-dashboard --no-open
```

## 🔧 Configuration

Path resolution priority: **`--projects-dir` > `$CLAUDE_CONFIG_DIR` > `~/.claude`**

| Env var | Description |
|---|---|
| `CLAUDE_CONFIG_DIR` | Claude Code config directory |
| `PORT` | Default port (overridden by `--port`) |

## <a id="requirements"></a>📋 Requirements

- Node.js **18+**
- Claude Code installed and run at least once (so `~/.claude/projects/` exists)

## 🔍 Troubleshooting

<details>
<summary><b>Port 3939 already in use</b></summary>

The CLI auto-falls back to the next free port (3940, 3941, …) and prints a warning. To pin a specific port, pass `--port 8080`.
</details>

<details>
<summary><b>Browser doesn't open (WSL / headless)</b></summary>

The CLI prints the URL and continues. Open it manually, or pass `--no-open`.
</details>

<details>
<summary><b><code>~/.claude/projects/</code> not found</b></summary>

You haven't run Claude Code yet, or your config is in a different location. Use `--projects-dir /path/to/.claude`.
</details>

<details>
<summary><b><code>cc-dashboard requires Node.js >= 18</code></b></summary>

Upgrade via [nvm](https://github.com/nvm-sh/nvm), [volta](https://volta.sh/), or asdf.
</details>

## 🛡 Security

- Binds to `127.0.0.1` by default — never exposed to the network.
- `--host 0.0.0.0` prints a warning before exposing.
- Conversation content is truncated to first 200 chars in the UI (no full transcript exposure).

## 🏗 Development

```bash
git clone https://github.com/skarl86/claude-code-dashboard.git
cd claude-code-dashboard
npm install && (cd client && npm install) && (cd server && npm install)

npm run dev    # HMR dev mode (server + Vite)
npm run build  # tsup + Vite production build
./bin/cc-dashboard.js
```

Build output:

```
dist/
├── server/    ← tsup ESM bundle (index.js + cli.js)
└── public/    ← Vite-built React SPA
```

Releases are managed by [release-please](https://github.com/googleapis/release-please). Use [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `docs:`).

## 📜 License

[MIT](./LICENSE) © skarl86
