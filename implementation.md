# Anna SDK — Implementation Guide

This document is the concrete "how to build it" companion to `plan.md`.
`plan.md` covers what each piece is and why; this covers exact code shape,
file layout, and the JSON-RPC wiring so you can build it without re-deriving
decisions mid-implementation.

---

## 1. End-to-end flow (what actually happens on one `/vibe`)

```
User types "/vibe a ceramic artist portfolio" in chat UI
   │
   ▼
Frontend → POST /api/vibe { sessionId, prompt }
   │
   ▼
Backend route handler
   │
   ├─ spawns Executa tool process: node tools/generate_project.js
   ├─ writes one JSON-RPC request to its stdin, closes stdin
   ├─ tool process calls the LLM, gets back structured JSON
   ├─ tool process writes files into /workspaces/{sessionId}/
   ├─ tool process writes one JSON-RPC response to stdout, exits
   │
   ▼
Backend reads stdout, parses JSON-RPC response, forwards result to frontend
   │
   ▼
Frontend renders the file tree + "Tool finished" log line
   │
   ▼
User clicks "Preview" → iframe loads /preview/{sessionId}/index.html
   (served directly as static files — no build step)
   │
   ▼
User types "make the button blue" → POST /api/edit { sessionId, instruction }
   │
   ▼
Backend spawns tools/read_file.js, then tools/edit_file.js, same JSON-RPC pattern
   │
   ▼
User clicks "Download ZIP" → GET /api/download/:sessionId
   (zip_project is NOT a JSON-RPC tool — see Section 6 — streams a real file)
```

Every box above is a real process or a real file operation. Nothing in this
flow is mocked once you finish this guide.

---

## 2. Repo structure

```
anna-sdk/
├── frontend/                  ← your existing Lovable-built UI, fixed per Section 0.5 of plan.md
│
├── backend/
│   ├── server.js              ← Express app, routes below
│   ├── workspace.js           ← session folder create/read/list/delete
│   ├── rpc-client.js          ← spawns a tool, speaks JSON-RPC over stdio, returns result
│   ├── zip.js                 ← zip_project (plain function, not a tool)
│   ├── static/                ← boilerplate copied into every new project
│   │   ├── .gitignore
│   │   ├── favicon.svg
│   │   ├── icons.svg
│   │   └── hero.png
│   └── workspaces/            ← runtime-created, one folder per session (gitignored)
│
├── tools/                     ← the real Executa tools — each is a standalone process
│   ├── generate_project.js
│   ├── read_file.js
│   ├── edit_file.js
│   └── list_files.js
│
└── skills/
    └── vibe-coder.skill.md    ← the Skill — loaded as the system prompt by the tools
```

Why tools live in their own top-level folder, not inside `backend/`: Executa
tools are meant to be standalone processes communicating over stdio, runnable
and testable independently of your web server. Keeping them physically
separate reinforces that they're not "just backend helper functions" — they
are the actual Executa-protocol artifacts the hackathon is judging.

---

## 3. The JSON-RPC 2.0 wire format

Every tool reads exactly one JSON-RPC 2.0 request object from stdin, and
writes exactly one JSON-RPC 2.0 response object to stdout, then exits.

**Request shape (what the backend sends in):**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "generate_project",
  "params": { "sessionId": "abc123", "prompt": "a ceramic artist portfolio" }
}
```

**Success response (what the tool sends out):**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": { "filesWritten": ["index.html", "style.css", "main.js", "screens/home.js"] }
}
```

**Error response:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "error": { "code": -32000, "message": "LLM returned invalid JSON" }
}
```

### `backend/rpc-client.js` — spawns a tool and speaks this protocol

```js
// backend/rpc-client.js
import { spawn } from 'child_process';

let nextId = 1;

