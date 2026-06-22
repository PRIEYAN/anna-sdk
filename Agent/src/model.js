import { readFile } from "node:fs/promises";
import path from "node:path";
import { AGENT_ROOT } from "./workspace.js";

const DEFAULT_API_URL = "https://api.openai.com/v1/chat/completions";
const DEFAULT_MODEL = "gpt-4o";

let skillPromise;
const loadSkill = () =>
  (skillPromise ??= readFile(path.join(AGENT_ROOT, "skills/vibe-coder.skill.md"), "utf8"));

// Accept base URLs like "https://nexus.anna.ai" and auto-append the standard path.
function resolveApiUrl(raw) {
  if (!raw) return DEFAULT_API_URL;
  const url = raw.trim().replace(/\/+$/, "");
  if (url.endsWith("/chat/completions")) return url;
  if (/\/v\d+$/.test(url)) return `${url}/chat/completions`;
  return `${url}/v1/chat/completions`;
}

export function modelIsConfigured() {
  return Boolean(process.env.ANNA_API_KEY);
}

export async function askModel(task, schemaDescription) {
  if (!modelIsConfigured()) return null;

  const apiUrl = resolveApiUrl(process.env.ANNA_API_URL);
  const model = process.env.ANNA_MODEL || DEFAULT_MODEL;

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      authorization: `Bearer ${process.env.ANNA_API_KEY}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.35,
      max_tokens: 16000,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `${await loadSkill()}\n\nRequired JSON schema: ${schemaDescription}`,
        },
        { role: "user", content: task },
      ],
    }),
  });

  if (!response.ok) {
    const body = (await response.text()).slice(0, 400);
    throw new Error(`Model request failed (${response.status}) at ${apiUrl} — ${body}`);
  }

  const payload = await response.json();
  const content = payload.choices?.[0]?.message?.content ?? payload.output_text;
  if (typeof content !== "string") throw new Error("Model returned no text content");
  return JSON.parse(content.replace(/^```(?:json)?\s*|\s*```$/g, ""));
}
