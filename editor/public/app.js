const state = {
  config: null,
  home: null,
  skills: [],
  media: [],
  runs: [],
  activeTab: "skills",
  selectedSkillId: "",
  isRunning: false,
  currentRun: null,
  runError: "",
  appStoreImageEditor: null,
  latestAppStoreRun: null,
  latestSkillResults: {},
  appStoreIsUpdating: false,
  appStoreIsSaving: false,
  appStorePlanError: "",
  showAppStoreParameters: true,
  outputCopyText: "",
  outputCopyResetTimer: null
};

const fallbackImage = "/assets/skills/app-product-summary/thumbnail-youtube.png";

const elements = {
  status: document.querySelector("[data-server-status]"),
  homeConcept: document.querySelector("[data-home-concept]"),
  heroImage: document.querySelector("[data-hero-image]"),
  skillList: document.querySelector("[data-skill-list]"),
  editorSkillSelect: document.querySelector("[data-editor-skill-select]"),
  runSkill: document.querySelector("[data-run-skill]"),
  editorThumbnail: document.querySelector("[data-editor-thumbnail]"),
  editorYoutube: document.querySelector("[data-editor-youtube]"),
  editorOutput: document.querySelector("[data-editor-output]"),
  outputType: document.querySelector("[data-output-type]"),
  outputTitle: document.querySelector("[data-output-title]"),
  outputContent: document.querySelector("[data-output-content]"),
  outputCopy: document.querySelector("[data-copy-output]")
};

document.addEventListener("DOMContentLoaded", () => {
  bindEvents();
  void initialize();
});

function bindEvents() {
  document.querySelectorAll("[data-tab-button]").forEach((button) => {
    button.addEventListener("click", () => setTab(button.dataset.tabButton));
  });

  document.querySelectorAll("[data-jump-tab]").forEach((button) => {
    button.addEventListener("click", () => setTab(button.dataset.jumpTab));
  });

  elements.editorSkillSelect.addEventListener("change", () => {
    selectSkill(elements.editorSkillSelect.value);
  });

  elements.runSkill.addEventListener("click", () => {
    void runSelectedSkill();
  });

  elements.outputCopy?.addEventListener("click", () => {
    void copyOutputText();
  });
}

async function initialize() {
  try {
    elements.status.textContent = "ready";
    const [home, skillsResult, configResult, latestAppStoreResult, appStorePlanResult] = await Promise.all([
      apiGet("/api/home"),
      apiGet("/api/skills"),
      apiGet("/data/skill-config.json"),
      apiGet("/api/appstore-image/latest").catch(() => ({ run: null })),
      apiGet("/api/appstore-image/plan").catch((error) => ({ error: error.message }))
    ]);
    state.home = home;
    state.config = configResult;
    state.media = configResult.skills || [];
    state.skills = orderSkillsByMedia(skillsResult.skills || []);
    state.selectedSkillId = state.skills[0]?.id || "";
    state.appStoreImageEditor = createAppStoreImageEditorState(appStoreImageExecution(), appStorePlanResult);
    state.appStorePlanError = appStorePlanResult.error || "";
    state.latestAppStoreRun = latestAppStoreResult.run || null;
    state.latestSkillResults = await fetchConfiguredSkillResults(state.media);
    if (state.latestAppStoreRun) {
      state.runs = [appStoreRunToHistoryItem(state.latestAppStoreRun)];
    }
    state.runs = [
      ...Object.entries(state.latestSkillResults).map(([mediaId, run]) => fileResultRunToHistoryItem(mediaId, run)),
      ...state.runs
    ];
    renderAll();
  } catch (error) {
    elements.status.textContent = "error";
    elements.homeConcept.textContent = error.message;
  }
}

function renderAll() {
  renderHome();
  renderSkills();
  renderEditorSkillOptions();
  renderEditorMedia();
  renderRunButton();
  renderEditorOutput();
  updateCounts();
}

function renderHome() {
  const home = state.home;
  if (!home) return;

  elements.homeConcept.textContent = home.concept;
  elements.heroImage.src = home.heroImage || fallbackImage;
  elements.heroImage.onerror = () => {
    elements.heroImage.src = fallbackImage;
  };

}

function renderSkills() {
  const template = document.querySelector("#skill-card-template");
  const cards = state.skills.map((skill) => {
    const display = displayForSkill(skill);
    const media = mediaForSkill(skill);
    const node = template.content.firstElementChild.cloneNode(true);
    node.classList.toggle("is-selected", skill.id === state.selectedSkillId);
    node.setAttribute("aria-label", `${display.title} のEditorを開く`);
    const image = node.querySelector("[data-skill-image]");
    image.src = media?.thumbnail?.localPath || skill.imageUrl || fallbackImage;
    image.onerror = () => {
      image.src = skill.imageUrl || fallbackImage;
    };
    node.querySelector("[data-skill-title]").textContent = display.title;
    node.querySelector("[data-skill-description]").textContent = display.description;
    node.querySelector("[data-card-target]").textContent = skill.path;
    node.addEventListener("click", () => {
      selectSkill(skill.id);
      setTab("editor");
    });
    return node;
  });

  elements.skillList.replaceChildren(...cards);
}

