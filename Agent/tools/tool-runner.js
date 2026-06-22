#!/usr/bin/env node
/**
 * Executa tool runner — implements the Anna sampling/createMessage
 * reverse-RPC protocol.
 *
 * Wire flow (Executa v2):
 *   server.js  →  stdin  → tool process (invoke request)
 *   tool process → stdout → server.js (sampling/createMessage request)
 *   server.js  →  stdin  → tool process (sampling result)
 *   tool process → stdout → server.js (invoke result)
 */
import crypto from "node:crypto";
import readline from "node:readline";
import { dispatchRpc } from "../src/rpc.js";
import { setSamplingCallback } from "../src/model.js";

const pendingSampling = new Map();

// Wire model.js to use reverse-RPC sampling instead of a REST endpoint.
setSamplingCallback((params) => {
  const id = crypto.randomUUID();
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      pendingSampling.delete(id);
      reject(new Error("sampling/createMessage timed out (90 s)"));
    }, 90_000);
    pendingSampling.set(id, { resolve, reject, timer });
    process.stdout.write(
      JSON.stringify({ jsonrpc: "2.0", id, method: "sampling/createMessage", params }) + "\n",
    );
  });
});

const rl = readline.createInterface({ input: process.stdin, crlfDelay: Infinity });

rl.on("line", async (raw) => {
  const line = raw.trim();
  if (!line) return;

  let msg;
  try {
    msg = JSON.parse(line);
  } catch {
    process.stdout.write(
      JSON.stringify({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } }) + "\n",
    );
    return;
  }

  // Sampling response from host (no "method" field means it is a reply).
  if (!("method" in msg)) {
    const p = pendingSampling.get(msg.id);
    if (p) {
      pendingSampling.delete(msg.id);
      clearTimeout(p.timer);
      if (msg.error) p.reject(new Error(msg.error.message || "Sampling error"));
      else p.resolve(msg.result);
    }
    return;
  }

  // Incoming invoke request from server.js.
  // Accept both the Executa v2 "invoke" wrapper and the legacy direct-method format.
  const rpcRequest =
    msg.method === "invoke"
      ? { jsonrpc: "2.0", id: msg.id, method: msg.params?.tool, params: msg.params?.arguments }
      : msg;

  try {
    const response = await dispatchRpc(rpcRequest);
    process.stdout.write(JSON.stringify(response) + "\n");
  } catch (err) {
    process.stdout.write(
      JSON.stringify({
        jsonrpc: "2.0",
        id: msg.id ?? null,
        error: { code: -32000, message: err instanceof Error ? err.message : "Tool failed" },
      }) + "\n",
    );
  }
});

rl.on("close", () => process.exit(0));
