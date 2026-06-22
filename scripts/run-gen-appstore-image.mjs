#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  createAppStoreImageRun,
  resolveAppStoreScreenshotBaseDir,
  resolveAppStoreScreenshotWorkDir
} from "./lib/appstore-image-runner.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = parseArgs(process.argv.slice(2));

if (args.help || (!args.demo && !args.inputPath)) {
  printHelp();
  process.exit(args.help ? 0 : 1);
}

const input = args.inputPath ? JSON.parse(await readFile(path.resolve(args.inputPath), "utf8")) : demoInput();
if (args.colorSchemeId) {
  input.colorSchemeId = args.colorSchemeId;
}
if (args.titles.length > 0) {
  input.slides = args.titles.map((title, index) => ({
    id: `slide-${index + 1}`,
    title
  }));
}

const { run } = await createAppStoreImageRun({ repoRoot, input });
const baseDir = resolveAppStoreScreenshotBaseDir({ repoRoot });
const workDir = resolveAppStoreScreenshotWorkDir({ repoRoot });

console.log(`AppStore image run complete: ${run.id}`);
console.log(`Generated images: ${path.join(baseDir, run.id)}`);
console.log(`Latest manifest: ${path.join(workDir, "latest.json")}`);
console.log(`Work directory: ${path.join(workDir, run.id)}`);
for (const image of run.images) {
  console.log(`- ${image.title}: ${image.url}`);
}

function parseArgs(values) {
  const parsed = {
    demo: false,
    help: false,
    inputPath: "",
    colorSchemeId: "",
    titles: []
  };

  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (value === "--demo") parsed.demo = true;
    else if (value === "--help" || value === "-h") parsed.help = true;
    else if (value === "--input") parsed.inputPath = values[++index] || "";
    else if (value === "--color-scheme") parsed.colorSchemeId = values[++index] || "";
    else if (value === "--title") parsed.titles.push(values[++index] || "");
    else throw new Error(`Unknown option: ${value}`);
  }

  return parsed;
}

function demoInput() {
  return {
    colorSchemeId: "warm",
    slides: [
      { id: "slide-1", title: "毎日の作業を、もっと軽く。" },
      { id: "slide-2", title: "必要な情報をすぐ整理" },
      { id: "slide-3", title: "続けやすい習慣を作る" },
      { id: "slide-4", title: "大事な流れを見失わない" },
      { id: "slide-5", title: "リリース前の準備も安心" }
    ]
  };
}

function printHelp() {
  console.log(`Usage:
  node scripts/run-gen-appstore-image.mjs --demo
  node scripts/run-gen-appstore-image.mjs --input input.json

Options:
  --demo                  Generate demo App Store screenshots.
  --input <path>          Read runner input JSON.
  --color-scheme <id>     Override color scheme: warm, fresh, calm, mono.
  --title <text>          Override slide titles. Repeatable.
`);
}
