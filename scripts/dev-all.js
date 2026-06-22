import { spawn } from "node:child_process";

const processes = [
  spawn("npm", ["--prefix", "Agent", "run", "dev"], { stdio: "inherit", detached: true }),
  spawn("npm", ["run", "dev"], { stdio: "inherit", detached: true }),
];

let stopping = false;
function stop(exitCode = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of processes) {
    try {
      process.kill(-child.pid, "SIGTERM");
    } catch {
      child.kill("SIGTERM");
    }
  }
  process.exitCode = exitCode;
}

for (const child of processes) {
  child.on("exit", (code, signal) => {
    if (!stopping && signal !== "SIGTERM") stop(code ?? 1);
  });
  child.on("error", (error) => {
    console.error(error);
    stop(1);
  });
}

process.on("SIGINT", () => stop(0));
process.on("SIGTERM", () => stop(0));
