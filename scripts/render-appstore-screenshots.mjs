#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);

let chromium;
try {
  ({ chromium } = require("playwright"));
} catch {
  console.error("playwright is not installed. Install it before running render-appstore-screenshots.");
  process.exit(2);
}

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const defaultOutputRoot = "output/app-store-screenshots";
const defaultPreviewRoot = "output/app-store-screenshot-previews";
const defaultManifestRoot = "output/app-store-screenshot-work";

const defaultBackgrounds = [
  "linear-gradient(160deg, #09090F 0%, #1D1538 52%, #071F2E 100%)",
  "linear-gradient(180deg, #08080D 0%, #10142A 48%, #051B23 100%)",
  "linear-gradient(180deg, #0A0911 0%, #2A174E 58%, #0B2135 100%)",
  "linear-gradient(160deg, #0B080E 0%, #241039 50%, #321317 100%)",
  "linear-gradient(180deg, #090B12 0%, #102640 55%, #2B205F 100%)"
];

const defaultLayout = {
  hero: { phoneWidth: 820, phoneTop: 735, copyTop: 190, headlineSize: 92 },
  "device-bottom": { phoneWidth: 800, phoneTop: 760, copyTop: 190, headlineSize: 92 },
  "device-top": { phoneWidth: 780, phoneTop: 130, copyTop: 2195, headlineSize: 88 }
};

const options = parseArgs(process.argv.slice(2));
const outputRoot = path.resolve(repoRoot, options.outputRoot);
const previewRoot = path.resolve(repoRoot, options.previewRoot);
const manifestRoot = path.resolve(repoRoot, options.manifestRoot);
const planPath = path.resolve(repoRoot, options.plan);
const plan = JSON.parse(await readFile(planPath, "utf8"));
const runId = options.runId || await readLatestRunId(manifestRoot) || formatRunTimestamp(new Date());
const finalDir = path.join(outputRoot, runId);
const previewDir = path.join(previewRoot, runId);
const runManifestDir = path.join(manifestRoot, runId);

await mkdir(finalDir, { recursive: true });
await mkdir(previewDir, { recursive: true });
await mkdir(runManifestDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1320, height: 2868 }, deviceScaleFactor: 1 });

for (const [index, slide] of plan.slides.entries()) {
  const fileName = imageFileName(index, options.fileSuffix);
  const screenPath = resolveScreenPath(slide.screen_path, outputRoot);
  const screenUrl = await imageDataUrl(screenPath);
  const html = slideHtml({
    slide,
    index,
    screenUrl,
    background: defaultBackgrounds[index % defaultBackgrounds.length],
    options
  });

  await page.setViewportSize({ width: 1320, height: 2868 });
  await page.setContent(html, { waitUntil: "networkidle" });
  await page.screenshot({ path: path.join(finalDir, fileName), type: "png", fullPage: false });
}

const contactItems = [];
for (const [index, slide] of plan.slides.entries()) {
  const fileName = imageFileName(index, options.fileSuffix);
  contactItems.push({
    label: `${String(index + 1).padStart(2, "0")} ${slide.label || slide.screen_slug}`,
    url: await imageDataUrl(path.join(finalDir, fileName))
  });
}
const contactSheetName = contactSheetFileName(options.fileSuffix);
await renderContactSheet(page, contactItems, path.join(previewDir, contactSheetName));
await browser.close();

await updateManifests({
  outputRoot,
  previewRoot,
  manifestRoot,
  runManifestDir,
  runId,
  plan,
  options
});

console.log(`Rendered ${plan.slides.length} screenshots to ${path.relative(repoRoot, finalDir)}`);

