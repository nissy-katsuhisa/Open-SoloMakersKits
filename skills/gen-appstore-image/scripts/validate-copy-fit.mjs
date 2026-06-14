#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

let chromium;
try {
  ({ chromium } = require("playwright"));
} catch {
  console.error("playwright is not installed. Install it before running validate-copy-fit.");
  process.exit(2);
}

const DEVICE_CANVAS = {
  iphone: { w: 1320, h: 2868 },
  ipad: { w: 2064, h: 2752 },
  android: { w: 1080, h: 1920 },
  "android-7": { w: 1200, h: 1920, wL: 1920, hL: 1200 },
  "android-10": { w: 1600, h: 2560, wL: 2560, hL: 1600 },
  "feature-graphic": { w: 1024, h: 500 },
};

const DEFAULT_DEVICE = "iphone";
const DEFAULT_LOCALE = "ja";
const MIN_VISUAL_LINE_CHARS = 4;
const MAX_HEADLINE_CHARS = {
  iphone: 26,
  ipad: 30,
  android: 24,
  "android-7": 28,
  "android-10": 30,
  "feature-graphic": 20,
};
const MIN_FONT_SCALE = 0.78;

function parseArgs(argv) {
  const options = {
    file: "",
    device: "",
    locale: "",
    orientation: "portrait",
    report: "",
  };

  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--file") options.file = argv[++i] || "";
    else if (arg === "--device") options.device = argv[++i] || "";
    else if (arg === "--locale") options.locale = argv[++i] || "";
    else if (arg === "--orientation") options.orientation = argv[++i] || "portrait";
    else if (arg === "--report") options.report = argv[++i] || "";
  }

  if (!options.file) {
    console.error("Usage: node validate-copy-fit.mjs --file <screenshot-plan.json|app-store-screenshots.json> [--device iphone] [--locale ja]");
    process.exit(2);
  }

  return options;
}

function getCanvas(device, orientation) {
  const canvas = DEVICE_CANVAS[device] || DEVICE_CANVAS[DEFAULT_DEVICE];
  if ((device === "android-7" || device === "android-10") && orientation === "landscape") {
    return { cW: canvas.wL, cH: canvas.hL };
  }
  return { cW: canvas.w, cH: canvas.h };
}

function getCaptionWidth(cW, layout) {
  switch (layout) {
    case "split-landscape":
      return cW * 0.38;
    case "no-device":
      return cW * 0.8;
    case "feature-graphic":
      return cW * 0.52;
    default:
      return cW * 0.88;
  }
}

function getTextStyle(device, orientation, layout) {
  const { cW, cH } = getCanvas(device, orientation);
  const unit = Math.min(cW, cH);
  return {
    width: getCaptionWidth(cW, layout),
    fontSize: unit * 0.092,
    minFontSize: unit * 0.092 * MIN_FONT_SCALE,
    letterSpacing: -(unit * 0.001),
    lineHeight: 0.96,
  };
}

function graphemes(input) {
  if (!input) return [];
  if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
    const segmenter = new Intl.Segmenter("ja", { granularity: "grapheme" });
    return Array.from(segmenter.segment(input), (entry) => entry.segment);
  }
  return Array.from(input);
}

function normalizeSlides(raw, fallbackDevice, fallbackLocale) {
  if (Array.isArray(raw?.slides)) {
    return {
      device: raw.devices?.[0] || fallbackDevice || DEFAULT_DEVICE,
      locale: raw.locales?.[0] || fallbackLocale || DEFAULT_LOCALE,
      slides: raw.slides.map((slide, index) => ({
        id: slide.screen_slug || `slide-${index + 1}`,
        order: slide.order || index + 1,
        layout: slide.layout || "device-bottom",
        headline: slide.headline || "",
      })),
    };
  }

  if (raw?.slidesByDevice) {
    const device = fallbackDevice || raw.device || DEFAULT_DEVICE;
    const locale = fallbackLocale || raw.locale || raw.locales?.[0] || DEFAULT_LOCALE;
    const slides = raw.slidesByDevice?.[device] || [];
    return {
      device,
      locale,
      slides: slides.map((slide, index) => ({
        id: slide.id || `slide-${index + 1}`,
        order: index + 1,
        layout: slide.layout || "device-bottom",
        headline: slide.headline?.[locale] || slide.headline?.en || Object.values(slide.headline || {})[0] || "",
      })),
    };
  }

  throw new Error("Unsupported input shape. Expected screenshot-plan.json or app-store-screenshots.json.");
}

