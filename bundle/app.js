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
const elMessages   = document.getElementById("chat-messages");
const elInput      = document.getElementById("chat-input");
const elSendBtn    = document.getElementById("send-btn");
const elBusy       = document.getElementById("busy");
const elFileTree   = document.getElementById("file-tree");
const elCodeView   = document.getElementById("code-view");
const elSelectedLabel  = document.getElementById("selected-file-label");
const elPreviewFrame   = document.getElementById("preview-frame");
const elPreviewUrlBar  = document.getElementById("preview-url-bar");
const elDownloadBtn    = document.getElementById("download-btn");
const elVersionLabel   = document.getElementById("version-label");
const elTabCode    = document.getElementById("tab-code");
const elTabPreview = document.getElementById("tab-preview");
const elCodePanel  = document.getElementById("code-panel");
const elPreviewPanel   = document.getElementById("preview-panel");
const elNewSessionBtn  = document.getElementById("new-session-btn");

// ── Chat helpers ───────────────────────────────────────────────────────────
function addMsg(type, text) {
  const div = document.createElement("div");
  div.className = type === "assistant" ? "msg msg-assistant"
                : type === "user"      ? "msg msg-user"
                                       : "msg msg-tool";
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
  return div;
}

// Live-update a tool message already in the DOM
function updateMsg(div, text) {
  div.textContent = text;
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
  document.querySelectorAll(".file-btn").forEach((b) => {
    b.classList.toggle("active", b.textContent === path.split("/").pop());
  });
  if (/\.(png|jpe?g|gif|webp|ico)$/i.test(path)) {
    elCodeView.textContent = "[binary asset]";
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
  elTabCode.classList.add("active"); elTabPreview.classList.remove("active");
  elCodePanel.hidden = false; elPreviewPanel.hidden = true;
});
elTabPreview.addEventListener("click", () => {
  elTabPreview.classList.add("active"); elTabCode.classList.remove("active");
  elPreviewPanel.hidden = false; elCodePanel.hidden = true;
  if (hasProject) refreshPreview();
});

elDownloadBtn.addEventListener("click", () => {
  window.location.assign(`${BACKEND}/api/download/${encodeURIComponent(sessionId)}`);
});
elNewSessionBtn.addEventListener("click", () => {
  if (!confirm("Start a new session? Current project will be lost.")) return;
  localStorage.removeItem("anna-vibe-session-id");
  location.reload();
});


// ── Generation ────────────────────────────────────────────────────────────
// Single landing page per prompt — one LLM call, one HTML file.
// maxTokens:2000 ensures the model has budget left after any internal thinking.

function systemRaw() {
  return (
    "You are an expert creative frontend developer.\n" +
    "DO NOT think or reason internally. Output code immediately.\n" +
    "Output ONLY the raw file content. No markdown fences. No explanation. No preamble."
  );
}

// Calls Anna and returns raw text (no JSON.parse).
async function callAnnaRaw(userText, systemText, maxTokens = 2000) {
  const messageText = "/no_think\n" + userText;
  let result;
  try {
    result = await anna.llm.complete({
      messages: [{ role: "user", content: { type: "text", text: messageText } }],
      systemPrompt: systemText,
      maxTokens,
      temperature: 0.7,
    });
  } catch (err) {
    const msg = err?.message ?? String(err);
    if (/llm_disabled|no.llm|disabled/i.test(msg))
      throw new Error("Anna LLM is disabled. Run: anna-app login --host https://anna.partners then restart start-anna.cmd");
    if (/verified developer|developer.*required/i.test(msg))
      throw new Error("Anna requires verified developer access. Apply at anna.partners/developers");
    throw err;
  }

  console.log("[anna-vibe] raw:", JSON.stringify(result).slice(0, 400));

  if (result?.ok === false)
    throw new Error(`Anna error: ${result?.error?.message ?? result?.error?.code ?? "unknown"}`);

  const text =
    (typeof result?.content?.[0]?.text === "string" && result.content[0].text) ||
    (typeof result?.content?.text === "string" && result.content.text) ||
    (typeof result?.content === "string" && result.content) ||
    (typeof result?.text === "string" && result.text) ||
    "";

  if (!text.trim())
    throw new Error(`Anna returned empty content. Raw: ${JSON.stringify(result).slice(0, 200)}`);

  // Strip markdown fences if present
  return text.replace(/^```[\w]*\n?/m, "").replace(/\n?```\s*$/m, "").trim();
}

async function generateWithAnna(desc) {
  const div = addMsg("tool", "▸ Anna is crafting your landing page…");

  const prompt =
    `Create a complete, creative single-page landing page HTML file for: "${desc}"\n\n` +
    `Requirements:\n` +
    `- Invent a bold brand name and memorable tagline for this business\n` +
    `- All CSS inside a <style> tag in <head>; all JS inside a <script> tag before </body>\n` +
    `- Dark background (#0d0d0d or similar), a vivid unique accent color, near-white body text\n` +
    `- Google Fonts API <link> in <head> (choose a font that fits the brand personality)\n` +
    `- Font Awesome 6.5 CDN <link> in <head> for icons\n` +
    `- Sections (in order): sticky nav, full-height hero with gradient overlay, ` +
    `3-column features section, a stats/testimonial row, a CTA section, footer\n` +
    `- CSS @keyframes animations (fadeIn, slideUp); smooth hover transitions on buttons and cards\n` +
    `- Real invented content — names, descriptions, numbers — nothing generic or lorem ipsum\n` +
    `- Fully responsive (mobile-friendly with @media queries)\n\n` +
    `Output raw HTML only. Start with <!DOCTYPE html>. No explanation text.`;

  let html;
  try {
    html = await callAnnaRaw(prompt, systemRaw(), 2000);
  } catch (err) {
    updateMsg(div, `✗ Failed: ${err.message}`);
    throw err;
  }

  // Ensure we got something that looks like HTML
  if (!html.includes("<")) {
    updateMsg(div, "✗ Anna returned unexpected content (not HTML)");
    throw new Error("Anna did not return HTML. Check DevTools console for the raw response.");
  }

  const file = { path: "index.html", content: html };
  await writeFiles([file]);
  await loadFileTree();
  await loadFile("index.html");
  updateMsg(div, "✓ Landing page ready");

  return { files: [file], spec: { name: desc } };
}

