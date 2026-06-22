import http from "node:http";
import { spawn } from "node:child_process";
import { createReadStream } from "node:fs";
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
} from "./src/workspace.js";

const root = path.dirname(fileURLToPath(import.meta.url));
try {
  process.loadEnvFile(path.join(root, ".env"));
} catch (error) {
  if (error?.code !== "ENOENT") throw error;
}
const port = Number(process.env.PORT || 8787);
const host = process.env.HOST || "127.0.0.1";
const clientOrigin = process.env.CLIENT_ORIGIN || "http://localhost:3000";
const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
};

function corsHeaders() {
  return {
    "access-control-allow-origin": clientOrigin,
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "access-control-allow-headers": "content-type",
  };
}

function sendJson(response, status, value) {
  response.writeHead(status, {
    ...corsHeaders(),
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  response.end(JSON.stringify(value));
}

async function readJson(request) {
  let body = "";
  for await (const chunk of request) {
    body += chunk;
    if (body.length > 1_000_000) throw new Error("Request body is too large");
  }
  return JSON.parse(body || "{}");
}

function runTool(method, params) {
  const script = path.join(root, "tools", `${method}.js`);
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [script], { cwd: root, stdio: ["pipe", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => child.kill(), 60_000);
    child.stdout.setEncoding("utf8").on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.setEncoding("utf8").on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", reject);
    child.on("close", () => {
      clearTimeout(timer);
      try {
        const response = JSON.parse(stdout);
        if (response.error) reject(new Error(response.error.message));
        else resolve(response.result);
      } catch (error) {
        reject(new Error(stderr || `Invalid response from ${method}: ${error.message}`));
      }
    });
    child.stdin.end(JSON.stringify({ jsonrpc: "2.0", id: Date.now(), method, params }));
  });
}

async function servePreview(response, sessionId, relativePath) {
  const requested = relativePath || "index.html";
  const file = safeProjectPath(sessionId, requested);
  const info = await stat(file).catch(() => null);
  if (!info?.isFile()) return sendJson(response, 404, { error: "Preview file not found" });
  response.writeHead(200, {
    ...corsHeaders(),
    "content-type": mimeTypes[path.extname(file)] || "application/octet-stream",
    "cache-control": "no-store",
  });
  createReadStream(file).pipe(response);
}

function streamZip(response, sessionId) {
  response.writeHead(200, {
    ...corsHeaders(),
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

const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://${request.headers.host || "localhost"}`);
    if (request.method === "OPTIONS") {
      response.writeHead(204, corsHeaders());
      return response.end();
    }
    if (request.method === "GET" && url.pathname === "/health")
      return sendJson(response, 200, { ok: true });

    if (request.method === "POST" && url.pathname === "/api/vibe") {
      const { sessionId, prompt } = await readJson(request);
      const result = await runTool("generate_project", { sessionId, prompt });
      return sendJson(response, 201, result);
    }
    if (request.method === "POST" && url.pathname === "/api/edit") {
      const { sessionId, path: requestedPath, instruction } = await readJson(request);
      if (!(await projectExists(sessionId)))
        return sendJson(response, 404, { error: "Project not found" });
      const result = await runTool("edit_file", { sessionId, path: requestedPath, instruction });
      return sendJson(response, 200, result);
    }

    const filesMatch = url.pathname.match(/^\/api\/files\/([^/]+)$/);
    if (request.method === "GET" && filesMatch) {
      const sessionId = decodeURIComponent(filesMatch[1]);
      if (!(await projectExists(sessionId)))
        return sendJson(response, 404, { error: "Project not found" });
      const requestedPath = url.searchParams.get("path");
      if (requestedPath)
        return sendJson(response, 200, {
          path: requestedPath,
          content: await readProjectFile(sessionId, requestedPath),
        });
      return sendJson(response, 200, { tree: await listProjectFiles(sessionId) });
    }

    const previewMatch = url.pathname.match(/^\/preview\/([^/]+)\/?(.*)$/);
    if (request.method === "GET" && previewMatch)
      return servePreview(
        response,
        decodeURIComponent(previewMatch[1]),
        decodeURIComponent(previewMatch[2]),
      );

    const downloadMatch = url.pathname.match(/^\/api\/download\/([^/]+)$/);
    if (request.method === "GET" && downloadMatch) {
      const sessionId = decodeURIComponent(downloadMatch[1]);
      if (!(await projectExists(sessionId)))
        return sendJson(response, 404, { error: "Project not found" });
      return streamZip(response, sessionId);
    }
    return sendJson(response, 404, { error: "Route not found" });
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : "Internal server error";
    sendJson(response, /invalid|escape|json/i.test(message) ? 400 : 500, { error: message });
  }
});

server.listen(port, host, () => console.log(`Anna agent listening on http://${host}:${port}`));
