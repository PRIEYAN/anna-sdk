import { listProjectFiles, readProjectFile } from "./workspace.js";

export async function dispatchRpc(request) {
  if (!request || request.jsonrpc !== "2.0" || typeof request.method !== "string")
    throw new Error("Invalid JSON-RPC request");
  const params = request.params ?? {};
  let result;
  if (request.method === "read_file")
    result = { content: await readProjectFile(params.sessionId, params.path) };
  else if (request.method === "list_files")
    result = { tree: await listProjectFiles(params.sessionId) };
  else throw new Error(`Unknown method: ${request.method}`);
  return { jsonrpc: "2.0", id: request.id ?? null, result };
}