function parseArgs(values) {
  const parsed = {
    plan: path.join(defaultOutputRoot, "screenshot-plan.json"),
    outputRoot: defaultOutputRoot,
    previewRoot: defaultPreviewRoot,
    manifestRoot: defaultManifestRoot,
    runId: "",
    phoneScale: 1.12,
    headlineWeight: 700,
    showCounters: false,
    phoneYOffsetBySlide: {},
    fileSuffix: ""
  };

  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (value === "--plan") parsed.plan = values[++index] || parsed.plan;
    else if (value === "--output-root") parsed.outputRoot = values[++index] || parsed.outputRoot;
    else if (value === "--preview-root") parsed.previewRoot = values[++index] || parsed.previewRoot;
    else if (value === "--manifest-root") parsed.manifestRoot = values[++index] || parsed.manifestRoot;
    else if (value === "--run-id") parsed.runId = values[++index] || "";
    else if (value === "--phone-scale") parsed.phoneScale = Number(values[++index] || parsed.phoneScale);
    else if (value === "--headline-weight") parsed.headlineWeight = Number(values[++index] || parsed.headlineWeight);
    else if (value === "--file-suffix") parsed.fileSuffix = normalizeFileSuffix(values[++index] || "");
    else if (value === "--show-counters") parsed.showCounters = true;
    else if (value === "--phone-y") {
      const [rawOrder, rawOffset] = String(values[++index] || "").split(":");
      const order = Number(rawOrder);
      const offset = Number(rawOffset);
      if (Number.isFinite(order) && Number.isFinite(offset)) {
        parsed.phoneYOffsetBySlide[order] = offset;
      }
    } else if (value === "--help" || value === "-h") {
      printHelp();
      process.exit(0);
    } else {
      throw new Error(`Unknown option: ${value}`);
    }
  }

  if (!Number.isFinite(parsed.phoneScale) || parsed.phoneScale <= 0) {
    throw new Error("--phone-scale must be a positive number.");
  }
  if (!Number.isFinite(parsed.headlineWeight) || parsed.headlineWeight <= 0) {
    throw new Error("--headline-weight must be a positive number.");
  }

  return parsed;
}

function printHelp() {
  console.log(`Usage:
  node scripts/render-appstore-screenshots.mjs
  node scripts/render-appstore-screenshots.mjs --phone-scale 1.12 --phone-y 1:-80 --phone-y 2:-80

Options:
  --plan <path>             screenshot-plan.json path
  --output-root <path>      output root, default output/app-store-screenshots
  --preview-root <path>     confirmation image root, default output/app-store-screenshot-previews
  --manifest-root <path>    manifest/work root, default output/app-store-screenshot-work
  --run-id <id>             datetime output folder id; defaults to latest.json id
  --phone-scale <number>    phone width scale, default 1.12
  --headline-weight <num>   headline font weight, default 700
  --file-suffix <suffix>    append suffix to PNG names, e.g. 01-20260619-2015.png
  --phone-y <order:offset>  per-slide phone y offset in px; repeatable
  --show-counters           render slide counters; hidden by default
`);
}