export function callTool(toolPath, method, params) {
  return new Promise((resolve, reject) => {
    const id = nextId++;
    const request = JSON.stringify({ jsonrpc: '2.0', id, method, params });

    const child = spawn('node', [toolPath], { stdio: ['pipe', 'pipe', 'pipe'] });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });

    child.on('close', (code) => {
      if (code !== 0) {
        return reject(new Error(`Tool ${toolPath} exited ${code}: ${stderr}`));
      }
      try {
        const response = JSON.parse(stdout);
        if (response.error) return reject(new Error(response.error.message));
        resolve(response.result);
      } catch (err) {
        reject(new Error(`Tool ${toolPath} returned invalid JSON-RPC: ${stdout}`));
      }
    });

    child.stdin.write(request);
    child.stdin.end();
  });
}
```

Every backend route below calls `callTool()` instead of importing tool logic
directly — that boundary is what makes these real Executa tools rather than
disguised function calls.

---

## 4. The tools themselves

Each tool follows the same skeleton: read stdin → do the real work → write
one JSON-RPC response to stdout → `process.exit(0)`.

### `tools/generate_project.js`

```js
// tools/generate_project.js
import fs from 'fs';
import path from 'path';
import { readSkill } from './lib/skill.js';
import { callLLM } from './lib/llm.js';   // wraps your Claude/GPT key — see Section 5

let input = '';
process.stdin.on('data', (chunk) => { input += chunk; });
process.stdin.on('end', async () => {
  const req = JSON.parse(input);
  const { sessionId, prompt } = req.params;
  const workspaceDir = path.join('backend/workspaces', sessionId);

  try {
    const skill = readSkill('skills/vibe-coder.skill.md');
    const llmOutput = await callLLM(skill, `Generate a project for: ${prompt}`);
    const parsed = JSON.parse(llmOutput); // { files: [{ path, content }] }

    for (const file of parsed.files) {
      const fullPath = path.join(workspaceDir, file.path);
      fs.mkdirSync(path.dirname(fullPath), { recursive: true });
      fs.writeFileSync(fullPath, file.content);
    }

    // copy static boilerplate the LLM never generates
    copyBoilerplate(workspaceDir);

    respond(req.id, { filesWritten: parsed.files.map(f => f.path) });
  } catch (err) {
    respondError(req.id, -32000, err.message);
  }
});

function copyBoilerplate(workspaceDir) {
  const staticDir = 'backend/static';
  for (const name of ['.gitignore', 'favicon.svg', 'icons.svg']) {
    fs.copyFileSync(path.join(staticDir, name), path.join(workspaceDir, 'public', name));
  }
  fs.mkdirSync(path.join(workspaceDir, 'assets'), { recursive: true });
  fs.copyFileSync(path.join(staticDir, 'hero.png'), path.join(workspaceDir, 'assets', 'hero.png'));
}

function respond(id, result) {
  process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id, result }));
}
function respondError(id, code, message) {
  process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id, error: { code, message } }));
}
```

### `tools/read_file.js`

```js
// tools/read_file.js
import fs from 'fs';
import path from 'path';

let input = '';
process.stdin.on('data', (c) => { input += c; });
process.stdin.on('end', () => {
  const req = JSON.parse(input);
  const { sessionId, filePath } = req.params;
  try {
    const content = fs.readFileSync(
      path.join('backend/workspaces', sessionId, filePath), 'utf-8'
    );
    process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: req.id, result: { content } }));
  } catch (err) {
    process.stdout.write(JSON.stringify({
      jsonrpc: '2.0', id: req.id, error: { code: -32001, message: err.message }
    }));
  }
});
```

### `tools/edit_file.js`

```js
// tools/edit_file.js
import fs from 'fs';
import path from 'path';
import { readSkill } from './lib/skill.js';
import { callLLM } from './lib/llm.js';

let input = '';
process.stdin.on('data', (c) => { input += c; });
process.stdin.on('end', async () => {
  const req = JSON.parse(input);
  const { sessionId, filePath, instruction } = req.params;
  const fullPath = path.join('backend/workspaces', sessionId, filePath);

  try {
    const currentContent = fs.readFileSync(fullPath, 'utf-8');
    const skill = readSkill('skills/vibe-coder.skill.md');
    const prompt = `Current file content:\n${currentContent}\n\nInstruction: ${instruction}\n\nReturn the complete new file content as plain text, nothing else.`;
    const newContent = await callLLM(skill, prompt);
    fs.writeFileSync(fullPath, newContent);
    process.stdout.write(JSON.stringify({
      jsonrpc: '2.0', id: req.id, result: { path: filePath, updated: true }
    }));
  } catch (err) {
    process.stdout.write(JSON.stringify({
      jsonrpc: '2.0', id: req.id, error: { code: -32002, message: err.message }
    }));
  }
});
```

### `tools/list_files.js`

```js
// tools/list_files.js
import fs from 'fs';
import path from 'path';

