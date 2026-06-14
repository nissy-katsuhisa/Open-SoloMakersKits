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
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const errors = [];

const playbackRate = Number(manifest.playbackRateForVideo ?? 1.25);
if (!Number.isFinite(playbackRate) || playbackRate <= 0) {
  errors.push(`playbackRateForVideo は正の数である必要があります: ${manifest.playbackRateForVideo}`);
}

const seedLines = manifest.lines.filter((line) => line.role === "seed");
const cloneLines = manifest.lines.filter((line) => line.role === "clone-target");

if (seedLines.length !== 2) {
  errors.push(`seed セリフは2本必要ですが、${seedLines.length}本でした。`);
}

for (const speaker of ["A", "B"]) {
  const speakerSeed = manifest.seedVoices?.[speaker];
  if (!speakerSeed?.referenceFileName) {
    errors.push(`話者 ${speaker} の seed voice メタデータがありません。`);
  }

  const speakerLines = manifest.lines.filter((line) => line.speaker === speaker);
  if (speakerLines.length === 0) {
    errors.push(`話者 ${speaker} のセリフがありません。`);
  }

  for (const line of speakerLines) {
    if (line.role === "clone-target" && !line.referenceAudioPath) {
      errors.push(`clone-target ${line.lineId} に referenceAudioPath がありません。`);
    }
    if (
      line.role === "clone-target" &&
      line.referenceAudioPath !== speakerSeed?.cloneReferencePath
    ) {
      errors.push(
        `clone-target ${line.lineId} の参照先が ${line.referenceAudioPath} です。期待値は ${speakerSeed?.cloneReferencePath} です。`,
      );
    }
    if (typeof line.globalStartFrame !== "number") {
      errors.push(`セリフ ${line.lineId} に globalStartFrame がありません。`);
    }
    if (typeof line.targetDurationSeconds !== "number") {
      errors.push(`セリフ ${line.lineId} に targetDurationSeconds がありません。`);
    }
  }
}

const seenNames = new Set();
const duplicateNames = new Set();
for (const line of manifest.lines) {
  if (seenNames.has(line.audioFileName)) {
    duplicateNames.add(line.audioFileName);
  }
  seenNames.add(line.audioFileName);
}
if (duplicateNames.size > 0) {
  errors.push(`重複している音声ファイル名があります: ${Array.from(duplicateNames).join(", ")}`);
}

if (errors.length > 0) {
  console.error("Windows 音声 manifest のチェックに失敗しました:");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log("Windows 音声 manifest のチェックに成功しました。");
console.log(
  JSON.stringify(
    {
      cloneTargets: cloneLines.length,
      seeds: seedLines.length,
      speakers: {
        A: manifest.lines.filter((line) => line.speaker === "A").length,
        B: manifest.lines.filter((line) => line.speaker === "B").length,
      },
      playbackRateForVideo: playbackRate,
    },
    null,
    2,
  ),
);
