import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize, sep } from "node:path";

const root = process.cwd();
const port = Number(process.env.PORT || 4173);
const languagePrefixes = new Set(["zh-hant"]);
const pageSlugs = new Set(["products", "trade", "contact"]);
const customPages = new Map([
  ["bl60-160", "bl60-160-3d.html"]
]);

const mime = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml; charset=utf-8"
};

function cacheControlFor(filePath) {
  return filePath.includes(`${sep}assets${sep}`)
    ? "public, max-age=31536000, immutable"
    : "public, max-age=0, must-revalidate";
}

function resolveRequestPath(url = "/") {
  const pathname = decodeURIComponent(url.split("?")[0] || "/");
  const normalized = normalize(pathname).replace(/^(\.\.[/\\])+/, "");
  const clean = normalized.replace(/^[/\\]/, "");
  const parts = clean.split(/[\\/]/).filter(Boolean);

  if (languagePrefixes.has(parts[0])) parts.shift();
  if (parts.length === 0) return join(root, "index.html");
  if (customPages.has(parts[0])) return join(root, customPages.get(parts[0]));
  if (pageSlugs.has(parts[0])) return join(root, `${parts[0]}.html`);

  const relative = parts.length ? parts.join("/") : "index.html";
  const filePath = join(root, relative);
  if (!filePath.startsWith(root)) return join(root, "index.html");
  return filePath;
}

const server = createServer(async (req, res) => {
  const requestedPath = resolveRequestPath(req.url);
  const ext = extname(requestedPath);

  try {
    const body = await readFile(requestedPath);
    res.writeHead(200, {
      "Content-Type": mime[ext] || "application/octet-stream",
      "Cache-Control": cacheControlFor(requestedPath),
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY"
    });
    res.end(body);
  } catch {
    const body = await readFile(join(root, "index.html"));
    res.writeHead(200, {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=0, must-revalidate",
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY"
    });
    res.end(body);
  }
});

server.listen(port, () => {
  console.log(`Ulong Technology preview: http://localhost:${port}`);
});
