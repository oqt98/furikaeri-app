# furikaeri-app

`furikaeri-app` は、毎日のふりかえりを軽く続けるための Expo / React Native アプリです。
長い日記を書くよりも、短く振り返って次の日を少し良くすることを重視しています。

## コンセプト

- 毎日の入力を負担にしない
- 過去の記録を見返しやすくする
- 気分や行動の傾向をざっくり把握できるようにする

## 現在できること

### 記録

- テンプレートを選んで記録を作成
- 日付、気分、カテゴリ、テンプレート回答、タグ、写真、メモを保存
- 記録の編集
- 入力途中の下書きを保持
- 作成画面から離れる際の未保存確認
- 同じ日付の記録を複数保存可能

### 閲覧

- 履歴一覧で過去の記録を確認
- カレンダーから日付ごとの記録を確認
- 記録詳細画面の表示
- お気に入り記録の管理

### テンプレートとタグ

- テンプレート一覧から選択
- クイック記録用テンプレートの利用
- ランダムでテンプレートを選択
- 行動タグ / 気分タグの追加
- タグの並び替え
- タグの削除

### そのほか

- シンプルな分析表示
- 大事な日の登録と一覧表示
- リマインダーなどの設定画面
- JSON のインポート / エクスポート
- Notion CSV の取り込み

## 現在の制約

- 1 日 1 件には制限していません
- 行動タグと気分タグは分かれていますが、自動集計は軽量です
- 週次サマリー、週次比較、自動文章要約は未実装です
- データ保存はローカルの `AsyncStorage` ベースです

## 主なデータ項目

- 日付
- 気分
- カテゴリ
- テンプレート回答
- 行動タグ
- 気分タグ
- 写真
- お気に入り

## テンプレート

現在の実装では、次のテンプレートを利用できます。

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

## ディレクトリ構成

```text
app/
  (tabs)/
  review/
  important-days.tsx
  notifications.tsx
  import-export.tsx
  about.tsx

components/
  共通 UI コンポーネント

data/
  reviewOptions.ts
  templates.ts
  tags.ts

lib/
  storage.ts
  entryDraft.ts
  reviewDate.ts
  importantDays.ts
  preferences.ts
  notionImport.ts

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

`npm run android` と `npm run ios` は `expo run:android` / `expo run:ios` を使います。

## テスト

変更後の基本確認として、次を実行します。

```bash
npm run test -- --runInBand
npm run typecheck
npm run lint
```

## 補足

- README は実装済み機能に合わせて更新します
- 将来案は、実装済みの挙動と混同しないように分けて扱います
- ストレージ構造を変更する場合は既存データとの互換性に注意してください
