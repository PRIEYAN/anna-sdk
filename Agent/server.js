import http from "node:http";
import { createReadStream, readFileSync } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ZipArchive } from "archiver";
import {
  listProjectFiles,
  projectExists,
  readProjectFile,
  safeProjectPath,
  workspacePath,
  AGENT_ROOT,
} from "./src/workspace.js";
import { writeProjectFiles, writeFileEdit } from "./src/generator.js";
import { generateSite } from "../bundle/generator.js";

const root = path.dirname(fileURLToPath(import.meta.url));
try {
  process.loadEnvFile(path.join(root, ".env"));
} catch (error) {
  if (error?.code !== "ENOENT") throw error;
}

const port = Number(process.env.PORT || 8787);
const host = process.env.HOST || "127.0.0.1";

// ── Skill prompt (loaded once) ────────────────────────────────────────────
let _skillText = null;
function getSkillText() {
  if (_skillText === null) {
    try {
      _skillText = readFileSync(
        path.join(AGENT_ROOT, "skills", "vibe-coder.skill.md"),
        "utf8",
      );
    } catch {
      _skillText = "";
    }
  }
  return _skillText;
}

// ── HTTP helpers ──────────────────────────────────────────────────────────

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
};

function corsHeaders(request) {
  const origin = request?.headers?.origin ?? "";
  const allowed = /^https?:\/\/localhost(:\d+)?$/.test(origin)
    ? origin
    : "http://localhost:3000";
  return {
    "access-control-allow-origin": allowed,
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "access-control-allow-headers": "content-type",
  };
}

function sendJson(response, request, status, value) {
  response.writeHead(status, {
    ...corsHeaders(request),
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  response.end(JSON.stringify(value));
}

async function readJson(request) {
  let body = "";
  for await (const chunk of request) {
    body += chunk;
    if (body.length > 4_000_000) throw new Error("Request body is too large");
  }
  return JSON.parse(body || "{}");
}

async function servePreview(response, request, sessionId, relativePath) {
  const requested = relativePath || "index.html";
  const file = safeProjectPath(sessionId, requested);
  const info = await stat(file).catch(() => null);
  if (!info?.isFile()) return sendJson(response, request, 404, { error: "Preview file not found" });
  response.writeHead(200, {
    ...corsHeaders(request),
    "content-type": mimeTypes[path.extname(file)] || "application/octet-stream",
    "cache-control": "no-store",
  });
  createReadStream(file).pipe(response);
}

function streamZip(response, request, sessionId) {
  response.writeHead(200, {
    ...corsHeaders(request),
    "content-type": "application/zip",
    "content-disposition": `attachment; filename="anna-${sessionId}.zip"`,
    "cache-control": "no-store",
  });
  const archive = new ZipArchive({ zlib: { level: 9 } });
  archive.on("error", (error) => response.destroy(error));
  archive.pipe(response);
  archive.directory(workspacePath(sessionId), false);
  archive.finalize();
}

// ── HTTP server ───────────────────────────────────────────────────────────

const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://${request.headers.host || "localhost"}`);
    if (request.method === "OPTIONS") {
      response.writeHead(204, corsHeaders(request));
      return response.end();
    }

    if (request.method === "GET" && url.pathname === "/health")
      return sendJson(response, request, 200, { ok: true });

    // Serve the skill prompt so the bundle frontend can embed it in LLM calls.
    if (request.method === "GET" && url.pathname === "/api/skill") {
      response.writeHead(200, {
        ...corsHeaders(request),
        "content-type": "text/plain; charset=utf-8",
        "cache-control": "no-store",
      });
      return response.end(getSkillText());
    }

    // Accept either:
    //   { sessionId, files[] }  — pre-generated files from the bundle frontend (port 5180)
    //   { sessionId, prompt }   — description string from the React frontend (port 3000)
    if (request.method === "POST" && url.pathname === "/api/vibe") {
      const body = await readJson(request);
      const { sessionId } = body;
      if (!sessionId) return sendJson(response, request, 400, { error: "sessionId is required" });
      const files = Array.isArray(body.files)
        ? body.files
        : typeof body.prompt === "string"
          ? generateSite(body.prompt).files
          : null;
      if (!files) return sendJson(response, request, 400, { error: "files[] or prompt is required" });
      const result = await writeProjectFiles(sessionId, files);
      return sendJson(response, request, 201, result);
    }

    // Write a single edited file sent from the frontend.
    // Body: { sessionId: string, path: string, content: string }
    if (request.method === "POST" && url.pathname === "/api/edit") {
      const { sessionId, path: requestedPath, content } = await readJson(request);
      if (!sessionId || !requestedPath || typeof content !== "string")
        return sendJson(response, request, 400, { error: "sessionId, path, and content are required" });
      if (!(await projectExists(sessionId)))
        return sendJson(response, request, 404, { error: "Project not found — generate one first with /vibe" });
      const result = await writeFileEdit(sessionId, requestedPath, content);
      return sendJson(response, request, 200, result);
    }

    const filesMatch = url.pathname.match(/^\/api\/files\/([^/]+)$/);
    if (request.method === "GET" && filesMatch) {
      const sessionId = decodeURIComponent(filesMatch[1]);
      if (!(await projectExists(sessionId)))
        return sendJson(response, request, 404, { error: "Project not found" });
      const requestedPath = url.searchParams.get("path");
      if (requestedPath)
        return sendJson(response, request, 200, {
          path: requestedPath,
          content: await readProjectFile(sessionId, requestedPath),
        });
      return sendJson(response, request, 200, { tree: await listProjectFiles(sessionId) });
    }

    const previewMatch = url.pathname.match(/^\/preview\/([^/]+)\/?(.*)$/);
    if (request.method === "GET" && previewMatch)
      return servePreview(
        response,
        request,
        decodeURIComponent(previewMatch[1]),
        decodeURIComponent(previewMatch[2]),
      );

    const downloadMatch = url.pathname.match(/^\/api\/download\/([^/]+)$/);
    if (request.method === "GET" && downloadMatch) {
      const sessionId = decodeURIComponent(downloadMatch[1]);
      if (!(await projectExists(sessionId)))
        return sendJson(response, request, 404, { error: "Project not found" });
      return streamZip(response, request, sessionId);
    }

    return sendJson(response, request, 404, { error: "Route not found" });
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : "Internal server error";
    sendJson(response, request, /invalid|escape|json/i.test(message) ? 400 : 500, { error: message });
  }
});

server.listen(port, host, () => console.log(`Anna agent listening on http://${host}:${port}`));
