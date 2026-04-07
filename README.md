# furikaeri-app

`furikaeri-app` は、毎日のふりかえりを短く残して、あとから見返しやすくするための Expo / React Native アプリです。アプリ内の表示名は現在 `Daynote` です。

長い日記を書くことよりも、少ない負担で続けられて、次の日を少しよくするヒントが残ることを大切にしています。

## コンセプト

- 入力は短く、迷わせない
- あとから見返しやすい
- 日々を少しずつ改善しやすい

このリポジトリでは、機能を増やしすぎず、軽さと継続しやすさを優先しています。

## 現在できること

### 記録

- テンプレートを選んでふりかえりを作成
- 日付、気分、カテゴリ、タグ、メモ、テンプレート回答を保存
- 写真を添付
- 1 日 1 件の記録として保存
- 下書き保存をしながら入力を継続
- 過去の記録を編集、削除、お気に入り登録

### 見返し

- 履歴一覧で検索、絞り込み、見返し
- カレンダーで記録の有無や流れを確認
- 分析画面で件数や傾向をざっくり確認
- ホーム画面で直近の記録や今週のひとことを表示

### 設定と補助機能

- 毎日のリマインド通知を設定
- テーマ切り替え
- 大切な日の登録
- 行動タグ / 状態タグの管理
- Notion CSV インポート
- JSON エクスポート
- 保存済みデータの全削除

## 現在の記録項目

- 日付
- 気分
- カテゴリ
- テンプレート
- テンプレートごとの回答
- ひとことメモ
- 行動タグ
- 状態タグ
- 写真
- お気に入り

### 気分

- `1`: かなりつかれた
- `2`: 少ししんどい
- `3`: ふつう
- `4`: よかった
- `5`: かなりよかった

### カテゴリ

- `仕事`
- `プライベート`

## テンプレート

現在は次のテンプレートを選べます。

- 今日のタイトル
- KPT
- YWT
- よかったこと3つ
- Start / Stop / Continue
- 4Ls
- Rose / Thorn / Bud
- Sailboat
- Starfish
- Glad / Sad / Mad

## タグ

タグは現在、次の 2 系統で扱っています。

- 行動タグ
  - 例: 読書、運動、勉強、仕事、家事、外出
- 状態タグ
  - 例: 忙しい、疲れた、眠い、よく眠れた、体調がよい、落ち着いていた

Settings 画面から追加や非表示設定ができます。

## Notion CSV インポート

Settings 画面から Notion の CSV を読み込み、既存のレビュー形式へ変換して保存できます。

### 想定列

- `タイトル`
- `今日の気分`
- `日付`

### 変換ルール

- `タイトル` は `answers.title` に保存
- テンプレートは `diary` を使用
- `今日の気分` は既存の mood 値へ変換
- `日付` は `YYYY/MM/DD` と `YYYY-MM-DD` を受け付け
- 完全重複データはスキップ

## まだ未実装のもの

以下は現時点では未実装、または軽量な範囲に留めています。

- 週次サマリーの本格生成
- 自動テキスト要約
- 週ごとの比較機能
- バックエンド連携

README では、実装済みの内容だけを「現在できること」として記載しています。

## 画面構成

### タブ

- 記録
- 履歴
- カレンダー
- 分析

### 補助画面

- 記録作成 / 編集
- テンプレート選択
- タグ管理
- 設定
- テーマ
- 大切な日
- 通知設定
- インポート / エクスポート
- このアプリについて
- オンボーディング

## 技術スタック

- Expo 54
- React Native
- Expo Router
- TypeScript
- AsyncStorage
- Expo Notifications
- Expo Image Picker
- expo-file-system
- React Native Reanimated
- React Native Gesture Handler

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
  notionImport.ts
  importantDays.ts
  preferences.ts
  theme.ts
  theme-context.tsx

test/
  ストレージ、分析、UI のテスト
```

## セットアップ

```bash
npm install
npm run start
```

必要に応じて次も使えます。

```bash
npm run android
npm run ios
npm run web
npm run lint
npm run typecheck
npm run test
npm run build:web
npm run e2e:maestro:record-create
npm run e2e:maestro:navigation
```

## テスト

現在の主な確認手段は次のとおりです。

- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build:web`

`test/` 配下では、主にストレージ、分析ロジック、設定画面のインポート UI、アプリのスモークテストを扱っています。

## 開発方針

- 軽量で続けやすい体験を優先する
- 長い入力や重いフローを増やしすぎない
- 実装済みの内容を README に正直に書く
- ローカル保存前提の挙動を壊さない
- 大きな変更より、小さく安全な改善を優先する