function renderEditorSkillOptions() {
  elements.editorSkillSelect.replaceChildren(
    ...state.skills.map((skill) => {
      const option = document.createElement("option");
      const display = displayForSkill(skill);
      option.value = skill.id;
      option.textContent = `${display.title} (${skill.kind})`;
      option.selected = skill.id === state.selectedSkillId;
      return option;
    })
  );
}

function renderEditorMedia() {
  const media = selectedMedia();
  if (!media) return;

  elements.editorThumbnail.src = media.thumbnail?.localPath || fallbackImage;
  elements.editorThumbnail.alt = `${media.title} thumbnail`;
  elements.editorThumbnail.onerror = () => {
    elements.editorThumbnail.src = fallbackImage;
  };

  elements.editorYoutube.src = media.youtube?.embedUrl || "";
  elements.editorYoutube.title = `${media.title} YouTube video`;
  renderRunButton();
}

function selectSkill(skillId) {
  state.selectedSkillId = skillId;
  state.currentRun = null;
  state.runError = "";
  elements.editorSkillSelect.value = skillId;
  renderSkills();
  renderEditorMedia();
  renderEditorOutput();
}

async function runSelectedSkill() {
  const skill = selectedSkill();
  const media = selectedMedia();
  const execution = media?.execution;
  if (!skill || !execution || state.isRunning) return;

  if (media.id === "gen-appstore-image") {
    await runAppStoreImageSkill(skill, media, execution);
    return;
  }

  if (isFileResultSkill(media)) {
    await runFileResultSkill(skill, media, execution);
    return;
  }

  state.isRunning = true;
  state.currentRun = null;
  state.runError = "";
  renderRunButton();
  renderEditorOutput();

  await delay(900);

  if (state.selectedSkillId !== skill.id) {
    state.isRunning = false;
    renderRunButton();
    renderEditorOutput();
    return;
  }

  state.currentRun = {
    id: `${Date.now()}-${media.id}`,
    skillId: skill.id,
    mediaId: media.id,
    execution,
    generatedAt: new Date().toISOString()
  };
  state.runs = [state.currentRun, ...state.runs];
  state.isRunning = false;
  renderRunButton();
  renderEditorOutput();
  updateCounts();
}

async function runFileResultSkill(skill, media, execution) {
  state.isRunning = true;
  state.currentRun = null;
  state.runError = "";
  renderRunButton();
  renderEditorOutput();

  try {
    const result = await apiGet(resultApiPathForMedia(media));
    state.latestSkillResults[media.id] = result.run || null;
    state.currentRun = fileResultRunToHistoryItem(media.id, result.run, skill, media, execution);
    state.runs = [state.currentRun, ...state.runs.filter((run) => run.id !== state.currentRun.id)];
  } catch (error) {
    state.runError = error.message || "結果ファイルの読み込みに失敗しました。";
  } finally {
    state.isRunning = false;
    renderRunButton();
    renderEditorOutput();
    updateCounts();
  }
}

async function runAppStoreImageSkill(skill, media, execution) {
  state.isRunning = true;
  state.currentRun = null;
  state.runError = "";
  renderRunButton();
  renderEditorOutput();

  try {
    const result = await apiPost("/api/appstore-image/update-preview", buildAppStoreImagePayload());
    state.currentRun = {
      id: result.run.id,
      skillId: skill.id,
      mediaId: media.id,
      execution,
      appStoreRun: result.run,
      generatedAt: result.run.createdAt
    };
    state.latestAppStoreRun = result.run;
    state.runs = [state.currentRun, ...state.runs];
  } catch (error) {
    state.runError = error.message || "AppStore画像生成に失敗しました。";
  } finally {
    state.isRunning = false;
    renderRunButton();
    renderEditorOutput();
    updateCounts();
  }
}

async function updateAppStorePreview() {
  if (state.appStoreIsUpdating || state.appStoreIsSaving || state.isRunning) return;

  state.appStoreIsUpdating = true;
  state.runError = "";
  renderRunButton();
  renderEditorOutput();

  try {
    const result = await apiPost("/api/appstore-image/update-preview", buildAppStoreImagePayload());
    state.latestAppStoreRun = result.run || state.latestAppStoreRun;
    state.currentRun = {
      id: result.run?.id || state.latestAppStoreRun?.id || Date.now(),
      skillId: state.selectedSkillId,
      mediaId: "gen-appstore-image",
      execution: appStoreImageExecution(),
      appStoreRun: result.run,
      generatedAt: result.run?.updatedAt || result.run?.createdAt || new Date().toISOString()
    };
    state.appStoreImageEditor = createAppStoreImageEditorState(appStoreImageExecution(), result);
    state.runs = [state.currentRun, ...state.runs.filter((run) => run.id !== state.currentRun.id)];
  } catch (error) {
    state.runError = error.message || "プレビューの更新に失敗しました。";
  } finally {
    state.appStoreIsUpdating = false;
    renderRunButton();
    renderEditorOutput();
    updateCounts();
  }
}

