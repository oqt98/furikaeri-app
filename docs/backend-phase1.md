# Backend Foundation

このメモは、初回リリースに向けた `backend の土台` を説明するものです。
初心者向けに短く書くと、`画面から直接 Supabase を触らず、lib/supabase に接続責務を集める` のが今回の方針です。

## 何を入れたか

- `lib/supabase/env.ts`
  - Expo の公開環境変数を読みます。
- `lib/supabase/client.ts`
  - Supabase client を必要になったときだけ作ります。
- `lib/supabase/auth.ts`
  - 匿名開始の認証をまとめます。
- `lib/supabase/SupabaseBootstrap.tsx`
  - アプリ起動時に匿名セッションを準備します。
- `lib/reviewRepository.ts`
  - 画面ではなく repository からレビューを扱います。
- `lib/tagRepository.ts`
  - タグの backend 連携の入り口です。
- `lib/weeklyAiSummary.ts`
  - 週次 AI 要約を Supabase Edge Function 経由で呼びます。
- `supabase/migrations/20260409_phase1_initial_schema.sql`
  - 最初の DB, RLS, Storage バケット定義です。
- `supabase/functions/weekly-summary/index.ts`
  - OpenAI を server side で呼ぶ関数です。

## どこに責務を置くか

- 画面: `app/`
  - UI と遷移だけを持つ
- repository: `lib/*Repository.ts`
  - 画面から見たデータの入口
- backend 接続: `lib/supabase/`
  - env, client, auth, storage, sync をまとめる
- Supabase 側の定義: `supabase/`
  - migration と Edge Function を置く

この形にしておくと、後で認証、DB、Storage、AI 連携を増やしても、画面コードを大きく壊しにくくなります。

## 現在の backend スコープ

- 匿名 auth の起動
- Supabase client の生成
- SQL schema の初期土台
- レビュー同期の入り口
- タグ同期の入り口
- 起動時のローカル復元土台
- 週次 AI 要約の Edge Function 呼び出し

## 今はまだ最小構成のもの

- 複雑な同期競合解決
- 正式アカウントへの連携導線
- AI 要約の保存履歴
- 課金連携
- iOS リリース向けの仕上げ

## 環境変数

ローカル開発では `.env.example` を `.env` にコピーして使います。

必要な値:
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`

この値が無い場合は、Supabase 呼び出しを無効化したまま local-first で動かす想定です。

## 最低限のセットアップ手順

1. Supabase プロジェクトを作る
2. Auth で Anonymous Sign-Ins を有効にする
3. `supabase/migrations/20260409_phase1_initial_schema.sql` を適用する
4. `.env.example` を `.env` にコピーする
5. `.env` に URL と anon key を入れる
6. `npm run android` で起動確認する

## 週次 AI 要約の追加設定

アプリは OpenAI を直接呼びません。
Supabase Edge Function 経由で呼びます。

Supabase 側で必要な secret:
- `OPENAI_API_KEY`
- `OPENAI_WEEKLY_SUMMARY_MODEL`

モデル名を省略した場合は、関数側の既定値を使います。

例:

```bash
supabase functions deploy weekly-summary
supabase secrets set OPENAI_API_KEY=...
supabase secrets set OPENAI_WEEKLY_SUMMARY_MODEL=gpt-4.1-mini
```

## 補足

今回の土台導入の目的は、いきなり全面 backend 化することではありません。
まずは `匿名開始` と `週次 AI 要約` を支えられる最小構成を置き、あとで安全に広げられるようにすることです。

再インストール時の復元については、[再インストール時の復元メモ](./reinstall-recovery.md) も参照してください。
