---
name: instagram-feed-image-generation
description: アプリ情報ファイルを必須入力として、Instagram フィード投稿画像を 3 枚カルーセル前提で生成するときに使う。ユーザー持参の reference prompt JSON があればそれを優先し、なければ assets/sample-feed-prompt.json を使い、`typography` をアプリ情報に合わせて埋めて `image_generation_prompt_template` を解決し、そのまま `imagegen` で画像生成したいときに使用。
---

# Instagram Feed Image Generation

Instagram フィード用の正方形カルーセル画像を、`app info file + prompt JSON template` の組み合わせで安定して生成するスキル。

このスキルは、`typography` をアプリ情報から埋め、`resolved_image_generation_prompt` を組み立てたうえで `imagegen` を使って画像を生成する。

# Required Inputs

- 必須:
  - アプリ情報ファイル
- 任意:
  - ユーザー持参の reference prompt JSON

reference prompt JSON がない場合は、`assets/sample-feed-prompt.json` を使う。

# Input Priority

入力の優先順位は固定する。

1. アプリ情報ファイル
2. ユーザー持参の reference prompt JSON
3. `assets/sample-feed-prompt.json`

アプリ情報ファイルは常に読む。  
template JSON だけを切り替える。

# App Info File

アプリ情報ファイルは、このスキルの前段で作られている前提で扱う。

優先して読む既定 path は `data/app-product-context.json`。  
これは `app-product-summary` が生成する、後段 skill 共通の app product context として扱う。
このファイルの存在確認と不足時の案内は `scripts/ensure-app-product-context.mjs` で管理する。

このスキルを進める前に次を実行する:

```bash
node scripts/ensure-app-product-context.mjs
```

script が missing を返した場合は、先に `app-product-summary` を使用して `data/app-product-context.json` を生成する。

理想は JSON 形式だが、markdown でもよい。  
JSON の場合は、`references/app-info-shape.md` のような情報を含むと扱いやすい。

優先して使いたい情報:

- `product_name`
- `product_summary`
- `main_features`
- `catchcopies`
- `tone_keywords`
- `audience`
- `benefits`

不足がある場合は、要約文や feature 一覧から補完してよい。

# Default Rules

- 縦横比は常に `1:1`
- 画像は常に `3枚` 生成する前提で組み立てる
- 1 枚目は表紙
- 2 枚目は機能紹介
- 3 枚目はベネフィット訴求
- template JSON の固定部分はできるだけ維持する
- 原則として変更するのは `typography.*.text`
- `image_generation_prompt_template` の `<slot>` は `typography` の key に対応させる
- 生成実行前に `resolved feed prompt JSON` を作る
- 画像生成は原則 `imagegen` skill を使う

# Text Size Control

- `imagegen` では文字サイズを `px` で正確に固定できない前提で扱う
- 文字サイズは `相対的な大きさ` と `情報量の上限` で制御する
- prompt では次を明示する
  - `headline must be very large and instantly readable`
  - `no tiny captions`
  - `use generous empty space around text`
  - `high contrast typography`
- 見出し上限の既定値:
  - 1 枚目: `20文字以内`
  - 2 枚目: `24文字以内`
  - 3 枚目: `20文字以内`
- 補助文:
  - `18文字以内 x 2行程度`
- 2 枚目の機能ラベル:
  - `1ラベル 12文字以内`
- 長すぎる場合は
  1. 言い換える
  2. 補助文へ逃がす
  3. 文字は別工程に切り出す

# Workflow

## 1. アプリ情報ファイルを読む

- まずアプリ情報ファイルを確認する
- `node scripts/ensure-app-product-context.mjs` を実行して、`data/app-product-context.json` が使える状態か確認する
- script が missing を返した場合は、先に `app-product-summary` を使って作成する
- script が OK なら `data/app-product-context.json` を読む
- 何のアプリか
- 主要機能は何か
- どんな価値があるか
- どんなコピー候補があるか

## 2. template JSON を決める

- ユーザー持参 JSON があるなら、それを使う
- なければ `assets/sample-feed-prompt.json` を使う
- template JSON の構造は壊さない

## 3. slide ごとの role を確認する

- 1 枚目: 表紙
- 2 枚目: 機能紹介
- 3 枚目: ベネフィット訴求

reference JSON が別の構造を持っていても、まずその画像 role を確認する。

## 4. typography を埋める

- `typography.*.text` がすでに埋まっていれば、それを優先する
- 空ならアプリ情報ファイルから埋める
- style ごとの方針は `references/typography-resolution.md` を使う
- 例:
  - `cover-main`: アプリの本質を一言で言う
  - `feature-headline`: 何が見返せるか、何ができるかを言う
  - `benefit-headline`: 使うと何が残るかを言う
  - `feature-label`: 機能を短く分解する
  - `short-support`: 見出しの意味を補う

## 5. prompt template を解決する

- `image_generation_prompt_template` の `<header>` のような placeholder を置換する
- `typography.header.text` を `<header>` に差し込む
- 差し込み結果を `resolved_image_generation_prompt` として保持する
- template 自体は残してよい

## 6. resolved feed prompt JSON を保存する

- 保存先の第一候補は `.tmp/feed-prompts/`
- 例:
  - `myu-cover-resolved.json`
  - `myu-features-resolved.json`
  - `myu-benefits-resolved.json`

## 7. imagegen で生成する

- 各 slide の `resolved_image_generation_prompt` を使って生成する
- 3 枚カルーセルなら、slide ごとに 1 回ずつ `imagegen` を呼ぶ
- 成果物は `data/images/` に保存する

## 8. 生成後に確認する

- 正方形になっているか
- 見出しが読めるか
- template の意図が保たれているか
- 2 枚目だけ文字が小さくなっていないか
- 参考 JSON がある場合、レイアウトとムードを引き継げているか

# Fallback Behavior

- reference JSON がない: `assets/sample-feed-prompt.json` を使う
- app 情報が薄い: 要約文と feature 一覧から最小限の文言を作る
- 文字が長すぎる: 短縮案を先に作る
- 厳密な可読性が必要: 背景と構図だけ生成して文字は別工程にする

# Output

- 最終的に返すもの:
  - 使った template path
  - 使った app info path
  - 保存した resolved JSON path
  - 保存した画像 path
  - 各 slide で埋めた主要 `typography` 項目

# References

- `assets/sample-feed-prompt.json`: 既定の prompt JSON template
- `references/app-info-shape.md`: app 情報ファイルの想定 shape
- `references/typography-resolution.md`: style ごとの文言生成方針
- `references/brief-template.md`: 手動 override が必要なときの補助