async function saveAppStoreImages() {
  if (state.appStoreIsUpdating || state.appStoreIsSaving || state.isRunning) return;

  state.appStoreIsSaving = true;
  state.runError = "";
  renderRunButton();
  renderEditorOutput();

  try {
    const result = await apiPost("/api/appstore-image/save", buildAppStoreImagePayload());
    state.latestAppStoreRun = result.run || state.latestAppStoreRun;
    state.currentRun = {
      id: result.run?.id || state.latestAppStoreRun?.id || Date.now(),
      skillId: state.selectedSkillId,
      mediaId: "gen-appstore-image",
      execution: appStoreImageExecution(),
      appStoreRun: result.run,
      generatedAt: result.run?.updatedAt || result.run?.createdAt || new Date().toISOString()
    };
    state.appStoreImageEditor = createAppStoreImageEditorState(appStoreImageExecution(), result);
    state.runs = [state.currentRun, ...state.runs.filter((run) => run.id !== state.currentRun.id)];
  } catch (error) {
    state.runError = error.message || "保存に失敗しました。";
  } finally {
    state.appStoreIsSaving = false;
    renderRunButton();
    renderEditorOutput();
    updateCounts();
  }
}

function renderRunButton() {
  const execution = selectedMedia()?.execution;
  elements.runSkill.disabled = !execution || state.isRunning || state.appStoreIsUpdating || state.appStoreIsSaving;
  elements.runSkill.textContent = state.isRunning || state.appStoreIsUpdating || state.appStoreIsSaving ? execution?.loadingLabel || "生成中..." : "実行";
}

function renderEditorOutput() {
  const media = selectedMedia();
  const execution = media?.execution;
  if (!execution) {
    elements.editorOutput.hidden = true;
    elements.outputContent.replaceChildren();
    setOutputCopyText("");
    return;
  }

  if (media.id === "gen-appstore-image") {
    elements.editorOutput.hidden = false;
    elements.outputType.textContent = executionDisplayLabel(execution);
    elements.outputTitle.textContent = execution.outputTitle || media.title;
    elements.outputContent.replaceChildren(renderAppStoreImageEditor(execution));
    setOutputCopyText("");
    return;
  }

  if (state.isRunning) {
    elements.editorOutput.hidden = false;
    elements.outputType.textContent = executionDisplayLabel(execution);
    elements.outputTitle.textContent = execution.outputTitle || media.title;
    const loading = document.createElement("div");
    loading.className = "editor-loading";
    loading.textContent = execution.loadingLabel || "生成中...";
    elements.outputContent.replaceChildren(loading);
    setOutputCopyText("");
    return;
  }

  if (isFileResultSkill(media)) {
    renderFileResultOutput(media, execution);
    return;
  }

  if (!state.currentRun || state.currentRun.skillId !== state.selectedSkillId) {
    elements.editorOutput.hidden = true;
    elements.outputContent.replaceChildren();
    setOutputCopyText("");
    return;
  }

  elements.editorOutput.hidden = false;
  elements.outputType.textContent = executionDisplayLabel(execution);
  elements.outputTitle.textContent = execution.outputTitle || media.title;

  if (execution.type === "text") {
    elements.outputContent.replaceChildren(renderTextOutput(execution));
    setOutputCopyText("");
  } else if (execution.type === "generation") {
    elements.outputContent.replaceChildren(renderGenerationOutput(execution));
    setOutputCopyText("");
  } else if (execution.type === "editing") {
    elements.outputContent.replaceChildren(renderEditingOutput(execution));
    setOutputCopyText("");
  } else {
    elements.outputContent.replaceChildren(renderTextOutput({ text: "未対応の実行タイプです。" }));
    setOutputCopyText("");
  }
}

function renderFileResultOutput(media, execution) {
  const activeRun = state.currentRun?.skillResultRun || state.latestSkillResults[media.id];
  const text = activeRun?.text || execution.text || "結果ファイルがまだありません。";
  elements.editorOutput.hidden = false;
  elements.outputType.textContent = executionDisplayLabel(execution);
  elements.outputTitle.textContent = activeRun?.outputTitle || (activeRun?.appName ? `${activeRun.appName} ${media.title}` : execution.outputTitle || media.title);
  elements.outputContent.replaceChildren(renderTextOutput({ text }));
  setOutputCopyText(execution.resultSource?.copyButton === false ? "" : text);
}

