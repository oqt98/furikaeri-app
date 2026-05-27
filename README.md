# Daynote-ふりかえり日記

`Daynote-ふりかえり日記` は、毎日のふりかえりを軽く続けるための Expo / React Native アプリです。
長い日記を書くよりも、短く振り返って次の日を少し良くすることを重視しています。

## 初回リリース方針

初回リリースは `Android only` です。

### 初回リリースに入れるもの

- 日次記録
- 履歴
- カレンダー
- 基本分析
- Supabase を使った backend 基盤
- 匿名開始の認証導線
- 週次 AI 要約

### 初回リリースに入れないもの

- iOS 版の公開
- 課金
- AI チャット
- 複雑なアカウント設定
- 高度な有料分析

### 今あるもの / これから入れるもの

今あるもの:
- テンプレートを使った日次記録
- 履歴一覧
- カレンダー表示
- 軽量な分析
- 設定、通知、言語切替などの基本設定
- Notion CSV import
- Supabase 接続の土台
- 匿名開始の自動サインイン土台
- 週次 AI 要約の呼び出し土台

これから入れるもの:
- backend 前提の本格的なデータ同期の磨き込み
- 匿名アカウントから正式アカウントへの連携
- 週次 AI 要約の保存・再生成管理
- DB 設計の詳細化
- RLS / 認証ルールの整理と強化

初回では入れないもの:
- AI チャット
- サブスク / 課金
- 高度な分析の有料機能
- 多数の設定項目を持つアカウント管理
- iOS リリース

## このリポジトリの現状

### すでに実装されていること

- テンプレートを選んで記録を作成
- 日付、気分、カテゴリ、テンプレート回答、タグ、写真、メモを保存
- 記録の編集
- 履歴一覧で過去の記録を確認
- カレンダーで日付ごとの記録を確認
- 基本分析の表示
- お気に入り記録の管理
- 通知設定
- JSON export / import
- Notion CSV import

### まだ前提にしないこと

- 課金あり前提の設計
- AI チャット前提の画面構成
- backend がないと使えない必須フロー

### 現在の制約

- 1 日に保存できる記録は 1 件までです。別の日付の記録は作成できます。
- 高度な週次比較や有料分析は未実装です
- backend は導入中で、現時点では local-first の構成です
- 週次 AI 要約は backend 経由で扱う前提ですが、周辺運用はまだ最小構成です

## backend の配置方針

初心者向けに短く書くと、画面から直接 Supabase を触らないようにしています。

- 画面: `app/`
  UI と画面遷移だけを担当します。
- データ取得の窓口: `lib/*Repository.ts`
  画面はここを呼びます。
- Supabase 接続まわり: `lib/supabase/`
  client, env, auth, storage など backend の土台を置きます。
- SQL / Edge Functions: `supabase/`
  Supabase 側に入れる DB 定義や関数を置きます。

この分け方にしておくと、あとで認証、DB、Storage、AI 連携を広げやすくなります。

詳しくは次のドキュメントを参照してください。

- [初回リリース方針](./docs/release-v1.md)
- [開発運用メモ](./docs/development-workflow.md)
- [backend 土台メモ](./docs/backend-phase1.md)
- [再インストール時の復元メモ](./docs/reinstall-recovery.md)
- [DB / RLS メモ](./docs/db-rls-phase1.md)
- [品質確認チェックリスト](./docs/quality-checklist.md)
- [Android 公開準備チェックリスト](./docs/android-release-checklist.md)
- [公開前の実行計画](./docs/release-execution-plan.md)
- [Play Store 掲載文案](./docs/play-store-listing-draft.md)
- [プライバシーポリシー草案](./docs/privacy-policy-draft.md)

## セットアップ

```bash
npm install
npm run start
```

### Supabase を使う場合の最小セットアップ

1. `.env.example` を `.env` にコピーします。
2. `EXPO_PUBLIC_SUPABASE_URL` を設定します。
3. `EXPO_PUBLIC_SUPABASE_ANON_KEY` を設定します。
4. Supabase Auth で Anonymous Sign-Ins を有効にします。
5. `supabase/migrations/20260409_phase1_initial_schema.sql` を適用します。

環境変数が未設定でも、アプリは local-first で動き続ける想定です。

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

## テスト

変更後の基本確認として、次を実行します。

```bash
npm run test -- --runInBand
npm run typecheck
npm run lint
```

## 補足

- README は初回リリース観点で、実装済みと今後の予定を分けて書いています。
- README の文字化けが起きる場合は、UTF-8 で開く前提にそろえて確認してください。
- ストレージ構造を変更する場合は既存データとの互換性に注意してください。
- backend 導入中でも、入力の速さを落とさない local-first の考え方を維持します。
