const DATA_ROOT = "../../data/book-digest";
const STORAGE_KEY = "book_digest_admin_state_v1";

const state = {
  catalog: [],
  booksById: {},
  currentBookId: null,
  currentSlideIndex: 0,
  mode: "reader",
  adminDraft: createEmptyDraft(),
  adminPublishedPreview: null,
};

function isLocalEnvironment() {
  const { hostname, protocol } = window.location;
  return (
    protocol === "file:" ||
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1" ||
    hostname.endsWith(".local")
  );
}

const canUseAdmin = isLocalEnvironment();

const elements = {
  topbarPanel: document.querySelector(".topbar-panel"),
  readerModeBtn: document.querySelector("#readerModeBtn"),
  adminModeBtn: document.querySelector("#adminModeBtn"),
  readerSection: document.querySelector("#readerSection"),
  adminSection: document.querySelector("#adminSection"),
  libraryList: document.querySelector("#libraryList"),
  readerBookTitle: document.querySelector("#readerBookTitle"),
  readerProgressBadge: document.querySelector("#readerProgressBadge"),
  readerProgressFill: document.querySelector("#readerProgressFill"),
  readerSlide: document.querySelector("#readerSlide"),
  prevSlideBtn: document.querySelector("#prevSlideBtn"),
  nextSlideBtn: document.querySelector("#nextSlideBtn"),
  bookTitleInput: document.querySelector("#bookTitleInput"),
  bookAuthorInput: document.querySelector("#bookAuthorInput"),
  bookThemeInput: document.querySelector("#bookThemeInput"),
  sourceModeSelect: document.querySelector("#sourceModeSelect"),
  bookSubtitleInput: document.querySelector("#bookSubtitleInput"),
  sourceTextInput: document.querySelector("#sourceTextInput"),
  newDraftBtn: document.querySelector("#newDraftBtn"),
  loadPublishedBtn: document.querySelector("#loadPublishedBtn"),
  generatePromptBtn: document.querySelector("#generatePromptBtn"),
  addSlideBtn: document.querySelector("#addSlideBtn"),
  publishPreviewBtn: document.querySelector("#publishPreviewBtn"),
  saveJsonBtn: document.querySelector("#saveJsonBtn"),
  exportJsonBtn: document.querySelector("#exportJsonBtn"),
  saveStatus: document.querySelector("#saveStatus"),
  draftSlideCount: document.querySelector("#draftSlideCount"),
  slidesEditorList: document.querySelector("#slidesEditorList"),
  promptOutput: document.querySelector("#promptOutput"),
  adminPreviewMeta: document.querySelector("#adminPreviewMeta"),
  adminPreviewSlide: document.querySelector("#adminPreviewSlide"),
  jsonOutput: document.querySelector("#jsonOutput"),
};

