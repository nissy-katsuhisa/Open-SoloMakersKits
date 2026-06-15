#!/usr/bin/env node
import {existsSync, readFileSync} from "node:fs";
import {dirname, join, resolve} from "node:path";

const configPath = resolve(process.argv[2] ?? "src/video-config.json");
const projectRoot = resolve(process.argv[3] ?? join(dirname(configPath), ".."));
const publicRoot = join(projectRoot, "public");
const errors = [];

const readConfig = () => {
  if (!existsSync(configPath)) {
    errors.push(`設定ファイルが見つかりません: ${configPath}`);
    return null;
  }

  try {
    return JSON.parse(readFileSync(configPath, "utf8"));
  } catch (error) {
    errors.push(`JSONとして読み込めません: ${error.message}`);
    return null;
  }
};

const requireString = (value, path) => {
  if (typeof value !== "string" || value.trim().length === 0) {
    errors.push(`${path} は空ではない文字列にしてください`);
  }
};

const requireStringArray = (value, path, minItems = 1) => {
  if (!Array.isArray(value) || value.length < minItems) {
    errors.push(`${path} は ${minItems} 件以上の配列にしてください`);
    return;
  }

  value.forEach((item, index) => requireString(item, `${path}[${index}]`));
};

const requireAsset = (value, path) => {
  requireString(value, path);

  if (typeof value !== "string" || value.trim().length === 0) {
    return;
  }

  const assetPath = join(publicRoot, value);
  if (!existsSync(assetPath)) {
    errors.push(`${path} の参照先画像が public 配下に見つかりません: ${assetPath}`);
  }
};

const config = readConfig();

if (config) {
  const app = config.app;
  const scenes = app?.scenes;

  requireString(app?.name, "app.name");

  const music = app?.audio?.backgroundMusic;
  if (music) {
    requireAsset(music.src, "app.audio.backgroundMusic.src");
    requireString(music.title, "app.audio.backgroundMusic.title");
    requireString(music.creator, "app.audio.backgroundMusic.creator");
    requireString(music.sourceUrl, "app.audio.backgroundMusic.sourceUrl");
    requireString(music.licenseUrl, "app.audio.backgroundMusic.licenseUrl");

    if (typeof music.volume !== "number" || music.volume < 0 || music.volume > 1) {
      errors.push("app.audio.backgroundMusic.volume は 0 から 1 の数値にしてください");
    }
  }

  requireAsset(scenes?.scene1?.handPhoneComposite, "app.scenes.scene1.handPhoneComposite");

  requireStringArray(scenes?.scene2?.titleLines, "app.scenes.scene2.titleLines", 1);
  requireAsset(scenes?.scene2?.phoneScreen, "app.scenes.scene2.phoneScreen");
  requireString(scenes?.scene2?.card?.title, "app.scenes.scene2.card.title");
  requireString(scenes?.scene2?.card?.introText, "app.scenes.scene2.card.introText");
  requireStringArray(scenes?.scene2?.card?.accentColors, "app.scenes.scene2.card.accentColors", 1);
  requireAsset(scenes?.scene3?.background, "app.scenes.scene3.background");

  const items = scenes?.scene3?.items;
  if (!Array.isArray(items) || items.length !== 3) {
    errors.push("app.scenes.scene3.items は機能紹介をちょうど3件入れてください");
  } else {
    items.forEach((item, index) => {
      requireString(item?.id, `app.scenes.scene3.items[${index}].id`);
      requireAsset(item?.screen, `app.scenes.scene3.items[${index}].screen`);
      requireString(item?.label, `app.scenes.scene3.items[${index}].label`);
      requireString(item?.title, `app.scenes.scene3.items[${index}].title`);
    });
  }

  requireAsset(scenes?.scene4?.logo, "app.scenes.scene4.logo");
  requireString(scenes?.scene4?.tagline, "app.scenes.scene4.tagline");
  requireString(scenes?.scene4?.nameText, "app.scenes.scene4.nameText");
}

if (errors.length > 0) {
  console.error("video-config の検証に失敗しました:");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log(`video-config の検証OK: ${configPath}`);
