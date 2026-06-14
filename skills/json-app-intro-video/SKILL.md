---
name: json-app-intro-video
description: >
  構造化されたJSONから、Remotion製の高品質なアプリ紹介動画を作成・更新するスキル。
  アプリ名、枕詞、スクリーンショット、ロゴ、シーン文言、素材パスを
  4シーン構成の3Dアプリ紹介動画テンプレートへ反映する時に使う。
  data/ や output/ 配下の既存JSONを参考にした video-config.json 作成、
  別アプリへのテンプレート適用、Remotion Studioの起動、静止画チェック、
  明示依頼がある場合のみMP4出力する作業にも使う。
---

# JSON App Intro Video

Remotionプロジェクトを再利用可能な動画テンプレートとして扱い、
`src/video-config.json` をアプリごとの差し替え入力として扱う。

## 対象プロジェクト

ユーザーが指定したRemotionプロジェクトを対象にする。
指定がない場合は、現在の作業フォルダや直近の会話から対象プロジェクトを確認する。

重要なファイル:

- `src/video-config.json`: アプリごとの入力データ
- `src/<composition>.tsx`: シーン構成とJSONの紐づけ
- `src/index.css`: レイアウト、サイズ、見た目
- `public/assets/`: JSONから参照する画像素材
- `TEMPLATE_DATA.md`: テンプレート部分とアプリ固有データの整理メモ

## 入力JSONの契約

アプリごとの差し替え情報は `app.scenes` 以下に置く。

必須項目:

- `app.name`: 参照用のアプリ名
- `app.scenes.scene1.handPhoneComposite`: アプリ画面をスマホ内に合成済みの、手持ちスマホ全画面画像
- `app.scenes.scene2.titleLines`: シーン2でスマホ上に表示する見出し行
- `app.scenes.scene2.phoneScreen`: シーン2のスマホ画面画像
- `app.scenes.scene2.card.title`: 浮遊カードのタイトル
- `app.scenes.scene2.card.metrics[]`: 浮遊カードに出す数値とラベル
- `app.scenes.scene2.card.accentColors[]`: 浮遊カード下部の色バー
- `app.scenes.scene3.background`: シーン3の全画面背景画像
- `app.scenes.scene3.items[]`: 3つの機能紹介。各要素の `screen` と `title` が同じタイミングで表示される
- `app.scenes.scene4.logo`: 最後に表示するロゴまたはアプリアイコン
- `app.scenes.scene4.tagline`: アプリのカテゴリや価値を表す短い枕詞
- `app.scenes.scene4.nameText`: 最後に表示するアプリ名

画像パスはすべて Remotion の `public/` からの相対パスにする。
コード側では `staticFile()` で読み込む。

新しい設定を作る時は `assets/video-config.example.json` を雛形にする。

## 作業手順

1. 対象アプリと素材を確認する。
   実在するスクリーンショットとロゴ・アイコンを使う。ユーザーが明示しない限り、架空UIの画像は作らない。

2. 既存JSONからアプリ情報を集める。
   プロジェクトに `data/`、`output/`、`outputs/` がある場合は、アプリ名やslugで関連JSONを探して、価値提案、機能、キャッチコピー、素材URL、既存分析を参考にする。
   代表例は `data/app-content/<app>/story-pack.json`、`data/app-content/<app>/resources.json`、`output/product-analysis/<app>-app-info.json`。
   機密情報、投稿ログ、内部運用メモ、APIキー、個人情報は動画用JSONへそのまま入れない。

3. 素材を `public/assets/` に置く。
   新しいアプリでは `public/assets/<app-slug>/` のようにアプリ別フォルダを作る。

4. `src/video-config.json` を埋める。
   アプリ固有のテキスト、スクリーンショット、ロゴ、色はJSONに置く。
   汎用的な動きやレイアウトだけをコードやCSSで変更する。

5. JSONと素材パスを検証する。

```bash
node agents/skills/json-app-intro-video/scripts/validate-video-config.mjs <remotion-project>/src/video-config.json
```

6. Remotion Studioで確認する。
   Studioが起動していない場合は、対象プロジェクト内で `npx remotion studio` を起動する。
   ユーザーにはRemotion StudioのURLを渡す。

```text
http://localhost:<port>/<composition-id>
```

7. MP4はユーザーが明示的に依頼した時だけ出力する。
   必要に応じて低並列にする。

```bash
npx remotion render <composition-id> out/app-intro.mp4 --concurrency=1
```

## シーン間の関係

- シーン1は、手持ちスマホ画像にアプリ画面を合成済みにした1枚画像を使う。
  スマホ画面を差し替える必要がある場合は、先に合成済み画像を作る。
- シーン2は、見出し、メインのスマホ画面、浮遊カードをJSONから読む。
- シーン3は3つの `items` を前提にする。配列順が、スマホ画像と左側タイトルの表示順になる。
- シーン4は、ロゴ、枕詞、アプリ名をJSONから読む。

## 編集ルール

- シーンの長さ、遷移、スマホの3D移動、円形リビールなどの再利用可能な動きはテンプレート側に置く。
- スクリーンショット、ロゴ、アプリ名、枕詞、見出し、数値、色などのアプリ固有値はJSONに置く。
- JSON項目を増減したら `TEMPLATE_DATA.md` も更新する。
- ユーザーが求めていない限り、追加エディターを勝手に開かない。
- ユーザーが明示するまでMP4は出力しない。
- 変更後は、可能なら `npm run lint` と静止画チェックで確認する。