function createEmptyDraft() {
  return {
    id: "",
    title: "",
    author: "",
    theme: "",
    status: "draft",
    sourceMode: "free_generate",
    sourceText: "",
    aiDraft: {
      subtitle: "",
      slides: [
        {
          text: "",
        },
      ],
    },
    published: {
      subtitle: "",
      slides: [],
    },
    updatedAt: new Date().toISOString(),
  };
}

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function slugifyBookId(title = "", author = "") {
  const seed = `${title} ${author}`.trim() || "untitled-book";
  return seed
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function escapeHtml(value = "") {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function loadPublishedBooks() {
  const indexResponse = await fetch(`${DATA_ROOT}/books-index.json`);
  if (!indexResponse.ok) {
    throw new Error("Failed to load book index.");
  }

  const indexData = await indexResponse.json();
  const bookDetails = await Promise.all(
    (indexData.books || []).map(async (book) => {
      const response = await fetch(`${DATA_ROOT}/books/${book.id}.json`);
      if (!response.ok) {
        throw new Error(`Failed to load book ${book.id}.`);
      }

      const detail = await response.json();
      return {
        ...book,
        ...detail,
      };
    }),
  );

  state.catalog = bookDetails;
  state.booksById = Object.fromEntries(bookDetails.map((book) => [book.id, book]));
  state.currentBookId = indexData.featuredBookId || bookDetails[0]?.id || null;
}

function getCurrentBook() {
  if (!state.currentBookId) {
    return null;
  }

  return state.booksById[state.currentBookId] || null;
}

function getCurrentSlides() {
  const book = getCurrentBook();
  return Array.isArray(book?.published?.slides) ? book.published.slides : [];
}

function renderLibrary() {
  if (!elements.libraryList) {
    return;
  }

  if (state.catalog.length === 0) {
    elements.libraryList.className = "library-list empty-state";
    elements.libraryList.textContent = "还没有已发布书籍。";
    return;
  }

  elements.libraryList.className = "library-list";
  elements.libraryList.innerHTML = state.catalog
    .map((book) => {
      const activeClass = book.id === state.currentBookId ? " is-active" : "";

      return `
        <button class="library-item${activeClass}" type="button" data-book-id="${escapeHtml(book.id)}">
          <h3>《${escapeHtml(book.title)}》</h3>
        </button>
      `;
    })
    .join("");
}

function renderReader() {
  const book = getCurrentBook();
  const slides = getCurrentSlides();

  if (!book || slides.length === 0) {
    elements.readerBookTitle.textContent = "没有可读内容";
    elements.readerProgressBadge.textContent = "0 / 0";
    elements.readerProgressFill.style.width = "0%";
    elements.readerSlide.className = "reader-slide empty-state";
    elements.readerSlide.textContent = "请选择左侧的一本书开始阅读。";
    elements.prevSlideBtn.disabled = true;
    elements.nextSlideBtn.disabled = true;
    return;
  }

  const boundedIndex = Math.min(state.currentSlideIndex, slides.length - 1);
  state.currentSlideIndex = Math.max(boundedIndex, 0);
  const currentSlide = slides[state.currentSlideIndex];

  elements.readerBookTitle.textContent = `《${book.title}》`;
  elements.readerProgressBadge.textContent = `${state.currentSlideIndex + 1} / ${slides.length}`;
  elements.readerProgressFill.style.width = `${((state.currentSlideIndex + 1) / slides.length) * 100}%`;
  elements.readerSlide.className = "reader-slide";
  elements.readerSlide.innerHTML = `
    <div class="reader-slide-content">
      <p class="reader-slide-text">${escapeHtml(currentSlide.text || "")}</p>
    </div>
  `;

  elements.prevSlideBtn.disabled = state.currentSlideIndex === 0;
  elements.nextSlideBtn.disabled = state.currentSlideIndex === slides.length - 1;
}

function renderMode() {
  if (!canUseAdmin) {
    state.mode = "reader";
  }

  const isReader = state.mode === "reader";
  elements.readerModeBtn.classList.toggle("is-active", isReader);
  elements.adminModeBtn.classList.toggle("is-active", !isReader);
  elements.readerModeBtn.setAttribute("aria-selected", String(isReader));
  elements.adminModeBtn.setAttribute("aria-selected", String(!isReader));
  elements.readerSection.classList.toggle("hidden", !isReader);
  elements.adminSection.classList.toggle("hidden", isReader);
}

function renderAdminForm() {
  const draft = state.adminDraft;
  elements.bookTitleInput.value = draft.title || "";
  elements.bookAuthorInput.value = draft.author || "";
  elements.bookThemeInput.value = draft.theme || "";
  elements.sourceModeSelect.value = draft.sourceMode || "free_generate";
  elements.bookSubtitleInput.value = draft.aiDraft?.subtitle || "";
  elements.sourceTextInput.value = draft.sourceText || "";
}

function renderSlidesEditor() {
  const slides = state.adminDraft?.aiDraft?.slides || [];
  elements.draftSlideCount.textContent = `${slides.length} 页`;

  if (slides.length === 0) {
    elements.slidesEditorList.className = "slides-editor-list empty-state";
    elements.slidesEditorList.textContent = "还没有草稿页。点击“新增一页”开始。";
    return;
  }

  elements.slidesEditorList.className = "slides-editor-list";
  elements.slidesEditorList.innerHTML = slides
    .map(
      (slide, index) => `
        <article class="slide-editor-card">
          <div class="slide-editor-head">
            <h3>第 ${index + 1} 页</h3>
            <div class="slide-editor-actions">
              <button class="slide-action-btn" type="button" data-action="move-up" data-slide-index="${index}">上移</button>
              <button class="slide-action-btn" type="button" data-action="move-down" data-slide-index="${index}">下移</button>
              <button class="slide-action-btn" type="button" data-action="duplicate" data-slide-index="${index}">复制</button>
              <button class="slide-action-btn" type="button" data-action="delete" data-slide-index="${index}">删除</button>
            </div>
          </div>
          <textarea class="slide-editor-textarea" data-slide-index="${index}" placeholder="每页保留 1-2 句话，控制在 45-90 字左右。">${escapeHtml(
            slide.text || "",
          )}</textarea>
        </article>
      `,
    )
    .join("");
}

function renderAdminPreview() {
  const preview = state.adminPublishedPreview;

  if (!preview || !Array.isArray(preview.published?.slides) || preview.published.slides.length === 0) {
    elements.adminPreviewMeta.textContent = "还没有发布预览。";
    elements.adminPreviewSlide.className = "admin-preview-slide empty-state";
    elements.adminPreviewSlide.textContent = "点击“发布到右侧预览”后会显示正式版第一页。";
    return;
  }

  elements.adminPreviewMeta.textContent = `${preview.title || "未命名书籍"} · ${preview.author || "未知作者"} · 共 ${preview.published.slides.length} 页`;
  elements.adminPreviewSlide.className = "admin-preview-slide";
  elements.adminPreviewSlide.textContent = preview.published.slides[0]?.text || "";
}

function syncDraftFromForm() {
  const draft = state.adminDraft;
  draft.title = elements.bookTitleInput.value.trim();
  draft.author = elements.bookAuthorInput.value.trim();
  draft.theme = elements.bookThemeInput.value.trim();
  draft.sourceMode = elements.sourceModeSelect.value;
  draft.sourceText = elements.sourceTextInput.value.trim();
  draft.aiDraft.subtitle = elements.bookSubtitleInput.value.trim();
  draft.id = slugifyBookId(draft.title, draft.author);
  draft.updatedAt = new Date().toISOString();
  persistDraft();
}

function persistDraft() {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        adminDraft: state.adminDraft,
        adminPublishedPreview: state.adminPublishedPreview,
      }),
    );
  } catch (error) {
    console.warn("Failed to persist admin draft.", error);
  }
}

function hydrateDraftFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return;
    }

    const parsed = JSON.parse(raw);
    if (parsed.adminDraft) {
      state.adminDraft = parsed.adminDraft;
    }
    if (parsed.adminPublishedPreview) {
      state.adminPublishedPreview = parsed.adminPublishedPreview;
    }
  } catch (error) {
    console.warn("Failed to restore admin draft.", error);
  }
}

function loadCurrentPublishedIntoAdmin() {
  const book = getCurrentBook();
  if (!book) {
    return;
  }

  state.adminDraft = {
    id: book.id || "",
    title: book.title || "",
    author: book.author || "",
    theme: book.theme || "",
    status: "draft",
    sourceMode: book.sourceMode || "free_generate",
    sourceText: book.sourceText || "",
    aiDraft: deepClone(book.aiDraft || { subtitle: "", slides: [] }),
    published: deepClone(book.published || { subtitle: "", slides: [] }),
    updatedAt: new Date().toISOString(),
  };

  state.adminPublishedPreview = deepClone(book);
  persistDraft();
  renderAdminForm();
  renderSlidesEditor();
  renderAdminPreview();
  renderExportOutput("");
}

function newDraft() {
  state.adminDraft = createEmptyDraft();
  state.adminPublishedPreview = null;
  elements.promptOutput.value = "";
  renderAdminForm();
  renderSlidesEditor();
  renderAdminPreview();
  renderExportOutput("");
  persistDraft();
}

function addSlide(text = "") {
  state.adminDraft.aiDraft.slides.push({ text });
  state.adminDraft.updatedAt = new Date().toISOString();
  renderSlidesEditor();
  persistDraft();
}

function moveSlide(index, direction) {
  const slides = state.adminDraft.aiDraft.slides;
  const nextIndex = index + direction;
  if (nextIndex < 0 || nextIndex >= slides.length) {
    return;
  }

  [slides[index], slides[nextIndex]] = [slides[nextIndex], slides[index]];
  renderSlidesEditor();
  persistDraft();
}

function duplicateSlide(index) {
  const slide = state.adminDraft.aiDraft.slides[index];
  if (!slide) {
    return;
  }

  state.adminDraft.aiDraft.slides.splice(index + 1, 0, deepClone(slide));
  renderSlidesEditor();
  persistDraft();
}

