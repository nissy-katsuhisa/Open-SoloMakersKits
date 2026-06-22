import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export const APPSTORE_SCREENSHOT_OUTPUT_ROOT = "output/app-store-screenshots";
export const APPSTORE_SCREENSHOT_PUBLIC_BASE = "/output/app-store-screenshots";
export const APPSTORE_SCREENSHOT_WORK_ROOT = "output/app-store-screenshot-work";

export const COLOR_SCHEMES = {
  warm: {
    id: "warm",
    label: "Warm Yellow",
    background: "#fff7df",
    primary: "#ffc447",
    secondary: "#ff3b25",
    surface: "#ffffff",
    text: "#2f343a"
  },
  fresh: {
    id: "fresh",
    label: "Fresh Green",
    background: "#effaf2",
    primary: "#2d9f68",
    secondary: "#ffc447",
    surface: "#ffffff",
    text: "#24342d"
  },
  calm: {
    id: "calm",
    label: "Calm Blue",
    background: "#eef6ff",
    primary: "#3977d6",
    secondary: "#7dd3fc",
    surface: "#ffffff",
    text: "#263447"
  },
  mono: {
    id: "mono",
    label: "Mono",
    background: "#f4f5f7",
    primary: "#2f343a",
    secondary: "#ffc447",
    surface: "#ffffff",
    text: "#2f343a"
  }
};

export const DEFAULT_APPSTORE_SLIDES = [
  {
    id: "slide-1",
    title: "毎日の作業を、もっと軽く。"
  },
  {
    id: "slide-2",
    title: "必要な情報をすぐ整理"
  },
  {
    id: "slide-3",
    title: "続けやすい習慣を作る"
  },
  {
    id: "slide-4",
    title: "大事な流れを見失わない"
  },
  {
    id: "slide-5",
    title: "リリース前の準備も安心"
  }
];

const DATA_URL_PATTERN = /^data:image\/(?:png|jpe?g|webp|svg\+xml);base64,[A-Za-z0-9+/=]+$/;

export function normalizeAppStoreImageInput(input = {}) {
  const colorSchemeId = COLOR_SCHEMES[input.colorSchemeId] ? input.colorSchemeId : "warm";
  const incomingSlides = Array.isArray(input.slides) && input.slides.length > 0 ? input.slides : DEFAULT_APPSTORE_SLIDES;
  const slides = incomingSlides.map((slide, index) => normalizeSlide(slide, index));

  return {
    colorSchemeId,
    colorScheme: COLOR_SCHEMES[colorSchemeId],
    slides
  };
}

export function buildScreenshotPlan(input = {}) {
  const normalized = normalizeAppStoreImageInput(input);
  return {
    schema: "app-store-screenshots/editor-v1",
    app_name: "OpenSoloMakersKits App",
    target_stores: ["apple-app-store"],
    devices: ["iphone-6.9"],
    locales: ["ja"],
    brand: {
      color_scheme: normalized.colorSchemeId,
      background_color: normalized.colorScheme.background,
      primary_color: normalized.colorScheme.primary,
      secondary_color: normalized.colorScheme.secondary,
      foreground_color: normalized.colorScheme.text
    },
    slides: normalized.slides.map((slide, index) => ({
      order: index + 1,
      screen_slug: slide.id,
      headline: slide.title,
      label: `Slide ${index + 1}`,
      layout: "device-bottom",
      visual_tone: normalized.colorScheme.label,
      background_direction: "single color scheme with a centered phone capture",
      has_uploaded_phone_image: Boolean(slide.phoneImage?.dataUrl)
    }))
  };
}

