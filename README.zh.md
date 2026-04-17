<p align="right">
  <a href="./README.md">English</a> ·
  <a href="./README.ko.md">한국어</a> ·
  <strong>中文</strong> ·
  <a href="./README.ja.md">日本語</a>
</p>

<div align="center">
  <h1>cc-dashboard</h1>
  <p><strong>用于监控 Claude Code 会话的零配置本地仪表盘 CLI。</strong></p>
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

就这么简单。仪表盘会在 `http://127.0.0.1:3939` 打开，并读取 `~/.claude/projects/` 中的会话。

## ✨ 特性

- **🚀 零配置** — 一行 `npx` 即可启动。无需安装，无需配置文件。
- **📊 活动概览** — 每日消息与会话趋势图表。
- **🧭 按项目视图** — 支持筛选、排序、分页。
- **🔬 会话详情** — Token 用量分析、工具分布、消息时间线。
- **🔒 本地优先** — 默认绑定 `127.0.0.1`。数据不会离开您的机器。
- **🌐 跨平台** — macOS、Linux、Windows (WSL)。

## 📦 安装

```bash
# 无需安装直接运行
npx @skarl86/cc-session-dashboard

# 或全局安装
npm i -g @skarl86/cc-session-dashboard
cc-dashboard
```

## 🛠 CLI 选项

| 参数 | 描述 | 默认值 |
|---|---|---|
| `--port <n>` | 绑定端口。被占用时自动回退到下一个空闲端口。 | `3939` |
| `--host <h>` | 绑定主机。`0.0.0.0` 会暴露到本地网络（带警告）。 | `127.0.0.1` |
| `--projects-dir <path>` | 覆盖 Claude 配置目录。 | `$CLAUDE_CONFIG_DIR` 或 `~/.claude` |
| `--no-open` | 禁止自动打开浏览器。 | off |
| `-v, --version` | 显示版本。 | |
| `-h, --help` | 显示帮助。 | |

```bash
cc-dashboard --port 8080
cc-dashboard --projects-dir /custom/.claude
cc-dashboard --no-open
```

## 🔧 配置

路径解析优先级：**`--projects-dir` > `$CLAUDE_CONFIG_DIR` > `~/.claude`**

| 环境变量 | 描述 |
|---|---|
| `CLAUDE_CONFIG_DIR` | Claude Code 配置目录 |
| `PORT` | 默认端口（被 `--port` 覆盖） |

## <a id="requirements"></a>📋 系统要求

- Node.js **18+**
- 已安装并至少运行过一次 Claude Code（使 `~/.claude/projects/` 存在）

## 🔍 故障排除

<details>
<summary><b>端口 3939 已被占用</b></summary>

CLI 会自动回退到下一个空闲端口（3940、3941…）并打印警告。要锁定特定端口，请传入 `--port 8080`。
</details>

<details>
<summary><b>浏览器未打开（WSL / 无头环境）</b></summary>

CLI 会打印 URL 并继续运行。手动访问，或传入 `--no-open`。
</details>

<details>
<summary><b><code>~/.claude/projects/</code> 不存在</b></summary>

您还未运行 Claude Code，或配置位于其他位置。请使用 `--projects-dir /path/to/.claude` 指定。
</details>

<details>
<summary><b><code>cc-dashboard requires Node.js >= 18</code></b></summary>

通过 [nvm](https://github.com/nvm-sh/nvm)、[volta](https://volta.sh/) 或 asdf 升级。
</details>

## 🛡 安全

- 默认仅绑定 `127.0.0.1` — 不会暴露到网络。
- `--host 0.0.0.0` 在暴露前会打印警告。
- UI 中对话内容仅显示前 200 个字符（不暴露完整文本）。

## 🏗 开发

```bash
git clone https://github.com/skarl86/claude-code-dashboard.git
cd claude-code-dashboard
npm install && (cd client && npm install) && (cd server && npm install)

npm run dev    # HMR 开发模式 (server + Vite)
npm run build  # tsup + Vite 生产构建
./bin/cc-dashboard.js
```

构建产物布局：

```
dist/
├── server/    ← tsup ESM 打包 (index.js + cli.js)
└── public/    ← Vite 构建的 React SPA
```

发布通过 [release-please](https://github.com/googleapis/release-please) 自动化。请使用 [Conventional Commits](https://www.conventionalcommits.org/)（`feat:`、`fix:`、`docs:`）。

## 📜 许可证

[MIT](./LICENSE) © skarl86
