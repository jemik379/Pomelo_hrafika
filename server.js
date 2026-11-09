const http = require("http");
const fs = require("fs");
const fsp = require("fs/promises");
const path = require("path");
const crypto = require("crypto");
const zlib = require("zlib");

const root = __dirname;
const port = Number(process.env.PORT) || 4177;
const host = process.env.HOST || "127.0.0.1";
const isProduction = process.env.NODE_ENV === "production";
const trustProxy = process.env.TRUST_PROXY === "1";
const inquiriesDir = path.join(root, "data");
const inquiriesFile = path.join(inquiriesDir, "inquiries.jsonl");

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".svg": "image/svg+xml; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml; charset=utf-8"
};

const validServices = new Set(["web", "eshop", "app", "care", "other"]);
const allowedRootFiles = new Set([
  "/index.html",
  "/privacy.html",
  "/404.html",
  "/robots.txt",
  "/sitemap.xml",
  "/site.webmanifest"
]);
const allowedPublicDirs = ["/assets/", "/css/", "/js/", "/demos/"];

const rateBuckets = new Map();
const RATE_LIMIT = 8;
const RATE_WINDOW_MS = 15 * 60 * 1000;

const compressibleExtensions = new Set([".html", ".css", ".js", ".json", ".svg", ".txt", ".xml", ".webmanifest"]);
const compressionCache = new Map();
const COMPRESSION_CACHE_LIMIT = 96;

setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of rateBuckets) {
    if (bucket.resetAt <= now) rateBuckets.delete(key);
  }
}, 10 * 60 * 1000).unref();

function requestPath(req) {
  try {
    return decodeURIComponent(new URL(req.url, `http://${req.headers.host || "localhost"}`).pathname);
  } catch {
    return "";
  }
}

function securityHeaders(req) {
  const isDemo = requestPath(req).startsWith("/demos/");
  const headers = {
    "Content-Security-Policy": [
      "default-src 'self'",
      "base-uri 'self'",
      "form-action 'self'",
      `frame-ancestors ${isDemo ? "'self'" : "'none'"}`,
      "frame-src 'self'",
      "object-src 'none'",
      "img-src 'self' data:",
      "font-src 'self'",
      `style-src 'self'${isDemo ? " 'unsafe-inline'" : ""}`,
      `script-src 'self'${isDemo ? " 'unsafe-inline'" : ""}`,
      "connect-src 'self'",
      "manifest-src 'self'",
      "media-src 'self'",
      "worker-src 'none'"
    ].join("; "),
    "Cross-Origin-Opener-Policy": "same-origin",
    "Cross-Origin-Resource-Policy": "same-origin",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": isDemo ? "SAMEORIGIN" : "DENY",
    "X-Permitted-Cross-Domain-Policies": "none",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()"
  };

  if (isDemo) headers["X-Robots-Tag"] = "noindex, nofollow";

  const forwardedProto = String(req.headers["x-forwarded-proto"] || "").split(",")[0].trim();
  if (isProduction || forwardedProto === "https" || req.socket.encrypted) {
    headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains";
  }

  return headers;
}

function writeHead(res, req, status, extraHeaders = {}) {
  res.writeHead(status, {
    ...securityHeaders(req),
    ...extraHeaders
  });
}

function sendJson(req, res, status, body, extraHeaders = {}) {
  writeHead(res, req, status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    ...extraHeaders
  });
  res.end(req.method === "HEAD" ? undefined : JSON.stringify(body));
}

function sendText(req, res, status, body, extraHeaders = {}) {
  writeHead(res, req, status, {
    "Content-Type": "text/plain; charset=utf-8",
    "Cache-Control": "no-store",
    ...extraHeaders
  });
  res.end(req.method === "HEAD" ? undefined : body);
}

function validateInquiry(payload) {
  const errors = {};
  const name = typeof payload.name === "string" ? payload.name.trim() : "";
  const email = typeof payload.email === "string" ? payload.email.trim() : "";
  const message = typeof payload.message === "string" ? payload.message.trim() : "";
  const company = typeof payload.company === "string" ? payload.company.trim() : "";
  const service = typeof payload.service === "string" ? payload.service : "";
  const budget = typeof payload.budget === "string" ? payload.budget.trim() : "";
  const consent = payload.consent === true;
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  if (name.length < 2 || name.length > 120) errors.name = "Zadejte prosím své jméno.";
  if (!emailPattern.test(email) || email.length > 180) errors.email = "Zadejte prosím platný e-mail.";
  if (message.length < 10 || message.length > 4000) errors.message = "Napište nám prosím alespoň pár slov o projektu.";
  if (!validServices.has(service)) errors.service = "Vyberte prosím typ služby.";
  if (budget.length > 80) errors.budget = "Pole rozpočtu je příliš dlouhé.";
  if (company.length > 160) errors.company = "Název firmy je příliš dlouhý.";
  if (!consent) errors.consent = "Potvrďte prosím souhlas se zpracováním údajů.";

  return {
    errors,
    data: { name, email, company, service, budget, message, consent }
  };
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    let tooLarge = false;

    req.on("data", (chunk) => {
      if (tooLarge) return;
      raw += chunk;
      if (raw.length > 32_000) {
        tooLarge = true;
        reject(new Error("PAYLOAD_TOO_LARGE"));
      }
    });

    req.on("end", () => {
      if (tooLarge) return;
      try {
        const parsed = JSON.parse(raw || "{}");
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
          reject(new Error("INVALID_JSON"));
          return;
        }
        resolve(parsed);
      } catch {
        reject(new Error("INVALID_JSON"));
      }
    });

    req.on("error", reject);
  });
}