function renderTextOutput(execution) {
  const pre = document.createElement("pre");
  pre.className = "text-output";
  pre.textContent = execution.text || "";
  return pre;
}

function renderGenerationOutput(execution) {
  const grid = document.createElement("div");
  grid.className = "generated-image-grid";
  const images = (execution.images || []).slice(0, 3);

  grid.replaceChildren(
    ...images.map((item) => {
      const figure = document.createElement("figure");
      const img = document.createElement("img");
      img.src = item.localPath || fallbackImage;
      img.alt = item.label || "";
      img.onerror = () => {
        img.src = fallbackImage;
      };
      const caption = document.createElement("figcaption");
      caption.textContent = item.label || "";
      figure.append(img, caption);
      return figure;
    })
  );

  return grid;
}

function renderEditingOutput(execution) {
  const workspace = document.createElement("div");
  workspace.className = "editing-workspace";

  const preview = renderEditingPreview(execution.preview || {});
  const params = renderParameterPanel(execution.parameters || [], preview);
  workspace.append(preview, params);
  return workspace;
}

function renderAppStoreImageEditor(execution) {
  ensureAppStoreImageEditorState(execution);
  const workspace = document.createElement("div");
  workspace.className = "appstore-editor-workspace";
  workspace.classList.toggle("has-parameters", state.showAppStoreParameters);

  const resultColumn = document.createElement("div");
  resultColumn.className = "appstore-result-column";

  const toolbar = document.createElement("div");
  toolbar.className = "appstore-editor-toolbar";
  const updateButton = document.createElement("button");
  updateButton.className = "dashboard-primary";
  updateButton.type = "button";
  updateButton.textContent = state.appStoreIsUpdating ? "更新中..." : "更新";
  updateButton.disabled = state.appStoreIsUpdating || state.appStoreIsSaving || state.isRunning;
  updateButton.addEventListener("click", () => {
    void updateAppStorePreview();
  });
  const saveButton = document.createElement("button");
  saveButton.className = "dashboard-secondary";
  saveButton.type = "button";
  saveButton.textContent = state.appStoreIsSaving ? "保存中..." : "保存";
  saveButton.disabled = state.appStoreIsUpdating || state.appStoreIsSaving || state.isRunning;
  saveButton.addEventListener("click", () => {
    void saveAppStoreImages();
  });
  toolbar.append(updateButton, saveButton);
  if (!state.showAppStoreParameters) {
    const openButton = document.createElement("button");
    openButton.className = "dashboard-secondary";
    openButton.type = "button";
    openButton.textContent = "パラメータ";
    openButton.addEventListener("click", () => {
      state.showAppStoreParameters = true;
      renderEditorOutput();
    });
    toolbar.append(openButton);
  }

  resultColumn.append(toolbar, renderAppStoreResultArea());
  workspace.append(resultColumn);
  if (state.showAppStoreParameters) {
    workspace.append(renderAppStoreParameterPanel(execution));
  }
  return workspace;
}

function renderAppStoreResultArea() {
  const section = document.createElement("section");
  section.className = "appstore-result-area";

  if (state.isRunning || state.appStoreIsUpdating || state.appStoreIsSaving) {
    const loading = document.createElement("div");
    loading.className = "editor-loading";
    loading.textContent = state.appStoreIsSaving ? "保存中..." : state.appStoreIsUpdating ? "プレビュー更新中..." : "生成中...";
    section.append(loading);
    return section;
  }

  if (state.runError) {
    const error = document.createElement("div");
    error.className = "editor-error";
    error.textContent = state.runError;
    section.append(error);
    return section;
  }

  const activeRun = state.currentRun?.appStoreRun || state.latestAppStoreRun;
  const images = activeRun?.images || [];
  if (!images.length) {
    const placeholder = document.createElement("div");
    placeholder.className = "appstore-result-placeholder";
    placeholder.textContent = "実行すると、生成されたApp Store画像がここに横並びで表示されます。";
    section.append(placeholder);
    return section;
  }

  const rail = document.createElement("div");
  rail.className = "appstore-result-rail";
  rail.replaceChildren(
    ...images.map((image) => {
      const figure = document.createElement("figure");
      figure.className = "appstore-result-card";
      const img = document.createElement("img");
      img.src = withCacheBuster(image.canonicalUrl || image.url, activeRun.updatedAt || activeRun.createdAt);
      img.alt = image.title;
      const caption = document.createElement("figcaption");
      caption.textContent = image.title;
      figure.append(img, caption);
      return figure;
    })
  );
  section.append(rail);
  return section;
}

