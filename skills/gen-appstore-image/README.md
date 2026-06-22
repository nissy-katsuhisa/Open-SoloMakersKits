[![bloom-banner-01-light-tags-1500x500](https://github.com/user-attachments/assets/31139b9d-1b89-44e8-b563-5bb7ba150b7b)](https://bloom.parthjadhav.com)

### 注記: iOS を起点に進める場合は、iPhone のベース撮影に 6.1 inch simulator を使ってください
これにより、後段の画像生成や構図調整を最小限にできます

# App Store & Google Play Screenshot Generation

AI コーディングエージェント向けの headless skill bundle です。**App Store / Google Play 用スクリーンショット**を直接生成します。iOS アプリのリポジトリ内で使う場合は、コードからアプリを理解し、実際のデザイントークンやアセットからブランド方針を抽出し、シミュレータからベース画像を撮影し、最終的なストア用画像まで生成できます。

#### Screenshots & App approved by Apple - https://apps.apple.com/us/app/bloom-coffee-shelf-recipe/id6759914524
![Example output — Bloom coffee tracking app](assets/example.png)

## できること

- マーケティング上の判断を聞く前に、まずコードからアプリを理解する
- `data/app-product-context.json` を共通入力として、プロダクト理解とブランド理解を扱う
- `scripts/ensure-app-product-context.mjs` で中核ファイルの確認と不足時の案内を管理する
- script が missing を返した場合は、[skills/app-product-summary/SKILL.md](../app-product-summary/SKILL.md) を使って実データから抽出する
- インストール済み runtime を使って、iOS のベーススクリーンショットをシミュレータから取得する
- 元スクリーンショットを予測しやすい出力フォルダ構造に整理する
- 機能優先度、ビジュアルトーン、背景方針などの screenshot-ready な planning 出力を書く
- `output/app-store-screenshots/<generated-at>/` 配下に App Store / Play Store 用の最終画像だけを生成する
- Apple App Store と Google Play の両方の planning target を扱える
- locale ごとの展開、テーマ方針、ストア別の asset mapping に対応する

既定の出力方針:

- iPhone は `6.9"` の 1セットだけを生成する
- iPad は必要なときだけ `13"` の 1セットを生成する
- Android は device class ごとに 1セットだけを生成する
- Google Play を対象にするときは feature graphic も生成対象に含める

## Copy validation

この skill では、headline copy を作ったあとにそのまま画像生成へ進まず、copy-fit validation を挟む前提です。

- script: `scripts/validate-copy-fit.mjs`
- 入力: `output/app-store-screenshot-work/current/screenshot-plan.json` または `app-store-screenshots.json`
- 検査内容:
  - layout ごとの現行 font size / width 前提で、1行に収まる文字数の目安を出す
  - 自動折り返しが起きていないか確認する
  - 2文字だけの短い行が出ていないか確認する

落ちた場合は、失敗した slide の headline だけを作り直して再検査し、通るまで繰り返します。

## 含まれる skill

- `SKILL.md`
  - スクリーンショットの撮影、screenshot plan の作成、最終画像の生成を直接行う
  - iOS の場合は別の撮影 skill を前提にせず、この skill 自体の workflow の中で simulator capture まで進める

## リポジトリ内の構成

- `SKILL.md`: コーディングエージェントが実行する App Store / Google Play 画像生成 workflow
- `README.md`: 人間向けの概要と使い方
- `LICENSE`: OSS 由来の著作権表示とライセンス
- `CONTRIBUTING.md`: upstream 由来の contributor guide
- `.github/`, `.gitignore`: upstream 由来の repository metadata と ignore 設定
- `assets/`: README 用の example 画像と、生成テンプレートで参照する mockup 画像
- `references/style-prompts.md`: 利用できる style prompt の一覧
- `references/style-prompts/`: 各 style の詳細仕様
- `scripts/validate-copy-fit.mjs`: headline copy が画像内に収まるかを検証する script

## 共有依存

- `../app-product-summary/SKILL.md`
  - コードベースを読み、プロダクト情報とブランド情報を統合した `data/app-product-context.json` を出力する
  - `scripts/ensure-app-product-context.mjs` が missing を返した場合に、この skill を実行して中核データを生成する

## 使い方

インストール後の主な流れは次です。

1. `node scripts/ensure-app-product-context.mjs` を実行し、missing の場合は `../app-product-summary/SKILL.md` で生成する
2. ソースファイルやアセットからブランドカラーとブランドコンセプトを抽出する
3. 必要ならシミュレータで新しいスクリーンショットを撮影する
4. スクリーンショットとアイコン素材を整理する
5. `output/` 配下に screenshot planning 出力を書く
6. App Store / Google Play 用の最終画像を生成する

既定の考え方は generic preset ではありません。アプリ自体からブランド主導のスクリーンショット方針を導くことを優先します。

- コードとアセットから primary / secondary color を確認する
- premium, casual, playful, calm, tech-forward など全体の印象を推定する
- そのブランドプロファイルを元に screenshot background direction を生成する

## iOS-first workflow

iOS アプリのリポジトリ内で使うときは、次の流れと特に相性がいい構成です。

- まず `node scripts/ensure-app-product-context.mjs` を実行し、missing の場合は `../app-product-summary/SKILL.md` で生成してデッキ設計前の前提を固める
- この skill 自体が Build iOS Apps workflow を使って simulator を起動し、スクリーンショットを撮る
- Mac にインストール済みの simulator runtime をそのまま使う
- app product context は `data/app-product-context.json` に置き、最終生成物は `output/app-store-screenshots/<generated-at>/`、確認用画像は `output/app-store-screenshot-previews/<generated-at>/`、planning file は `output/app-store-screenshot-work/` へ整理する

撮影時の実務ルール:

- build configuration を決め打ちせず、shared scheme が launch に使う configuration を先に確認する
- project に `Debug` がなく `Local` や `Dev` だけがある場合は、その configuration で build して撮影する
- 起動時の bundle id は build 後の app から確認する
- `UI_TESTS` や `DEBUG_*` の launch argument、preview factory、debug launch destination があれば手動遷移より優先する
- 最初は 1 枚だけ fixed screen を撮り、permission prompt や onboarding blocker がないことを確認してから枚数を増やす

## 典型的な出力

- `data/app-product-context.json`
- `output/ios-page-screenshots/<screen-slug>.png`
- `output/app-store-screenshot-work/current/screenshot-plan.md`
- `output/app-store-screenshot-work/current/screenshot-plan.json`
- `output/app-store-screenshot-previews/<generated-at>/apple/iphone/6.9/ja/contact-sheet.png`
- `output/app-store-screenshots/<generated-at>/apple/iphone/6.9/ja/*.png`
- `output/app-store-screenshots/<generated-at>/apple/ipad/13/ja/*.png`
- `output/app-store-screenshots/<generated-at>/android/phone/ja/*.png`
- `output/app-store-screenshots/<generated-at>/android/feature-graphic/ja/*.png`

## 生成対象の書き出しサイズ

### Apple App Store

| Display | Resolution |
|---------|-----------|
| 6.9" | 1320 x 2868 |
| 13" iPad | 2064 x 2752 |

### Google Play Store

| Device | Resolution |
|--------|-----------|
| Phone (portrait) | 1080 x 1920 |
| 7" Tablet (portrait) | 1200 x 1920 |
| 7" Tablet (landscape) | 1920 x 1200 |
| 10" Tablet (portrait) | 1600 x 2560 |
| 10" Tablet (landscape) | 2560 x 1600 |
| Feature Graphic | 1024 x 500 |

## 必要条件

- Node.js 18+
- `bun`, `pnpm`, `yarn`, `npm` のいずれか
- iOS 撮影を行う場合は、ローカル Mac に simulator runtime が入っていること

## ライセンス

MIT