function deleteSlide(index) {
  const slides = state.adminDraft.aiDraft.slides;
  if (slides.length <= 1) {
    slides[0].text = "";
  } else {
    slides.splice(index, 1);
  }
  renderSlidesEditor();
  persistDraft();
}

function publishPreview() {
  syncDraftFromForm();
  const preview = deepClone(state.adminDraft);
  preview.status = "published";
  preview.published = {
    subtitle: preview.aiDraft.subtitle,
    slides: deepClone(preview.aiDraft.slides).filter((slide) => slide.text.trim()),
  };
  preview.updatedAt = new Date().toISOString();
  state.adminPublishedPreview = preview;
  renderAdminPreview();
  renderExportOutput("");
  persistDraft();
}

function generatePrompt() {
  syncDraftFromForm();
  const draft = state.adminDraft;
  const withSource = draft.sourceMode === "with_source" && draft.sourceText;
  const prompt = [
    "你是一名资深中文内容编辑，需要把一本书压缩成适合手机竖屏翻页阅读的 3 分钟版。",
    "",
    "输出要求：",
    "1. 输出 JSON，不要输出额外说明。",
    '2. JSON 结构必须为 {"subtitle": "...", "slides": [{"text": "..."}]}。',
    "3. slides 控制在 10-15 页。",
    "4. 每页只写 1-2 句话，语言流畅，适合独立成页阅读。",
    "5. 不要强行套固定结构，以这本书本身最自然的节奏组织内容。",
    "6. 避免空话、避免过度剧透式复述，优先保留真正有记忆点的信息。",
    "",
    `书名：${draft.title || "未填写"}`,
    `作者：${draft.author || "未填写"}`,
    `一句话定位：${draft.aiDraft.subtitle || "未填写"}`,
    `生成模式：${withSource ? "基于材料生成" : "自由生成"}`,
    "",
    withSource ? "参考材料：" : "说明：当前没有提供材料，请基于书名与作者生成一版可供人工审核的初稿。",
    withSource ? draft.sourceText : "",
  ]
    .filter(Boolean)
    .join("\n");

  elements.promptOutput.value = prompt;
}

function renderExportOutput(text) {
  elements.jsonOutput.value = text;
}

function setSaveStatus(message, isError = false) {
  if (!elements.saveStatus) {
    return;
  }

  elements.saveStatus.textContent = message;
  elements.saveStatus.style.color = isError ? "#9f2d2d" : "";
}

function exportJson() {
  syncDraftFromForm();
  const record = deepClone(state.adminPublishedPreview || state.adminDraft);
  record.id = slugifyBookId(record.title, record.author);
  record.updatedAt = new Date().toISOString();
  if (!record.published?.slides?.length) {
    record.published = {
      subtitle: record.aiDraft.subtitle,
      slides: deepClone(record.aiDraft.slides).filter((slide) => slide.text.trim()),
    };
  }
  renderExportOutput(JSON.stringify(record, null, 2));
}