// Writes a batch of files to disk via the Agent server
async function writeFiles(files) {
  const res = await fetch(`${BACKEND}/api/vibe`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ sessionId, files }),
  });
  if (!res.ok) throw new Error((await res.json()).error || `Write failed (${res.status})`);
  return res.json();
}

// ── Edit helpers ───────────────────────────────────────────────────────────
async function editWithAnna(instruction, targetPath, currentContent) {
  const editDiv = addMsg("tool", `▸ Editing ${targetPath}…`);
  const ext = targetPath.split(".").pop();
  const prompt =
    `File: ${targetPath}\nInstruction: ${instruction}\n\n` +
    `CURRENT CONTENT:\n${currentContent}\n\n` +
    `Output the complete updated file. Start with the first line of the file. No explanation.`;

  let updated;
  try {
    updated = await callAnnaRaw(prompt, systemRaw(), 2000);
  } catch (err) {
    updateMsg(editDiv, `✗ Edit failed: ${err.message}`);
    throw err;
  }

  const editRes = await fetch(`${BACKEND}/api/edit`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ sessionId, path: targetPath, content: updated }),
  });
  if (!editRes.ok) throw new Error((await editRes.json()).error || `Write failed`);
  updateMsg(editDiv, `✓ ${targetPath} updated`);
  return targetPath;
}

// ── Main send handler ──────────────────────────────────────────────────────
async function handleSend() {
  const text = elInput.value.trim();
  if (!text || isBusy) return;
  elInput.value = "";
  addMsg("user", text);
  setBusy(true);

  try {
    if (!anna) throw new Error(
      "Anna AI is not connected.\nRun: start-anna.cmd\n(requires anna-app dev + verified developer access at anna.partners/developers)"
    );

    if (text.startsWith("/vibe")) {
      const desc = text.replace(/^\/vibe\b/, "").trim() || "a creative landing page";
      addMsg("tool", `→ generate_project("${desc}")`);
      addMsg("assistant", "Anna AI is building your landing page — takes ~15 seconds…");

      const { files, spec } = await generateWithAnna(desc);

      hasProject = true;
      projectVersion++;
      elVersionLabel.textContent = `${spec.name} · v${projectVersion}`;
      elDownloadBtn.disabled = false;
      await loadFileTree();
      await loadFile("screens/home.js");

      addMsg("tool", `✓ Done — ${files.length} files written by Anna AI`);
      addMsg("assistant", `"${spec.name}" is ready! Switch to Preview, or tell me what to change.`);

    } else if (hasProject) {
      const target = selectedFile || "screens/home.js";
      addMsg("tool", `→ edit_file("${target}")`);

      const fileRes = await fetch(
        `${BACKEND}/api/files/${encodeURIComponent(sessionId)}?path=${encodeURIComponent(target)}`,
      );
      if (!fileRes.ok) throw new Error("Could not read current file");
      const { content: currentContent } = await fileRes.json();

      await editWithAnna(text, target, currentContent);

      projectVersion++;
      elVersionLabel.textContent = elVersionLabel.textContent.replace(/ · v\d+$/, ` · v${projectVersion}`);
      await loadFile(target);
      elTabPreview.click();
      addMsg("assistant", "Applied. Preview refreshed — check the right panel.");

    } else {
      addMsg("assistant",
        "Start with /vibe to generate a site.\n\nExamples:\n" +
        "  /vibe a coffee shop called Morning Brew\n" +
        "  /vibe a chatting app with dark neon theme\n" +
        "  /vibe an ecommerce store for handmade jewellery\n" +
        "  /vibe a fitness app for yoga studios"
      );
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    addMsg("assistant", `Error: ${msg}`);
    console.error("[anna-vibe]", err);
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
  try {
    const res = await fetch(`${BACKEND}/api/skill`);
    if (res.ok) skillText = await res.text();
  } catch { /* backend may not be running */ }

  try {
    anna = await AnnaAppRuntime.connect();
    addMsg("assistant",
      "Anna is ready. Describe any website and I'll build it from scratch.\n\n" +
      "  /vibe a coffee shop called Morning Brew\n" +
      "  /vibe a chatting app with dark neon theme\n" +
      "  /vibe an ecommerce store for handmade jewellery\n" +
      "  /vibe a fitness studio landing page\n\n" +
      "Anna builds a unique landing page for each prompt — takes ~15 seconds."
    );
  } catch (err) {
    console.error("[anna-vibe] Anna connect failed:", err);
    addMsg("assistant",
      "⚠️  Anna AI is not connected.\n\n" +
      "To use this app:\n" +
      "1. Run: start-anna.cmd\n" +
      "2. Make sure you have developer access: anna.partners/developers\n" +
      "3. Login: anna-app login --host https://anna.partners\n\n" +
      "The site builder requires the Anna AI harness to generate real code."
    );
  }
}

boot();
