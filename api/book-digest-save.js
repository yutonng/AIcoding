const fs = require("fs/promises");
const path = require("path");

const DATA_DIR = path.join(process.cwd(), "data", "book-digest");
const BOOKS_DIR = path.join(DATA_DIR, "books");
const INDEX_PATH = path.join(DATA_DIR, "books-index.json");

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function slugifyBookId(title = "", author = "") {
  const seed = `${title} ${author}`.trim() || "untitled-book";
  return seed
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function sanitizeSlides(slides) {
  if (!Array.isArray(slides)) {
    return [];
  }

  return slides
    .map((slide) => ({
      text: normalizeText(slide?.text),
    }))
    .filter((slide) => slide.text);
}

async function readJson(filePath, fallbackValue) {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw);
  } catch (error) {
    if (error && error.code === "ENOENT") {
      return fallbackValue;
    }
    throw error;
  }
}

function buildRecord(input) {
  const title = normalizeText(input?.title);
  const author = normalizeText(input?.author);
  const theme = normalizeText(input?.theme);
  const sourceMode = normalizeText(input?.sourceMode) || "free_generate";
  const sourceText = normalizeText(input?.sourceText);
  const subtitle = normalizeText(input?.aiDraft?.subtitle || input?.published?.subtitle);
  const aiSlides = sanitizeSlides(input?.aiDraft?.slides);
  const publishedSlides = sanitizeSlides(input?.published?.slides);
  const id = normalizeText(input?.id) || slugifyBookId(title, author);

  if (!title) {
    throw new Error("Missing title.");
  }

  if (publishedSlides.length === 0 && aiSlides.length === 0) {
    throw new Error("At least one slide is required.");
  }

  const record = {
    id,
    title,
    author,
    status: "published",
    sourceMode,
    sourceText,
    aiDraft: {
      subtitle,
      slides: aiSlides.length > 0 ? aiSlides : publishedSlides,
    },
    published: {
      subtitle,
      slides: publishedSlides.length > 0 ? publishedSlides : aiSlides,
    },
    updatedAt: new Date().toISOString(),
  };

  if (theme) {
    record.theme = theme;
  }

  return record;
}

async function ensureDirectories() {
  await fs.mkdir(BOOKS_DIR, { recursive: true });
}

async function writeBookRecord(record) {
  const bookPath = path.join(BOOKS_DIR, `${record.id}.json`);
  await fs.writeFile(bookPath, `${JSON.stringify(record, null, 2)}\n`, "utf8");
  return bookPath;
}

async function syncIndex(record) {
  const index = await readJson(INDEX_PATH, {
    featuredBookId: record.id,
    books: [],
  });

  const books = Array.isArray(index.books) ? index.books : [];
  const summary = {
    id: record.id,
    title: record.title,
    author: record.author,
    status: "published",
    durationLabel: "约 3 分钟",
    theme: record.theme || "未分类",
  };

  const existingIndex = books.findIndex((book) => book.id === record.id);
  if (existingIndex >= 0) {
    books[existingIndex] = {
      ...books[existingIndex],
      ...summary,
    };
  } else {
    books.unshift(summary);
  }

  const nextIndex = {
    featuredBookId: index.featuredBookId || record.id,
    books,
  };

  await fs.writeFile(INDEX_PATH, `${JSON.stringify(nextIndex, null, 2)}\n`, "utf8");
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method Not Allowed" });
    return;
  }

  try {
    await ensureDirectories();
    const record = buildRecord(req.body || {});
    const savedPath = await writeBookRecord(record);
    await syncIndex(record);

    res.status(200).json({
      ok: true,
      id: record.id,
      path: savedPath,
      updatedAt: record.updatedAt,
    });
  } catch (error) {
    res.status(400).json({
      ok: false,
      error: error instanceof Error ? error.message : "Unknown save error.",
    });
  }
};
