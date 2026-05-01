# mvp-todo

**課題から考えて作った** ToDo アプリ。本当に解決したかった困りごとから出発し、 MVP として機能を最小限に絞り込んでいる。

セミナースライドの「【3】作るものを絞り込む(MVP)」で紹介する例として作成。

## 動かす

ビルド不要。以下のいずれかで動く:

- **デモ URL**: https://s12bt.github.io/giiku-mini-conference-2026/mvp-todo/
- **ローカル**: `git clone` 後、 `mvp-todo/index.html` をブラウザで直接開く

データは `localStorage` に保存される。サーバーや DB は不要。

## ファイル構成

| ファイル | 役割 |
|---|---|
| `index.html` | マークアップ |
| `style.css` | スタイル |
| `app.js` | ロジック(state + render パターン) |
| `data-schema.md` | localStorage のデータスキーマ |

## 設計方針

- MVP として **最小限の機能だけ** 実装する
- 状態は 1 つの `state` オブジェクトに集約し、 `render(state)` で DOM を更新する
- ビジネスロジックは純粋関数で書く
- `localStorage` のスキーマは [data-schema.md](./data-schema.md) で固定する