function normalizeFileSuffix(value) {
  return String(value || "")
    .trim()
    .replace(/[^A-Za-z0-9_-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

function imageFileName(index, fileSuffix = "") {
  const order = String(index + 1).padStart(2, "0");
  return fileSuffix ? `${order}-${fileSuffix}.png` : `${order}.png`;
}

function contactSheetFileName(fileSuffix = "") {
  return fileSuffix ? `contact-sheet-${fileSuffix}.png` : "contact-sheet.png";
}

async function readLatestRunId(manifestRootPath) {
  try {
    const latest = JSON.parse(await readFile(path.join(manifestRootPath, "latest.json"), "utf8"));
    return latest.id || "";
  } catch (error) {
    if (error?.code === "ENOENT") return "";
    throw error;
  }
}

function resolveScreenPath(screenPath, outputRootPath) {
  if (!screenPath) {
    throw new Error("Every slide must include screen_path.");
  }
  if (path.isAbsolute(screenPath)) return screenPath;

  const normalized = screenPath.split(path.sep).join("/");
  const outputRootRelative = path.relative(repoRoot, outputRootPath).split(path.sep).join("/");
  if (normalized.startsWith(`${outputRootRelative}/`)) {
    return path.resolve(repoRoot, normalized);
  }

  return path.resolve(outputRootPath, normalized.replace(/^output\/app-store-screenshots\//, ""));
}

async function imageDataUrl(filePath) {
  const buffer = await readFile(filePath);
  return `data:${mimeTypeForImage(filePath)};base64,${buffer.toString("base64")}`;
}

function mimeTypeForImage(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".webp") return "image/webp";
  if (ext === ".svg") return "image/svg+xml";
  return "image/png";
}

function slideHtml({ slide, index, screenUrl, background, options: renderOptions }) {
  const layoutName = defaultLayout[slide.layout] ? slide.layout : "device-bottom";
  const layout = defaultLayout[layoutName];
  const order = Number(slide.order || index + 1);
  const phoneWidth = Math.round(layout.phoneWidth * renderOptions.phoneScale);
  const phoneHeight = Math.round((phoneWidth * 2622) / 1206);
  const phoneTop = layout.phoneTop + (renderOptions.phoneYOffsetBySlide[order] || 0);
  const labelColor = index === 3 ? "#53D9FF" : "#24D0FF";
  const counter = renderOptions.showCounters ? `<p class="counter">${order} / ${plan.slides.length}</p>` : "";

  return `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8" />
<style>
  * { box-sizing: border-box; }
  html, body { margin: 0; width: 1320px; height: 2868px; overflow: hidden; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Hiragino Sans", "Noto Sans JP", Arial, sans-serif;
    background: ${background};
    color: #FFFFFF;
    letter-spacing: 0;
  }
  .stage { position: relative; width: 1320px; height: 2868px; overflow: hidden; }
  .stage::before {
    content: "";
    position: absolute;
    inset: 0;
    background:
      linear-gradient(125deg, rgba(155, 92, 255, 0.28), transparent 34%),
      linear-gradient(300deg, rgba(33, 200, 246, 0.20), transparent 40%);
    opacity: 0.85;
  }
  .stage::after {
    content: "";
    position: absolute;
    inset: 0;
    background: linear-gradient(90deg, rgba(255,255,255,0.05), transparent 20%, transparent 80%, rgba(255,255,255,0.04));
    mix-blend-mode: screen;
    opacity: 0.55;
  }
  .copy {
    position: absolute;
    z-index: 3;
    left: 92px;
    right: 92px;
    top: ${layout.copyTop}px;
    text-align: center;
  }
  .label {
    margin: 0 0 28px;
    color: ${labelColor};
    font-size: 27px;
    line-height: 1.1;
    font-weight: 760;
    text-transform: uppercase;
  }
  .headline {
    margin: 0;
    color: #FFFFFF;
    font-size: ${layout.headlineSize}px;
    line-height: 1.12;
    font-weight: ${renderOptions.headlineWeight};
    white-space: pre-line;
    text-wrap: balance;
    text-shadow: 0 4px 18px rgba(0,0,0,0.34);
  }
  .counter {
    margin-top: 24px;
    font-size: 30px;
    font-weight: 700;
    color: rgba(255,255,255,0.54);
  }
  .phone {
    position: absolute;
    z-index: 2;
    width: ${phoneWidth}px;
    height: ${phoneHeight}px;
    left: ${(1320 - phoneWidth) / 2}px;
    top: ${phoneTop}px;
    padding: 18px;
    border-radius: ${Math.round(92 * 1.1)}px;
    background: linear-gradient(145deg, #1D1D22, #030305 56%, #4E4760);
    box-shadow:
      0 42px 86px rgba(0,0,0,0.44),
      0 0 0 2px rgba(255,255,255,0.10),
      0 0 0 6px rgba(155, 92, 255, 0.16);
  }
  .screen {
    width: 100%;
    height: 100%;
    border-radius: ${Math.round(72 * 1.1)}px;
    overflow: hidden;
    background: #050505;
  }
  .screen img { width: 100%; height: 100%; display: block; }
  .home-indicator {
    position: absolute;
    left: 50%;
    bottom: 34px;
    width: 252px;
    height: 10px;
    transform: translateX(-50%);
    border-radius: 999px;
    background: rgba(255,255,255,0.38);
  }
</style>
</head>
<body>
  <main class="stage">
    <section class="copy">
      <p class="label">${escapeHtml(slide.label || "")}</p>
      <h1 class="headline">${escapeHtml(slide.headline || "")}</h1>
      ${counter}
    </section>
    <figure class="phone" aria-label="${escapeHtml(slide.screen_slug || "")}">
      <div class="screen"><img src="${screenUrl}" alt="" /></div>
      <div class="home-indicator"></div>
    </figure>
  </main>
</body>
</html>`;
}

async function renderContactSheet(page, items, outputPath) {
  await page.setViewportSize({ width: 2976, height: 1348 });
  const cards = items.map((item) => `
    <div class="card">
      <img src="${item.url}" alt="" />
      <div>${escapeHtml(item.label)}</div>
    </div>`).join("");

  await page.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>
    * { box-sizing: border-box; }
    html, body { margin: 0; width: 2976px; height: 1348px; overflow: hidden; background: #101010; color: white; font-family: -apple-system, BlinkMacSystemFont, "Hiragino Sans", sans-serif; letter-spacing: 0; }
    .sheet { display: grid; grid-template-columns: repeat(5, 1fr); gap: 44px; padding: 56px; height: 100%; }
    .card { min-width: 0; }
    img { width: 100%; height: 1120px; object-fit: cover; object-position: top center; display: block; background: #000; }
    div div { margin-top: 20px; font-size: 32px; font-weight: 800; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  </style></head><body><main class="sheet">${cards}</main></body></html>`, { waitUntil: "networkidle" });
  await page.screenshot({ path: outputPath, type: "png", fullPage: false });
}

async function updateManifests({
  outputRoot: outputRootPath,
  previewRoot: previewRootPath,
  manifestRoot: manifestRootPath,
  runManifestDir: runManifestDirectory,
  runId: currentRunId,
  plan: screenshotPlan,
  options: renderOptions
}) {
  const manifestPaths = [
    path.join(manifestRootPath, "latest.json"),
    path.join(runManifestDirectory, "manifest.json")
  ];

  for (const manifestPath of manifestPaths) {
    let manifest = {};
    try {
      manifest = JSON.parse(await readFile(manifestPath, "utf8"));
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }

    manifest.id = manifest.id || currentRunId;
    manifest.skillId = manifest.skillId || "gen-appstore-image";
    manifest.status = "complete";
    manifest.updatedAt = new Date().toISOString();
    manifest.renderer = "scripts/render-appstore-screenshots.mjs";
    manifest.fileSuffix = renderOptions.fileSuffix || "";
    manifest.contactSheet = {
      fileName: contactSheetFileName(renderOptions.fileSuffix),
      path: path.join("output/app-store-screenshot-previews", currentRunId, contactSheetFileName(renderOptions.fileSuffix)),
      url: `/output/app-store-screenshot-previews/${currentRunId}/${contactSheetFileName(renderOptions.fileSuffix)}`
    };
    manifest.renderAdjustments = {
      headlineWeight: renderOptions.headlineWeight,
      phoneScale: renderOptions.phoneScale,
      phoneYOffsetBySlide: renderOptions.phoneYOffsetBySlide,
      removedSlideCounters: !renderOptions.showCounters
    };
    manifest.outputRoot = "output/app-store-screenshots";
    manifest.previewRoot = "output/app-store-screenshot-previews";
    manifest.workRoot = "output/app-store-screenshot-work";
    manifest.finalAssetsPath = path.join("output/app-store-screenshots", currentRunId);
    delete manifest.canonicalFinalAssetsPath;
    manifest.images = screenshotPlan.slides.map((slide, index) => {
      const fileName = imageFileName(index, renderOptions.fileSuffix);
      return {
        id: slide.screen_slug,
        title: String(slide.headline || "").replace(/\n/g, " "),
        label: slide.label,
        goal: slide.goal,
        fileName,
        url: `/output/app-store-screenshots/${currentRunId}/${fileName}`,
        path: path.join("output/app-store-screenshots", currentRunId, fileName),
        sourceScreenPath: slide.screen_path
      };
    });

    await mkdir(path.dirname(manifestPath), { recursive: true });
    await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;");
}

function formatRunTimestamp(date) {
  return date.toISOString().replace(/[-:]/g, "").replace(/\..+/, "").replace("T", "-");
}