function clientAddress(req) {
  if (trustProxy) {
    const forwarded = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim();
    if (forwarded) return forwarded;
  }
  return req.socket.remoteAddress || "unknown";
}

function consumeRateLimit(key) {
  const now = Date.now();
  let bucket = rateBuckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    bucket = { count: 0, resetAt: now + RATE_WINDOW_MS };
    rateBuckets.set(key, bucket);
  }

  bucket.count += 1;
  return {
    allowed: bucket.count <= RATE_LIMIT,
    retryAfter: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000))
  };
}

async function handleContact(req, res) {
  const contentType = String(req.headers["content-type"] || "").toLowerCase();
  if (!contentType.startsWith("application/json")) {
    sendJson(req, res, 415, { ok: false, message: "Očekáváme data ve formátu JSON." });
    return;
  }

  const fetchSite = String(req.headers["sec-fetch-site"] || "");
  if (fetchSite && fetchSite !== "same-origin" && fetchSite !== "none") {
    sendJson(req, res, 403, { ok: false, message: "Požadavek byl odmítnut." });
    return;
  }

  const limit = consumeRateLimit(clientAddress(req));
  if (!limit.allowed) {
    sendJson(
      req,
      res,
      429,
      { ok: false, message: "Příliš mnoho pokusů. Zkuste to prosím později." },
      { "Retry-After": String(limit.retryAfter) }
    );
    return;
  }

  try {
    const payload = await readJsonBody(req);

    // Honeypot: silently accept obvious bots without storing anything.
    if (typeof payload.company_website === "string" && payload.company_website.trim()) {
      sendJson(req, res, 200, { ok: true });
      return;
    }

    const { errors, data } = validateInquiry(payload);
    if (Object.keys(errors).length) {
      sendJson(req, res, 422, { ok: false, errors });
      return;
    }

    const record = {
      ...data,
      createdAt: new Date().toISOString(),
      source: "pomelo-studio-web"
    };

    await fsp.mkdir(inquiriesDir, { recursive: true, mode: 0o700 });
    await fsp.appendFile(inquiriesFile, `${JSON.stringify(record)}\n`, { encoding: "utf8", mode: 0o600 });

    sendJson(req, res, 200, { ok: true });
  } catch (error) {
    if (error.message === "PAYLOAD_TOO_LARGE") {
      sendJson(req, res, 413, { ok: false, message: "Zpráva je příliš dlouhá." });
      return;
    }
    if (error.message === "INVALID_JSON") {
      sendJson(req, res, 400, { ok: false, message: "Neplatný požadavek." });
      return;
    }
    console.error("Contact form error:", error);
    sendJson(req, res, 500, { ok: false, message: "Zprávu se nepodařilo uložit." });
  }
}

function resolvePublicFile(pathname) {
  const relative = pathname.replace(/^\/+/, "");
  const filePath = path.resolve(root, relative);
  const safePrefix = `${root}${path.sep}`;

  if (filePath === root || !filePath.startsWith(safePrefix)) return null;

  // Validate the canonical path so `assets/../server.js` cannot slip through
  // the directory prefix allowlist.
  const canonical = `/${path.relative(root, filePath).split(path.sep).join("/")}`;
  if (allowedRootFiles.has(canonical)) return filePath;

  if (!allowedPublicDirs.some((prefix) => canonical.startsWith(prefix))) return null;
  if (canonical.split("/").some((segment) => segment.startsWith("."))) return null;

  const extension = path.extname(canonical).toLowerCase();
  if (!mimeTypes[extension] && extension !== ".webmanifest") return null;

  return filePath;
}

function cacheControlFor(extension, isHtml) {
  if (isHtml) return "no-cache";
  if (extension === ".woff2") return "public, max-age=31536000, immutable";
  if (extension === ".css" || extension === ".js" || extension === ".webmanifest") {
    return "public, max-age=3600, must-revalidate";
  }
  if (extension === ".svg" || extension === ".png" || extension === ".webp" || extension === ".jpg") {
    return "public, max-age=86400";
  }
  return "public, max-age=3600";
}

function acceptedEncodings(req) {
  const accepted = new Map();
  const header = String(req.headers["accept-encoding"] || "").toLowerCase();

  for (const part of header.split(",")) {
    const [name, ...params] = part.trim().split(";");
    if (!name) continue;
    let quality = 1;
    for (const param of params) {
      const [key, value] = param.trim().split("=");
      if (key === "q") quality = Number(value);
    }
    accepted.set(name, Number.isFinite(quality) ? quality : 0);
  }

  return accepted;
}