async function saveJson() {
  syncDraftFromForm();

  if (!state.adminPublishedPreview) {
    publishPreview();
  }

  const payload = deepClone(state.adminPublishedPreview || state.adminDraft);
  elements.saveJsonBtn.disabled = true;
  setSaveStatus("正在保存到 JSON 文件...");

  try {
    const response = await fetch("/api/book-digest-save", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();
    if (!response.ok || !result.ok) {
      throw new Error(result.error || "保存失败。");
    }

    const savedRecord = deepClone(payload);
    savedRecord.id = result.id || savedRecord.id;
    savedRecord.status = "published";
    savedRecord.updatedAt = result.updatedAt || new Date().toISOString();

    state.booksById[savedRecord.id] = savedRecord;
    const existingCatalogIndex = state.catalog.findIndex((book) => book.id === savedRecord.id);
    const catalogSummary = {
      ...savedRecord,
      durationLabel: "约 3 分钟",
      theme: savedRecord.theme || "未分类",
    };

    if (existingCatalogIndex >= 0) {
      state.catalog[existingCatalogIndex] = catalogSummary;
    } else {
      state.catalog.unshift(catalogSummary);
    }

    state.currentBookId = savedRecord.id;
    state.currentSlideIndex = 0;
    state.adminPublishedPreview = savedRecord;
    persistDraft();
    renderLibrary();
    renderReader();
    renderAdminPreview();
    renderExportOutput(JSON.stringify(savedRecord, null, 2));
    setSaveStatus(`已保存到 JSON：${result.id}.json`);
  } catch (error) {
    console.error(error);
    setSaveStatus(error instanceof Error ? error.message : "保存失败。", true);
  } finally {
    elements.saveJsonBtn.disabled = false;
  }
}

function bindEvents() {
  elements.readerModeBtn?.addEventListener("click", () => {
    state.mode = "reader";
    renderMode();
  });

  elements.adminModeBtn?.addEventListener("click", () => {
    if (!canUseAdmin) {
      return;
    }
    state.mode = "admin";
    renderMode();
  });

  elements.libraryList?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-book-id]");
    if (!button) {
      return;
    }

    state.currentBookId = button.dataset.bookId;
    state.currentSlideIndex = 0;
    renderLibrary();
    renderReader();
  });

  elements.prevSlideBtn?.addEventListener("click", () => {
    state.currentSlideIndex = Math.max(state.currentSlideIndex - 1, 0);
    renderReader();
  });

  elements.nextSlideBtn?.addEventListener("click", () => {
    const slides = getCurrentSlides();
    state.currentSlideIndex = Math.min(state.currentSlideIndex + 1, slides.length - 1);
    renderReader();
  });

  document.addEventListener("keydown", (event) => {
    if (state.mode !== "reader") {
      return;
    }

    if (event.key === "ArrowLeft") {
      state.currentSlideIndex = Math.max(state.currentSlideIndex - 1, 0);
      renderReader();
    }

    if (event.key === "ArrowRight") {
      const slides = getCurrentSlides();
      state.currentSlideIndex = Math.min(state.currentSlideIndex + 1, slides.length - 1);
      renderReader();
    }
  });

  [
    elements.bookTitleInput,
    elements.bookAuthorInput,
    elements.bookThemeInput,
    elements.sourceModeSelect,
    elements.bookSubtitleInput,
    elements.sourceTextInput,
  ].forEach((input) => {
    input?.addEventListener("input", syncDraftFromForm);
  });

  elements.newDraftBtn?.addEventListener("click", newDraft);
  elements.loadPublishedBtn?.addEventListener("click", loadCurrentPublishedIntoAdmin);
  elements.generatePromptBtn?.addEventListener("click", generatePrompt);
  elements.addSlideBtn?.addEventListener("click", () => addSlide(""));
  elements.publishPreviewBtn?.addEventListener("click", publishPreview);
  elements.saveJsonBtn?.addEventListener("click", saveJson);
  elements.exportJsonBtn?.addEventListener("click", exportJson);

  elements.slidesEditorList?.addEventListener("input", (event) => {
    const textarea = event.target.closest("[data-slide-index]");
    if (!textarea) {
      return;
    }

    const index = Number(textarea.dataset.slideIndex);
    if (!Number.isFinite(index) || !state.adminDraft.aiDraft.slides[index]) {
      return;
    }

    state.adminDraft.aiDraft.slides[index].text = textarea.value;
    state.adminDraft.updatedAt = new Date().toISOString();
    persistDraft();
  });

  elements.slidesEditorList?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-action]");
    if (!button) {
      return;
    }

    const index = Number(button.dataset.slideIndex);
    const action = button.dataset.action;
    if (!Number.isFinite(index)) {
      return;
    }

    if (action === "move-up") {
      moveSlide(index, -1);
    }
    if (action === "move-down") {
      moveSlide(index, 1);
    }
    if (action === "duplicate") {
      duplicateSlide(index);
    }
    if (action === "delete") {
      deleteSlide(index);
    }
  });
}

async function initialize() {
  if (canUseAdmin) {
    hydrateDraftFromStorage();
  } else {
    state.mode = "reader";
  }

  if (!canUseAdmin) {
    elements.topbarPanel?.classList.add("hidden");
    elements.adminSection?.classList.add("hidden");
  }

  bindEvents();
  renderMode();
  if (canUseAdmin) {
    renderAdminForm();
    renderSlidesEditor();
    renderAdminPreview();
  }

  try {
    await loadPublishedBooks();
    renderLibrary();
    renderReader();
  } catch (error) {
    console.error(error);
    elements.libraryList.className = "library-list empty-state";
    elements.libraryList.textContent = "书单加载失败，请检查 JSON 文件路径。";
    elements.readerSlide.className = "reader-slide empty-state";
    elements.readerSlide.textContent = "当前无法读取已发布内容。";
  }
}

initialize();
