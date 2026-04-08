const http = require("http");
const fs = require("fs/promises");
const path = require("path");
const { URL } = require("url");

const saveBookDigest = require("./api/book-digest-save");

const ROOT_DIR = process.cwd();
const PORT = Number(process.env.PORT) || 3000;

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
  });
  res.end(JSON.stringify(payload));
}

function createNodeResponse(res) {
  return {
    status(code) {
      res.statusCode = code;
      return this;
    },
    json(payload) {
      sendJson(res, res.statusCode || 200, payload);
    },
  };
}

async function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf8");
      if (!raw) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(raw));
      } catch (error) {
        reject(new Error("Invalid JSON body."));
      }
    });
    req.on("error", reject);
  });
}

function resolveFilePath(urlPath) {
  const normalizedPath = decodeURIComponent(urlPath.split("?")[0]);
  const safePath = normalizedPath === "/" ? "/index.html" : normalizedPath;
  const absolutePath = path.normalize(path.join(ROOT_DIR, safePath));

  if (!absolutePath.startsWith(ROOT_DIR)) {
    return null;
  }

  return absolutePath;
}

async function serveStaticFile(res, pathname) {
  let filePath = resolveFilePath(pathname);
  if (!filePath) {
    sendJson(res, 403, { error: "Forbidden" });
    return;
  }

  try {
    let stats = await fs.stat(filePath);
    if (stats.isDirectory()) {
      filePath = path.join(filePath, "index.html");
      stats = await fs.stat(filePath);
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || "application/octet-stream";
    const content = await fs.readFile(filePath);

    res.writeHead(200, {
      "Content-Type": contentType,
      "Cache-Control": "no-store",
    });
    res.end(content);
  } catch (error) {
    sendJson(res, 404, { error: "Not Found" });
  }
}

const server = http.createServer(async (req, res) => {
  const requestUrl = new URL(req.url, `http://${req.headers.host || `localhost:${PORT}`}`);
  const { pathname } = requestUrl;

  if (pathname === "/api/book-digest-save") {
    try {
      req.body = await readRequestBody(req);
      await saveBookDigest(req, createNodeResponse(res));
    } catch (error) {
      sendJson(res, 400, {
        ok: false,
        error: error instanceof Error ? error.message : "Invalid request.",
      });
    }
    return;
  }

  await serveStaticFile(res, pathname);
});

server.listen(PORT, () => {
  console.log(`Local dev server running at http://localhost:${PORT}`);
});
