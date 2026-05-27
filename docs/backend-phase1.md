# Backend Foundation

このメモは、初回リリースに向けた backend 基盤の責務を整理するものです。初回リリースでは、アプリ上から週次AI要約は呼びません。

## 現在の backend スコープ

- Supabase client の初期化
- 匿名認証の起動
- review repository 経由の保存、更新、削除、取得
- tag repository 経由のタグ同期
- Storage 経由の写真保存
- 起動時のローカル復元
- DB / RLS / Storage policy の初期 schema

## 主なファイル

- `lib/supabase/env.ts`
  - Expo の公開環境変数を読み込みます。
- `lib/supabase/client.ts`
  - Supabase client を必要なときだけ作ります。
- `lib/supabase/auth.ts`
  - 匿名認証を扱います。
- `lib/supabase/SupabaseBootstrap.tsx`
  - アプリ起動時に匿名セッションを準備します。
- `lib/reviewRepository.ts`
  - 画面から見た記録データの入口です。
- `lib/tagRepository.ts`
  - タグの local / remote 同期の入口です。
- `supabase/migrations/20260409_phase1_initial_schema.sql`
  - 初期 DB、RLS、Storage bucket 定義です。

## 初回リリースで呼ばないもの

以下は後続候補としてコードが残っていても、初回リリースではアプリ上の導線から外します。

- `lib/weeklyAiSummary.ts`
- `supabase/functions/weekly-summary/index.ts`
- import/export 関連画面とモジュール

## 環境変数

ローカル開発では `.env.example` を `.env` にコピーして使います。

必要な値:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`

この値が未設定でも、アプリは local-first で動く前提です。

## 最小セットアップ手順

1. Supabase プロジェクトを作る
2. Auth で Anonymous Sign-Ins を有効にする
3. `supabase/migrations/20260409_phase1_initial_schema.sql` を適用する
4. `.env.example` を `.env` にコピーする
5. `.env` に URL と anon key を入れる
6. Android 実機で記録、タグ、写真を確認する

## 補足

初回リリースの目的は、記録をクラウドにも安全に保存できる最小構成を置くことです。AI要約、データ移行、正式アカウント連携は後続で検討します。
