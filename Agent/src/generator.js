import { replaceProject, writeProjectFile } from "./workspace.js";

// Paths the LLM is allowed to generate (also served as editable files).
const REQUIRED_PATHS = new Set([
  "index.html",
  "style.css",
  "main.js",
  "screens/home.js",
  "screens/about.js",
  "screens/contact.js",
  "screens/login.js",
]);

// ── Static boilerplate added to every generated project ───────────────────

function staticBoilerplate() {
  return [
    {
      path: "package.json",
      content:
        '{\n  "name": "anna-project",\n  "version": "1.0.0",\n  "private": true,\n  "scripts": {\n    "start": "npx serve .",\n    "dev": "npx serve ."\n  }\n}\n',
    },
    { path: ".gitignore", content: ".DS_Store\n*.log\nnode_modules/\n" },
    {
      path: "public/favicon.svg",
      content:
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="9" fill="#24201c"/><path d="M16 7c1 5 4 8 9 9-5 1-8 4-9 9-1-5-4-8-9-9 5-1 8-4 9-9Z" fill="#f7f2e9"/></svg>\n',
    },
    {
      path: "public/icons.svg",
      content:
        '<svg xmlns="http://www.w3.org/2000/svg"><symbol id="arrow" viewBox="0 0 24 24"><path d="M5 12h14m-6-6 6 6-6 6" fill="none" stroke="currentColor" stroke-width="2"/></symbol></svg>\n',
    },
    {
      path: "assets/hero.png",
      content: Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAFgwJ/lbMcWQAAAABJRU5ErkJggg==",
        "base64",
      ),
    },
  ];
}

// ── Validation ─────────────────────────────────────────────────────────────

function validateFiles(files) {
  if (!Array.isArray(files)) throw new Error("files must be an array");
  const seen = new Set();
  for (const file of files) {
    if (!file || typeof file.path !== "string" || typeof file.content !== "string")
      throw new Error("Each file must have a string path and string content");
    if (
      !REQUIRED_PATHS.has(file.path) &&
      !/^screens\/[a-zA-Z0-9_-]+\.js$/.test(file.path)
    )
      throw new Error(`Disallowed path: ${file.path}`);
    if (seen.has(file.path)) throw new Error(`Duplicate path: ${file.path}`);
    seen.add(file.path);
  }
  for (const required of REQUIRED_PATHS)
    if (!seen.has(required)) throw new Error(`Missing required file: ${required}`);
}

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Write LLM-generated source files + static boilerplate to a project workspace.
 * Called by POST /api/vibe after the frontend obtains the files from anna.llm.complete().
 */
export async function writeProjectFiles(sessionId, files) {
  validateFiles(files);
  const allFiles = [...files, ...staticBoilerplate()];
  await replaceProject(sessionId, allFiles);
  return { filesWritten: allFiles.map(({ path }) => path) };
}

/**
 * Write a single edited file returned by anna.llm.complete() back to the project.
 * Called by POST /api/edit after the frontend calls anna.llm.complete() for the edit.
 */
export async function writeFileEdit(sessionId, requestedPath, content) {
  const isAllowed =
    REQUIRED_PATHS.has(requestedPath) ||
    /^screens\/[a-zA-Z0-9_-]+\.js$/.test(requestedPath);
  if (!isAllowed) throw new Error(`Edit not allowed for path: ${requestedPath}`);
  if (!content || !content.trim()) throw new Error("Content must not be empty");
  await writeProjectFile(sessionId, requestedPath, content);
  return { path: requestedPath, updated: true };
}
