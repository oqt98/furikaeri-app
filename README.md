# furikaeri-app

`furikaeri-app` は、毎日のふりかえりを軽く続けて、あとから見返しやすくするための Expo / React Native アプリです。アプリ内ブランド名は `Daynote` です。

## コンセプト

- 入力は短く、続けやすく
- あとから履歴やカレンダーで見返しやすく
- 次の日に少し活かせる気づきを残しやすく

## 現在できること

### 記録

- テンプレートを選んで記録を作成
- 日付、気分、カテゴリ、行動タグ、状態タグ、テンプレ回答を保存
- 写真を添付
- 1 日 1 件ルールで保存
- 入力途中の下書きを保持
- 既存の記録を編集、削除、お気に入り登録

### 見返し

- 履歴タブで一覧表示
- カレンダータブで日付起点の見返し
- 分析タブで現在の保存データに基づく軽い集計
- 大切な日を登録し、カレンダーにも表示

### 設定と補助機能

- オンボーディング
- 8 種類のテーマ切り替え
- 通知設定
- 行動タグ / 状態タグの管理
- Notion CSV の取り込み
- JSON のインポート / エクスポート

## 記録で使えるテンプレート

- 今日のタイトル
- ひとことメモ
- KPT
- YWT
- よかったこと 3 つ
- Start / Stop / Continue
- 4Ls
- Rose / Thorn / Bud
- Sailboat
- Starfish
- Glad / Sad / Mad

## 主要画面

### 下部タブ

- 記録
- 履歴
- カレンダー
- 分析

### そのほかの画面

- テンプレート選択
- 記録作成 / 編集
- タグ管理
- テーマ
- 大切な日
- 通知設定
- インポート / エクスポート
- このアプリについて
- オンボーディング

## データの考え方

- 保存先はローカルの `AsyncStorage`
- バックエンド前提ではない
- オフライン前提で使える構成
- 大切な日は現在、毎年くり返す日として扱う

## ディレクトリ構成

```text
app/
  _layout.tsx
  onboarding.tsx
  theme.tsx
  important-days.tsx
  notifications.tsx
  import-export.tsx
  about.tsx
  (tabs)/
    _layout.tsx
    index.tsx
    history.tsx
    calendar.tsx
    analytics.tsx
    settings.tsx
    templates.tsx
    entry.tsx
    tags.tsx

components/
  共通 UI コンポーネント

data/
  reviewOptions.ts
  templates.ts
  tags.ts

lib/
  storage.ts
  insights.ts
  entryDraft.ts
  importantDays.ts
  notionImport.ts
  preferences.ts
  theme.ts
  theme-context.tsx

test/
  テストコード
```

## セットアップ

```bash
npm install
npm run start
```

## よく使うコマンド

```bash
npm run android
npm run ios
npm run web
npm run lint
npm run typecheck
npm run test
npm run build:web
```

## テスト

最低限の確認として、次を通す想定です。

- `npm run test -- --runInBand`
- `npm run typecheck`
- `npm run lint`

## 注意

- README には現在実装されている内容だけを記載しています
- 週次サマリーや自動文章要約など、将来案の機能はまだ入っていません
- ストレージ構造を変えるときは既存データ互換性に注意してください
