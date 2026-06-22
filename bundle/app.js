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


// ── Multi-step generation ──────────────────────────────────────────────────
// Each file is its own LLM call using RAW output (no JSON wrapper).
// This avoids the truncation caused by Anna's ~2000-token output cap
// when large files are embedded inside a JSON string.

function systemJson() {
  return (
    "You are an elite creative web designer and front-end developer.\n" +
    "DO NOT use extended thinking. Output immediately and directly.\n" +
    "Respond with ONLY a raw JSON object. No markdown, no fences, no explanation.\n" +
    "First character must be { and last must be }.\n"
  );
}

function systemRaw(fileType) {
  return (
    `You are an expert ${fileType} developer. Output ONLY the raw file content.\n` +
    "DO NOT use extended thinking. Output immediately.\n" +
    "No markdown fences, no explanation, no preamble. Start with the first line of the file.\n"
  );
}

// Calls Anna and returns the raw text (not parsed as JSON).
async function callAnnaRaw(userText, systemText, maxTokens = 1800) {
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

// Design spec — small JSON response, stays well within token cap
async function generateDesignSpec(desc) {
  const prompt =
    `Client request: "${desc}"\n\n` +
    `Create a bold, original design spec. Return exactly this JSON (no other text):\n` +
    `{"name":"brand name","tagline":"one-line tagline",` +
    `"palette":{"bg":"#hex","card":"#hex","border":"#hex","accent":"#hex","text":"#hex","muted":"#hex"},` +
    `"googleFont":"Google Font name","pages":["home","p2","p3","about","contact","login"],` +
    `"siteDescription":"2 sentences","businessType":"ecommerce|coffee|restaurant|portfolio|saas|fitness|blog|other"}\n\n` +
    `Rules: dark bg, vivid accent (not blue/white), pages[1] and [2] must be domain-specific ` +
    `(ecommerce→products+cart, coffee→menu+events, fitness→programs+coaches, saas→features+pricing, etc.)`;

  const raw = await callAnnaRaw(prompt, systemJson(), 800);
  return JSON.parse(raw);
}

// Generate a single file as raw text output
async function generateOneFile(spec, filePath, hint, maxTokens = 1800) {
  const ext = filePath.split(".").pop();
  const isPage = filePath.startsWith("screens/");
  const pageName = isPage ? filePath.replace("screens/", "").replace(".js", "") : "";
  const cap = `${pageName.charAt(0).toUpperCase()}${pageName.slice(1)}`;

  const ctx =
    `Site: ${spec.name} — ${spec.tagline}\n` +
    `Type: ${spec.businessType}\n` +
    `Colors: bg=${spec.palette.bg} card=${spec.palette.card} border=${spec.palette.border} ` +
    `accent=${spec.palette.accent} text=${spec.palette.text} muted=${spec.palette.muted}\n` +
    `Font: ${spec.googleFont}\n` +
    `Pages: ${spec.pages.join(", ")}`;

  let prompt;
  if (filePath === "index.html") {
    prompt =
      `${ctx}\n\nGenerate index.html:\n` +
      `- <head>: charset, viewport, title="${spec.name}", ` +
      `Google Fonts link for "${spec.googleFont}" weights 400;700;900, ` +
      `Font Awesome 6.5 all.min.css CDN, <link rel="stylesheet" href="style.css">\n` +
      `- <body>: <div id="app"></div>\n` +
      `- Scripts (no type=module): ${spec.pages.map(p => `<script src="screens/${p}.js"></script>`).join(" ")} ` +
      `<script src="main.js"></script>`;
  } else if (filePath === "style.css") {
    prompt =
      `${ctx}\n\nGenerate style.css. Use these exact CSS variables in :root.\n` +
      `Include: reset, body font-family "${spec.googleFont}", fixed nav with blur backdrop, ` +
      `.page{min-height:100vh;padding-top:64px}, .sv-hero with gradient overlay + picsum bg-image, ` +
      `.sv-section{max-width:1100px;margin:0 auto;padding:80px 40px}, ` +
      `.sv-card, .sv-btn (accent bg), .sv-btn-ghost, ` +
      `form inputs (.sv-input), footer with 4-col grid, ` +
      `@keyframes fadeIn + slideUp, responsive @media(max-width:768px).\n` +
      `Keep it ~120 lines. No inline comments.`;
  } else if (filePath === "main.js") {
    prompt =
      `${ctx}\n\nGenerate main.js — hash-based SPA router.\n` +
      `- nav() builds fixed nav with logo, links for each page, CTA button\n` +
      `- footer() builds footer with brand, 3 link cols, social icons\n` +
      `- route() reads location.hash, calls window.render[Page](), renders nav+page+footer into #app\n` +
      `- window.addEventListener("hashchange", route); route();\n` +
      `Active nav link = current hash. No external dependencies.`;
  } else if (isPage) {
    const pageHints = {
      home: "Full-viewport hero (gradient + picsum bg-image), stats row, 4-feature cards grid, CTA banner",
      about: "Brand story section, team cards with picsum photos, values grid, timeline",
      contact: "Contact form with JS submit handler, 3 info cards (address/phone/email), map placeholder",
      login: "Split layout: left=brand image+tagline, right=login form (Google SSO btn + email/pw + signup link)",
      menu: "Category sections with item rows (name, description, price, dietary icons)",
      products: "Product cards grid (picsum image, name, price, Add-to-Cart btn with onclick)",
      cart: "Cart items list + order summary sidebar + checkout btn",
      events: "Event cards (date badge, title, description, RSVP btn)",
      features: "Feature cards grid, comparison table, integration logos",
      pricing: "3-tier pricing cards (free/pro/enterprise) with feature lists and CTA btns",
      programs: "Program cards with difficulty badge, duration, description, enroll btn",
      coaches: "Coach cards with picsum photo, name, specialty, booking btn",
      portfolio: "Project grid with hover overlays, filter tabs",
      work: "Case study cards with tags, featured project spotlight",
      resume: "Experience + education timeline, skills list, download CV btn",
      blog: "Article cards (picsum img, title, excerpt, read-time, category tag)",
      posts: "Article cards grid with search bar",
      subscribe: "Newsletter hero, benefits list, email form",
      reservations: "Reservation form (date, time, party size), confirmation flow",
    };
    prompt =
      `${ctx}\n\nGenerate screens/${pageName}.js.\n` +
      `Required: window.render${cap} = function() { return \`<div class="page">...</div>\`; };\n` +
      `Content: ${pageHints[pageName] || "Rich content page with real data for this business"}\n` +
      `Rules: inline all styles using the CSS vars, picsum.photos/seed/[keyword]/[w]/[h] for images, ` +
      `FA6 icons, real invented content (names/prices/descriptions), no lorem ipsum, ` +
      `interactive (forms preventDefault, buttons onclick).`;
  } else {
    prompt = `${ctx}\n\n${hint}`;
  }

  const content = await callAnnaRaw(prompt, systemRaw(ext), maxTokens);
  return { path: filePath, content };
}

async function generateWithAnna(desc) {
  const allFiles = [];

  // Step 1 — Design spec (JSON)
  const specDiv = addMsg("tool", "▸ Anna is designing your website…");
  let spec;
  try {
    spec = await generateDesignSpec(desc);
    updateMsg(specDiv, `✓ Design: "${spec.name}" · ${spec.googleFont} · accent ${spec.palette.accent}`);
  } catch (err) {
    updateMsg(specDiv, `✗ Design spec failed: ${err.message}`);
    throw new Error(`Anna LLM error at design step: ${err.message}`);
  }

  // Steps 2–N — one file per LLM call, raw output
  const filePlan = [
    { path: "index.html", maxTok: 600 },
    { path: "style.css",  maxTok: 1800 },
    { path: "main.js",    maxTok: 1400 },
    ...spec.pages.map(p => ({ path: `screens/${p}.js`, maxTok: 1800 })),
  ];

  for (const { path, maxTok } of filePlan) {
    const div = addMsg("tool", `▸ Writing ${path}…`);
    try {
      const file = await generateOneFile(spec, path, "", maxTok);
      allFiles.push(file);
      await writeFiles([file]);
      await loadFileTree();
      if (path.startsWith("screens/")) await loadFile(path);
      updateMsg(div, `✓ ${path}`);
    } catch (err) {
      updateMsg(div, `✗ ${path} failed: ${err.message} (skipped)`);
    }
  }

  return { files: allFiles, spec };
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
    updated = await callAnnaRaw(prompt, systemRaw(ext), 1800);
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
      addMsg("assistant", "Generating with Anna AI — this takes 20–40 seconds as each file is written fresh. Watch the files appear…");

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
      "Each file is written by Anna AI — it takes 20-40 seconds and you'll see each file appear."
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
