# Gen Feed Posts Workflow

この workflow は、アプリ情報をもとに Instagram フィード投稿画像を生成するための標準手順。

## Goal

- 前段でアプリ情報ファイルを作る
- アプリ情報ファイルは `data/app-product-context.json` を既定の中核入力として扱う
- reference prompt JSON があればそれを使う
- なければ sample template を使う
- typography をアプリ情報に合わせて埋める
- `resolved_image_generation_prompt` を作る
- `imagegen` で 3 枚カルーセル画像を生成する

## Files

- app 情報スキル:
  - `app-product-summary/`
- 画像生成スキル:
  - `instagram-feed-image-generation/`
- 既定 template:
  - `instagram-feed-image-generation/assets/sample-feed-prompt.json`

## Standard Flow

1. `node scripts/ensure-app-product-context.mjs` を実行する
2. script が missing を返した場合は、先に `app-product-summary` を使って `data/app-product-context.json` を作る
3. 生成後、もう一度 `node scripts/ensure-app-product-context.mjs` を実行する
4. ユーザーが reference prompt JSON を持っているか確認する
5. あるならその JSON を使う
6. なければ `sample-feed-prompt.json` を使う
7. `instagram-feed-image-generation` で `typography` を app 情報に合わせて埋める
8. `image_generation_prompt_template` の `<slot>` を解決して `resolved_image_generation_prompt` を作る
9. slide ごとに `imagegen` で画像を生成する
10. resolved JSON は `.tmp/feed-prompts/` に、画像は `data/images/` に保存する

## Priority Rules

1. app 情報ファイルは常に必須
2. reference prompt JSON は任意
3. reference prompt JSON があれば sample template より優先
4. template の固定構造はできるだけ維持する
5. 主に変更するのは `typography.*.text`

## Expected Outputs

- app 情報ファイル
- resolved feed prompt JSON
- 3 枚の画像

## Notes

- 2 枚目は文字が小さくなりやすいので、4つ前後の feature label に抑える
- 文字が厳しい場合は、背景と構図だけ生成して文字は別工程に切り出してよい
