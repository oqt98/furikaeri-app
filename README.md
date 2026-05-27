# Daynote - ふりかえり日記

`furikaeri-app` は、毎日のふりかえりを軽く続けるための Expo / React Native アプリです。長い日記を書くことよりも、気分とひとことを残し、あとから見返しやすくすることを重視しています。

## 初回リリース方針

初回リリースは Android / Google Play 向けです。

含めるもの:

- 日次記録
- 1日1件のふりかえり
- 履歴
- カレンダー
- 基本分析
- タグ
- 写真
- 通知リマインダー
- テーマ / 言語 / オンボーディング / About
- Supabase を使ったクラウド保存の基盤

初回リリースに含めないもの:

- 週次AI要約
- AI要約生成ボタン
- Notion CSV import
- JSON export / import
- インポート / エクスポート画面への導線
- iOS 公開
- 課金

## 現在の実装

- テンプレートを選んで記録を作成
- 日付、気分、カテゴリ、テンプレート回答、タグ、写真、メモを保存
- 同じユーザーの同じ日付は1件まで保存
- 履歴一覧、検索、絞り込み、お気に入り管理
- カレンダーで日付ごとの記録を確認
- 基本分析の表示
- 通知リマインダー設定
- テーマ、言語、オンボーディング、About
- Supabase Auth / Database / Storage 連携

## バックエンド方針

画面から直接 Supabase を扱わず、`lib/*Repository.ts` と `lib/supabase/` に backend 接続の責務を寄せています。Supabase が未設定でも、アプリは local-first で動く前提です。

- 画面: `app/`
- 共通 UI: `components/`
- 静的データ: `data/`
- 永続化と repository: `lib/`
- Supabase SQL / Edge Functions: `supabase/`

週次AI要約用の Edge Function や import/export 関連モジュールは残っていますが、初回リリースではアプリ上の導線から外しています。

## セットアップ

```bash
npm install
npm run start
```

Supabase を使う場合:

1. `.env.example` を `.env` にコピーする
2. `EXPO_PUBLIC_SUPABASE_URL` を設定する
3. `EXPO_PUBLIC_SUPABASE_ANON_KEY` を設定する
4. Supabase Auth で Anonymous Sign-Ins を有効にする
5. `supabase/migrations/20260409_phase1_initial_schema.sql` を適用する

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

初回リリース対象は Android なので、通常確認は `npm run android` を優先します。

## ドキュメント

- [初回リリース方針](./docs/release-v1.md)
- [開発運用メモ](./docs/development-workflow.md)
- [backend 基盤メモ](./docs/backend-phase1.md)
- [再インストール時の復元メモ](./docs/reinstall-recovery.md)
- [DB / RLS メモ](./docs/db-rls-phase1.md)
- [品質確認チェックリスト](./docs/quality-checklist.md)
- [Android 公開準備チェックリスト](./docs/android-release-checklist.md)
- [公開前の実行計画](./docs/release-execution-plan.md)
- [Play Store 掲載文案](./docs/play-store-listing-draft.md)
- [プライバシーポリシー草案](./docs/privacy-policy-draft.md)