function renderAppStoreParameterPanel(execution) {
  const editorState = ensureAppStoreImageEditorState(execution);
  const panel = document.createElement("form");
  panel.className = "appstore-param-panel";
  panel.addEventListener("submit", (event) => event.preventDefault());

  const header = document.createElement("div");
  header.className = "appstore-param-panel__head";
  const title = document.createElement("strong");
  title.textContent = "パラメータ調整";
  const closeButton = document.createElement("button");
  closeButton.className = "appstore-param-close";
  closeButton.type = "button";
  closeButton.setAttribute("aria-label", "パラメータを閉じる");
  closeButton.textContent = "×";
  closeButton.addEventListener("click", () => {
    state.showAppStoreParameters = false;
    renderEditorOutput();
  });
  header.append(title, closeButton);
  const planPath = document.createElement("small");
  planPath.className = "appstore-plan-path";
  planPath.textContent = editorState.planPath || "output/app-store-screenshots/screenshot-plan.json";
  panel.append(header, planPath);

  if (state.appStorePlanError) {
    const error = document.createElement("div");
    error.className = "editor-error editor-error--compact";
    error.textContent = state.appStorePlanError;
    panel.append(error);
  }

  const renderGroup = document.createElement("section");
  renderGroup.className = "appstore-slide-control appstore-slide-control--render";
  const renderHeading = document.createElement("strong");
  renderHeading.textContent = "共通レンダー設定";

  const phoneScaleField = createAppStoreField("スマホ倍率", "number", editorState.renderAdjustments.phoneScale, (value) => {
    editorState.renderAdjustments.phoneScale = toNumber(value, 1.12);
  });
  phoneScaleField.querySelector("input").step = "0.01";
  phoneScaleField.querySelector("input").min = "0.5";
  phoneScaleField.querySelector("input").max = "2";

  const headlineWeightField = createAppStoreField("見出しの太さ", "number", editorState.renderAdjustments.headlineWeight, (value) => {
    editorState.renderAdjustments.headlineWeight = Math.round(toNumber(value, 700));
  });
  headlineWeightField.querySelector("input").step = "50";
  headlineWeightField.querySelector("input").min = "300";
  headlineWeightField.querySelector("input").max = "900";

  const counterField = document.createElement("label");
  counterField.className = "appstore-checkbox-field";
  const counterInput = document.createElement("input");
  counterInput.type = "checkbox";
  counterInput.checked = editorState.renderAdjustments.removedSlideCounters;
  counterInput.addEventListener("change", () => {
    editorState.renderAdjustments.removedSlideCounters = counterInput.checked;
  });
  const counterText = document.createElement("span");
  counterText.textContent = "ページ数表示を消す";
  counterField.append(counterInput, counterText);

  renderGroup.append(renderHeading, phoneScaleField, headlineWeightField, counterField);
  panel.append(renderGroup);

  editorState.plan.slides.forEach((slide, index) => {
    const group = document.createElement("section");
    group.className = "appstore-slide-control";

    const heading = document.createElement("strong");
    heading.textContent = `${slide.order || index + 1}枚目`;

    const headlineField = createAppStoreField("見出し", "textarea", slide.headline, (value) => {
      slide.headline = value;
    });

    const labelField = createAppStoreField("ラベル", "text", slide.label, (value) => {
      slide.label = value;
    });

    const screenImageField = createAppStoreScreenImageField(slide);

    const layoutField = document.createElement("label");
    const layoutLabel = document.createElement("span");
    layoutLabel.textContent = "レイアウト";
    const layoutSelect = document.createElement("select");
    ["hero", "device-bottom", "device-top"].forEach((layout) => {
      const option = document.createElement("option");
      option.value = layout;
      option.textContent = layout;
      option.selected = layout === slide.layout;
      layoutSelect.append(option);
    });
    layoutSelect.addEventListener("change", () => {
      slide.layout = layoutSelect.value;
    });
    layoutField.append(layoutLabel, layoutSelect);

    const offsetField = createAppStoreField("スマホ上下位置", "number", editorState.renderAdjustments.phoneYOffsetBySlide[slide.order] || 0, (value) => {
      const offset = toNumber(value, 0);
      if (offset === 0) {
        delete editorState.renderAdjustments.phoneYOffsetBySlide[slide.order];
      } else {
        editorState.renderAdjustments.phoneYOffsetBySlide[slide.order] = offset;
      }
    });
    offsetField.querySelector("input").step = "10";

    group.append(heading, headlineField, labelField, screenImageField, layoutField, offsetField);
    panel.append(group);
  });

  const actions = document.createElement("div");
  actions.className = "appstore-param-actions";
  const updateButton = document.createElement("button");
  updateButton.className = "dashboard-primary";
  updateButton.type = "button";
  updateButton.textContent = state.appStoreIsUpdating ? "更新中..." : "更新";
  updateButton.disabled = state.appStoreIsUpdating || state.appStoreIsSaving || state.isRunning;
  updateButton.addEventListener("click", () => {
    void updateAppStorePreview();
  });
  const saveButton = document.createElement("button");
  saveButton.className = "dashboard-secondary";
  saveButton.type = "button";
  saveButton.textContent = state.appStoreIsSaving ? "保存中..." : "保存";
  saveButton.disabled = state.appStoreIsUpdating || state.appStoreIsSaving || state.isRunning;
  saveButton.addEventListener("click", () => {
    void saveAppStoreImages();
  });
  actions.append(updateButton, saveButton);
  panel.append(actions);

  return panel;
}

