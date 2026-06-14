import {spawnSync} from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const readArg = (name, fallback) => {
  const index = args.indexOf(name);
  return index === -1 ? fallback : args[index + 1];
};

const projectRoot = path.resolve(readArg("--project-root", process.cwd()));
const manifestPath = path.resolve(
  projectRoot,
  readArg("--manifest", "windows-voice/windows-voice-manifest.json"),
);
const finalDir = path.resolve(projectRoot, readArg("--final-dir", "windows-voice/final"));
const publicAudioDir = path.resolve(projectRoot, readArg("--public-audio-dir", "public/audio"));
const outputPath = path.resolve(projectRoot, readArg("--out", "public/audio/voiceover.wav"));
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const playbackRate = Number(readArg("--playback-rate", manifest.playbackRateForVideo ?? 1.25));

if (!Number.isFinite(playbackRate) || playbackRate <= 0) {
  throw new Error(`playbackRate は正の数である必要があります: ${playbackRate}`);
}

const formatRate = (value) =>
  value
    .toFixed(6)
    .replace(/0+$/u, "")
    .replace(/\.$/u, "");

const buildAtempoFilters = (rate) => {
  if (Math.abs(rate - 1) < 0.000001) return [];

  const filters = [];
  let remaining = rate;

  while (remaining > 2) {
    filters.push("atempo=2");
    remaining /= 2;
  }
  while (remaining < 0.5) {
    filters.push("atempo=0.5");
    remaining /= 0.5;
  }

  filters.push(`atempo=${formatRate(remaining)}`);
  return filters;
};

const perLineFilters = ["aresample=48000", ...buildAtempoFilters(playbackRate)];

fs.mkdirSync(publicAudioDir, {recursive: true});

const inputs = [];
const filters = [];

for (const [index, line] of manifest.lines.entries()) {
  const inputPath = path.join(finalDir, line.audioFileName);
  if (!fs.existsSync(inputPath)) {
    throw new Error(`Windows 生成音声ファイルが見つかりません: ${inputPath}`);
  }

  const normalizedPath = path.join(publicAudioDir, line.audioFileName);
  const normalize = spawnSync(
    "ffmpeg",
    [
      "-y",
      "-loglevel",
      "error",
      "-i",
      inputPath,
      "-filter:a",
      perLineFilters.join(","),
      "-ar",
      "48000",
      "-ac",
      "2",
      normalizedPath,
    ],
    {stdio: "inherit"},
  );
  if (normalize.status !== 0) {
    process.exit(normalize.status ?? 1);
  }

  inputs.push("-i", normalizedPath);
  const delayMs = Math.round((line.globalStartFrame / line.fps) * 1000);
  filters.push(`[${index}:a]adelay=${delayMs}|${delayMs}[a${index}]`);
}

const mixInputs = manifest.lines.map((_, index) => `[a${index}]`).join("");
const filterComplex = `${filters.join(";")};${mixInputs}amix=inputs=${manifest.lines.length}:normalize=0:duration=longest,alimiter=limit=0.95[a]`;

const mix = spawnSync(
  "ffmpeg",
  [
    "-y",
    "-loglevel",
    "error",
    ...inputs,
    "-filter_complex",
    filterComplex,
    "-map",
    "[a]",
    "-ar",
    "48000",
    "-ac",
    "2",
    outputPath,
  ],
  {stdio: "inherit"},
);

if (mix.status !== 0) {
  process.exit(mix.status ?? 1);
}

console.log(`voiceover を保存しました: ${outputPath} (playbackRate=${playbackRate})`);
