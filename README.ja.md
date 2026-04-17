<p align="right">
  <a href="./README.md">English</a> ·
  <a href="./README.ko.md">한국어</a> ·
  <a href="./README.zh.md">中文</a> ·
  <strong>日本語</strong>
</p>

<div align="center">
  <h1>cc-dashboard</h1>
  <p><strong>Claude Code セッションをモニタリングする、ゼロ設定のローカル CLI ダッシュボード。</strong></p>
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

これだけです。ダッシュボードが `http://127.0.0.1:3939` で開き、`~/.claude/projects/` のセッションを読み込みます。

## ✨ 特徴

- **🚀 ゼロ設定** — `npx` 一行で起動。設定ファイル不要。
- **📊 アクティビティ概要** — 日次メッセージ/セッションのトレンドチャート。
- **🧭 プロジェクト別ビュー** — フィルタ、ソート、ページネーション対応。
- **🔬 詳細セッションビュー** — トークン使用量、ツール分布、メッセージタイムライン。
- **🔒 ローカルファースト** — デフォルトで `127.0.0.1` にバインド。データは外部に送信されません。
- **🌐 クロスプラットフォーム** — macOS、Linux、Windows (WSL) 対応。

## 📦 インストール

```bash
# インストールなしで実行
npx @skarl86/cc-session-dashboard

# またはグローバルインストール
npm i -g @skarl86/cc-session-dashboard
cc-dashboard
```

## 🛠 CLI オプション

| フラグ | 説明 | デフォルト |
|---|---|---|
| `--port <n>` | バインドするポート。使用中の場合、次の空きポートに自動フォールバック。 | `3939` |
| `--host <h>` | バインドするホスト。`0.0.0.0` はローカルネットワークに公開（警告あり）。 | `127.0.0.1` |
| `--projects-dir <path>` | Claude 設定ディレクトリを上書き。 | `$CLAUDE_CONFIG_DIR` または `~/.claude` |
| `--no-open` | ブラウザの自動起動を無効化。 | off |
| `-v, --version` | バージョン表示。 | |
| `-h, --help` | ヘルプ表示。 | |

```bash
cc-dashboard --port 8080
cc-dashboard --projects-dir /custom/.claude
cc-dashboard --no-open
```

## 🔧 設定

パス解決の優先順位：**`--projects-dir` > `$CLAUDE_CONFIG_DIR` > `~/.claude`**

| 環境変数 | 説明 |
|---|---|
| `CLAUDE_CONFIG_DIR` | Claude Code 設定ディレクトリ |
| `PORT` | デフォルトポート（`--port` が優先） |

## <a id="requirements"></a>📋 動作要件

- Node.js **18 以上**
- Claude Code が一度以上起動されていること（`~/.claude/projects/` が存在する）

## 🔍 トラブルシューティング

<details>
<summary><b>ポート 3939 が使用中</b></summary>

CLI は次の空きポート（3940、3941…）に自動フォールバックし、警告を出力します。特定のポートを指定するには `--port 8080` を使用してください。
</details>

<details>
<summary><b>ブラウザが開かない（WSL / ヘッドレス環境）</b></summary>

CLI は URL を出力して動作を続けます。手動でアクセスするか `--no-open` を指定してください。
</details>

<details>
<summary><b><code>~/.claude/projects/</code> が見つからない</b></summary>

Claude Code をまだ実行していないか、設定が別の場所にあります。`--projects-dir /path/to/.claude` で指定してください。
</details>

<details>
<summary><b><code>cc-dashboard requires Node.js >= 18</code></b></summary>

[nvm](https://github.com/nvm-sh/nvm)、[volta](https://volta.sh/)、asdf などでアップグレードしてください。
</details>

## 🛡 セキュリティ

- デフォルトで `127.0.0.1` のみにバインド — ネットワークには公開されません。
- `--host 0.0.0.0` は公開前に警告を出力します。
- UI 上では会話内容の最初の 200 文字のみ表示（全文は非公開）。

## 🏗 開発

```bash
git clone https://github.com/skarl86/claude-code-dashboard.git
cd claude-code-dashboard
npm install && (cd client && npm install) && (cd server && npm install)

npm run dev    # HMR 開発モード (server + Vite)
npm run build  # tsup + Vite 本番ビルド
./bin/cc-dashboard.js
```

ビルド成果物のレイアウト：

```
dist/
├── server/    ← tsup ESM バンドル (index.js + cli.js)
└── public/    ← Vite でビルドされた React SPA
```

リリースは [release-please](https://github.com/googleapis/release-please) で自動化されています。[Conventional Commits](https://www.conventionalcommits.org/)（`feat:`、`fix:`、`docs:`）を使用してください。

## 📜 ライセンス

[MIT](./LICENSE) © skarl86