function createAppStoreField(labelText, type, value, onInput) {
  const field = document.createElement("label");
  const label = document.createElement("span");
  label.textContent = labelText;
  let control;
  if (type === "textarea") {
    control = document.createElement("textarea");
    control.rows = 3;
  } else {
    control = document.createElement("input");
    control.type = type;
  }
  control.value = value ?? "";
  control.addEventListener("input", () => onInput(control.value));
  control.addEventListener("change", () => onInput(control.value));
  field.append(label, control);
  return field;
}

function createAppStoreScreenImageField(slide) {
  const field = document.createElement("label");
  field.className = "appstore-file-field";
  const label = document.createElement("span");
  label.textContent = "スクショ画像";
  const control = document.createElement("input");
  control.type = "file";
  control.accept = "image/png,image/jpeg,image/webp,image/svg+xml";
  control.addEventListener("change", () => {
    const file = control.files?.[0];
    if (file) void handleAppStoreScreenUpload(slide, file);
  });
  const current = document.createElement("small");
  current.className = "appstore-upload-name";
  current.textContent = slide.screen_upload?.name
    ? `選択中: ${slide.screen_upload.name}`
    : `現在: ${slide.screen_path || "未選択"}`;
  field.append(label, control, current);
  return field;
}

function renderEditingPreview(previewConfig) {
  const preview = document.createElement("div");
  preview.className = `editing-preview editing-preview--${previewConfig.kind || "image"}`;
  preview.style.setProperty("--preview-accent", previewConfig.accentColor || "#ff3b25");

  const label = document.createElement("span");
  label.className = "editing-preview__label";
  label.textContent = previewConfig.kind === "video" ? "Video Preview" : "Image Preview";

  const title = document.createElement("strong");
  title.className = "editing-preview__title";
  title.dataset.previewTitle = "";
  title.textContent = previewConfig.title || "";

  const subtitle = document.createElement("p");
  subtitle.className = "editing-preview__subtitle";
  subtitle.textContent = previewConfig.subtitle || "";

  const notes = document.createElement("div");
  notes.className = "editing-preview__notes";
  notes.replaceChildren(
    ...(previewConfig.notes || []).map((note) => {
      const chip = document.createElement("span");
      chip.textContent = note;
      return chip;
    })
  );

  preview.append(label, title, subtitle, notes);
  return preview;
}

function renderParameterPanel(parameters, preview) {
  const panel = document.createElement("form");
  panel.className = "parameter-panel";

  const title = document.createElement("strong");
  title.textContent = "パラメータ調整";
  panel.append(title);

  parameters.forEach((parameter) => {
    const field = document.createElement("label");
    field.className = "parameter-field";
    const label = document.createElement("span");
    label.textContent = parameter.label;
    const control = createParameterControl(parameter, preview);
    field.append(label, control);
    panel.append(field);
  });

  return panel;
}

function createParameterControl(parameter, preview) {
  let control;
  if (parameter.type === "select") {
    control = document.createElement("select");
    control.replaceChildren(
      ...(parameter.options || []).map((optionValue) => {
        const option = document.createElement("option");
        option.value = optionValue;
        option.textContent = optionValue;
        option.selected = optionValue === parameter.value;
        return option;
      })
    );
  } else {
    control = document.createElement("input");
    control.type = parameter.type || "text";
    if (parameter.type === "checkbox") {
      control.checked = Boolean(parameter.value);
    } else {
      control.value = parameter.value ?? "";
    }
    if (parameter.min !== undefined) control.min = parameter.min;
    if (parameter.max !== undefined) control.max = parameter.max;
  }

  control.name = parameter.id;
  control.addEventListener("input", () => updateEditingPreview(parameter, control, preview));
  control.addEventListener("change", () => updateEditingPreview(parameter, control, preview));
  return control;
}

function updateEditingPreview(parameter, control, preview) {
  const value = control.type === "checkbox" ? control.checked : control.value;
  if (parameter.id === "accentColor") {
    preview.style.setProperty("--preview-accent", value);
  }
  if (parameter.id === "headline") {
    const title = preview.querySelector("[data-preview-title]");
    if (title) title.textContent = value;
  }
}

function appStoreImageExecution() {
  return state.media.find((item) => item.id === "gen-appstore-image")?.execution;
}

