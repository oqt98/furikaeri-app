# 開発運用メモ

このメモは、`main` を壊さずに小さく進めるための運用前提をまとめたものです。

## 今回の前提

- `1ブランチ = 1テーマ` で進める
- 未コミット変更は勝手に戻さない
- 既存変更と競合しそうな場所を先に確認する
- backend 導入中でも、いきなり広い範囲を触らない

## 推奨ブランチ名

今回のテーマなら、次のどちらかが分かりやすいです。

- `codex/release-foundation-phase1`
- `codex/backend-foundation-phase1`

このリポジトリでは `codex/` 接頭辞でそろえるのが安全です。

## 今後の命名ルール案

- `codex/release-...`: リリース方針や配布準備
- `codex/docs-...`: README や docs の整理
- `codex/backend-...`: Supabase, DB, Auth, RLS
- `codex/ui-...`: 画面や体験改善
- `codex/test-...`: テスト整備

例:
- `codex/docs-release-v1`
- `codex/backend-db-phase1`
- `codex/backend-rls-phase1`
- `codex/ui-entry-speed`

## 競合しやすい場所

今回のワークツリーを見ると、次は競合しやすいです。

- `README.md`
- `app/(tabs)/*`
- `app/_layout.tsx`
- `lib/storage.ts`
- `lib/preferences.ts`
- `package.json`
- `test/ui/app-smoke.test.tsx`

理由は、既に未コミット変更が入っているためです。

## 比較的安全に進めやすい場所

- `docs/` 配下の新規メモ
- `.env.example`
- `lib/supabase/` の小さな補足修正
- `.gitignore` の環境変数保護

## 安全な進め方

1. まず `git status --short --branch` で差分を確認する
2. 触る予定のファイルが既に変更済みか確認する
3. 競合しやすい変更は別ブランチに分ける
4. backend, docs, UI を一度に大きく混ぜない
5. main に戻す前に typecheck と最低限の動作確認を行う

## 補足

今のワークツリーは既に変更が多いです。
そのため、新しいブランチを切るなら本来は作業前が理想ですが、今の状態では既存差分を含んだままブランチが分かれる点に注意してください。