function pickEncoding(req) {
  const accepted = acceptedEncodings(req);
  const quality = (name) => {
    if (accepted.has(name)) return accepted.get(name);
    return accepted.get("*") ?? 0;
  };

  const brQuality = quality("br");
  const gzipQuality = quality("gzip");

  if (brQuality <= 0 && gzipQuality <= 0) return null;
  if (brQuality >= gzipQuality && brQuality > 0) return "br";
  return "gzip";
}

function compress(data, encoding) {
  if (encoding === "br") {
    return zlib.brotliCompressSync(data, {
      params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 11 }
    });
  }
  return zlib.gzipSync(data, { level: 9 });
}

function compressedVariant(filePath, stats, encoding, data) {
  const key = `${filePath}:${stats.mtimeMs}:${stats.size}:${encoding}`;
  const cached = compressionCache.get(key);
  if (cached) return cached;

  const result = compress(data, encoding);
  compressionCache.set(key, result);

  if (compressionCache.size > COMPRESSION_CACHE_LIMIT) {
    compressionCache.delete(compressionCache.keys().next().value);
  }

  return result;
}

function etagMatches(header, etag) {
  if (!header) return false;
  const value = String(header);
  if (value.trim() === "*") return true;
  return value
    .split(",")
    .map((tag) => tag.trim())
    .some((tag) => tag === etag || tag === `W/${etag}`);
}

function serveNotFound(req, res, pathname) {
  const wantsPage = !path.extname(pathname);

  if (!wantsPage) {
    sendText(req, res, 404, "Soubor nebyl nalezen.");
    return;
  }

  fs.readFile(path.join(root, "404.html"), (error, data) => {
    if (error) {
      sendText(req, res, 404, "Stránka nebyla nalezena.");
      return;
    }

    writeHead(res, req, 404, {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store"
    });
    res.end(req.method === "HEAD" ? undefined : data);
  });
}

function serveStatic(req, res, pathname) {
  let relativePath = pathname === "/" ? "/index.html" : pathname;
  if (relativePath.startsWith("/demos/") && relativePath.endsWith("/")) {
    relativePath += "index.html";
  }
  const filePath = resolvePublicFile(relativePath);

  if (!filePath) {
    serveNotFound(req, res, pathname);
    return;
  }

  fs.stat(filePath, (statError, stats) => {
    if (statError || !stats.isFile()) {
      if (relativePath === "/index.html" || relativePath === "/404.html") {
        sendText(req, res, 500, "Obsah webu se nepodařilo načíst.");
        return;
      }
      serveNotFound(req, res, pathname);
      return;
    }

    fs.readFile(filePath, (error, data) => {
      if (error) {
        serveNotFound(req, res, pathname);
        return;
      }

      const extension = path.extname(filePath).toLowerCase();
      const isHtml = extension === ".html";
      const canCompress = compressibleExtensions.has(extension) && data.length > 1024;
      const encoding = canCompress ? pickEncoding(req) : null;
      const hash = crypto.createHash("sha1").update(data).digest("hex");
      const etag = `"${hash}${encoding ? `-${encoding}` : ""}"`;
      const varyHeaders = canCompress ? { Vary: "Accept-Encoding" } : {};

      if (etagMatches(req.headers["if-none-match"], etag)) {
        writeHead(res, req, 304, {
          ETag: etag,
          "Cache-Control": cacheControlFor(extension, isHtml),
          ...varyHeaders
        });
        res.end();
        return;
      }

      const headers = {
        "Content-Type": mimeTypes[extension] || "application/octet-stream",
        "Cache-Control": cacheControlFor(extension, isHtml),
        ETag: etag,
        "Last-Modified": stats.mtime.toUTCString(),
        ...varyHeaders
      };
      let body = data;

      if (encoding) {
        body = compressedVariant(filePath, stats, encoding, data);
        headers["Content-Encoding"] = encoding;
      }

      headers["Content-Length"] = String(body.length);

      writeHead(res, req, 200, headers);
      res.end(req.method === "HEAD" ? undefined : body);
    });
  });
}

const server = http.createServer((req, res) => {
  let pathname;

  try {
    pathname = decodeURIComponent(new URL(req.url, `http://${req.headers.host || "localhost"}`).pathname);
  } catch {
    sendText(req, res, 400, "Neplatný požadavek.");
    return;
  }

  if (pathname.includes("\0")) {
    sendText(req, res, 400, "Neplatný požadavek.");
    return;
  }

  if (req.method === "POST" && pathname === "/api/contact") {
    handleContact(req, res);
    return;
  }

  if (req.method === "GET" || req.method === "HEAD") {
    if (pathname.startsWith("/api/")) {
      sendJson(req, res, 404, { ok: false, message: "Endpoint nebyl nalezen." });
      return;
    }
    serveStatic(req, res, pathname);
    return;
  }

  sendText(req, res, 405, "Metoda není povolena.", { Allow: "GET, HEAD, POST" });
});

server.listen(port, host, () => {
  console.log(`Pomelo studio běží na http://${host}:${port}`);
});
