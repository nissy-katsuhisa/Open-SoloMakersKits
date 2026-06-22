import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  buildScreenshotPlan,
  buildResultImageRecords,
  createAppStoreImageRun,
  normalizeAppStoreImageInput,
  renderAppStoreScreenshotSvg
} from "../../scripts/lib/appstore-image-runner.mjs";

const transparentPng =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=";

test("全体の配色をscreenshot planへ反映する", () => {
  const plan = buildScreenshotPlan({
    colorSchemeId: "fresh",
    slides: [{ id: "slide-1", title: "配色テスト" }]
  });

  assert.equal(plan.brand.color_scheme, "fresh");
  assert.equal(plan.brand.primary_color, "#2d9f68");
  assert.equal(plan.slides[0].headline, "配色テスト");
});

test("タイトル文言を生成SVGへ反映する", () => {
  const input = normalizeAppStoreImageInput({
    colorSchemeId: "warm",
    slides: [{ id: "slide-1", title: "タイトル変更済み" }]
  });
  const svg = renderAppStoreScreenshotSvg(input.slides[0], input.colorScheme, 0, 1);

  assert.match(svg, /タイトル変更済み/);
  assert.match(svg, /#ffc447/);
});

test("スマホ内画像アップロードを生成SVGへ埋め込む", () => {
  const input = normalizeAppStoreImageInput({
    slides: [
      {
        id: "slide-1",
        title: "アップロード画像",
        phoneImage: {
          name: "phone.png",
          dataUrl: transparentPng
        }
      }
    ]
  });
  const svg = renderAppStoreScreenshotSvg(input.slides[0], input.colorScheme, 0, 1);

  assert.match(svg, /<image href="data:image\/png;base64,/);
});

test("複数生成結果を横スクロール表示向けの順序付き画像リストとして返す", () => {
  const slides = normalizeAppStoreImageInput({
    slides: [
      { id: "slide-1", title: "1枚目" },
      { id: "slide-2", title: "2枚目" },
      { id: "slide-3", title: "3枚目" },
      { id: "slide-4", title: "4枚目" }
    ]
  }).slides;
  const images = buildResultImageRecords("run-1", slides);

  assert.equal(images.length, 4);
  assert.deepEqual(images.map((image) => image.fileName), ["01.png", "02.png", "03.png", "04.png"]);
  assert.ok(images.every((image) => image.url.startsWith("/output/app-store-screenshots/run-1/")));
  assert.ok(images.every((image) => image.sourceSvgPath.startsWith("output/app-store-screenshot-work/source-assets/generated-svg/run-1/")));
});

test("AppStore画像runnerがoutput配下へplanと最終画像を書き出す", async () => {
  const outputRoot = await mkdtemp(path.join(os.tmpdir(), "appstore-runner-"));
  try {
    const result = await createAppStoreImageRun({
      outputRoot,
      now: new Date("2026-06-19T00:00:00.123Z"),
      input: {
        colorSchemeId: "calm",
        slides: [
          { id: "slide-1", title: "落ち着いた配色" },
          { id: "slide-2", title: "2枚目の画像" }
        ]
      }
    });

    assert.equal(result.run.status, "complete");
    assert.equal(result.run.presentation.layout, "horizontal-scroll");
    assert.equal(result.run.images.length, 2);

    const baseDir = path.join(outputRoot, "app-store-screenshots");
    const workDir = path.join(outputRoot, "app-store-screenshot-work");
    const plan = await readFile(path.join(workDir, result.run.id, "screenshot-plan.json"), "utf8");
    const firstImage = await readFile(path.join(baseDir, result.run.id, "01.png"));
    const sourceSvg = await readFile(path.join(workDir, "source-assets", "generated-svg", result.run.id, "01.svg"), "utf8");
    const latest = await readFile(path.join(workDir, "latest.json"), "utf8");
    assert.match(plan, /落ち着いた配色/);
    assert.deepEqual([...firstImage.slice(1, 4)].map((value) => String.fromCharCode(value)).join(""), "PNG");
    assert.match(sourceSvg, /落ち着いた配色/);
    assert.match(latest, new RegExp(result.run.id));
  } finally {
    await rm(outputRoot, { recursive: true, force: true });
  }
});
