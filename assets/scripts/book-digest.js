const DATA_ROOT = "../../data/book-digest";
const STORAGE_KEY = "book_digest_admin_state_v2";

const state = {
  catalog: [],
  booksById: {},
  currentBookId: null,
  currentSlideIndex: 0,
  mode: "reader",
  adminDraft: createEmptyDraft(),
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
  readerProgressFill: document.querySelector("#readerProgressFill"),
  readerSlide: document.querySelector("#readerSlide"),
  prevSlideBtn: document.querySelector("#prevSlideBtn"),
  nextSlideBtn: document.querySelector("#nextSlideBtn"),
  bookTitleInput: document.querySelector("#bookTitleInput"),
  bookAuthorInput: document.querySelector("#bookAuthorInput"),
  bookContentInput: document.querySelector("#bookContentInput"),
  loadPublishedBtn: document.querySelector("#loadPublishedBtn"),
  publishJsonBtn: document.querySelector("#publishJsonBtn"),
  saveStatus: document.querySelector("#saveStatus"),
};

function createEmptyDraft() {
  return {
    id: "",
    title: "",
    author: "",
    content: "",
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

function setSaveStatus(message, isError = false) {
  if (!elements.saveStatus) {
    return;
  }

  elements.saveStatus.textContent = message;
  elements.saveStatus.style.color = isError ? "#9f2d2d" : "";
}

function buildSlidesFromContent(content) {
  return content
    .split(/\n\s*\n+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((text) => ({ text }));
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
  return state.currentBookId ? state.booksById[state.currentBookId] || null : null;
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
    elements.readerProgressFill.style.width = "0%";
    elements.readerSlide.className = "reader-slide empty-state";
    elements.readerSlide.textContent = "请选择左侧的一本书开始阅读。";
    elements.prevSlideBtn.disabled = true;
    elements.nextSlideBtn.disabled = true;
    return;
  }

  state.currentSlideIndex = Math.max(0, Math.min(state.currentSlideIndex, slides.length - 1));
  const currentSlide = slides[state.currentSlideIndex];

  elements.readerBookTitle.textContent = `《${book.title}》`;
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
  elements.bookTitleInput.value = state.adminDraft.title || "";
  elements.bookAuthorInput.value = state.adminDraft.author || "";
  elements.bookContentInput.value = state.adminDraft.content || "";
}

function syncDraftFromForm() {
  state.adminDraft.title = elements.bookTitleInput.value.trim();
  state.adminDraft.author = elements.bookAuthorInput.value.trim();
  state.adminDraft.content = elements.bookContentInput.value;
  state.adminDraft.id = slugifyBookId(state.adminDraft.title, state.adminDraft.author);
  state.adminDraft.updatedAt = new Date().toISOString();
  persistDraft();
}

function persistDraft() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ adminDraft: state.adminDraft }));
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
    content: (book.published?.slides || []).map((slide) => slide.text || "").join("\n\n"),
    updatedAt: new Date().toISOString(),
  };

  persistDraft();
  renderAdminForm();
  setSaveStatus("已载入当前书籍，可以直接编辑后重新发布。");
}

function buildPublishedPayload() {
  syncDraftFromForm();
  const slides = buildSlidesFromContent(state.adminDraft.content || "");

  if (!state.adminDraft.title) {
    throw new Error("请先填写书名。");
  }

  if (slides.length === 0) {
    throw new Error("请先填写内容，并至少保留一个段落。");
  }

  return {
    id: slugifyBookId(state.adminDraft.title, state.adminDraft.author),
    title: state.adminDraft.title,
    author: state.adminDraft.author,
    status: "published",
    sourceMode: "manual",
    sourceText: state.adminDraft.content,
    aiDraft: {
      subtitle: "",
      slides,
    },
    published: {
      subtitle: "",
      slides,
    },
    updatedAt: new Date().toISOString(),
  };
}

async function publishJson() {
  let payload;

  try {
    payload = buildPublishedPayload();
  } catch (error) {
    setSaveStatus(error instanceof Error ? error.message : "发布失败。", true);
    return;
  }

  elements.publishJsonBtn.disabled = true;
  setSaveStatus("正在发布并写入 JSON...");

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
      throw new Error(result.error || "发布失败。");
    }

    const savedRecord = deepClone(payload);
    savedRecord.id = result.id || savedRecord.id;
    savedRecord.updatedAt = result.updatedAt || new Date().toISOString();

    state.booksById[savedRecord.id] = savedRecord;
    const existingCatalogIndex = state.catalog.findIndex((book) => book.id === savedRecord.id);
    const catalogSummary = {
      ...savedRecord,
      durationLabel: "约 3 分钟",
      theme: "未分类",
    };

    if (existingCatalogIndex >= 0) {
      state.catalog[existingCatalogIndex] = catalogSummary;
    } else {
      state.catalog.unshift(catalogSummary);
    }

    state.currentBookId = savedRecord.id;
    state.currentSlideIndex = 0;
    renderLibrary();
    renderReader();
    setSaveStatus(`已发布并写入 JSON：${savedRecord.id}.json`);
  } catch (error) {
    console.error(error);
    setSaveStatus(error instanceof Error ? error.message : "发布失败。", true);
  } finally {
    elements.publishJsonBtn.disabled = false;
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

  [elements.bookTitleInput, elements.bookAuthorInput, elements.bookContentInput].forEach((input) => {
    input?.addEventListener("input", syncDraftFromForm);
  });

  elements.loadPublishedBtn?.addEventListener("click", loadCurrentPublishedIntoAdmin);
  elements.publishJsonBtn?.addEventListener("click", publishJson);
}

async function initialize() {
  if (canUseAdmin) {
    hydrateDraftFromStorage();
  } else {
    state.mode = "reader";
    elements.topbarPanel?.classList.add("hidden");
    elements.adminSection?.classList.add("hidden");
  }

  bindEvents();
  renderMode();

  if (canUseAdmin) {
    renderAdminForm();
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
