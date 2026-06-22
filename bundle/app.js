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

// ── Anna LLM core ──────────────────────────────────────────────────────────
// Calls anna.llm.complete() and parses the JSON result.
// Does NOT silently swallow errors — callers must handle them.
async function callAnnaLLM(userText, systemText, maxTokens = 4000) {
  let result;
  try {
    result = await anna.llm.complete({
      messages: [{ role: "user", content: { type: "text", text: userText } }],
      systemPrompt: systemText,
      maxTokens,
      temperature: 0.75,
    });
  } catch (err) {
    // Surface Anna-specific errors with actionable messages
    const msg = err?.message ?? String(err);
    if (/llm_disabled|no.llm|disabled/i.test(msg)) {
      throw new Error(
        "Anna LLM is disabled (running with --no-llm).\n\n" +
        "To enable real AI generation:\n" +
        "1. Run: anna-app login --host https://anna.partners\n" +
        "2. Complete device flow in browser\n" +
        "3. If 'verified developer required': apply at anna.partners/developers\n" +
        "4. Restart start-anna.cmd"
      );
    }
    if (/verified developer|not.*developer|developer.*required/i.test(msg)) {
      throw new Error(
        "Anna requires verified developer access.\n\n" +
        "Apply at: https://anna.partners/developers\n" +
        "Once approved, restart start-anna.cmd"
      );
    }
    if (/unauthorized|401|forbidden|403/i.test(msg)) {
      throw new Error("Anna authentication failed. Run: anna-app login --host https://anna.partners");
    }
    throw err;
  }

  // Anna returns content in several possible shapes — handle all of them
  let text =
    result?.content?.[0]?.text    // array of content blocks
    ?? result?.content?.text       // single block with .text
    ?? result?.content             // raw string content
    ?? result?.text                // top-level text
    ?? result;

  if (typeof text !== "string") text = JSON.stringify(text);
  // Strip markdown code fences if the model wrapped in ```json…```
  text = text.replace(/^```(?:json)?\s*/m, "").replace(/\s*```\s*$/m, "").trim();
  return JSON.parse(text);
}

// ── Multi-step generation ──────────────────────────────────────────────────
// Anna builds the site page by page. Each call is focused and short, giving
// better quality and real progressive output.

const SYSTEM_DESIGNER = `You are an elite creative web designer and front-end developer.
You MUST always respond with valid JSON only — no markdown, no explanation, no code fences.
Create stunning, unique, production-quality designs. Never use placeholder/lorem ipsum text.
${skillText}`;

async function generateDesignSpec(desc) {
  const prompt = `Client request: "${desc}"

Design a unique website. Be bold and creative — invent something original.

Return JSON with exactly this shape:
{
  "name": "brand name (invent one if not specified)",
  "tagline": "memorable one-line tagline",
  "palette": {
    "bg": "#hex (dark background)",
    "card": "#hex (slightly lighter)",
    "border": "#hex (subtle border)",
    "accent": "#hex (strong brand color — the most distinctive choice)",
    "text": "#hex (near-white for dark bg)",
    "muted": "#hex (secondary text)"
  },
  "googleFont": "exact Google Fonts name (choose one that fits the brand personality)",
  "pages": ["home", "page2", "page3", "about", "contact", "login"],
  "siteDescription": "2 sentences describing the site content and target audience",
  "businessType": "coffee|restaurant|portfolio|saas|ecommerce|fitness|blog|other"
}

IMPORTANT:
- pages[] must contain exactly 6 items always ending with: "about", "contact", "login"
- pages 2 and 3 must be domain-specific (e.g. for coffee: "menu","events"; for ecommerce: "products","cart")
- palette must use dark theme — bg should be very dark (#0x0x0x range)
- accent color must be vivid and distinctive, NOT generic blue or white`;

  return callAnnaLLM(prompt, SYSTEM_DESIGNER, 1000);
}

async function generateCoreFiles(desc, spec) {
  const prompt = `Build core files for: ${spec.name} — ${spec.tagline}
Business type: ${spec.businessType}
Description: ${spec.siteDescription}

Palette: ${JSON.stringify(spec.palette)}
Google Font: "${spec.googleFont}"
Pages: ${spec.pages.join(", ")}

Create these 3 files:

1. index.html — Full HTML shell:
   - <head> loads: Google Fonts API for "${spec.googleFont}" (weights 400,700,900), Font Awesome 6.5 CDN, style.css
   - <body> has <div id="app"></div>
   - <script> tags: one for each screens/[page].js in order, then main.js (all type="module" optional but consistent)

2. style.css — Complete stylesheet:
   - :root CSS variables matching the palette exactly
   - Base reset, body, scrollbar styling
   - nav (fixed, blur backdrop), .nav-logo, .nav-links, .nav-cta
   - .page (min-height: 100vh, padding-top: 64px)
   - .hero section with background image via picsum.photos
   - Cards, buttons (.btn-primary, .btn-ghost), forms, footer
   - At least 2 CSS @keyframes animations (fade-in, slide-up or similar)
   - Responsive: mobile nav collapses on <768px

3. main.js — SPA router:
   - Calls window.render[PageName]() for each hash
   - Renders nav (active states) + page content + footer
   - Hash-change listener + initial render
   - nav links built from pages array: ${JSON.stringify(spec.pages)}

Return JSON: { "files": [ { "path": "...", "content": "..." }, ... ] }`;

  return callAnnaLLM(prompt, SYSTEM_DESIGNER, 4000);
}

