# Android 公開準備チェックリスト

初回リリースを Google Play に出す前に確認する項目です。

## 設定済み

- package 名: `com.oqt98.furikaeriapp`
- Expo project id
- Android adaptive icon
- splash
- EAS build profile: `preview`, `production`

参照:

- [app.json](../app.json)
- [eas.json](../eas.json)
- [Play Store 掲載文案](./play-store-listing-draft.md)
- [プライバシーポリシー草案](./privacy-policy-draft.md)

## 公開前に確認する設定

- アプリ名
- package 名
- アイコン
- splash
- version / versionCode
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

## ストア説明に入れる内容

- 日次のふりかえりを短く続けるアプリであること
- 1日1件の記録を保存できること
- 履歴、カレンダー、基本分析があること
- タグ、写真、通知リマインダーを使えること
- 匿名開始で使い始められること
- クラウド保存を使うこと
- 医療・心理診断を目的としたアプリではないこと

## プライバシーポリシーで触れる内容

- 記録内容をクラウド保存すること
- 写真を保存する場合があること
- 匿名認証用のユーザー ID を扱うこと
- 通知はユーザーが有効にした場合のみ使うこと
- 初回リリースではAI要約を提供しないこと

## 最短ルート

1. `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build:web` を通す
2. Supabase 実機環境で記録、タグ、写真を確認する
3. Android 実機で主要導線を確認する
4. `eas build -p android --profile production` を通す
5. ストア素材と説明文をそろえる
6. Play Console の申告項目を埋める

## メモ

- 初回リリースでは課金を扱わない
- 初回リリースではAI要約、Notion CSV import、JSON export / import を扱わない
- ストア説明と実際のアプリ内導線がずれていないことを最後に確認する
