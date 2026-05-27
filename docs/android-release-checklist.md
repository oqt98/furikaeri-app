# Android 公開準備チェックリスト

このメモは、初回リリースを Google Play に出す前に必要な項目を整理するためのものです。

## 今の設定で確認できたこと

- package 名: `com.oqt98.furikaeriapp`
- Expo project id: 設定済み
- Android adaptive icon: 設定あり
- splash: 設定あり
- EAS build 設定: `preview`, `production` あり

参照:
- [app.json](C:\Users\238ks\furikaeri-app\app.json)
- [eas.json](C:\Users\238ks\furikaeri-app\eas.json)

## 今の状態で不足しやすいもの

- アプリ名の反映確認
  - 表示名は `Daynote - ふりかえり日記`
- Play Store 用の説明文
- スクリーンショット
- プライバシーポリシー
- 初回公開用のバージョン運用ルール
- 本番ビルド手順の実行確認

## 公開前に確認する設定

- アプリ名
- package 名
- アイコン
- splash
- バージョン番号
- Android 実機での見え方

## Google Play Console で必要になるもの

- アプリ名
- 短い説明文
- 詳しい説明文
- スクリーンショット
- アイコン
- 連絡先情報
- プライバシーポリシー URL
- データ収集 / 共有に関する申告

## このアプリで説明に入れたい内容

- 日次のふりかえりを短く続けるアプリであること
- 記録、履歴、カレンダー、基本分析ができること
- 匿名開始で使い始められること
- 週次 AI 要約は見返し支援であり、診断ではないこと
- クラウド保存を使うこと

## プライバシーポリシーで触れたい内容

- 記録内容をクラウド保存すること
- 画像を保存する場合があること
- AI 要約のために、週次の振り返りデータを backend 経由で処理すること
- 医療・心理診断を行うアプリではないこと

## 最短ルート

1. `npm run test`, `npm run typecheck`, `npm run lint` を通す
2. Supabase 実環境で記録、写真、タグ、AI 要約を確認する
3. Android 実機で主要導線を確認する
4. `eas build -p android --profile production` を一度通す
5. ストア用素材と説明文をそろえる
6. Play Console の申告項目を埋める

## メモ

- AI とクラウド保存を使うので、ストア説明では「入力内容を安全に保存する」「診断目的ではない」を明記した方が安全です
- 課金は初回対象外なので、価格やサブスク説明は不要です