function walk(dir, base = '') {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries.map((e) => {
    const rel = path.join(base, e.name);
    return e.isDirectory()
      ? { type: 'dir', name: e.name, children: walk(path.join(dir, e.name), rel) }
      : { type: 'file', name: e.name, path: rel };
  });
}

let input = '';
process.stdin.on('data', (c) => { input += c; });
process.stdin.on('end', () => {
  const req = JSON.parse(input);
  const { sessionId } = req.params;
  try {
    const tree = walk(path.join('backend/workspaces', sessionId));
    process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: req.id, result: { tree } }));
  } catch (err) {
    process.stdout.write(JSON.stringify({
      jsonrpc: '2.0', id: req.id, error: { code: -32003, message: err.message }
    }));
  }
});
```

### `tools/lib/llm.js` — your own Claude/GPT key, NOT an Anna completions key

Per confirmation from Anna's Discord: there is no standalone Anna completions
key for external apps. This file uses your own provider key directly.

```js
// tools/lib/llm.js
export async function callLLM(systemPrompt, userPrompt) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 4000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  });
  const data = await response.json();
  return data.content.map((b) => b.text || '').join('');
}
```

### `tools/lib/skill.js`

```js
// tools/lib/skill.js
import fs from 'fs';
export function readSkill(skillPath) {
  return fs.readFileSync(skillPath, 'utf-8');
}
```

---

## 5. The Skill file — `skills/vibe-coder.skill.md`

(Same content as plan.md Section 4 — repeated here so it lives as a real
file in your repo, not just prose in a planning doc.)

```
You are the code-generation engine inside Anna SDK.

RULES — never break these:
1. Output ONLY valid JSON matching the schema you're given. No prose,
   no markdown fences, no explanation text outside the JSON.
2. Generate plain HTML, CSS, and vanilla JavaScript only. No React, no JSX,
   no build tools, no external libraries.
3. All page content for a given screen must live in ONE file under
   /screens/. Do not split a screen into smaller files or components.
4. When generating a new project: produce index.html, style.css, main.js,
   and one file under screens/ per page (default screens/home.js if
   unspecified). Return as { "files": [{ "path": "...", "content": "..." }] }.
5. When editing an existing file: return the COMPLETE new file content,
   never a partial diff.
6. Keep code simple and self-contained — plain DOM APIs only.
7. If a request is ambiguous, make the most reasonable choice yourself.
```

---

## 6. Backend routes — `backend/server.js`

```js
import express from 'express';
import path from 'path';
import { callTool } from './rpc-client.js';
import { createSession, sessionDir } from './workspace.js';
import { zipSession } from './zip.js';

const app = express();
app.use(express.json());

