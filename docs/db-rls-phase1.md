# DB / RLS Phase 1

このメモは、初回リリース向けの DB 設計と RLS 方針を整理するためのものです。

初心者向けに短く言うと:

- DB は「クラウドにどう保存するか」の設計です
- RLS は「そのユーザー本人のデータだけ見せる」ための DB 側の安全装置です

## テーブルごとの所有者

- `profiles`
  - `id = auth.users.id`
  - そのユーザー本人のプロフィール
- `app_preferences`
  - `user_id = auth.users.id`
  - そのユーザー本人の設定
- `reviews`
  - `user_id = auth.users.id`
  - そのユーザー本人の記録
- `tags`
  - `user_id = auth.users.id`
  - そのユーザー本人のタグ
- `review_photos`
  - 直接 user_id は持たず、親の `reviews` を通して所有者を判断
- `review_tags`
  - 直接 user_id は持たず、親の `reviews` と `tags` を通して所有者を判断

phase 1 では、匿名開始ユーザーも Supabase Auth 上のユーザーとして扱い、RLS は `authenticated` ロール向けにそろえます。

## review_date の扱い

初回リリースでは `reviews(user_id, review_date)` を一意にします。

理由:

- 1 日に保存する記録は 1 件までにする
- 別の日付の記録は自由に追加できる
- アプリ側の重複チェックだけでなく DB 側でも同じ制約を守る

つまり、DB でも「同じユーザーの同じ日付は 1 件まで」を保証します。

## 今回入れた判断

- `answers_json` は `jsonb` の object だけ許可
- `import_source + import_fingerprint` はユーザー単位で重複しないように unique index を追加
- `review_photos.sort_order` は 0 以上
- `review_photos(review_id, sort_order)` は同じレビュー内で重複しないように unique index を追加

## tags.id の扱い

ローカルのデフォルトタグ ID は `action-reading` のように全ユーザー共通です。
そのため、クラウドではそのまま使うと別ユーザーと衝突する可能性があります。

今回の実装では、remote 保存時だけ `userId:localTagId` の形に変換して衝突を避けます。
画面や local storage では引き続き元の tag id を使います。

## 匿名開始 -> 後で連携 の前提

- phase 1 では、まず匿名ユーザーでも `auth.uid()` を持てることを前提にします
- テーブルの所有者判定は `auth.uid()` ベースでそろえます
- 後で連携を入れる場合も、所有者判定の軸を `auth.uid()` のまま維持する設計にしておくと広げやすいです

## 将来追加しやすい候補テーブル

- `weekly_ai_summaries`
  - 週次 AI 要約の保存履歴
- `account_links` 相当の補助情報
  - 後で連携の状態管理
- `review_sync_jobs`
  - 同期失敗や再送の運用を分けたい場合
