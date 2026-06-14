# Remotion 動画ワークフロー

## ワークスペース

現在のプロジェクト配下に、独立したワークスペースを作る。

```text
workspaces/<skill-name>-remotion-video/
```

生成した MP4 は `out/` に置く。画像素材は `public/images/`、最終音声は `public/audio/voiceover.wav` に置く。

## package scripts

次のような scripts を用意する。

```json
{
  "studio": "remotion studio src/index.ts",
  "render": "remotion render src/index.ts SkillReferenceIntro out/skill-reference-intro.mp4",
  "still": "remotion still src/index.ts SkillReferenceIntro out/frame-check.png --frame=30 --scale=0.5"
}
```

ユーザーが求めない限り、サムネイル生成用 script は追加しない。

## Composition

基本設定は次の通り。

- `1920x1080`
- `30fps`
- 白背景、または控えめで作業向きの背景
- スキル由来の実素材を主役にする
- 会話形式にする場合は、下部に話者アバターと吹き出しを置く

960px幅程度のプレビューでも読める文字サイズにする。本文は通常ウェイトを基本にし、太字はタイトル、ラベル、シーン見出し、番号バッジに絞る。

## 素材

動画で必要な素材だけをコピーする。

- スキル解説フロー画像
- 生成スクリーンショットや出力例
- プロダクト・アプリのアイコン
- CTA で使う場合は OpenSoloMakersKits / GitHub アイコン

プラットフォーム公式アイコンを求められた場合は、提供された素材、またはローカルに存在する公式アセットを優先する。ワークスペース内で素材の出どころが分かるようにしておく。

## レンダリング

本番レンダリング前に、数枚の静止フレームで確認する。

```bash
npx remotion still src/index.ts SkillReferenceIntro out/reveal-check.png --frame=<frame> --scale=0.5 --log=error
```

その後、MP4を書き出す。

```bash
npx remotion render src/index.ts SkillReferenceIntro out/skill-reference-intro.mp4 --concurrency=1 --log=error
```

音声解析や Chrome プロセスでプロセス上限に当たる環境では、`--concurrency=1` を使う。
