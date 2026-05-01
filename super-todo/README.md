# super-todo

**機能から考えて作った** ToDo アプリ。「あったらいいな」と思いついた機能を順に実装している。

セミナースライドで「機能から考えて作る」アプローチの例として紹介。

## 動かす

ビルド不要。以下のいずれかで動く:

- **デモ URL**: https://s12bt.github.io/giiku-mini-conference-2026/super-todo/
- **ローカル**: `git clone` 後、 `super-todo/index.html` をブラウザで直接開く

データは `localStorage` に保存される。サーバーや DB は不要。

## ファイル構成

| ファイル | 役割 |
|---|---|
| `index.html` | マークアップ |
| `style.css` | スタイル |
| `app.js` | ロジック(state + render パターン) |
| `data-schema.md` | localStorage のデータスキーマ |

## 設計方針

- 状態は 1 つの `state` オブジェクトに集約し、 `render(state)` で DOM を更新する
- ビジネスロジックは純粋関数(state を受け取って次の state を返す)で書く
- `localStorage` のスキーマは [data-schema.md](./data-schema.md) で固定する。後で React 化してもデータが消えないように

## 対になるアプリ

[mvp-todo](../mvp-todo/) は、同じ ToDo アプリを **課題から考えて作った版**。両方を触り比べると、アプローチの違いで使い心地がどう変わるかが見える。