async function launchBrowser() {
  const attempts = [
    () => chromium.launch({ headless: true }),
    () => chromium.launch({ headless: true, channel: "chrome" }),
  ];

  let lastError = null;
  for (const attempt of attempts) {
    try {
      return await attempt();
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError;
}

async function measureHeadline(page, text, style) {
  return page.evaluate(
    ({ text: input, style: incomingStyle }) => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) return [];

      ctx.font = `700 ${incomingStyle.fontSize}px Inter, system-ui, -apple-system, BlinkMacSystemFont, sans-serif`;
      const maxWidth = incomingStyle.width;
      const letterSpacing = incomingStyle.letterSpacing;
      const lines = [];

      for (const rawLine of input.split("\n")) {
        const chars = Array.from(rawLine);
        if (chars.length === 0) {
          lines.push({ text: "", chars: 0 });
          continue;
        }

        let currentText = "";
        let currentChars = 0;
        let currentWidth = 0;

        for (const char of chars) {
          const charWidth = ctx.measureText(char).width;
          const nextWidth =
            currentChars === 0
              ? charWidth
              : currentWidth + letterSpacing + charWidth;

          if (currentChars > 0 && nextWidth > maxWidth) {
            lines.push({ text: currentText, chars: currentChars });
            currentText = char;
            currentChars = 1;
            currentWidth = charWidth;
          } else {
            currentText += char;
            currentChars += 1;
            currentWidth = nextWidth;
          }
        }

        lines.push({ text: currentText, chars: currentChars });
      }

      return lines;
    },
    { text, style },
  );
}

async function singleLineLimit(page, style) {
  let lo = 1;
  let hi = 40;
  while (hi - lo > 1) {
    const mid = Math.floor((lo + hi) / 2);
    const lines = await measureHeadline(page, "あ".repeat(mid), style);
    if (lines.length === 1) lo = mid;
    else hi = mid;
  }
  return {
    maxCharsWithoutWrap: lo,
    wrapStartsAt: lo + 1,
  };
}

function headlineLength(text) {
  return graphemes(text.replace(/\n/g, "")).length;
}

function hasBadLineStart(text) {
  return /^[。、，,.!?！？]/u.test(text.trim());
}

async function fitHeadlineStyle(page, text, baseStyle) {
  let lo = baseStyle.minFontSize;
  let hi = baseStyle.fontSize;
  let best = null;

  for (let i = 0; i < 14; i += 1) {
    const mid = (lo + hi) / 2;
    const style = { ...baseStyle, fontSize: mid };
    const visualLines = await measureHeadline(page, text, style);
    const manualLineCount = text.split("\n").length;
    const hasAutoWrap = visualLines.length > manualLineCount;

    if (hasAutoWrap) {
      hi = mid;
    } else {
      best = { style, visualLines };
      lo = mid;
    }
  }

  if (best) return best;

  return {
    style: { ...baseStyle, fontSize: baseStyle.minFontSize },
    visualLines: await measureHeadline(page, text, { ...baseStyle, fontSize: baseStyle.minFontSize }),
  };
}