function createAppStoreImageEditorState(execution, planResult = {}) {
  const plan = planResult.plan || buildDefaultAppStorePlanFromExecution(execution);
  return {
    planPath: planResult.planPath || "output/app-store-screenshots/screenshot-plan.json",
    plan: cloneAppStorePlan(plan),
    renderAdjustments: normalizeEditorRenderAdjustments(planResult.renderAdjustments)
  };
}

function ensureAppStoreImageEditorState(execution) {
  if (!state.appStoreImageEditor) {
    state.appStoreImageEditor = createAppStoreImageEditorState(execution || appStoreImageExecution());
  }
  return state.appStoreImageEditor;
}

function buildAppStoreImagePayload() {
  const editorState = ensureAppStoreImageEditorState(appStoreImageExecution());
  return {
    plan: cloneAppStorePlan(editorState.plan),
    renderAdjustments: normalizeEditorRenderAdjustments(editorState.renderAdjustments)
  };
}

function buildDefaultAppStorePlanFromExecution(execution) {
  const editor = execution?.editor || {};
  return {
    app_name: "OpenSoloMakersKits App",
    target_stores: ["apple-app-store"],
    devices: ["iphone"],
    locales: ["ja"],
    brand: {},
    slides: (editor.slides || []).map((slide, index) => ({
      order: index + 1,
      goal: `slide-${index + 1}`,
      screen_slug: slide.id || `slide-${index + 1}`,
      screen_path: `output/app-store-screenshots/source-assets/screenshots/apple/iphone/ja/${String(index + 1).padStart(2, "0")}.png`,
      headline: slide.title || `スクリーンショット ${index + 1}`,
      label: `SLIDE ${index + 1}`,
      visual_tone: "",
      background_direction: "",
      layout: index === 0 ? "hero" : index === 2 || index === 4 ? "device-top" : "device-bottom"
    }))
  };
}

function cloneAppStorePlan(plan) {
  return {
    ...plan,
    brand: { ...(plan?.brand || {}) },
    target_stores: [...(plan?.target_stores || ["apple-app-store"])],
    devices: [...(plan?.devices || ["iphone"])],
    locales: [...(plan?.locales || ["ja"])],
    slides: (plan?.slides || []).map((slide, index) => ({
      order: Number(slide.order || index + 1),
      goal: String(slide.goal || `slide-${index + 1}`),
      screen_slug: String(slide.screen_slug || `slide-${index + 1}`),
      screen_path: String(slide.screen_path || ""),
      headline: String(slide.headline || ""),
      label: String(slide.label || `SLIDE ${index + 1}`),
      visual_tone: String(slide.visual_tone || ""),
      background_direction: String(slide.background_direction || ""),
      layout: String(slide.layout || "device-bottom"),
      ...(slide.screen_upload ? { screen_upload: { ...slide.screen_upload } } : {})
    }))
  };
}

function normalizeEditorRenderAdjustments(value = {}) {
  const incoming = value && typeof value === "object" ? value : {};
  const phoneYOffsetBySlide = {};
  Object.entries(incoming.phoneYOffsetBySlide || {}).forEach(([order, offset]) => {
    const numericOffset = toNumber(offset, 0);
    if (numericOffset !== 0) {
      phoneYOffsetBySlide[Number(order)] = numericOffset;
    }
  });
  return {
    headlineWeight: Math.round(toNumber(incoming.headlineWeight, 700)),
    phoneScale: toNumber(incoming.phoneScale ?? incoming.phoneScaleFromOriginalRenderer, 1.12),
    phoneYOffsetBySlide,
    removedSlideCounters: incoming.removedSlideCounters !== false
  };
}

async function handleAppStoreScreenUpload(slide, file) {
  if (!file) return;
  slide.screen_upload = {
    name: file.name,
    dataUrl: await readFileAsDataUrl(file)
  };
  renderEditorOutput();
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(String(reader.result || "")));
    reader.addEventListener("error", () => reject(reader.error || new Error("画像の読み込みに失敗しました。")));
    reader.readAsDataURL(file);
  });
}

function selectedSkill() {
  return state.skills.find((skill) => skill.id === state.selectedSkillId);
}

function appStoreRunToHistoryItem(run) {
  return {
    id: run.id,
    skillId: "skills/gen-appstore-image/SKILL.md",
    mediaId: "gen-appstore-image",
    execution: appStoreImageExecution(),
    appStoreRun: run,
    generatedAt: run.createdAt
  };
}

function fileResultRunToHistoryItem(mediaId, run, skill = null, media = null, execution = null) {
  const fallbackExecution = execution || fileResultExecution(mediaId);
  return {
    id: run?.id || `${mediaId}-latest`,
    skillId: skill?.id || run?.skillPath || media?.skillPath || `skills/${mediaId}/SKILL.md`,
    mediaId: media?.id || mediaId,
    execution: run?.text ? { ...fallbackExecution, text: run.text } : fallbackExecution,
    skillResultRun: run,
    generatedAt: run?.createdAt || new Date().toISOString()
  };
}

