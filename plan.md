# Anna SDK — Backend Agent Implementation Plan

## 0. Decision you need to confirm first

Your frontend mock shows `App.jsx` / `Home.jsx` (React). Your new direction says
the agent should generate **plain HTML + vanilla JS**, no React, no JSX, no build
step. These conflict. This plan assumes the **vanilla pivot is correct** — it is
the right call for reliability — which means:

- File tree must change from `App.jsx` / `Home.jsx` → `index.html`,
  `main.js`, `screens/home.js`, `style.css`.
- "Preview" stops meaning "run a Vite dev server" and starts meaning
  "serve a static folder and load it in an iframe." This removes the single
  biggest risk from the whole project — no process spawning, no port
  management, no build errors. Plain HTML/JS just *works* when served.

**Action item:** update the frontend's hardcoded file tree + code viewer mock
to vanilla filenames before wiring it to the real agent, or the UI and the
backend will permanently disagree with each other.

---

## 1. Architecture overview

```
Browser (your existing chat UI)
   │  POST /api/vibe        { sessionId, prompt }
   │  POST /api/edit        { sessionId, instruction }
   │  GET  /api/files/:id   (file tree + contents)
   │  GET  /preview/:id/*   (static file serve → iframe src)
   │  GET  /api/download/:id (zip stream)
   ▼
Node.js/Express backend ("the Agent")
   │
   ├─ Session/workspace manager
   │     /workspaces/{sessionId}/  ← real files live here on disk
   │
   ├─ Executa Tools (separate scripts, JSON-RPC over stdin/stdout)
   │     tools/generate_project.js
   │     tools/edit_file.js
   │     tools/list_files.js
   │     tools/read_file.js
   │     tools/zip_project.js
   │
   ├─ Skill (system prompt) → tells the LLM when/how to call each tool
   │
   └─ LLM call (Claude/GPT API, swap for Anna AI API key later)
```

Why tools are separate scripts, not just functions: the hackathon explicitly
requires Executa tools communicating via **JSON-RPC over stdin/stdout**. If
you just call functions inline inside your Express route, it works, but it
does **not** count as a real Executa tool for judging. Spawn each tool as a
child process, write a JSON-RPC request to its stdin, read the JSON-RPC
response from its stdout. This is a small wrapper, not a big lift.

---

## 2. Workspace / state

Each chat session = one folder: `/workspaces/{sessionId}/`.
This folder **is** the state. No database needed for v1 — the AI's "memory"
of the project is just: read whatever files currently exist before editing.

Fixed structure the agent always writes on `/vibe`:

```
/workspaces/{sessionId}/
├── index.html
├── style.css
├── main.js
├── .gitignore
├── public/
│   ├── favicon.svg
│   └── icons.svg
├── assets/
│   └── hero.png        (placeholder, copy a static default — don't generate images)
└── screens/
    └── home.js          (hardcoded screen, no component imports)
```

Keep this structure **identical every time** — never let the LLM invent its
own folder layout. The LLM only fills in the *content* of `index.html`,
`style.css`, `main.js`, and files under `screens/`.

---

## 3. Executa Tools — spec

Each tool is a standalone Node script. Reads one JSON object from stdin,
writes one JSON object to stdout, exits.

### `generate_project`
**Request:**
```json
{ "method": "generate_project", "params": { "sessionId": "abc123", "prompt": "a ceramic artist portfolio" } }
```
**What it does:**
1. Calls the LLM with the Skill (below) + the user prompt.
2. LLM must return strict JSON: `{ "files": [ { "path": "index.html", "content": "..." }, ... ] }`
3. Tool writes each file under `/workspaces/{sessionId}/`, creating folders as needed.
4. Tool also copies static boilerplate it does NOT ask the LLM to generate:
   `.gitignore`, `public/favicon.svg`, `public/icons.svg`, `assets/hero.png`
   (ship these as fixed template files in your repo, just copy them).

**Response:**
```json
{ "result": { "filesWritten": ["index.html", "style.css", "main.js", "screens/home.js"] } }
```

### `read_file`
**Request:** `{ "method": "read_file", "params": { "sessionId": "abc123", "path": "screens/home.js" } }`
**Response:** `{ "result": { "content": "...current file text..." } }`
Used by the agent before every edit — never edit blind.

### `edit_file`
**Request:**
```json
{ "method": "edit_file", "params": { "sessionId": "abc123", "path": "screens/home.js", "instruction": "make the button blue" } }
```
**What it does:**
1. Calls `read_file` internally to get current content.
2. Sends `{ currentContent, instruction }` to the LLM with the editing Skill.
3. LLM returns the **entire new file content** (never a diff — diffs are
   where one-day builds break).
