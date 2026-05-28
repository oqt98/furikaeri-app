# DB / RLS Phase 1

このメモは、初回リリース向けの DB 設計と RLS 方針を整理するものです。

## 方針

- DB は「クラウドにも保存する」ための基盤
- RLS は「そのユーザー本人のデータだけを見せる」ための安全装置
- phase 1 は匿名開始ユーザーを Supabase Auth 上のユーザーとして扱う

## テーブルごとの所有者

- `profiles`
  - `id = auth.users.id`
- `app_preferences`
  - `user_id = auth.users.id`
- `reviews`
  - `user_id = auth.users.id`
- `tags`
  - `user_id = auth.users.id`
- `review_photos`
  - 親の `reviews` を通して所有者を判定
- `review_tags`
  - 親の `reviews` と `tags` を通して所有者を判定

## review_date の扱い

初回リリースでは `reviews(user_id, review_date)` を一意にします。

理由:

- 同じ日付に保存する記録は1件までにする
- 別の日付の記録は自由に追加できる
- アプリ側だけでなく DB 側でも同じ制約を守る

つまり、DB でも「同じユーザーの同じ日付は1件まで」を保証します。

## 今回入れた判断

- `answers_json` は `jsonb` の object のみ許可
- `import_source + import_fingerprint` は後続の import 機能用に残っているが、初回リリースではアプリ上の導線から外す
- `review_photos.sort_order` は 0 以上
- `review_photos(review_id, sort_order)` は同じレビュー内で重複しない

## tags.id の扱い

ローカルのデフォルトタグ ID は全ユーザー共通です。クラウド保存時は、必要に応じて userId と組み合わせた remote 用 ID に変換して衝突を避けます。

## 後続候補

- 正式アカウント連携
- 同期失敗や再送の運用整理
- AI要約の保存履歴
- データ import/export の再導入
