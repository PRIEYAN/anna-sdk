// Anna App Runtime — served by anna-app dev harness
import { AnnaAppRuntime } from "/static/anna-apps/_sdk/latest/index.js";

const BACKEND = "http://localhost:8787";

// ── State ──────────────────────────────────────────────────────────────────
let anna = null;
let skillText = "";
let hasProject = false;
let selectedFile = "screens/home.js";
let projectVersion = 0;
let isBusy = false;

const sessionId = (() => {
  const key = "anna-vibe-session-id";
  let id = localStorage.getItem(key);
  if (!id) { id = crypto.randomUUID(); localStorage.setItem(key, id); }
  return id;
})();

// ── DOM refs ───────────────────────────────────────────────────────────────
const elMessages = document.getElementById("chat-messages");
const elInput = document.getElementById("chat-input");
const elSendBtn = document.getElementById("send-btn");
const elBusy = document.getElementById("busy");
const elFileTree = document.getElementById("file-tree");
const elCodeView = document.getElementById("code-view");
const elSelectedLabel = document.getElementById("selected-file-label");
const elPreviewFrame = document.getElementById("preview-frame");
const elPreviewUrlBar = document.getElementById("preview-url-bar");
const elDownloadBtn = document.getElementById("download-btn");
const elVersionLabel = document.getElementById("version-label");
const elTabCode = document.getElementById("tab-code");
const elTabPreview = document.getElementById("tab-preview");
const elCodePanel = document.getElementById("code-panel");
const elPreviewPanel = document.getElementById("preview-panel");
const elNewSessionBtn = document.getElementById("new-session-btn");

// ── Chat helpers ───────────────────────────────────────────────────────────
function addMsg(type, text) {
  const div = document.createElement("div");
  div.className = type === "assistant" ? "msg msg-assistant" : type === "user" ? "msg msg-user" : "msg msg-tool";
  if (type === "assistant") {
    const span = document.createElement("span");
    span.className = "text";
    span.textContent = text;
    div.appendChild(span);
  } else {
    div.textContent = text;
  }
  elMessages.appendChild(div);
  elMessages.scrollTop = elMessages.scrollHeight;
}

function setBusy(busy) {
  isBusy = busy;
  elBusy.style.display = busy ? "flex" : "none";
  elSendBtn.disabled = busy;
}

// ── File helpers ───────────────────────────────────────────────────────────
async function loadFileTree() {
  const res = await fetch(`${BACKEND}/api/files/${encodeURIComponent(sessionId)}`);
  if (!res.ok) return;
  const { tree } = await res.json();
  renderTree(tree, elFileTree);
}

function renderTree(nodes, container) {
  container.innerHTML = "";
  const ul = document.createElement("ul");
  for (const node of nodes) renderNode(node, ul);
  container.appendChild(ul);
}

function renderNode(node, parent) {
  const li = document.createElement("li");
  if (node.children) {
    const span = document.createElement("span");
    span.className = "folder";
    span.textContent = `📁 ${node.name}/`;
    li.appendChild(span);
    if (node.children.length) {
      const sub = document.createElement("ul");
      for (const child of node.children) renderNode(child, sub);
      li.appendChild(sub);
    }
  } else {
    const btn = document.createElement("button");
    btn.className = "file-btn" + (node.path === selectedFile ? " active" : "");
    btn.textContent = node.name;
    btn.addEventListener("click", () => void loadFile(node.path));
    li.appendChild(btn);
  }
  parent.appendChild(li);
}

async function loadFile(path) {
  selectedFile = path;
  elSelectedLabel.textContent = path;
  // Update active state
  document.querySelectorAll(".file-btn").forEach((b) => {
    b.classList.toggle("active", b.textContent === path.split("/").pop() && b.closest("li")?.querySelector(".file-btn")?.textContent === path.split("/").pop());
  });
  if (/\.(png|jpe?g|gif|webp|ico)$/i.test(path)) {
    elCodeView.textContent = "[binary asset — cannot display]";
    return;
  }
  try {
    const res = await fetch(
      `${BACKEND}/api/files/${encodeURIComponent(sessionId)}?path=${encodeURIComponent(path)}`,
    );
    if (!res.ok) return;
    const { content } = await res.json();
    elCodeView.textContent = content;
  } catch { /* ignore */ }
}

function refreshPreview() {
  const url = `${BACKEND}/preview/${encodeURIComponent(sessionId)}/index.html?v=${projectVersion}`;
  elPreviewFrame.src = url;
  elPreviewUrlBar.textContent = url;
}

// ── Tab switching ──────────────────────────────────────────────────────────
elTabCode.addEventListener("click", () => {
  elTabCode.classList.add("active");
  elTabPreview.classList.remove("active");
  elCodePanel.hidden = false;
  elPreviewPanel.hidden = true;
});

elTabPreview.addEventListener("click", () => {
  elTabPreview.classList.add("active");
  elTabCode.classList.remove("active");
  elPreviewPanel.hidden = false;
  elCodePanel.hidden = true;
  if (hasProject) refreshPreview();
});

// ── Download & new session ─────────────────────────────────────────────────
elDownloadBtn.addEventListener("click", () => {
  window.location.assign(`${BACKEND}/api/download/${encodeURIComponent(sessionId)}`);
});

elNewSessionBtn.addEventListener("click", () => {
  if (!confirm("Start a new session? The current project will be lost.")) return;
  localStorage.removeItem("anna-vibe-session-id");
  location.reload();
});

// ── Generation helpers ─────────────────────────────────────────────────────
const GENERATION_SCHEMA =
  `{ "files": [ { "path": "index.html", "content": "..." }, { "path": "style.css", "content": "..." }, { "path": "main.js", "content": "..." }, { "path": "screens/home.js", "content": "..." }, { "path": "screens/about.js", "content": "..." }, { "path": "screens/contact.js", "content": "..." }, { "path": "screens/login.js", "content": "..." } ] }`;