export function renderAppStoreScreenshotSvg(slide, colorScheme, index, total) {
  const titleLines = wrapTitle(slide.title);
  const phoneImage = slide.phoneImage?.dataUrl || "";
  const titleSvg = titleLines
    .map((line, lineIndex) => {
      const y = 360 + lineIndex * 122;
      return `<text x="660" y="${y}" text-anchor="middle" fill="${escapeXml(colorScheme.text)}" font-family="Arial, sans-serif" font-size="104" font-weight="900">${escapeXml(line)}</text>`;
    })
    .join("\n  ");

  const phoneContent = phoneImage
    ? `<image href="${escapeXml(phoneImage)}" x="390" y="1040" width="540" height="955" preserveAspectRatio="xMidYMid slice"/>`
    : [
        `<rect x="390" y="1040" width="540" height="955" rx="46" fill="${escapeXml(colorScheme.background)}"/>`,
        `<circle cx="660" cy="1310" r="92" fill="${escapeXml(colorScheme.secondary)}" opacity="0.9"/>`,
        `<rect x="472" y="1518" width="376" height="44" rx="22" fill="${escapeXml(colorScheme.primary)}"/>`,
        `<rect x="472" y="1602" width="300" height="30" rx="15" fill="${escapeXml(colorScheme.text)}" opacity="0.16"/>`,
        `<rect x="472" y="1662" width="372" height="30" rx="15" fill="${escapeXml(colorScheme.text)}" opacity="0.16"/>`,
        `<rect x="472" y="1722" width="252" height="30" rx="15" fill="${escapeXml(colorScheme.text)}" opacity="0.16"/>`
      ].join("\n    ");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1320 2868" role="img" aria-label="${escapeXml(slide.title)}">
  <rect width="1320" height="2868" fill="${escapeXml(colorScheme.background)}"/>
  <circle cx="1082" cy="304" r="180" fill="${escapeXml(colorScheme.primary)}" opacity="0.35"/>
  <circle cx="206" cy="2478" r="220" fill="${escapeXml(colorScheme.secondary)}" opacity="0.18"/>
  ${titleSvg}
  <text x="660" y="734" text-anchor="middle" fill="${escapeXml(colorScheme.text)}" font-family="Arial, sans-serif" font-size="34" font-weight="700" opacity="0.72">App Store screenshot ${index + 1} / ${total}</text>
  <rect x="318" y="870" width="684" height="1390" rx="94" fill="${escapeXml(colorScheme.text)}"/>
  <rect x="346" y="904" width="628" height="1322" rx="72" fill="${escapeXml(colorScheme.surface)}"/>
  <rect x="575" y="936" width="170" height="24" rx="12" fill="${escapeXml(colorScheme.text)}" opacity="0.22"/>
  ${phoneContent}
  <rect x="390" y="2036" width="540" height="96" rx="34" fill="${escapeXml(colorScheme.primary)}"/>
  <text x="660" y="2097" text-anchor="middle" fill="${escapeXml(colorScheme.text)}" font-family="Arial, sans-serif" font-size="34" font-weight="900">今すぐ使ってみる</text>
</svg>
`;
}

export function buildResultImageRecords(runId, slides, options = {}) {
  const publicBase = options.publicBase || APPSTORE_SCREENSHOT_PUBLIC_BASE;
  return slides.map((slide, index) => {
    const fileName = `${String(index + 1).padStart(2, "0")}.svg`;
    return {
      id: slide.id,
      title: slide.title,
      label: `Slide ${index + 1}`,
      fileName,
      url: `${publicBase}/${runId}/${fileName}`
    };
  });
}

export async function createAppStoreImageRun({ outputRoot, repoRoot, input, now = new Date(), publicBase = APPSTORE_SCREENSHOT_PUBLIC_BASE } = {}) {
  const normalized = normalizeAppStoreImageInput(input);
  const runId = `${formatRunTimestamp(now)}-gen-appstore-image`;
  const baseDir = resolveAppStoreScreenshotBaseDir({ outputRoot, repoRoot });
  const workDir = resolveAppStoreScreenshotWorkDir({ outputRoot, repoRoot });
  const runWorkDir = path.join(workDir, runId);
  const finalDir = path.join(baseDir, runId);

  await mkdir(finalDir, { recursive: true });

  const plan = buildScreenshotPlan(normalized);
  await mkdir(runWorkDir, { recursive: true });
  await writeFile(path.join(runWorkDir, "input.json"), `${JSON.stringify(input, null, 2)}\n`, "utf8");
  await writeFile(path.join(runWorkDir, "screenshot-plan.json"), `${JSON.stringify(plan, null, 2)}\n`, "utf8");

  const images = buildResultImageRecords(runId, normalized.slides, { publicBase });
  await Promise.all(
    images.map((image, index) => {
      const svg = renderAppStoreScreenshotSvg(normalized.slides[index], normalized.colorScheme, index, images.length);
      return writeFile(path.join(finalDir, image.fileName), svg, "utf8");
    })
  );

  const run = {
    id: runId,
    skillId: "gen-appstore-image",
    status: "complete",
    createdAt: now.toISOString(),
    outputRoot: APPSTORE_SCREENSHOT_OUTPUT_ROOT,
    workRoot: APPSTORE_SCREENSHOT_WORK_ROOT,
    finalAssetsPath: path.join(APPSTORE_SCREENSHOT_OUTPUT_ROOT, runId),
    planPath: path.join(APPSTORE_SCREENSHOT_WORK_ROOT, runId, "screenshot-plan.json"),
    presentation: {
      layout: "horizontal-scroll"
    },
    colorScheme: normalized.colorScheme,
    planUrl: `/output/app-store-screenshot-work/${runId}/screenshot-plan.json`,
    images
  };

  await writeFile(path.join(runWorkDir, "manifest.json"), `${JSON.stringify(run, null, 2)}\n`, "utf8");
  await writeFile(path.join(workDir, "latest.json"), `${JSON.stringify(run, null, 2)}\n`, "utf8");
  return { run };
}

export async function readLatestAppStoreImageRun(options = {}) {
  const baseDir = resolveAppStoreScreenshotWorkDir(options);
  try {
    return JSON.parse(await readFile(path.join(baseDir, "latest.json"), "utf8"));
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
}

export function resolveAppStoreScreenshotBaseDir({ outputRoot, repoRoot } = {}) {
  const root = outputRoot ? path.resolve(outputRoot) : path.join(repoRoot ? path.resolve(repoRoot) : process.cwd(), "output");
  return path.join(root, "app-store-screenshots");
}

export function resolveAppStoreScreenshotWorkDir({ outputRoot, repoRoot } = {}) {
  const root = outputRoot ? path.resolve(outputRoot) : path.join(repoRoot ? path.resolve(repoRoot) : process.cwd(), "output");
  return path.join(root, "app-store-screenshot-work");
}

function normalizeSlide(slide = {}, index) {
  const fallback = DEFAULT_APPSTORE_SLIDES[index] || { id: `slide-${index + 1}`, title: `スクリーンショット ${index + 1}` };
  return {
    id: String(slide.id || fallback.id || `slide-${index + 1}`).trim(),
    title: normalizeTitle(slide.title || fallback.title),
    phoneImage: normalizePhoneImage(slide.phoneImage)
  };
}

function normalizeTitle(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 42) || "アプリの魅力を伝える";
}

function normalizePhoneImage(phoneImage) {
  if (!phoneImage || typeof phoneImage !== "object") return null;
  const dataUrl = String(phoneImage.dataUrl || "");
  if (!DATA_URL_PATTERN.test(dataUrl)) return null;
  return {
    name: String(phoneImage.name || "uploaded-image").slice(0, 120),
    dataUrl
  };
}

function wrapTitle(title) {
  const chars = Array.from(title);
  if (chars.length <= 12) return [title];
  if (chars.length <= 24) return [chars.slice(0, 12).join(""), chars.slice(12).join("")];
  return [chars.slice(0, 12).join(""), chars.slice(12, 24).join(""), chars.slice(24).join("")];
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function formatRunTimestamp(date) {
  return date.toISOString().replace(/[-:]/g, "").replace(/\..+/, `-${String(date.getMilliseconds()).padStart(3, "0")}`).replace("T", "-");
}
