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
  const allFiles = [];

  // ── Step 1: index.html — React CDN loader ──────────────────────────────
  const divHtml = addMsg("tool", "▸ Writing index.html…");
  const htmlPrompt =
    `Generate index.html for a React CDN app about: "${desc}"\n\n` +
    `<head> must include EXACTLY these tags in order:\n` +
    `1. <meta charset="UTF-8">\n` +
    `2. <meta name="viewport" content="width=device-width, initial-scale=1.0">\n` +
    `3. <title> — invent a short brand name for "${desc}"\n` +
    `4. Google Fonts API <link> — choose one font that fits the brand personality (weights 400;700;900)\n` +
    `5. Font Awesome 6.5: <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">\n` +
    `6. <link rel="stylesheet" href="style.css">\n` +
    `7. <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>\n` +
    `8. <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>\n` +
    `9. <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>\n\n` +
    `<body>: <div id="root"></div>\n` +
    `Last tag: <script type="text/babel" src="App.js"></script>\n\n` +
    `Output raw HTML only. Start with <!DOCTYPE html>. Nothing else.`;

  let htmlContent;
  try {
    htmlContent = await callAnnaRaw(htmlPrompt, systemRaw(), 600);
    allFiles.push({ path: "index.html", content: htmlContent });
    await writeFiles([{ path: "index.html", content: htmlContent }]);
    await loadFileTree();
    updateMsg(divHtml, "✓ index.html");
  } catch (err) {
    updateMsg(divHtml, `✗ index.html: ${err.message}`);
    throw err;
  }

  // ── Step 2: App.js — full React component ──────────────────────────────
  const divApp = addMsg("tool", "▸ Writing App.js (React component)…");
  const appPrompt =
    `Write App.js — a complete React single-page landing page for: "${desc}"\n\n` +
    `MUST start with:\n` +
    `const { useState, useEffect, useRef } = React;\n\n` +
    `MUST end with:\n` +
    `ReactDOM.createRoot(document.getElementById('root')).render(<App />);\n\n` +
    `Sections inside function App():\n` +
    `1. Sticky <nav className="sv-nav"> — logo text (invent brand name) + 3 links + .sv-btn; useState for mobile menu\n` +
    `2. <section className="sv-hero"> — full-viewport hero, big h1, subtitle, 2 buttons (.sv-btn and .sv-btn-ghost)\n` +
    `3. <section className="sv-features"> — h2 heading, 3 .sv-card divs each with FA6 <i> icon, h3, p\n` +
    `4. <section className="sv-stats"> — 3 .sv-stat items with big bold number and label\n` +
    `5. <section className="sv-cta"> — bold h2, p, .sv-btn\n` +
    `6. <footer className="sv-footer"> — brand, tagline, © ${new Date().getFullYear()}\n\n` +
    `Add useEffect: IntersectionObserver that adds class "visible" to each section when scrolled into view.\n` +
    `Invent real content: brand name, feature titles/descriptions, stats numbers, CTA text — all specific to "${desc}".\n` +
    `No lorem ipsum. Use className everywhere (not class).`;

  let appContent;
  try {
    appContent = await callAnnaRaw(appPrompt, systemRaw(), 2000);
    allFiles.push({ path: "App.js", content: appContent });
    await writeFiles([{ path: "App.js", content: appContent }]);
    await loadFileTree();
    updateMsg(divApp, "✓ App.js");
  } catch (err) {
    updateMsg(divApp, `✗ App.js: ${err.message} (skipped)`);
  }

  // ── Step 3: style.css ───────────────────────────────────────────────────
  const divCss = addMsg("tool", "▸ Writing style.css…");
  const cssPrompt =
    `Write style.css for a bold React landing page about "${desc}".\n\n` +
    `:root — pick colors that suit "${desc}" perfectly:\n` +
    `--bg (very dark, #0a0a0a range), --card (dark glass: rgba dark), --border (subtle rgba white), ` +
    `--accent (ONE vivid brand color — NOT blue or white), --text (#f0f0f0), --muted (#888)\n\n` +
    `Required styles:\n` +
    `* *, *::before, *::after { box-sizing:border-box; margin:0; padding:0 }\n` +
    `* body — font from Google Fonts (match index.html), background:var(--bg), color:var(--text), scroll-behavior:smooth\n` +
    `* .sv-nav — position:fixed, top:0, width:100%, backdrop-filter:blur(16px), background:rgba(0,0,0,0.6), border-bottom:1px solid var(--border), z-index:100, display:flex, align-items:center, justify-content:space-between, padding:0 48px, height:68px\n` +
    `* .sv-btn — background:var(--accent), color:#000 or #fff (whichever contrasts), font-weight:700, border:none, border-radius:8px, padding:12px 28px, cursor:pointer, transition:all 0.2s, hover:scale(1.05)+brightness(1.1)\n` +
    `* .sv-btn-ghost — background:transparent, border:2px solid var(--accent), color:var(--accent), same padding/radius, hover:background:var(--accent)+color flip\n` +
    `* .sv-hero — min-height:100vh, display:flex, align-items:center, justify-content:center, text-align:center, padding:80px 40px 40px, background: radial-gradient or linear-gradient using --bg and --accent tones\n` +
    `* .sv-hero h1 — font-size:clamp(2.8rem,6vw,5.5rem), font-weight:900, line-height:1.08, letter-spacing:-0.02em\n` +
    `* .sv-hero p — font-size:1.2rem, color:var(--muted), max-width:560px, margin:24px auto\n` +
    `* .sv-features, .sv-stats, .sv-cta — max-width:1100px, margin:0 auto, padding:96px 40px\n` +
    `* .sv-card — background:var(--card), border:1px solid var(--border), border-radius:16px, padding:36px, backdrop-filter:blur(8px), transition:transform 0.25s+box-shadow 0.25s, hover:translateY(-8px)+box-shadow 0 20px 60px rgba(accent,0.15)\n` +
    `* .features-grid, .stats-grid — display:grid, grid-template-columns:repeat(3,1fr), gap:28px\n` +
    `* .sv-stat — text-align:center; h2 font-size:3rem, font-weight:900, color:var(--accent); p color:var(--muted)\n` +
    `* .sv-cta — text-align:center; h2 font-size:2.4rem; p color:var(--muted), margin:20px 0 36px\n` +
    `* .sv-footer — border-top:1px solid var(--border), padding:40px, text-align:center, color:var(--muted), font-size:0.9rem\n` +
    `* section { opacity:0; transform:translateY(40px); transition:opacity 0.7s ease, transform 0.7s ease }\n` +
    `* section.visible { opacity:1; transform:none }\n` +
    `* .sv-nav { opacity:1; transform:none }\n` +
    `* @keyframes fadeIn { from{opacity:0} to{opacity:1} }\n` +
    `* @media(max-width:768px) — .features-grid, .stats-grid: grid-template-columns:1fr; padding reduced; hero h1 smaller\n\n` +
    `Output raw CSS only. No inline comments.`;

  let cssContent;
  try {
    cssContent = await callAnnaRaw(cssPrompt, systemRaw(), 2000);
    allFiles.push({ path: "style.css", content: cssContent });
    await writeFiles([{ path: "style.css", content: cssContent }]);
    await loadFileTree();
    await loadFile("index.html");
    updateMsg(divCss, "✓ style.css — React app ready!");
  } catch (err) {
    updateMsg(divCss, `✗ style.css: ${err.message} (skipped)`);
  }

  return { files: allFiles, spec: { name: desc } };
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
      addMsg("assistant", "Anna AI is building a React landing page — takes ~20 seconds…");

      const { files, spec } = await generateWithAnna(desc);

      hasProject = true;
      projectVersion++;
      elVersionLabel.textContent = `${spec.name} · v${projectVersion}`;
      elDownloadBtn.disabled = false;
      await loadFileTree();
      await loadFile("index.html");

      addMsg("tool", `✓ Done — ${files.length} files written by Anna AI`);
      addMsg("assistant", `Landing page is ready! Switch to Preview, or tell me what to change.`);

    } else if (hasProject) {
      const target = selectedFile || "index.html";
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
      "Anna builds a unique React landing page for each prompt — takes ~20 seconds."
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
