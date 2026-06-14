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
const outputPath = path.resolve(
  projectRoot,
  readArg("--out", "windows-voice/windows-generate-voices.ps1"),
);
const remoteRoot = readArg("--remote-root", "D:/SSD_Agents/Irodori-TTS");
const remoteOutputSlug = readArg("--remote-output-slug", "codex_skill_reference_video");
const remoteOutputDir = `${remoteRoot}/outputs/${remoteOutputSlug}`;
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

const quotePs = (value) => `'${String(value).replace(/'/g, "''")}'`;

const secondsForLine = (line) => {
  const target = Number(line.targetDurationSeconds ?? 0);
  return Math.max(2.4, Math.min(8.0, Math.round((target || 3.2) * 10) / 10));
};

const seedCaptionBySpeaker = {
  A: manifest.seedVoices.A.irodoriCaption,
  B: manifest.seedVoices.B.irodoriCaption,
};

const referenceFileBySpeaker = {
  A: manifest.seedVoices.A.referenceFileName,
  B: manifest.seedVoices.B.referenceFileName,
};

const renderCommand = (line) => {
  const remoteOutput =
    line.role === "seed"
      ? `${remoteOutputDir}/${referenceFileBySpeaker[line.speaker]}`
      : `${remoteOutputDir}/${line.audioFileName}`;
  const refPath =
    line.role === "seed"
      ? null
      : `${remoteOutputDir}/${referenceFileBySpeaker[line.speaker]}`;

  const baseArgs = [
    ".\\.venv\\Scripts\\python.exe",
    "infer.py",
    "--hf-checkpoint",
    line.role === "seed"
      ? "Aratako/Irodori-TTS-500M-v2-VoiceDesign"
      : "Aratako/Irodori-TTS-500M-v3",
    "--text",
    line.text,
    "--model-device",
    "cuda",
    "--codec-device",
    "cuda",
    "--num-steps",
    "16",
    "--seconds",
    secondsForLine(line).toFixed(1),
    "--output-wav",
    remoteOutput,
  ];

  if (line.role === "seed") {
    baseArgs.push("--caption", seedCaptionBySpeaker[line.speaker], "--no-ref");
  } else {
    baseArgs.push("--ref-wav", refPath);
  }

  const commands = [
    `Invoke-Irodori ${quotePs(line.lineId)} @(${baseArgs.map(quotePs).join(", ")})`,
  ];

  if (line.role === "seed") {
    commands.push(
      `Copy-Item -LiteralPath ${quotePs(remoteOutput)} -Destination ${quotePs(
        `${remoteOutputDir}/${line.audioFileName}`,
      )} -Force`,
    );
  }

  return commands.join("\n");
};

const script = `Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$remoteRepoRoot = ${quotePs(remoteRoot)}
$remoteOutputDir = ${quotePs(remoteOutputDir)}

Set-Location $remoteRepoRoot
New-Item -ItemType Directory -Force $remoteOutputDir | Out-Null

function Invoke-Irodori {
  param(
    [string]$Label,
    [string[]]$CommandParts
  )

  Write-Host "=== ${"$"}Label ===" -ForegroundColor Cyan
  Write-Host ($CommandParts -join " ") -ForegroundColor DarkGray

  if ($CommandParts.Length -eq 0) {
    throw "CommandParts は空にできません。"
  }

  $executable = $CommandParts[0]
  if ($CommandParts.Length -eq 1) {
    & $executable
    return
  }

  $tail = $CommandParts[1..($CommandParts.Length - 1)]
  & $executable @tail
}

${manifest.lines.map(renderCommand).join("\n")}

Write-Host "${manifest.lines.length} 個の音声ファイルを生成しました: ${"$"}remoteOutputDir" -ForegroundColor Green
`;

fs.mkdirSync(path.dirname(outputPath), {recursive: true});
fs.writeFileSync(outputPath, Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from(script, "utf8")]));
console.log(`Windows 実行用 PowerShell を書き出しました: ${outputPath}`);
