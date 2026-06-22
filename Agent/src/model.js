import { readFile } from "node:fs/promises";
import path from "node:path";
import { AGENT_ROOT } from "./workspace.js";

let skillPromise;
const loadSkill = () =>
  (skillPromise ??= readFile(path.join(AGENT_ROOT, "skills/vibe-coder.skill.md"), "utf8"));

// Set by tool-runner.js once the process boots.
// When null the generator falls back to the built-in local template.
let _samplingCb = null;

export function setSamplingCallback(fn) {
  _samplingCb = fn;
}

export function modelIsConfigured() {
  return _samplingCb !== null;
}

export async function askModel(task, schemaDescription) {
  if (!_samplingCb) return null;

  const result = await _samplingCb({
    messages: [{ role: "user", content: { type: "text", text: task } }],
    maxTokens: 16000,
    systemPrompt: `${await loadSkill()}\n\nRequired JSON schema: ${schemaDescription}`,
    temperature: 0.35,
    responseFormat: { type: "json_object" },
  });

  const text =
    typeof result?.content === "string"
      ? result.content
      : result?.content?.text ?? "";
  if (!text) throw new Error("Model returned no text content");
  return JSON.parse(text.replace(/^```(?:json)?\s*|\s*```$/g, ""));
}
