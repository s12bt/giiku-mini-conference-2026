# super-todo

**機能から考えて作った** ToDo アプリ。「あったらいいな」と思いついた機能を順に実装した。

セミナースライドで「機能から考えて作る」アプローチの例として紹介。

## 動かす

- **デモ URL**: https://s12bt.github.io/giiku-mini-conference-2026/super-todo/
- **ローカル**:
  ```sh
  npm install
  npm run dev
  ```

データは `localStorage` に保存される。サーバーや DB は不要。

## 技術スタック

- React 19
- TypeScript
- Vite
- canvas-confetti(お祝い演出)

## 主な機能

- タスク基本: 作成・完了・削除・編集・一括切替・Undo・ピン留め
- 属性: 優先度・期限・タグ・メモ・サブタスク・集中秒数
- 検索/絞り込み: 全文検索・フィルタ・タグ・日付・4 種ソート
- 3 ビュー: リスト・カレンダー・統計
- ポモドーロ(25/5 分・浮遊リング UI)
- ストリーク(連続日数・35 日ヒートマップ)
- canvas-confetti による完了お祝い
- テーマ切替(light/dark/system)
- JSON import/export、キーボードショートカット

## 対になるアプリ

[mvp-todo](../mvp-todo/) は、同じ ToDo アプリを **課題から考えて作った版**。両方を触り比べると、アプローチの違いで使い心地がどう変わるかが見える。