app.post('/api/vibe', async (req, res) => {
  const { sessionId, prompt } = req.body;
  createSession(sessionId);
  try {
    const result = await callTool('tools/generate_project.js', 'generate_project', { sessionId, prompt });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/edit', async (req, res) => {
  const { sessionId, filePath, instruction } = req.body;
  try {
    await callTool('tools/read_file.js', 'read_file', { sessionId, filePath }); // sanity check file exists
    const result = await callTool('tools/edit_file.js', 'edit_file', { sessionId, filePath, instruction });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/files/:sessionId', async (req, res) => {
  try {
    const result = await callTool('tools/list_files.js', 'list_files', { sessionId: req.params.sessionId });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Static preview — NOT a tool, just real file serving. This is intentional (Section 5 of plan.md).
app.use('/preview/:sessionId', (req, res, next) => {
  express.static(sessionDir(req.params.sessionId))(req, res, next);
});

// Zip/download — NOT a JSON-RPC tool, see note below.
app.get('/api/download/:sessionId', async (req, res) => {
  try {
    await zipSession(req.params.sessionId, res); // streams directly to response
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(3001, () => console.log('Anna SDK backend on :3001'));
```

**Why zip/download is a plain function, not a JSON-RPC tool:** JSON-RPC over
stdio is built for structured request/response, not binary file streaming.
Forcing a zip stream through stdout-as-JSON would mean base64-encoding the
whole archive into a string — slow, memory-heavy, and fragile for no real
benefit. `generate_project`, `read_file`, `edit_file`, `list_files` are your
four genuine Executa tools for hackathon compliance; `zip_project` is
legitimate supporting infrastructure around them.

---

## 7. Workspace manager — `backend/workspace.js`

```js
import fs from 'fs';
import path from 'path';

const ROOT = path.join(process.cwd(), 'backend/workspaces');

export function sessionDir(sessionId) {
  return path.join(ROOT, sessionId);
}

export function createSession(sessionId) {
  fs.mkdirSync(sessionDir(sessionId), { recursive: true });
}

export function deleteSession(sessionId) {
  fs.rmSync(sessionDir(sessionId), { recursive: true, force: true });
}
```

---

## 8. Zip — `backend/zip.js`

```js
import archiver from 'archiver';
import { sessionDir } from './workspace.js';

export async function zipSession(sessionId, res) {
  res.attachment(`${sessionId}.zip`);
  const archive = archiver('zip');
  archive.pipe(res);
  archive.directory(sessionDir(sessionId), false);
  await archive.finalize();
}
```

Install: `npm install archiver`

---

## 9. Frontend wiring checklist

Replace each of these mock behaviors with a real fetch call:

| Currently mocked | Replace with |
|---|---|
| Hardcoded file tree on `/vibe` | `POST /api/vibe`, then `GET /api/files/:sessionId` to populate the tree |
| Hardcoded code content in viewer | Use `result.content` from `read_file` (call it when a file is clicked) |
| Fake "Preview" tab | `<iframe src="/preview/{sessionId}/index.html">` |
| Fake "Download ZIP" toast | `<a href="/api/download/{sessionId}">` or a fetch + blob download |
| Fake tool-call log lines | These can stay UI flourish — show them *while waiting* for the real `/api/vibe` response, then swap in the real result once it returns |

---

## 10. Best use of "fit with Anna" given your timeline

Be precise about what you're claiming in your submission description, since
overclaiming here is an easy way to lose points on judging:

**What you genuinely have, and should say plainly:**
- Real Executa tools (`generate_project`, `read_file`, `edit_file`,
  `list_files`) speaking actual JSON-RPC 2.0 over stdio, spawned as
  standalone child processes — matching Anna's documented Tool protocol
  exactly (Section 3 above).
- A real Skill file (`vibe-coder.skill.md`) that governs how those tools
  behave — matching Anna's "declarative flavour of Executa" definition.
- Real state (the workspace folder) and a real UI on top.

**What you do NOT have, and should not claim:**
- This is not yet a published **Anna App** — it doesn't run inside Anna's
  own iframe shell, doesn't use the App UI SDK or manifest, and doesn't
  call `anna.tools.invoke` from inside a live Anna session.

**How to phrase this honestly in your submission writeup:**
> "Anna SDK implements real Executa tools and a Skill following Anna's
> documented JSON-RPC-over-stdio protocol. It currently runs as a
> standalone app with its own UI and backend; the tools are structured so
> they could be re-packaged as a published Anna App (manifest + UI bundle)
> as a next step, without changing the underlying tool/skill logic."

This framing gets you full credit for genuine, protocol-correct Executa use
without claiming Anna-native installation you didn't build — judges can
verify the former by reading your code, and would immediately notice if you
overclaimed the latter.

**If you somehow finish early and want the real native path:** the docs
mention an `anna-app` CLI (`anna-app dev`, scaffold/dev/validate) and a
reference project (`anna-app-focus-flow`) to clone. That is a genuine
stretch goal, not a today-task — don't attempt it unless steps 1–9 in the
previous build-order message are fully done and demoed.

---

## 11. Run instructions (put this in your actual README/deliverable)

```bash
# backend
cd backend
npm install express archiver
node server.js

# tools have no separate install step — they're invoked by rpc-client.js
# just make sure ANTHROPIC_API_KEY (or your provider's key) is set:
export ANTHROPIC_API_KEY=sk-...

# frontend
cd frontend
npm install
npm run dev
```