#!/usr/bin/env node
import { dispatchRpc } from "../src/rpc.js";

let input = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => {
  input += chunk;
});
process.stdin.on("end", async () => {
  let request;
  try {
    request = JSON.parse(input);
    process.stdout.write(JSON.stringify(await dispatchRpc(request)));
  } catch (error) {
    process.stdout.write(
      JSON.stringify({
        jsonrpc: "2.0",
        id: request?.id ?? null,
        error: { code: -32000, message: error instanceof Error ? error.message : "Tool failed" },
      }),
    );
    process.exitCode = 1;
  }
});
