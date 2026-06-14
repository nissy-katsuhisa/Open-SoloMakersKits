---
name: gen-skill-reference-video
description: Codex skill を紹介する短い Remotion 参考動画を作成・更新する。ストーリーボード、実際のスキル画像や生成物、2人会話、Windows Irodori-TTS 音声生成、基本1.25倍の Remotion 用単一 voiceover 合成、MP4 書き出し、明示指定がない限りサムネイルなしの納品まで扱う。GenFeedPosts 風のスキル紹介動画、参考動画、デモ動画、解説動画、OpenSoloMakersKits のスキル動画生成フローを作るときに使う。
---

# Gen Skill Reference Video

## 基本フロー

計画だけで終わらせず、実際に見られる参考動画まで作る。

1. 対象スキルを特定し、`SKILL.md`、主要な参照資料、スクリプト、既存の解説画像があれば読む。
2. `<skill-name>-remotion-video` のような名前で Remotion ワークスペースを作る、または既存のものを再利用する。
3. 16:9 の短い解説動画にする。構成は「課題」「なぜスキルが必要か」「スキルの流れ」「具体的な生成結果」「CTA」を基本にする。
4. スクリーンショット、フロー画像、生成結果、アイコンなど、スキル由来の実素材を使う。汎用的なストック風素材だけで組まない。
5. ユーザー指定がなければ、60〜90秒程度の11シーン構成を基本にする。
6. 必要に応じて2人の話者を使う。Aは学習者・利用者、Bは案内役・解説者にする。
7. 利用可能、またはユーザーが希望している場合、最終音声は Windows Irodori-TTS で作る。ユーザーが仮音声として承認していない限り、macOS `say` 音声を最終版として納品しない。
8. 基本の音声速度は1.25倍にする。Irodori でセリフ別音声を生成し、Remotion レンダリング前に `public/audio/voiceover.wav` 側で1.25倍化してから動画を組む。
9. 最終成果物は MP4 とする。ユーザーが明示的に求めない限り、サムネイルは作らず、残さない。

Remotion コードを作成・編集するときは、利用可能ならローカルの `remotion-best-practices` スキルも読み込む。

## ストーリーボード

次の流れを基本にし、対象スキルに合わせて文言を調整する。

1. フック: アプリ・スキル・成果物を作った後に起きる具体的な悩みを見せる。
2. Before: 手作業の重さ、または繰り返し起きる失敗を見せる。
3. Risk: 小さいが痛い品質問題を見せる。
4. Skill reveal: スキル名、必要なら公式アイコンやプロダクトアイコン、1行の価値を見せる。
5. Flow: 入力から最終成果物までを4〜6ステップで見せる。
6. Planning: structured plan や source of truth になるファイルを見せる。
7. Validation: スキルが失敗をどう防ぐかを見せる。
8. Alignment / polish: 出力を揃えるためのルールを見せる。
9. Result: 生成結果をまとめて見せる。
10. Summary: 効能を3つのコンパクトなカードでまとめる。
11. CTA: OpenSoloMakersKits、またはインストール・ダウンロード導線を示す。

見た目の作り方は `references/remotion-video-workflow.md` を読む。

## 音声

最終音声は `references/irodori-voice-workflow.md` の Windows Irodori フローで作る。

Remotion 側の台本データは、次の形を前提にする。

- `src/data/script.ts` が `FPS`、`AUDIO_PLAYBACK_RATE`、`SCENES` を export する。`AUDIO_PLAYBACK_RATE` は原則 `1.25` にする。
- 各 scene は `durationInFrames`、`id`、`lines` を持つ。
- 各 line は `audioSrc`、`durationInFrames`、`speaker`、`startFrame`、`text` を持つ。

`scripts/` の同梱スクリプトを使い、Irodori 用 manifest と voiceover を作る。

```bash
node /path/to/gen-skill-reference-video/scripts/build-windows-voice-manifest.mjs --project-root .
node /path/to/gen-skill-reference-video/scripts/check-windows-voice-manifest.mjs --project-root .
node /path/to/gen-skill-reference-video/scripts/build-windows-voice-remote-script.mjs --project-root . --remote-output-slug codex_<skill>_intro
```

Windows Irodori から `windows-voice/final/` にセリフ別 WAV が戻ったら、1本に合成する。

```bash
node /path/to/gen-skill-reference-video/scripts/mix-windows-voiceover.mjs --project-root .
```

この合成時に `AUDIO_PLAYBACK_RATE` に合わせて音声を速める。映像全体を後から倍速にするのではなく、速めた音声に合わせて Remotion の scene / line duration を組む。

Remotion composition では、次のように1本の音声だけを読む形を優先する。

```tsx
<Audio src={staticFile("audio/voiceover.wav")} />
```

セリフごとに多数の `<Audio>` を置くと、Remotion が音声解析を何度も走らせ、環境によってはプロセス上限に当たりやすい。

## 検証

納品前に確認する。

- TypeScript がある場合は型チェックを通す。
- フック、スキル名表示、生成結果、CTA の静止フレームをレンダリングする。
- 静止フレームを目視し、重なり、読みにくい文字、欠けた素材がないか確認する。
- マシンがプロセス上限に当たりやすい場合は、低並列でレンダリングする。
- MP4 が H.264 映像、AAC 音声、`1920x1080`、想定尺になっていることを確認する。
- ユーザーが求めていない限り、`out/` の一時的な静止画 PNG は削除する。
- 絶対パスの MP4 を返し、ローカルメディア表示に対応しているクライアントでは Markdown の画像・動画記法で埋め込む。
