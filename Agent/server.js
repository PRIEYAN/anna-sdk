import http from "node:http";
import readline from "node:readline";
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

// ── LLM REST API (host-side handler for sampling/createMessage) ───────────────

const DEFAULT_API_URL = "https://api.openai.com/v1/chat/completions";
const DEFAULT_MODEL = "gpt-4o";

function resolveApiUrl(raw) {
  if (!raw) return DEFAULT_API_URL;
  const url = raw.trim().replace(/\/+$/, "");
  if (url.endsWith("/chat/completions")) return url;
  if (/\/v\d+$/.test(url)) return `${url}/chat/completions`;
  return `${url}/v1/chat/completions`;
}

async function handleSamplingRequest(params) {
  const apiKey = process.env.ANNA_API_KEY;
  if (!apiKey) throw new Error("ANNA_API_KEY not set — add it to Agent/.env");

  const apiUrl = resolveApiUrl(process.env.ANNA_API_URL);
  const model = process.env.ANNA_MODEL || DEFAULT_MODEL;

  const apiMessages = [];
  if (params.systemPrompt) apiMessages.push({ role: "system", content: params.systemPrompt });
  for (const msg of params.messages || []) {
    const content =
      typeof msg.content === "string" ? msg.content : (msg.content?.text ?? "");
    apiMessages.push({ role: msg.role, content });
  }

  const body = {
    model,
    temperature: params.temperature ?? 0.35,
    max_tokens: params.maxTokens || 16000,
    messages: apiMessages,
  };
  if (params.responseFormat) body.response_format = params.responseFormat;

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errBody = (await response.text()).slice(0, 400);
    throw new Error(`LLM API error (${response.status}) at ${apiUrl} — ${errBody}`);
  }

  const payload = await response.json();
  const text = payload.choices?.[0]?.message?.content ?? payload.output_text ?? "";
  return {
    content: { type: "text", text },
    model: payload.model,
    usage: payload.usage
      ? {
          inputTokens: payload.usage.prompt_tokens,
          outputTokens: payload.usage.completion_tokens,
          totalTokens: payload.usage.total_tokens,
        }
      : undefined,
    stopReason: payload.choices?.[0]?.finish_reason,
  };
}

// ── Executa tool runner — supports Anna sampling/createMessage reverse-RPC ─────

function runTool(method, params) {
  const script = path.join(root, "tools", `${method}.js`);
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [script], {
      cwd: root,
      stdio: ["pipe", "pipe", "pipe"],
    });

    let settled = false;
    function settle(fn, val) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      child.stdin.end();
      fn(val);
    }

    const timer = setTimeout(() => {
      settle(reject, new Error(`Tool ${method} timed out`));
      child.kill();
    }, 90_000);

    const rl = readline.createInterface({ input: child.stdout, crlfDelay: Infinity });
    child.stderr.setEncoding("utf8").on("data", (chunk) => process.stderr.write(chunk));

    rl.on("line", async (raw) => {
      const line = raw.trim();
      if (!line) return;
      let msg;
      try {
        msg = JSON.parse(line);
      } catch {
        return;
      }

      // Reverse-RPC: tool asks host to call the LLM on its behalf.
      if (msg.method === "sampling/createMessage") {
        try {
          const result = await handleSamplingRequest(msg.params || {});
          if (!settled)
            child.stdin.write(JSON.stringify({ jsonrpc: "2.0", id: msg.id, result }) + "\n");
        } catch (err) {
          if (!settled)
            child.stdin.write(
              JSON.stringify({
                jsonrpc: "2.0",
                id: msg.id,
                error: { code: -32003, message: err.message },
              }) + "\n",
            );
        }
        return;
      }

      // Final invoke response from tool (no "method" field = reply frame).
      if (!("method" in msg)) {
        if (msg.error) settle(reject, new Error(msg.error.message || "Tool error"));
        else settle(resolve, msg.result);
      }
    });

    child.on("error", (err) => settle(reject, err));
    child.on("close", () =>
      settle(reject, new Error(`Tool ${method} exited without sending a response`)),
    );

    // Send the invoke request — keep stdin OPEN so sampling responses flow back.
    child.stdin.write(
      JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "invoke",
        params: { tool: method, arguments: params },
      }) + "\n",
    );
  });
}

// ── HTTP helpers ──────────────────────────────────────────────────────────────

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

// ── HTTP server ───────────────────────────────────────────────────────────────

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
