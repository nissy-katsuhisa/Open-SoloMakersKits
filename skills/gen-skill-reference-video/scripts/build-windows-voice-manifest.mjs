import fs from "node:fs";
import {createRequire} from "node:module";
import path from "node:path";
import vm from "node:vm";

const args = process.argv.slice(2);

const readArg = (name, fallback) => {
  const index = args.indexOf(name);
  return index === -1 ? fallback : args[index + 1];
};

const projectRoot = path.resolve(readArg("--project-root", process.cwd()));
const sourcePath = path.resolve(projectRoot, readArg("--source", "src/data/script.ts"));
const outputPath = path.resolve(
  projectRoot,
  readArg("--out", "windows-voice/windows-voice-manifest.json"),
);

const projectRequire = createRequire(path.join(projectRoot, "package.json"));
const ts = projectRequire("typescript");

const speakerProfiles = {
  A: {
    cloneCaption:
      "自然な日本語の男性ナレーション。落ち着きつつ親しみがあり、説明動画として聞き取りやすく読む。",
    cloneReferenceFile: "seed/A_ref.wav",
    displayName: "話者A",
    irodoriCaption:
      "自然な日本語の男性ナレーションで、個人開発者向けの解説動画として、落ち着きがありつつテンポよく、明瞭に読み上げてください。",
    referenceFileName: "A_ref.wav",
  },
  B: {
    cloneCaption:
      "自然な日本語の女性ナレーション。明るく安心感があり、説明動画として聞き取りやすく読む。",
    cloneReferenceFile: "seed/B_ref.wav",
    displayName: "話者B",
    irodoriCaption:
      "自然な日本語の女性ナレーションで、個人開発者向けの解説動画として、明るく親しみやすく、明瞭に読み上げてください。",
    referenceFileName: "B_ref.wav",
  },
};

const loadScriptModule = () => {
  const source = fs.readFileSync(sourcePath, "utf8");
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
    fileName: sourcePath,
  }).outputText;

  const module = {exports: {}};
  const context = vm.createContext({
    exports: module.exports,
    module,
    require: projectRequire,
  });

  vm.runInContext(transpiled, context, {filename: sourcePath});
  return module.exports;
};

const buildManifest = () => {
  const {AUDIO_PLAYBACK_RATE = 1.25, FPS, SCENES} = loadScriptModule();
  if (!FPS || !Array.isArray(SCENES)) {
    throw new Error("src/data/script.ts は FPS と SCENES を export している必要があります。");
  }

  const seedBySpeaker = new Map();
  const lines = [];
  let sceneStartFrame = 0;

  for (const scene of SCENES) {
    for (const line of scene.lines ?? []) {
      const profile = speakerProfiles[line.speaker];
      if (!profile) {
        throw new Error(`未対応の話者です: ${line.speaker}`);
      }

      const role = seedBySpeaker.has(line.speaker) ? "clone-target" : "seed";
      const audioFileName = path.basename(line.audioSrc);
      const globalStartFrame = sceneStartFrame + line.startFrame;
      const videoDurationSeconds = Number((line.durationInFrames / FPS).toFixed(3));
      const targetDurationSeconds = Number(
        (videoDurationSeconds * AUDIO_PLAYBACK_RATE).toFixed(3),
      );

      const entry = {
        audioFileName,
        audioSrc: line.audioSrc,
        cloneCaption: role === "seed" ? null : profile.cloneCaption,
        durationInFrames: line.durationInFrames,
        finalOutputPath: `final/${audioFileName}`,
        fps: FPS,
        globalStartFrame,
        lineId: `${scene.id}:${path.basename(audioFileName, ".wav")}`,
        playbackRateForVideo: AUDIO_PLAYBACK_RATE,
        rawOutputPath: `raw/${audioFileName}`,
        referenceAudioPath: role === "seed" ? null : profile.cloneReferenceFile,
        role,
        sceneId: scene.id,
        speaker: line.speaker,
        speakerDisplayName: profile.displayName,
        startFrame: line.startFrame,
        targetDurationSeconds,
        text: line.text,
        videoDurationSeconds,
      };

      lines.push(entry);

      if (role === "seed") {
        seedBySpeaker.set(line.speaker, {
          audioFileName,
          lineId: entry.lineId,
          referenceFileName: profile.referenceFileName,
          sceneId: scene.id,
          text: line.text,
        });
      }
    }
    sceneStartFrame += scene.durationInFrames;
  }

  return {
    manifestVersion: 1,
    notes: [
      "A/B の seed voice を先に生成する。",
      "clone-target のセリフは、同じ話者の seed だけを参照する。",
      "Windows 側でセリフ別 WAV を作り、Mac 側で playbackRateForVideo に合わせて音声を速めてから public/audio/voiceover.wav に合成する。",
    ],
    playbackRateForVideo: AUDIO_PLAYBACK_RATE,
    seedVoices: {
      A: {
        cloneReferencePath: speakerProfiles.A.cloneReferenceFile,
        irodoriCaption: speakerProfiles.A.irodoriCaption,
        ...seedBySpeaker.get("A"),
      },
      B: {
        cloneReferencePath: speakerProfiles.B.cloneReferenceFile,
        irodoriCaption: speakerProfiles.B.irodoriCaption,
        ...seedBySpeaker.get("B"),
      },
    },
    sourceOfTruth: path.relative(projectRoot, sourcePath),
    windowsOutputLayout: {
      final: "windows-voice/final",
      raw: "windows-voice/raw",
      seed: "windows-voice/seed",
    },
    lines,
  };
};

fs.mkdirSync(path.dirname(outputPath), {recursive: true});
fs.writeFileSync(outputPath, `${JSON.stringify(buildManifest(), null, 2)}\n`, "utf8");
console.log(`Windows 音声 manifest を保存しました: ${outputPath}`);
