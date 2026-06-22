import { readProjectFile, replaceProject, writeProjectFile } from "./workspace.js";
import { askModel } from "./model.js";

const sourcePaths = new Set(["index.html", "style.css", "main.js", "screens/home.js"]);
const escapeHtml = (value) =>
  String(value).replace(
    /[&<>\"]/g,
    (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[char],
  );

function titleFrom(prompt) {
  const clean =
    prompt
      .replace(/^\s*(a|an|the)\s+/i, "")
      .replace(/[^a-z0-9 &'’-]/gi, " ")
      .trim() || "Tiny idea";
  return clean
    .split(/\s+/)
    .slice(0, 7)
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(" ");
}

function localGeneratedFiles(prompt) {
  const title = escapeHtml(titleFrom(prompt));
  const description = escapeHtml(prompt || "A thoughtfully made little website.");
  return [
    {
      path: "index.html",
      content: `<!doctype html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <meta name="description" content="${description}">\n  <link rel="icon" href="public/favicon.svg">\n  <link rel="stylesheet" href="style.css">\n  <title>${title}</title>\n</head>\n<body>\n  <div id="app"></div>\n  <script src="screens/home.js"></script>\n  <script src="main.js"></script>\n</body>\n</html>\n`,
    },
    {
      path: "style.css",
      content: `:root { font-family: Inter, ui-sans-serif, system-ui, sans-serif; }\n* { box-sizing: border-box; }\nbody { margin: 0; color: #24201c; background: #f7f2e9; }\nmain { min-height: 100vh; display: grid; place-items: center; padding: 48px 24px; }\n.hero { width: min(920px, 100%); border: 1px solid #ded5c8; border-radius: 28px; background: rgba(255,255,255,.72); box-shadow: 0 24px 80px rgba(65,47,27,.12); }\n.hero__content { padding: clamp(36px, 8vw, 84px); }\n.eyebrow { color: #7d674e; font-size: 12px; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; }\nh1 { max-width: 760px; margin: 18px 0 0; font: 500 clamp(44px, 8vw, 84px)/.98 Georgia, serif; letter-spacing: -.045em; }\n.lede { max-width: 590px; color: #685f56; font-size: 18px; line-height: 1.7; }\n.actions { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 34px; }\n.button { border: 0; border-radius: 999px; padding: 13px 22px; color: white; background: #24201c; font: inherit; font-weight: 650; cursor: pointer; }\n.status { align-self: center; color: #7d674e; font-size: 14px; }\n`,
    },
    {
      path: "main.js",
      content: `const root = document.querySelector("#app");\nroot.innerHTML = window.renderHome();\ndocument.querySelector("[data-action='begin']")?.addEventListener("click", () => {\n  document.querySelector("[data-status]").textContent = "Lovely. Let’s begin.";\n});\n`,
    },
    {
      path: "screens/home.js",
      content: `window.renderHome = function renderHome() {\n  return \`<main><section class="hero"><div class="hero__content"><p class="eyebrow">Made with Anna</p><h1>${title}</h1><p class="lede">${description}</p><div class="actions"><button class="button" data-action="begin">Get started</button><span class="status" data-status>Built with plain HTML, CSS, and JavaScript.</span></div></div></section></main>\`;\n};\n`,
    },
    { path: ".gitignore", content: ".DS_Store\n*.log\n" },
    {
      path: "public/favicon.svg",
      content: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="9" fill="#24201c"/><path d="M16 7c1 5 4 8 9 9-5 1-8 4-9 9-1-5-4-8-9-9 5-1 8-4 9-9Z" fill="#f7f2e9"/></svg>\n`,
    },
    {
      path: "public/icons.svg",
      content: `<svg xmlns="http://www.w3.org/2000/svg"><symbol id="arrow" viewBox="0 0 24 24"><path d="M5 12h14m-6-6 6 6-6 6" fill="none" stroke="currentColor" stroke-width="2"/></symbol></svg>\n`,
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

export async function generateProject(sessionId, prompt) {
  const modelResult = await askModel(
    `Generate a complete project for this request: ${prompt}`,
    `{ "files": [{ "path": "index.html | style.css | main.js | screens/<page>.js", "content": "complete file content" }] }`,
  );
  const sourceFiles = modelResult
    ? validateGeneratedFiles(modelResult.files)
    : localGeneratedFiles(prompt).slice(0, 4);
  const files = [...sourceFiles, ...localGeneratedFiles(prompt).slice(4)];
  await replaceProject(sessionId, files);
  return { filesWritten: files.map(({ path }) => path) };
}

export async function editProjectFile(sessionId, requestedPath, instruction) {
  let target = sourcePaths.has(requestedPath) ? requestedPath : "screens/home.js";
  if (
    /\b(color|colour|background|font|spacing|size|blue|red|green|purple|orange|pink)\b/i.test(
      instruction,
    )
  )
    target = "style.css";
  let content = await readProjectFile(sessionId, target);
  const modelResult = await askModel(
    `Edit ${target}.\n\nInstruction: ${instruction}\n\nCURRENT FULL CONTENT:\n${content}`,
    `{ "content": "the complete updated file content" }`,
  );
  if (modelResult) {
    if (typeof modelResult.content !== "string" || !modelResult.content.trim())
      throw new Error("Model returned invalid edited content");
    await writeProjectFile(sessionId, target, modelResult.content);
    return { path: target, updated: true };
  }
  const colorName = ["blue", "red", "green", "purple", "orange", "pink", "black"].find((name) =>
    instruction.toLowerCase().includes(name),
  );
  const color =
    instruction.match(/#(?:[0-9a-f]{3}){1,2}\b/i)?.[0] ??
    {
      blue: "#2563eb",
      red: "#dc2626",
      green: "#16835a",
      purple: "#7c3aed",
      orange: "#ea580c",
      pink: "#db2777",
      black: "#111111",
    }[colorName];
  if (target === "style.css" && color)
    content = content.replace(/(\.button\s*\{[^}]*background:)\s*[^;]+/s, `$1 ${color}`);
  else {
    const heading = instruction
      .match(/(?:headline|heading|title)\s+(?:to|as)\s+["“]?([^"”]+)["”]?/i)?.[1]
      ?.trim();
    if (target === "screens/home.js" && heading)
      content = content.replace(/<h1>.*?<\/h1>/s, `<h1>${escapeHtml(heading)}</h1>`);
    else content += `\n/* Anna edit request: ${instruction.replaceAll("*/", "* /")} */\n`;
  }
  await writeProjectFile(sessionId, target, content);
  return { path: target, updated: true };
}

function validateGeneratedFiles(files) {
  if (!Array.isArray(files)) throw new Error("Model response must contain a files array");
  const seen = new Set();
  for (const file of files) {
    if (!file || typeof file.path !== "string" || typeof file.content !== "string")
      throw new Error("Model returned an invalid file entry");
    if (!sourcePaths.has(file.path) && !/^screens\/[a-zA-Z0-9_-]+\.js$/.test(file.path))
      throw new Error(`Model returned a disallowed path: ${file.path}`);
    if (seen.has(file.path)) throw new Error(`Model returned a duplicate path: ${file.path}`);
    seen.add(file.path);
  }
  for (const required of sourcePaths)
    if (!seen.has(required)) throw new Error(`Model omitted required file: ${required}`);
  return files;
}
