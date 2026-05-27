# 公開前の実行計画

このメモは、初回 Android リリースまでに実際に潰す順番を固定するためのものです。

## 決めた仕様

- 1 日に複数件の記録を保存できる
- 初回リリースに週次 AI 要約を入れる
- 初回リリースは Android のみ
- backend は Supabase
- 認証は匿名開始を基本にし、正式アカウント連携は後続で詰める

## 直近でやること

1. ローカル品質確認
   - `npm run typecheck`
   - `npm run test -- --runInBand`
   - `npm run lint`

2. Supabase 実環境確認
   - Supabase CLI を使う場合は `supabase` コマンドが使える状態にする
   - `.env.example` を `.env` にコピーする
   - `EXPO_PUBLIC_SUPABASE_URL` を設定する
   - `EXPO_PUBLIC_SUPABASE_ANON_KEY` を設定する
   - Supabase Auth の Anonymous Sign-Ins を有効にする
   - `supabase/migrations/20260409_phase1_initial_schema.sql` を適用する
   - Android 実機で記録作成、編集、削除、お気に入り、タグ、写真を確認する

3. 週次 AI 要約確認
   - `supabase/functions/weekly-summary` を deploy する
   - Supabase secrets に `OPENAI_API_KEY` を設定する
   - 必要なら `OPENAI_WEEKLY_SUMMARY_MODEL` を設定する
   - 分析画面から週次 AI 要約を生成できることを確認する
   - 失敗時にユーザー向け文言が崩れないことを確認する

4. Android 公開準備
   - アプリ名を確定する
   - Android 実機確認用に Android Studio / adb / 端末の USB デバッグを準備する
   - production build を通す
   - Android 実機で主要導線を確認する
   - [Play Store 掲載文案](./play-store-listing-draft.md) を最終確認する
   - [プライバシーポリシー草案](./privacy-policy-draft.md) を最終確認する
   - Play Store 用スクリーンショットを用意する
   - データ収集 / 共有の申告を埋める

## 実機で見る主要導線

1. アプリ起動
2. 気分とひとことだけで記録を保存
3. 同じ日にもう 1 件保存
4. タグ、写真、テンプレ質問を開いて追加
5. 履歴で検索、絞り込み、お気に入り切り替え
6. カレンダーで同日の複数記録が見えることを確認
7. 分析画面で週次 AI 要約を生成
8. 通信オフまたは Supabase 未設定時に local-first で壊れないことを確認

## このPCで追加準備が必要なもの

2026-05-27 時点では、このPCの PATH 上に次のコマンドは見つかっていません。

- `supabase`
- `adb`

そのため、Supabase Edge Function の deploy や Android 実機接続は、次のどちらかで進めます。

- Android Studio / Supabase CLI をこのPCに入れてから実行する
- 会社PCなど、すでに CLI と実機接続環境があるPCで実行する

Expo の設定確認は `npx expo config --type public` で通っています。

## 公開判断

公開してよい目安:

- typecheck / test / lint が通っている
- Android 実機で主要導線が落ちない
- Supabase 保存と写真保存が本番環境で動く
- AI 要約の失敗時にも記録機能が使える
- プライバシーポリシーとストア説明で、クラウド保存と AI 処理を説明できている

まだ出さない方がよい状態:

- 同期失敗時に記録が消えたように見える
- AI 要約が失敗したときの表示が分かりにくい
- 写真付き記録の保存や削除でクラウド側にゴミが残る
- ストア申告と実際のデータ利用がずれている
