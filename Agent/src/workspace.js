import { mkdir, readFile, readdir, rename, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const AGENT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const WORKSPACES_ROOT = path.join(AGENT_ROOT, "workspaces");

export function validateSessionId(value) {
  if (typeof value !== "string" || !/^[a-zA-Z0-9_-]{1,80}$/.test(value))
    throw new Error("Invalid session id");
  return value;
}

export function workspacePath(sessionId) {
  return path.join(WORKSPACES_ROOT, validateSessionId(sessionId));
}

export function safeProjectPath(sessionId, relativePath = "") {
  const root = workspacePath(sessionId);
  const clean = String(relativePath).replaceAll("\\", "/").replace(/^\/+/, "");
  const target = path.resolve(root, clean);
  if (target !== root && !target.startsWith(`${root}${path.sep}`))
    throw new Error("Path escapes workspace");
  return target;
}

export async function readProjectFile(sessionId, relativePath) {
  return readFile(safeProjectPath(sessionId, relativePath), "utf8");
}

export async function writeProjectFile(sessionId, relativePath, content) {
  const target = safeProjectPath(sessionId, relativePath);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, content);
}

export async function replaceProject(sessionId, files) {
  const target = workspacePath(sessionId);
  await mkdir(WORKSPACES_ROOT, { recursive: true });
  const staging = `${target}.staging-${process.pid}-${Date.now()}`;
  await mkdir(staging, { recursive: true });
  try {
    for (const file of files) {
      const destination = path.resolve(staging, file.path);
      if (!destination.startsWith(`${staging}${path.sep}`))
        throw new Error("Invalid generated path");
      await mkdir(path.dirname(destination), { recursive: true });
      await writeFile(destination, file.content);
    }
    await rm(target, { recursive: true, force: true });
    await rename(staging, target);
  } catch (error) {
    await rm(staging, { recursive: true, force: true });
    throw error;
  }
}

async function walk(directory, root) {
  const entries = await readdir(directory, { withFileTypes: true });
  entries.sort((a, b) => Number(a.isFile()) - Number(b.isFile()) || a.name.localeCompare(b.name));
  return Promise.all(
    entries.map(async (entry) => {
      const absolute = path.join(directory, entry.name);
      const relative = path.relative(root, absolute).replaceAll(path.sep, "/");
      return entry.isDirectory()
        ? { name: entry.name, path: relative, children: await walk(absolute, root) }
        : { name: entry.name, path: relative };
    }),
  );
}

export async function listProjectFiles(sessionId) {
  const root = workspacePath(sessionId);
  if (!(await stat(root).catch(() => null))?.isDirectory()) return [];
  return walk(root, root);
}

export async function projectExists(sessionId) {
  return (await stat(workspacePath(sessionId)).catch(() => null))?.isDirectory() ?? false;
}
