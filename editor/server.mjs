import { createServer } from "node:http";
import { execFile } from "node:child_process";
import { readFile, readdir, mkdir, writeFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { createAppStoreImageRun, readLatestAppStoreImageRun } from "../scripts/lib/appstore-image-runner.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const publicDir = path.join(__dirname, "public");
const outputDir = path.join(repoRoot, "output");
const runsDir = path.join(outputDir, "editor-runs");
const skillsDir = path.join(repoRoot, "skills");
const imageDir = path.join(repoRoot, "skill-explanation-images");
const port = Number(process.env.PORT || 4173);
const execFileAsync = promisify(execFile);
const appStoreOutputDir = path.join(outputDir, "app-store-screenshots");
const appStoreWorkDir = path.join(outputDir, "app-store-screenshot-work");
const appStorePreviewDir = path.join(outputDir, "app-store-screenshot-previews");
const appStorePlanPath = path.join(appStoreWorkDir, "current", "screenshot-plan.json");

const mimeTypes = new Map([
  [".html", "text/html; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".md", "text/markdown; charset=utf-8"],
  [".png", "image/png"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".webp", "image/webp"],
  [".svg", "image/svg+xml"]
]);

const server = createServer(async (request, response) => {
  try {
    const requestUrl = new URL(request.url || "/", `http://${request.headers.host || "localhost"}`);
    if (requestUrl.pathname === "/api/home" && request.method === "GET") {
      await sendJson(response, await getHomeData());
      return;
    }

    if (requestUrl.pathname === "/api/skills" && request.method === "GET") {
      await sendJson(response, { skills: await getSkills() });
      return;
    }

    if (requestUrl.pathname === "/api/runs" && request.method === "GET") {
      await sendJson(response, { runs: await getRuns() });
      return;
    }

    if (requestUrl.pathname === "/api/run" && request.method === "POST") {
      const body = await readJsonBody(request);
      await sendJson(response, await createRun(body));
      return;
    }

    if (requestUrl.pathname === "/api/appstore-image/run" && request.method === "POST") {
      const body = await readJsonBody(request);
      await sendJson(response, await createAppStoreImageRun({ repoRoot, input: body }));
      return;
    }

    if (requestUrl.pathname === "/api/appstore-image/latest" && request.method === "GET") {
      await sendJson(response, { run: await readLatestAppStoreImageRun({ repoRoot }) });
      return;
    }

    if (requestUrl.pathname === "/api/appstore-image/plan" && request.method === "GET") {
      await sendJson(response, await getAppStoreImagePlan());
      return;
    }

    if (requestUrl.pathname === "/api/appstore-image/update-preview" && request.method === "POST") {
      const body = await readJsonBody(request);
      await sendJson(response, await updateAppStoreImagePreview(body));
      return;
    }

    if (requestUrl.pathname === "/api/appstore-image/save" && request.method === "POST") {
      const body = await readJsonBody(request);
      await sendJson(response, await saveAppStoreImageSet(body));
      return;
    }

    if (requestUrl.pathname === "/api/check-native-app-legal/latest" && request.method === "GET") {
      await sendJson(response, { run: await readLatestSkillResult("check-native-app-legal") });
      return;
    }

    const skillResultMatch = requestUrl.pathname.match(/^\/api\/skill-results\/([^/]+)\/latest$/);
    if (skillResultMatch && request.method === "GET") {
      await sendJson(response, { run: await readLatestSkillResult(decodeURIComponent(skillResultMatch[1])) });
      return;
    }

    if (requestUrl.pathname.startsWith("/repo/") && request.method === "GET") {
      await serveFile(response, repoRoot, requestUrl.pathname.replace(/^\/repo\//, ""));
      return;
    }

    if (requestUrl.pathname.startsWith("/runs/") && request.method === "GET") {
      await serveFile(response, runsDir, requestUrl.pathname.replace(/^\/runs\//, ""));
      return;
    }

    if (requestUrl.pathname.startsWith("/output/") && request.method === "GET") {
      await serveFile(response, outputDir, requestUrl.pathname.replace(/^\/output\//, ""));
      return;
    }

    const staticPath = requestUrl.pathname === "/" ? "index.html" : requestUrl.pathname.replace(/^\//, "");
    await serveFile(response, publicDir, staticPath);
  } catch (error) {
    const status = error.statusCode || 500;
    await sendJson(response, { error: error.message || "Internal Server Error" }, status);
  }
});

server.listen(port, () => {
  console.log(`OpenSoloMakersKits Editor: http://localhost:${port}`);
});

async function getHomeData() {
  const [readme, skills, images] = await Promise.all([
    readText(path.join(repoRoot, "README.md")),
    getSkills(),
    listImages()
  ]);

  return {
    repoName: "OpenSoloMakersKits",
    concept: extractReadmeConcept(readme),
    counts: {
      skills: skills.length,
      images: images.length,
      bundles: skills.filter((skill) => skill.kind !== "skill").length
    },
    heroImage: "/assets/skills/gen-appstore-image/thumbnail-youtube.png",
    images: images.map((file) => ({
      name: file,
      url: imageUrl(file)
    }))
  };
}

async function getSkills() {
  const files = await walk(skillsDir);
  const skillFiles = files
    .filter((file) => file.endsWith("/SKILL.md") || file.endsWith("/workflow.md"))
    .sort((a, b) => a.localeCompare(b));

  const skills = [];
  for (const absolutePath of skillFiles) {
    const relativePath = toRepoRelative(absolutePath);
    const text = await readText(absolutePath);
    const frontmatter = parseFrontmatter(text);
    const title = extractTitle(text);
    const rootSlug = relativePath.split("/")[1] || "";
    const slug = frontmatter.name || path.basename(path.dirname(absolutePath));
    const summary = frontmatter.description || extractSummary(text);
    const fileName = path.basename(absolutePath);
    const kind = getSkillKind(relativePath, rootSlug, fileName);

    skills.push({
      id: relativePath,
      name: frontmatter.name || title || slug,
      title: title || frontmatter.name || slug,
      slug,
      rootSlug,
      kind,
      path: relativePath,
      directory: path.dirname(relativePath),
      summary,
      imageUrl: findSkillImage(slug, rootSlug),
      updatedLabel: findUpdatedLabel(text),
      lineCount: text.split("\n").length,
      preview: buildPreview(text)
    });
  }

  return skills;
}

async function createRun(body) {
  const skills = await getSkills();
  const skill = skills.find((item) => item.id === body.skillId) || skills[0];
  if (!skill) {
    throw httpError(400, "No skills are available.");
  }

  const now = new Date();
  const runId = `${formatRunTimestamp(now)}-${slugify(skill.slug || skill.rootSlug || "skill")}`;
  const runDir = path.join(runsDir, runId);
  await mkdir(runDir, { recursive: true });

  const input = normalizeRunInput(body.input || {});
  const artifacts = buildRunArtifacts(skill, input, now);
  await writeFile(path.join(runDir, "input.json"), `${JSON.stringify(input, null, 2)}\n`, "utf8");

  for (const artifact of artifacts) {
    await writeFile(path.join(runDir, artifact.fileName), artifact.content, "utf8");
  }

  const manifest = {
    id: runId,
    createdAt: now.toISOString(),
    skill,
    input,
    artifacts: artifacts.map(({ fileName, label, type }) => ({ fileName, label, type }))
  };
  await writeFile(path.join(runDir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

  return {
    run: {
      ...manifest,
      artifacts
    }
  };
}

async function getRuns() {
  await mkdir(runsDir, { recursive: true });
  const entries = await readdir(runsDir, { withFileTypes: true });
  const runs = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const manifestPath = path.join(runsDir, entry.name, "manifest.json");
    try {
      const manifest = JSON.parse(await readText(manifestPath));
      const artifacts = [];
      for (const artifact of manifest.artifacts || []) {
        artifacts.push({
          ...artifact,
          content: await readText(path.join(runsDir, entry.name, artifact.fileName))
        });
      }
      runs.push({ ...manifest, artifacts });
    } catch {
      // Ignore incomplete local runs.
    }
  }
  return runs.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}

async function getAppStoreImagePlan() {
  const latest = await readLatestAppStoreImageRun({ repoRoot });
  const plan = await ensureAppStoreScreenshotPlan(latest);
  return {
    plan,
    planPath: toRepoRelative(appStorePlanPath),
    renderAdjustments: normalizeRenderAdjustments(latest?.renderAdjustments)
  };
}

async function readLatestSkillResult(skillId) {
  const safeSkillId = safeResultSkillId(skillId);
  const latestPath = path.join(outputDir, safeSkillId, "latest.json");
  const latest = await readJsonIfExists(latestPath);
  if (!latest) return null;

  const contentPath = latest.resultPath || latest.reportPath || latest.textPath || "";
  const resolvedContentPath = contentPath ? resolveRepoOrAbsolutePath(contentPath) : null;
  const text = resolvedContentPath ? await readText(resolvedContentPath).catch(() => "") : "";

  return {
    ...latest,
    skillId: latest.skillId || safeSkillId,
    text,
    resultUrl: latest.resultUrl || urlForRepoPath(latest.resultPath),
    reportUrl: latest.reportUrl || urlForRepoPath(latest.reportPath)
  };
}

async function updateAppStoreImagePreview(body) {
  const plan = normalizeScreenshotPlan(body?.plan);
  const latest = await readLatestAppStoreImageRun({ repoRoot });
  const runId = latest?.id || formatRunTimestamp(new Date());
  const renderAdjustments = normalizeRenderAdjustments(body?.renderAdjustments);

  return renderAppStoreImageSet({
    plan,
    runId,
    renderAdjustments,
    persistPlan: false
  });
}

async function saveAppStoreImageSet(body) {
  const plan = normalizeScreenshotPlan(body?.plan);
  const now = new Date();
  const runId = formatRunTimestamp(now);
  const renderAdjustments = normalizeRenderAdjustments(body?.renderAdjustments);

  return renderAppStoreImageSet({
    plan,
    runId,
    renderAdjustments,
    persistPlan: true
  });
}

async function renderAppStoreImageSet({ plan, runId, renderAdjustments, persistPlan }) {
  await mkdir(appStoreOutputDir, { recursive: true });
  await mkdir(appStoreWorkDir, { recursive: true });
  await mkdir(appStorePreviewDir, { recursive: true });
  plan = await materializeScreenshotUploads(plan, runId);

  const planPath = persistPlan
    ? appStorePlanPath
    : path.join(appStoreWorkDir, "preview", "screenshot-plan.preview.json");
  await writeJson(planPath, plan);

  const runPlanPath = path.join(appStoreWorkDir, runId, "screenshot-plan.json");
  if (persistPlan) {
    await mkdir(path.dirname(runPlanPath), { recursive: true });
    await writeJson(runPlanPath, plan);
  }

  await runNodeScript([
    "skills/gen-appstore-image/scripts/validate-copy-fit.mjs",
    "--file",
    toRepoRelative(planPath),
    "--device",
    "iphone",
    "--locale",
    "ja"
  ]);

  const renderArgs = [
    "scripts/render-appstore-screenshots.mjs",
    "--plan",
    toRepoRelative(planPath),
    "--output-root",
    "output/app-store-screenshots",
    "--preview-root",
    "output/app-store-screenshot-previews",
    "--manifest-root",
    "output/app-store-screenshot-work",
    "--run-id",
    runId,
    "--phone-scale",
    String(renderAdjustments.phoneScale),
    "--headline-weight",
    String(renderAdjustments.headlineWeight)
  ];
  if (!renderAdjustments.removedSlideCounters) {
    renderArgs.push("--show-counters");
  }
  Object.entries(renderAdjustments.phoneYOffsetBySlide).forEach(([order, offset]) => {
    renderArgs.push("--phone-y", `${order}:${offset}`);
  });

  await runNodeScript(renderArgs);

  const reportPath = path.join(appStoreWorkDir, "current", "screenshot-plan.copy-fit-report.json");
  const validatorReportPath = path.join(appStoreWorkDir, "screenshot-plan.copy-fit-report.json");
  const runReportPath = path.join(appStoreWorkDir, runId, "screenshot-plan.copy-fit-report.json");
  if (persistPlan) {
    await mkdir(path.dirname(runReportPath), { recursive: true });
    try {
      const report = await readFile(reportPath).catch(() => readFile(validatorReportPath));
      await writeFile(runReportPath, report);
    } catch {
      // The renderer still succeeds without the report copy.
    }
  }

  return {
    plan,
    planPath: toRepoRelative(appStorePlanPath),
    renderAdjustments,
    run: await readLatestAppStoreImageRun({ repoRoot })
  };
}

async function ensureAppStoreScreenshotPlan(latest) {
  const existing = await readJsonIfExists(appStorePlanPath);
  if (existing) return normalizeScreenshotPlan(existing);

  const candidates = [
    latest?.canonicalPlanPath,
    latest?.planPath,
    latest?.planUrl?.replace(/^\/output\//, "output/")
  ].filter(Boolean);

  for (const candidate of candidates) {
    const candidatePath = path.resolve(repoRoot, candidate);
    const candidatePlan = await readJsonIfExists(candidatePath);
    if (candidatePlan) {
      const plan = normalizeScreenshotPlan(candidatePlan);
      await mkdir(path.dirname(appStorePlanPath), { recursive: true });
      await writeJson(appStorePlanPath, plan);
      return plan;
    }
  }

  const plan = buildDefaultScreenshotPlan(latest);
  await mkdir(path.dirname(appStorePlanPath), { recursive: true });
  await writeJson(appStorePlanPath, plan);
  return plan;
}

function buildDefaultScreenshotPlan(latest) {
  const appName = latest?.sourceApp?.name || "OpenSoloMakersKits App";
  return {
    app_name: appName,
    target_stores: ["apple-app-store"],
    devices: ["iphone"],
    locales: ["ja"],
    brand: {
      primary_color: "#9B5CFF",
      secondary_color: "#21C8F6",
      surface_color_dark: "#060606",
      concept: "app-store-ready",
      background_direction: "Dark base with subtle brand glow."
    },
    slides: Array.from({ length: 5 }, (_, index) => {
      const order = index + 1;
      const image = latest?.images?.[index];
      return {
        order,
        goal: image?.goal || `slide-${order}`,
        screen_slug: image?.id || `slide-${order}`,
        screen_path: image?.sourceScreenPath || `output/app-store-screenshot-work/source-assets/screenshots/apple/iphone/ja/${String(order).padStart(2, "0")}.png`,
        headline: image?.title || `スクリーンショット ${order}`,
        label: image?.label || `SLIDE ${order}`,
        visual_tone: "app-store-ready",
        background_direction: "brand-led background",
        layout: order === 3 || order === 5 ? "device-top" : order === 1 ? "hero" : "device-bottom"
      };
    })
  };
}

function normalizeScreenshotPlan(value) {
  const plan = value && typeof value === "object" ? value : {};
  const slides = Array.isArray(plan.slides) ? plan.slides : [];
  return {
    app_name: String(plan.app_name || plan.appName || "OpenSoloMakersKits App"),
    target_stores: Array.isArray(plan.target_stores) ? plan.target_stores : ["apple-app-store"],
    devices: Array.isArray(plan.devices) ? plan.devices : ["iphone"],
    locales: Array.isArray(plan.locales) ? plan.locales : ["ja"],
    brand: plan.brand && typeof plan.brand === "object" ? plan.brand : {},
    slides: slides.map((slide, index) => {
      const normalized = {
        order: Number(slide.order || index + 1),
        goal: String(slide.goal || `slide-${index + 1}`),
        screen_slug: String(slide.screen_slug || slide.id || `slide-${index + 1}`),
        screen_path: String(slide.screen_path || ""),
        headline: String(slide.headline || slide.title || ""),
        label: String(slide.label || `SLIDE ${index + 1}`),
        visual_tone: String(slide.visual_tone || ""),
        background_direction: String(slide.background_direction || ""),
        layout: ["hero", "device-bottom", "device-top"].includes(slide.layout) ? slide.layout : "device-bottom"
      };
      const screenUpload = normalizeScreenUpload(slide.screen_upload);
      if (screenUpload) normalized.screen_upload = screenUpload;
      return normalized;
    })
  };
}

async function materializeScreenshotUploads(plan, runId) {
  const safeRunId = safeFileSegment(runId || "preview");
  const slides = [];

  for (const slide of plan.slides || []) {
    const nextSlide = { ...slide };
    const upload = normalizeScreenUpload(nextSlide.screen_upload);
    delete nextSlide.screen_upload;

    if (upload) {
      const image = parseImageDataUrl(upload.dataUrl);
      const order = String(nextSlide.order || slides.length + 1).padStart(2, "0");
      const fileBase = safeFileSegment(path.basename(upload.name, path.extname(upload.name)) || nextSlide.screen_slug || `screen-${order}`);
      const fileName = `${order}-${fileBase}${extensionForMime(image.mime, upload.name)}`;
      const outputPath = path.join(appStoreWorkDir, "source-assets", "uploads", safeRunId, fileName);
      await mkdir(path.dirname(outputPath), { recursive: true });
      await writeFile(outputPath, image.buffer);
      nextSlide.screen_path = toRepoRelative(outputPath);
    }

    slides.push(nextSlide);
  }

  return {
    ...plan,
    slides
  };
}

function normalizeScreenUpload(value) {
  if (!value || typeof value !== "object") return null;
  const name = String(value.name || "screen.png").slice(0, 160);
  const dataUrl = String(value.dataUrl || "");
  if (!dataUrl.startsWith("data:image/")) return null;
  return { name, dataUrl };
}

function parseImageDataUrl(dataUrl) {
  const match = String(dataUrl).match(/^data:(image\/(?:png|jpe?g|webp|svg\+xml));base64,([A-Za-z0-9+/=\s]+)$/);
  if (!match) {
    throw httpError(400, "スクショ画像はPNG、JPEG、WEBP、SVGのいずれかを選択してください。");
  }

  return {
    mime: match[1] === "image/jpg" ? "image/jpeg" : match[1],
    buffer: Buffer.from(match[2].replace(/\s+/g, ""), "base64")
  };
}

function extensionForMime(mime, fileName) {
  const ext = path.extname(fileName || "").toLowerCase();
  if ([".png", ".jpg", ".jpeg", ".webp", ".svg"].includes(ext)) return ext === ".jpg" ? ".jpeg" : ext;
  if (mime === "image/jpeg") return ".jpeg";
  if (mime === "image/webp") return ".webp";
  if (mime === "image/svg+xml") return ".svg";
  return ".png";
}

function normalizeRenderAdjustments(value = {}) {
  const incoming = value && typeof value === "object" ? value : {};
  const phoneYOffsetBySlide = {};
  Object.entries(incoming.phoneYOffsetBySlide || {}).forEach(([order, offset]) => {
    const parsedOffset = Number(offset);
    if (Number.isFinite(parsedOffset)) {
      phoneYOffsetBySlide[String(Number(order))] = parsedOffset;
    }
  });

  return {
    headlineWeight: Number(incoming.headlineWeight || 700),
    phoneScale: Number(incoming.phoneScale || incoming.phoneScaleFromOriginalRenderer || 1.12),
    phoneYOffsetBySlide,
    removedSlideCounters: incoming.removedSlideCounters !== false
  };
}

async function runNodeScript(args) {
  try {
    await execFileAsync(process.execPath, args, {
      cwd: repoRoot,
      env: process.env,
      maxBuffer: 1024 * 1024 * 8
    });
  } catch (error) {
    const detail = [error.stdout, error.stderr, error.message].filter(Boolean).join("\n").trim();
    throw httpError(500, detail || "プレビューの更新に失敗しました。");
  }
}

async function readJsonIfExists(filePath) {
  try {
    return JSON.parse(await readText(filePath));
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
}

async function writeJson(filePath, value) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function buildRunArtifacts(skill, input, now) {
  const lines = [];
  lines.push(`# ${skill.name} run`);
  lines.push("");
  lines.push(`- created: ${now.toISOString()}`);
  lines.push(`- skill file: ${skill.path}`);
  lines.push(`- project: ${input.projectName || "未入力"}`);
  lines.push(`- source path: ${input.sourcePath || "未入力"}`);
  lines.push("");
  lines.push("## Goal");
  lines.push("");
  lines.push(input.goal || "未入力");
  lines.push("");
  lines.push("## Notes");
  lines.push("");
  lines.push(input.notes || "未入力");
  lines.push("");

  const artifacts = [];
  const skillName = `${skill.name} ${skill.slug} ${skill.rootSlug}`.toLowerCase();

  if (skillName.includes("app-product-summary")) {
    artifacts.push({
      fileName: "app-product-context.draft.json",
      label: "App product context draft",
      type: "json",
      content: `${JSON.stringify(buildAppProductContext(input, now), null, 2)}\n`
    });
    lines.push("## Generated");
    lines.push("");
    lines.push("- `app-product-context.draft.json`");
  } else if (skillName.includes("appstore")) {
    artifacts.push({
      fileName: "store-screenshot-brief.draft.json",
      label: "Store screenshot brief",
      type: "json",
      content: `${JSON.stringify(buildStoreBrief(input, now), null, 2)}\n`
    });
    lines.push("## Generated");
    lines.push("");
    lines.push("- `store-screenshot-brief.draft.json`");
  } else if (skillName.includes("legal") || skillName.includes("security")) {
    artifacts.push({
      fileName: "review-checklist.md",
      label: "Review checklist",
      type: "markdown",
      content: buildReviewChecklist(skill, input)
    });
    lines.push("## Generated");
    lines.push("");
    lines.push("- `review-checklist.md`");
  } else if (skillName.includes("video")) {
    artifacts.push({
      fileName: "storyboard.draft.md",
      label: "Storyboard draft",
      type: "markdown",
      content: buildStoryboard(input)
    });
    lines.push("## Generated");
    lines.push("");
    lines.push("- `storyboard.draft.md`");
  } else {
    lines.push("## Generated");
    lines.push("");
    lines.push("- `result.md`");
  }

  if (input.rawJson.trim()) {
    artifacts.push({
      fileName: "input-reference.json",
      label: "Input reference",
      type: "json",
      content: normalizeJsonText(input.rawJson)
    });
  }

  artifacts.unshift({
    fileName: "result.md",
    label: "Run summary",
    type: "markdown",
    content: `${lines.join("\n")}\n`
  });
  return artifacts;
}

function buildAppProductContext(input, now) {
  return {
    schema: "app-product-context/local-draft",
    generated_at: now.toISOString(),
    product_name: input.projectName || "Untitled app",
    product_summary: input.goal || input.notes || "Editor inputから作成したアプリ概要の下書きです。",
    source_path: input.sourcePath || "",
    main_features: toList(input.features || input.notes).slice(0, 6),
    audience: input.audience || "個人開発アプリの成長施策を検討するユーザー",
    benefits: toList(input.benefits || input.goal).slice(0, 6),
    user_pains: toList(input.pains).slice(0, 6),
    catchcopies: toList(input.catchcopy || input.goal).slice(0, 5),
    tone_keywords: toList(input.tone || "clear, practical, creator-focused")
  };
}

function buildStoreBrief(input, now) {
  return {
    schema: "store-screenshot-brief/local-draft",
    generated_at: now.toISOString(),
    app_name: input.projectName || "Untitled app",
    source_path: input.sourcePath || "",
    promise: input.goal || "",
    target_user: input.audience || "",
    screens: toList(input.features || input.notes).slice(0, 8).map((feature, index) => ({
      order: index + 1,
      title: feature,
      caption: input.catchcopy || input.goal || ""
    })),
    tone_keywords: toList(input.tone || "polished, readable, app-store-ready")
  };
}

function buildReviewChecklist(skill, input) {
  const label = skill.name.includes("security") ? "セキュリティ" : "法務・ストア";
  const target = input.projectName || input.sourcePath || "対象アプリ";
  return [
    `# ${target} ${label}レビュー下書き`,
    "",
    "## 確認対象",
    "",
    `- source path: ${input.sourcePath || "未入力"}`,
    `- goal: ${input.goal || "未入力"}`,
    "",
    "## 先に見る項目",
    "",
    "- アプリの入口、設定、権限、公開ページ",
    "- 課金、認証、ユーザーデータ、外部SDK",
    "- リリース前に人間確認が必要な項目",
    "",
    "## 入力メモ",
    "",
    input.notes || "未入力",
    ""
  ].join("\n");
}

function buildStoryboard(input) {
  const title = input.projectName || "Skill reference video";
  return [
    `# ${title} storyboard draft`,
    "",
    "1. 課題を見せる",
    "2. スキルで短縮できる作業を見せる",
    "3. 入力を見せる",
    "4. 生成物を見せる",
    "5. OpenSoloMakersKits の次の導線を見せる",
    "",
    "## Notes",
    "",
    input.notes || "未入力",
    ""
  ].join("\n");
}

function normalizeRunInput(input) {
  return {
    projectName: String(input.projectName || "").trim(),
    sourcePath: String(input.sourcePath || "").trim(),
    goal: String(input.goal || "").trim(),
    notes: String(input.notes || "").trim(),
    features: String(input.features || "").trim(),
    audience: String(input.audience || "").trim(),
    benefits: String(input.benefits || "").trim(),
    pains: String(input.pains || "").trim(),
    catchcopy: String(input.catchcopy || "").trim(),
    tone: String(input.tone || "").trim(),
    rawJson: String(input.rawJson || "").trim()
  };
}

function parseFrontmatter(text) {
  if (!text.startsWith("---")) return {};
  const closeIndex = text.indexOf("\n---", 3);
  if (closeIndex === -1) return {};
  const frontmatter = text.slice(3, closeIndex).trim().split("\n");
  const data = {};
  for (let index = 0; index < frontmatter.length; index += 1) {
    const line = frontmatter[index];
    const match = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!match) continue;
    const [, key, rawValue] = match;
    if (rawValue.trim() === ">") {
      const block = [];
      while (frontmatter[index + 1] && /^\s+/.test(frontmatter[index + 1])) {
        index += 1;
        block.push(frontmatter[index].trim());
      }
      data[key] = block.join(" ").trim();
    } else {
      data[key] = rawValue.replace(/^["']|["']$/g, "").trim();
    }
  }
  return data;
}

function extractTitle(text) {
  const match = text.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : "";
}

function extractSummary(text) {
  const content = text.replace(/^---[\s\S]*?\n---\n?/, "");
  const paragraphs = content.split(/\n{2,}/).map((part) => part.trim()).filter(Boolean);
  const first = paragraphs.find((paragraph) => !paragraph.startsWith("#"));
  return first ? first.replace(/\s+/g, " ").slice(0, 220) : "";
}

function extractReadmeConcept(readme) {
  const paragraphs = readme.split(/\n{2,}/).map((part) => part.trim()).filter(Boolean);
  return paragraphs.find((part) => !part.startsWith("#")) || "OpenSoloMakersKits のスキルを、見つけて、理解して、実行するためのローカル dashboard です。";
}

function findUpdatedLabel(text) {
  const match = text.match(/更新日:\s*([0-9-]+)/);
  return match ? match[1] : "";
}

function buildPreview(text) {
  return text
    .replace(/^---[\s\S]*?\n---\n?/, "")
    .split("\n")
    .filter((line) => line.trim())
    .slice(0, 12)
    .join("\n");
}

function findSkillImage(slug, rootSlug) {
  const imageSlug = rootSlug || slug || "app-product-summary";
  return imageUrl(`${imageSlug}-flow.png`);
}

function getSkillKind(relativePath, rootSlug, fileName) {
  if (fileName === "workflow.md") return "workflow";
  if (rootSlug === "gen-appstore-image") return "bundle";
  if (relativePath.includes("/skills/")) return "bundle skill";
  return "skill";
}

async function listImages() {
  try {
    return (await readdir(imageDir)).filter((file) => /\.(png|jpe?g|webp|svg)$/i.test(file)).sort();
  } catch {
    return [];
  }
}

function imageUrl(fileName) {
  return `/repo/skill-explanation-images/${encodeURIComponent(fileName)}`;
}

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.name === "node_modules" || entry.name === ".git") continue;
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...await walk(fullPath));
    } else {
      files.push(fullPath);
    }
  }
  return files;
}

async function serveFile(response, baseDir, relativePath) {
  const filePath = path.join(baseDir, decodeURIComponent(relativePath));
  const fileStat = await stat(filePath).catch(() => null);
  if (!fileStat || !fileStat.isFile()) {
    throw httpError(404, "Not found");
  }
  const data = await readFile(filePath);
  response.writeHead(200, { "Content-Type": mimeTypes.get(path.extname(filePath)) || "application/octet-stream" });
  response.end(data);
}

async function sendJson(response, data, status = 200) {
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  response.end(`${JSON.stringify(data)}\n`);
}

async function readJsonBody(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

async function readText(filePath) {
  return readFile(filePath, "utf8");
}

function httpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function toRepoRelative(filePath) {
  return path.relative(repoRoot, filePath).split(path.sep).join("/");
}

function toList(value) {
  return String(value || "")
    .split(/\n|,|、|・/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeJsonText(value) {
  try {
    return `${JSON.stringify(JSON.parse(value), null, 2)}\n`;
  } catch {
    return `${value}\n`;
  }
}

function slugify(value) {
  return String(value || "run").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "run";
}

function safeFileSegment(value) {
  return String(value || "file")
    .toLowerCase()
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80) || "file";
}

function safeResultSkillId(value) {
  const safeValue = String(value || "").trim();
  if (!/^[A-Za-z0-9_-]+$/.test(safeValue)) {
    throw httpError(400, "Invalid skill result id.");
  }
  return safeValue;
}

function resolveRepoOrAbsolutePath(value) {
  const filePath = String(value || "");
  return path.isAbsolute(filePath) ? filePath : path.resolve(repoRoot, filePath);
}

function urlForRepoPath(value) {
  if (!value) return "";
  const relative = String(value).replace(/\\/g, "/");
  if (relative.startsWith("output/")) {
    return `/output/${relative.replace(/^output\//, "")}`;
  }
  if (!path.isAbsolute(relative)) {
    return `/repo/${relative}`;
  }
  return "";
}

function formatRunTimestamp(date) {
  return date.toISOString().replace(/[-:]/g, "").replace(/\..+/, "").replace("T", "-");
}

function formatMinuteTimestamp(date) {
  const pad = (value) => String(value).padStart(2, "0");
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate())
  ].join("") + `-${pad(date.getHours())}${pad(date.getMinutes())}`;
}