function fileResultExecution(mediaId) {
  return state.media.find((item) => item.id === mediaId)?.execution;
}

async function fetchConfiguredSkillResults(mediaItems) {
  const resultEntries = await Promise.all(
    mediaItems
      .filter(isFileResultSkill)
      .map(async (media) => {
        const result = await apiGet(resultApiPathForMedia(media)).catch(() => ({ run: null }));
        return [media.id, result.run];
      })
  );
  return Object.fromEntries(resultEntries.filter(([, run]) => run));
}

function isFileResultSkill(media) {
  return media?.execution?.displayType === "file-result" || Boolean(media?.execution?.resultSource?.latestApiPath);
}

function resultApiPathForMedia(media) {
  return media?.execution?.resultSource?.latestApiPath || `/api/skill-results/${encodeURIComponent(media.id)}/latest`;
}

function setOutputCopyText(text) {
  state.outputCopyText = String(text || "");
  if (!elements.outputCopy) return;

  elements.outputCopy.hidden = !state.outputCopyText;
  elements.outputCopy.classList.remove("is-copied");
  elements.outputCopy.setAttribute("aria-label", "結果をコピー");
  elements.outputCopy.title = "結果をコピー";
}

async function copyOutputText() {
  if (!state.outputCopyText || !elements.outputCopy) return;
  await writeClipboard(state.outputCopyText);
  elements.outputCopy.classList.add("is-copied");
  elements.outputCopy.setAttribute("aria-label", "コピーしました");
  elements.outputCopy.title = "コピーしました";
  clearTimeout(state.outputCopyResetTimer);
  state.outputCopyResetTimer = window.setTimeout(() => {
    elements.outputCopy.classList.remove("is-copied");
    elements.outputCopy.setAttribute("aria-label", "結果をコピー");
    elements.outputCopy.title = "結果をコピー";
  }, 1600);
}

async function writeClipboard(text) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      // Fall back to a temporary textarea when clipboard permission is unavailable.
    }
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  document.body.append(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
}

function selectedMedia() {
  const skill = selectedSkill();
  return mediaForSkill(skill) || state.media[0];
}

function mediaForSkill(skill) {
  const mediaId = skill?.rootSlug || skill?.slug || "";
  return state.media.find((item) => item.id === mediaId);
}

function executionTypeLabel(type) {
  return state.config?.executionTypes?.[type]?.label || type || "";
}

function executionDisplayLabel(execution) {
  return state.config?.displayTypes?.[execution?.displayType]?.label || executionTypeLabel(execution?.type);
}

function displayForSkill(skill) {
  const media = mediaForSkill(skill);
  return {
    title: media?.title || skill?.title || skill?.name || "",
    description: media?.description || skill?.summary || "スキルの入力値をもとに、必要な生成物を作成します。"
  };
}

function orderSkillsByMedia(skills) {
  const order = new Map(state.media.map((item, index) => [item.id, index]));
  return [...skills].sort((a, b) => {
    const aOrder = order.get(a.rootSlug || a.slug) ?? Number.MAX_SAFE_INTEGER;
    const bOrder = order.get(b.rootSlug || b.slug) ?? Number.MAX_SAFE_INTEGER;
    if (aOrder !== bOrder) return aOrder - bOrder;
    return a.path.localeCompare(b.path);
  });
}

function setTab(tabName) {
  state.activeTab = tabName;
  document.querySelectorAll("[data-tab-button]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.tabButton === tabName);
  });
  document.querySelectorAll("[data-tab-panel]").forEach((panel) => {
    panel.classList.toggle("is-active", panel.dataset.tabPanel === tabName);
  });
}

function updateCounts() {
  const counts = {
    skills: state.home?.counts?.skills || state.skills.length,
    skillsMetric: state.home?.counts?.skills || state.skills.length,
    bundles: state.home?.counts?.bundles || state.skills.filter((skill) => skill.kind !== "skill").length,
    images: state.home?.counts?.images || 0,
    runs: state.runs.length,
    runsMetric: state.runs.length
  };

  Object.entries(counts).forEach(([key, value]) => {
    document.querySelectorAll(`[data-count="${key}"]`).forEach((node) => {
      node.textContent = value;
    });
  });
}

function readableName(fileName) {
  return fileName.replace(/\.[^.]+$/, "").replace(/-/g, " ");
}

function toNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function withCacheBuster(url, version) {
  if (!url) return "";
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}v=${encodeURIComponent(version || Date.now())}`;
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function formatDate(value) {
  if (!value) return "";
  return new Date(value).toLocaleString("ja-JP", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

async function apiGet(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

async function apiPost(path, body) {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}