const EDIT_SCHEMA = `{ "content": "the complete updated file content" }`;

function buildGenerationPrompt(desc) {
  return `Generate a complete, professional multi-page vanilla web project for this request: ${desc}

Required pages (always include all 4):
- screens/home.js   — hero with gradient+picsum background, features grid, "Get Started" CTA → #login
- screens/about.js  — About Us: origin story, team cards with photos, mission statement
- screens/contact.js — Contact Us: styled form + address, phone, email
- screens/login.js  — Login form with email/password + "Continue with Google" button (UI only)

Also add domain-specific pages (ecommerce → products + cart, portfolio → work, restaurant → menu, blog → posts + post-detail, etc.)

Technical requirements:
- index.html loads Font Awesome 6 CDN, then every screens/*.js <script> tag in order, then main.js
- main.js routes via window.location.hash and calls window.render*() functions
- Every page includes a fixed nav bar and a footer with social icons
- Use CSS variables for consistent colors; picsum.photos/seed/{keyword} for themed images; FA6 for icons
- Realistic sample content — no lorem ipsum`;
}

function parseJsonResult(raw) {
  const text = typeof raw === "string" ? raw : (raw?.content?.text ?? raw?.content ?? "");
  return JSON.parse(text.replace(/^```(?:json)?\s*|\s*```$/g, ""));
}

async function callAnnaLLM(userText, systemSuffix) {
  const systemPrompt = `${skillText}\n\nRequired JSON schema: ${systemSuffix}`;
  const result = await anna.llm.complete({
    messages: [{ role: "user", content: { type: "text", text: userText } }],
    systemPrompt,
    maxTokens: 16000,
    temperature: 0.35,
    responseFormat: { type: "json_object" },
  });
  return parseJsonResult(result?.content?.text ?? result?.content ?? result);
}

// ── Main send handler ──────────────────────────────────────────────────────
async function handleSend() {
  const text = elInput.value.trim();
  if (!text || isBusy) return;
  elInput.value = "";
  addMsg("user", text);
  setBusy(true);

  try {
    if (!anna) throw new Error("Anna AI not connected. Run via: anna-app dev");

    if (text.startsWith("/vibe")) {
      const desc = text.replace(/^\/vibe\b/, "").trim() || "a tiny landing page";
      addMsg("tool", `→ generate_project({ prompt: "${desc}" })`);

      const parsed = await callAnnaLLM(buildGenerationPrompt(desc), GENERATION_SCHEMA);

      const res = await fetch(`${BACKEND}/api/vibe`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sessionId, files: parsed.files }),
      });
      if (!res.ok) throw new Error((await res.json()).error || `Write failed (${res.status})`);
      const { filesWritten } = await res.json();

      hasProject = true;
      projectVersion++;
      elVersionLabel.textContent = `vibe-project · v${projectVersion}`;
      elDownloadBtn.disabled = false;

      await loadFileTree();
      await loadFile("screens/home.js");

      addMsg("tool", `✓ Wrote ${filesWritten.length} files.`);
      addMsg("assistant", "Done! Your project is ready. Switch to Preview to see it, or describe a change you want.");
    } else if (hasProject) {
      const target = selectedFile || "screens/home.js";
      addMsg("tool", `→ edit_file("${target}")`);

      const fileRes = await fetch(
        `${BACKEND}/api/files/${encodeURIComponent(sessionId)}?path=${encodeURIComponent(target)}`,
      );
      if (!fileRes.ok) throw new Error("Could not read current file");
      const { content: currentContent } = await fileRes.json();

      const parsed = await callAnnaLLM(
        `Edit ${target}.\n\nInstruction: ${text}\n\nCURRENT FULL CONTENT:\n${currentContent}`,
        EDIT_SCHEMA,
      );

      if (!parsed.content || typeof parsed.content !== "string")
        throw new Error("Model returned invalid content for edit");

      const editRes = await fetch(`${BACKEND}/api/edit`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sessionId, path: target, content: parsed.content }),
      });
      if (!editRes.ok) throw new Error((await editRes.json()).error || `Edit failed (${editRes.status})`);

      projectVersion++;
      elVersionLabel.textContent = `vibe-project · v${projectVersion}`;
      await loadFile(target);
      elTabPreview.click();

      addMsg("tool", `✓ Updated ${target}.`);
      addMsg("assistant", "Applied your change. Preview refreshed — check the right panel.");
    } else {
      addMsg("assistant", "Start with /vibe to generate a project first.\n\nExample: /vibe a coffee shop landing page");
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    addMsg("assistant", `I couldn't complete that: ${msg}`);
  } finally {
    setBusy(false);
  }
}

elSendBtn.addEventListener("click", handleSend);
elInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
});

// ── Boot ───────────────────────────────────────────────────────────────────
async function boot() {
  // Load the skill prompt from the backend
  try {
    const res = await fetch(`${BACKEND}/api/skill`);
    if (res.ok) skillText = await res.text();
  } catch { /* backend may not be running yet */ }

  // Connect to Anna's platform
  try {
    anna = await AnnaAppRuntime.connect();
    addMsg(
      "assistant",
      "Hi, I'm Anna. Type /vibe followed by a description to generate a multi-page vanilla web project.\n\nExample: /vibe a professional ecommerce website for a shoe store",
    );
  } catch (err) {
    addMsg(
      "assistant",
      "⚠️ Anna AI is not available. Make sure you are running this via:\n\n  anna-app dev\n\nand that the Agent server is running:\n\n  node Agent/server.js",
    );
  }
}

boot();