async function generatePage(desc, spec, pageName) {
  const isSpecial = !["about", "contact", "login"].includes(pageName);
  const hint = {
    home: "Hero with full-viewport gradient + picsum background, value proposition, features grid (4 cards), CTA section, testimonials or stats row",
    about: "Brand origin story, team member cards with photos, mission/values section, milestone timeline",
    contact: "Contact form (name, email, subject, message — JS submit handler), office info cards (location, phone, email), map placeholder, live-chat CTA",
    login: "Split layout: left side brand imagery + tagline, right side login form with Google SSO button + email/password, sign-up link",
    menu: "Categorized menu items with prices, dietary badges (vegan/gluten-free), featured item hero, order CTA",
    products: "Product grid with cards (image, name, price, Add to Cart), filter bar, featured product hero",
    cart: "Cart items list, order summary sidebar, checkout button, quantity controls, remove button",
    events: "Upcoming events timeline, event cards with date/time/description, RSVP buttons",
    features: "Feature showcase grid, comparison table, integration logos, demo video placeholder",
    pricing: "3-tier pricing cards (free/pro/enterprise), feature checklist, FAQ accordion, CTA",
    portfolio: "Masonry project grid with hover overlays, category filter tabs, featured project spotlight",
    work: "Case study cards, skill tags, client logos strip, project detail modal trigger",
    resume: "Timeline experience + education sections, skills progress bars, download CV button",
    blog: "Article cards with hero image/excerpt/read-time, category tags, search bar, newsletter signup",
    posts: "Same as blog",
    programs: "Program cards with difficulty/duration badges, progress preview, enroll buttons",
    coaches: "Coach profile cards with photo/bio/specialty, booking buttons",
    subscribe: "Newsletter hero, benefit list, subscription form, social proof numbers",
    reservations: "Reservation form (date/time/party-size picker), availability notice, confirmation flow",
  }[pageName] || "Rich, interactive page with real content matching the brand. Include picsum images, FA6 icons, interactive elements.";

  const prompt = `Generate the "${pageName}" page for: ${spec.name} (${spec.businessType})
Tagline: ${spec.tagline}
Description: ${spec.siteDescription}

Palette CSS vars: --bg:${spec.palette.bg}; --card:${spec.palette.card}; --border:${spec.palette.border}; --accent:${spec.palette.accent}; --text:${spec.palette.text}; --muted:${spec.palette.muted};

PAGE CONTENT REQUIREMENTS:
${hint}

TECHNICAL RULES:
- Export as: window.render${pageName.charAt(0).toUpperCase() + pageName.slice(1)} = function() { return \`<div class="page">...</div>\`; };
- Use FA6 icons, picsum.photos/seed/[descriptive-keyword]/[w]/[h] for ALL images
- Inline ALL styles (use CSS vars + extra inline style="" for layout) — do NOT rely on external classes beyond what style.css provides
- Interactive: forms submit with JS (event.preventDefault), buttons have onclick handlers, hover effects via onmouseover
- Content must be REAL, specific, and unique — invent realistic names, prices, descriptions for this specific business
- NEVER use lorem ipsum

Return JSON: { "path": "screens/${pageName}.js", "content": "complete window.render... function" }`;

  return callAnnaLLM(prompt, SYSTEM_DESIGNER, 3500);
}

async function generateWithAnna(desc) {
  const allFiles = [];
  let specDiv = addMsg("tool", "▸ Anna is designing your website…");

  // Step 1 — Design spec
  let spec;
  try {
    spec = await generateDesignSpec(desc);
    updateMsg(specDiv, `✓ Design spec: "${spec.name}" · ${spec.googleFont} · accent ${spec.palette.accent}`);
  } catch (err) {
    updateMsg(specDiv, `✗ Design spec failed: ${err.message}`);
    throw new Error(`Anna LLM error at design step: ${err.message}`);
  }

  // Step 2 — Core files (index.html, style.css, main.js)
  let coreDiv = addMsg("tool", "▸ Writing index.html, style.css, main.js…");
  try {
    const { files } = await generateCoreFiles(desc, spec);
    allFiles.push(...files);
    // Write core files to disk so preview updates progressively
    await writeFiles(files);
    updateMsg(coreDiv, `✓ Core files written (${files.length} files)`);
  } catch (err) {
    updateMsg(coreDiv, `✗ Core files failed: ${err.message}`);
    throw new Error(`Anna LLM error at core files: ${err.message}`);
  }

  // Step 3 — Each page
  for (const page of spec.pages) {
    const label = `screens/${page}.js`;
    const pageDiv = addMsg("tool", `▸ Generating ${label}…`);
    try {
      const file = await generatePage(desc, spec, page);
      allFiles.push(file);
      await writeFiles([file]);
      // Update file tree and load the last written page
      await loadFileTree();
      await loadFile(file.path);
      updateMsg(pageDiv, `✓ ${label} written`);
    } catch (err) {
      updateMsg(pageDiv, `✗ ${label} failed: ${err.message} (skipped)`);
      // Continue generating remaining pages even if one fails
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
  const prompt = `Edit this file: ${targetPath}

Instruction: ${instruction}

CURRENT FILE CONTENT:
${currentContent}

Return JSON: { "content": "the complete updated file — no truncation, full replacement" }`;

  let result;
  try {
    result = await callAnnaLLM(prompt, SYSTEM_DESIGNER, 4000);
    if (!result?.content || typeof result.content !== "string")
      throw new Error("Anna returned an unexpected edit format");
  } catch (err) {
    updateMsg(editDiv, `✗ Edit failed: ${err.message}`);
    throw err;
  }

  const editRes = await fetch(`${BACKEND}/api/edit`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ sessionId, path: targetPath, content: result.content }),
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
