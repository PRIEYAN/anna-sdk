import { readFile } from "node:fs/promises";
import path from "node:path";
import { AGENT_ROOT } from "./workspace.js";

let skillPromise;
const loadSkill = () =>
  (skillPromise ??= readFile(path.join(AGENT_ROOT, "skills/vibe-coder.skill.md"), "utf8"));

export function modelIsConfigured() {
  return Boolean(process.env.ANNA_API_URL && process.env.ANNA_API_KEY && process.env.ANNA_MODEL);
}

export async function askModel(task, schemaDescription) {
  if (!modelIsConfigured()) return null;
  const response = await fetch(process.env.ANNA_API_URL, {
    method: "POST",
    headers: {
      authorization: `Bearer ${process.env.ANNA_API_KEY}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.ANNA_MODEL,
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
  if (!response.ok)
    throw new Error(
      `Model request failed (${response.status}): ${(await response.text()).slice(0, 300)}`,
    );
  const payload = await response.json();
  const content = payload.choices?.[0]?.message?.content ?? payload.output_text;
  if (typeof content !== "string") throw new Error("Model returned no text content");
  return JSON.parse(content.replace(/^```(?:json)?\s*|\s*```$/g, ""));
}
