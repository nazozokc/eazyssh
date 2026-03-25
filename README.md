# simple-ssh

`~/.ssh/config` を読み書きして、fzf でホストを選んで SSH 接続する CLI ツール。

## インストール

### npm

```bash
git clone https://github.com/nazozokc/simple-ssh
cd simple-ssh
npm install && npm run build
npm link
```

### Nix

```bash
nix run github:nazozokc/simple-ssh
```

## 使い方

```bash
eazyssh              # fzf でホストを選んで接続（デフォルト）
eazyssh ls           # ホスト一覧
eazyssh add myserver -H 192.168.1.10 -u nazozo -i ~/.ssh/id_ed25519
eazyssh show myserver
eazyssh rm myserver
```

### `add` オプション

| オプション | 説明 |
|---|---|
| `-H, --hostname` | 接続先ホスト名 or IP |
| `-u, --user` | ログインユーザー |
| `-p, --port` | ポート番号 |
| `-i, --identity` | 秘密鍵のパス |

## 依存

- [fzf](https://github.com/junegunn/cli) — ホスト選択UI
- Node.js 20+

## ライセンス

MIT