4. Tool overwrites the file.

**Response:** `{ "result": { "path": "screens/home.js", "updated": true } }`

### `list_files`
Returns the current file tree for a session, recursively, so the frontend's
file explorer panel is real instead of hardcoded.
**Response:** `{ "result": { "tree": [ ...nested paths... ] } }`

### `zip_project`
Zips the entire `/workspaces/{sessionId}/` folder using `archiver` (npm
package), streams it back. This is what makes "Download ZIP" actually work.
**Response:** binary stream, not JSON — call this one directly from the
Express route rather than through stdin/stdout (file streaming over
stdout is unnecessary pain; keep this one as a direct backend function,
the other four are your "real" Executa tools for judging purposes).

---

## 4. The Skill (system prompt)

This is a real deliverable for the hackathon — write it as its own file,
`skills/vibe-coder.skill.md`, and load its text into every LLM call.

```
You are the code-generation engine inside Anna SDK.

RULES — never break these:
1. Output ONLY valid JSON matching the schema you're given. No prose,
   no markdown fences, no explanation text outside the JSON.
2. Generate plain HTML, CSS, and vanilla JavaScript only. No React, no JSX,
   no build tools, no external libraries, no <script type="module"> imports
   beyond plain relative paths.
3. All page content for a given screen must live in ONE file under
   /screens/. Do not split a screen into smaller files or components.
4. When asked to generate a new project: produce index.html, style.css,
   main.js, and one file under screens/ per page the user describes
   (default to a single screens/home.js if the user doesn't specify
   multiple pages).
5. When asked to edit an existing file: you will be given the CURRENT
   full content of that file and an instruction. Return the COMPLETE
   new file content with the change applied — never a partial diff,
   never "...rest unchanged...".
6. Keep generated code simple, readable, and self-contained. Prefer
   plain DOM APIs (document.querySelector, addEventListener) over
   anything clever.
7. If the user's instruction is ambiguous, make the most reasonable
   visual/UX choice yourself rather than asking a follow-up question —
   this tool has no mechanism for the AI to ask clarifying questions
   mid-generation.
```

Keep tool-call routing logic (when to call `generate_project` vs
`edit_file`) in your main agent prompt, separate from this content-Skill —
e.g.: "If the user message starts with /vibe, call generate_project. For
any other message once a project exists, call read_file on the most likely
target file, then call edit_file."

---

## 5. Preview — the easy version

Because output is now plain static HTML/CSS/JS, you don't need to run
anything. Mount one Express static middleware per session:

```js
app.use('/preview/:sessionId', (req, res, next) => {
  express.static(`/workspaces/${req.params.sessionId}`)(req, res, next);
});
```

Frontend iframe just points `src="/preview/{sessionId}/index.html"`.
Every edit that overwrites a file is reflected on the next iframe reload —
no dev server, no port allocation, no crash recovery needed. This is the
single biggest scope-reduction in the whole project; don't skip it by
trying to add a build step "for later."

---

## 6. Build order for today

1. Static boilerplate files (favicon, icons, hero.png, .gitignore template) — 10 min.
2. Workspace/session folder manager (create, read tree, delete on cleanup) — 20 min.
3. `generate_project` tool + Skill prompt + JSON schema validation — 1–2 hrs
   (this is where most of your time goes; test with 3–4 different prompts).
4. `read_file` / `edit_file` tools — 30–45 min once `generate_project` works,
   they reuse the same LLM-call plumbing.
5. Static preview route (Section 5) — 15 min, genuinely this fast.
6. `zip_project` + real Download button wiring — 30 min.
7. `list_files` + connect frontend's file explorer to real tree instead of
   hardcoded mock — 30–45 min.
8. Wrap tools 3–5 as actual JSON-RPC stdin/stdout child processes (compliance
   step for judging) — do this LAST, only after the logic works as plain
   function calls. Wrapping working code in JSON-RPC is mechanical; debugging
   JSON-RPC plumbing and LLM logic at the same time is not.
9. Connect GitHub button: leave disabled, as already planned.

## 7. Fallback if you run out of time

If step 3 (generation) is unreliable under time pressure, hardcode 2–3
"template" projects (portfolio, landing page, blog) the LLM picks from and
lightly customizes via edit_file, instead of generating fully from scratch.
Still real tool calls, still real state, just a smaller LLM surface area —
better to demo this than a generator that sometimes returns broken JSON.