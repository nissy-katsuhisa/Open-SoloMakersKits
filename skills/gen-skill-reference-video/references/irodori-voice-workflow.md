# Windows Irodori 音声ワークフロー

## 目的

Windows Irodori-TTS で最終ナレーションを生成し、セリフ別 WAV を基本1.25倍にしてから、Remotion で扱いやすい `public/audio/voiceover.wav` に合成する。

## 前提

- Windows ホストへ SSH 接続できる。よく使う alias は `win-gpu`。
- Windows 側に Irodori-TTS の checkout がある。よく使う場所は `D:/SSD_Agents/Irodori-TTS`。
- Remotion プロジェクトに `SCENES` を持つ `src/data/script.ts` がある。
- `src/data/script.ts` は `AUDIO_PLAYBACK_RATE` を export する。指定がなければスキル側の既定は `1.25`。
- Mac 側で正規化と合成に使う `ffmpeg` が使える。

SSH セッションで `D:` が見えない場合は、実際の Irodori root を確認し、`--remote-root` で渡す。

## ローカル manifest を作る

Remotion ワークスペースで実行する。

```bash
node /path/to/gen-skill-reference-video/scripts/build-windows-voice-manifest.mjs --project-root .
node /path/to/gen-skill-reference-video/scripts/check-windows-voice-manifest.mjs --project-root .
node /path/to/gen-skill-reference-video/scripts/build-windows-voice-remote-script.mjs --project-root . --remote-root D:/SSD_Agents/Irodori-TTS --remote-output-slug codex_<skill>_intro
```

manifest では、A の最初のセリフと B の最初のセリフを seed voice にする。以降のセリフは、同じ話者の seed を参照して生成する。

`targetDurationSeconds` は Irodori で生成する元音声の長さ、`videoDurationSeconds` は1.25倍化した後に動画上で使う長さを表す。動画全体を後から倍速にするのではなく、`mix-windows-voiceover.mjs` が `AUDIO_PLAYBACK_RATE` に合わせてセリフ別 WAV を速めてから合成する。

## Windows で実行する

生成された PowerShell をコピーして実行する。

```bash
scp windows-voice/windows-generate-voices.ps1 win-gpu:/tmp/windows-generate-voices.ps1
ssh win-gpu "powershell -NoLogo -NoProfile -ExecutionPolicy Bypass -File C:/tmp/windows-generate-voices.ps1"
```

SSH サーバーが `/tmp` を公開していない場合は、コピー先のパスを調整する。

PowerShell は次の場所へ WAV を出力する。

```text
<remote-root>/outputs/<remote-output-slug>/
```

## 音声を戻す

生成された WAV をローカルプロジェクトへコピーする。

```bash
scp 'win-gpu:<remote-root>/outputs/<remote-output-slug>/*.wav' windows-voice/final/
```

scp のパス変換が不安定な場合は、Windows 側で出力フォルダを zip 化してからコピーする。

## Remotion 用に合成する

Remotion ワークスペースで実行する。

```bash
node /path/to/gen-skill-reference-video/scripts/mix-windows-voiceover.mjs --project-root .
```

この処理は各セリフを `48kHz stereo` に正規化し、`playbackRateForVideo`、通常は `1.25`、で速めて `public/audio/` に置き、`public/audio/voiceover.wav` を作る。

Remotion composition では、次のように1本の音声を読む。

```tsx
<Audio src={staticFile("audio/voiceover.wav")} />
```
