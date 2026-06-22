import assert from "node:assert/strict";
import { rm } from "node:fs/promises";
import test from "node:test";
import { dispatchRpc } from "../src/rpc.js";
import { readProjectFile, workspacePath } from "../src/workspace.js";

const sessionId = `test-${process.pid}`;

test.after(async () => rm(workspacePath(sessionId), { recursive: true, force: true }));

test("generates the fixed vanilla project structure", async () => {
  const response = await dispatchRpc({
    jsonrpc: "2.0",
    id: 1,
    method: "generate_project",
    params: { sessionId, prompt: "a ceramic artist portfolio" },
  });
  assert.deepEqual(response.result.filesWritten, [
    "index.html",
    "style.css",
    "main.js",
    "screens/home.js",
    "screens/about.js",
    "screens/contact.js",
    "screens/login.js",
    "package.json",
    ".gitignore",
    "public/favicon.svg",
    "public/icons.svg",
    "assets/hero.png",
  ]);
  assert.match(await readProjectFile(sessionId, "index.html"), /screens\/home\.js/);
  assert.doesNotMatch(await readProjectFile(sessionId, "main.js"), /React|JSX/);
});

test("lists and reads project files through JSON-RPC", async () => {
  const listed = await dispatchRpc({
    jsonrpc: "2.0",
    id: 2,
    method: "list_files",
    params: { sessionId },
  });
  assert.ok(listed.result.tree.some((node) => node.name === "screens"));
  const read = await dispatchRpc({
    jsonrpc: "2.0",
    id: 3,
    method: "read_file",
    params: { sessionId, path: "screens/home.js" },
  });
  assert.match(read.result.content, /Ceramic Artist Portfolio/);
  assert.match(read.result.content, /login/);
});

test("edits the most relevant source file", async () => {
  const response = await dispatchRpc({
    jsonrpc: "2.0",
    id: 4,
    method: "edit_file",
    params: { sessionId, path: "screens/home.js", instruction: "make the button blue" },
  });
  assert.equal(response.result.path, "style.css");
  assert.match(await readProjectFile(sessionId, "style.css"), /background: #2563eb/);
});

test("rejects traversal outside a workspace", async () => {
  await assert.rejects(() => readProjectFile(sessionId, "../../package.json"), /escapes workspace/);
});