async function main() {
  const options = parseArgs(process.argv);
  const filePath = path.resolve(options.file);
  const raw = JSON.parse(await fs.readFile(filePath, "utf8"));
  const normalized = normalizeSlides(raw, options.device, options.locale);
  const device = normalized.device || DEFAULT_DEVICE;
  const locale = normalized.locale || DEFAULT_LOCALE;
  const orientation = options.orientation || "portrait";

  const browser = await launchBrowser();
  const page = await browser.newPage();

  const layouts = [...new Set(normalized.slides.map((slide) => slide.layout))];
  const limitsByLayout = {};

  for (const layout of layouts) {
    limitsByLayout[layout] = await singleLineLimit(
      page,
      getTextStyle(device, orientation, layout),
    );
  }

  const failures = [];
  const fittedSlides = [];

  for (const slide of normalized.slides) {
    const baseStyle = getTextStyle(device, orientation, slide.layout);
    const { style, visualLines } = await fitHeadlineStyle(page, slide.headline, baseStyle);
    const manualLineCount = slide.headline.split("\n").length;
    const tooShortLines = visualLines.filter((line) => visualLines.length > 1 && line.chars < MIN_VISUAL_LINE_CHARS);
    const badStartLines = visualLines.filter((line) => hasBadLineStart(line.text));
    const limit = limitsByLayout[slide.layout];
    const longestManualLine = Math.max(
      ...slide.headline.split("\n").map((line) => graphemes(line).length),
      0,
    );
    const maxHeadlineChars = MAX_HEADLINE_CHARS[device] || MAX_HEADLINE_CHARS[DEFAULT_DEVICE];
    const fittedStyle = {
      fontSize: Math.round(style.fontSize * 100) / 100,
      fontScale: Math.round((style.fontSize / baseStyle.fontSize) * 1000) / 1000,
      minFontSize: Math.round(baseStyle.minFontSize * 100) / 100,
    };

    fittedSlides.push({
      id: slide.id,
      order: slide.order,
      layout: slide.layout,
      headline: slide.headline,
      visualLines,
      fittedStyle,
    });

    const issues = [];
    if (headlineLength(slide.headline) > maxHeadlineChars) {
      issues.push({
        type: "headline_length_exceeded",
        message: `見出しの上限 ${maxHeadlineChars} 文字を超えています。現在 ${headlineLength(slide.headline)} 文字です。`,
      });
    }
    if (visualLines.length > manualLineCount) {
      issues.push({
        type: "unexpected_auto_wrap",
        message: `最小フォントサイズ ${Math.round(baseStyle.minFontSize)}px まで下げても、自動折り返しが発生しています。`,
      });
    }
    if (tooShortLines.length > 0) {
      issues.push({
        type: "too_short_line",
        message: `短すぎる行があります。各表示行は最低 ${MIN_VISUAL_LINE_CHARS} 文字必要です。最短 ${Math.min(...tooShortLines.map((line) => line.chars))} 文字です。`,
      });
    }
    if (badStartLines.length > 0) {
      issues.push({
        type: "bad_line_start",
        message: "句読点や記号から始まる表示行があります。",
      });
    }
    if (longestManualLine > limit.maxCharsWithoutWrap && visualLines.length > manualLineCount) {
      issues.push({
        type: "recommended_limit_exceeded",
        message: `推奨上限 ${limit.maxCharsWithoutWrap} 文字を超える行があります。最長 ${longestManualLine} 文字です。`,
      });
    }

    if (issues.length > 0) {
      failures.push({
        id: slide.id,
        order: slide.order,
        layout: slide.layout,
        headline: slide.headline,
        manualLineCount,
        visualLines,
        fittedStyle,
        issues,
      });
    }
  }

  await browser.close();

  const report = {
    ok: failures.length === 0,
    input: filePath,
    device,
    locale,
    orientation,
    limitsByLayout,
    rules: {
      minVisualLineChars: MIN_VISUAL_LINE_CHARS,
      maxHeadlineChars: MAX_HEADLINE_CHARS[device] || MAX_HEADLINE_CHARS[DEFAULT_DEVICE],
      minFontScale: MIN_FONT_SCALE,
    },
    fittedSlides,
    checkedSlides: normalized.slides.length,
    failures,
  };

  const reportPath =
    options.report ||
    path.join(path.dirname(filePath), `${path.basename(filePath, path.extname(filePath))}.copy-fit-report.json`);
  await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  console.log(`copy-fit report: ${reportPath}`);
  for (const [layout, limit] of Object.entries(limitsByLayout)) {
    console.log(
      `${layout}: ${limit.maxCharsWithoutWrap} chars fit on one line, wraps from ${limit.wrapStartsAt}`,
    );
  }

  if (failures.length === 0) {
    console.log("All headlines passed copy-fit validation.");
    return;
  }

  for (const failure of failures) {
    console.log(
      `slide ${failure.order} (${failure.layout}): ${failure.issues.map((issue) => issue.type).join(", ")}`,
    );
  }

  process.exit(1);
}

await main();
