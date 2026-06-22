# リリースとブランチ運用

## 基本方針

- `main` は公開中のOSSとして扱う。
- 公開は `main` に通常 push するだけでよい。
- スキルは機能ごとに段階的に解放する。
- 未リリーススキルは別ブランチに保存してよい。未リリース内容が public branch で見えても問題ない前提とする。

## ブランチの役割

- `main`: 現在公開しているスキルだけを置く。
- `codex/archive/full-skill-catalog-YYYY-MM-DD`: その時点の全部入り状態を保存する。
- `codex/release/<release-name>`: main に反映する前の整理と確認に使う短命ブランチ。
- `codex/feature/<skill-id>`: 今後の個別スキル開発に使う。

## 初回公開対象

初回は次の4つだけを `main` に残す。

- `skills/gen-appstore-image/`
- `skills/check-native-app-legal/`
- `skills/native-app-security-check/`
- `skills/app-product-summary/`

## リリース手順

1. 全部入り状態を archive ブランチにコミットして保存する。
2. `main` から release ブランチを作る。
3. release ブランチで公開対象外のスキル、画像、README、Editor設定を外す。
4. `rg` で公開対象外スキル名の参照が残っていないか確認する。
5. テストと Editor 表示を確認する。
6. 問題なければ `main` に反映して push する。

## 今後スキルを追加公開するとき

1. `main` から release ブランチを作る。
2. archive または feature ブランチから、公開するスキルのファイルだけを戻す。
3. Editor設定、README、必要なライセンス表記を更新する。
4. テストと Editor 表示を確認する。
5. `main` に反映して push する。
