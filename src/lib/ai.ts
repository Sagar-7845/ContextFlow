import { z } from "zod";
import { logger } from "./logger";

export class AIUnavailableError extends Error {}

function extractJson(text: string): unknown {
  const cleaned = text.replace(/```json|```/gi, "").trim();
  const s = cleaned.indexOf("{");
  const e = cleaned.lastIndexOf("}");
  if (s === -1 || e === -1) throw new Error("No JSON object found");
  return JSON.parse(cleaned.slice(s, e + 1));
}

async function callModel(model: string, messages: { role: string; content: string }[], timeoutMs: number) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model, messages, temperature: 0.2 }),
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error(`OpenRouter HTTP ${res.status}`);
    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content) throw new Error("Empty model response");
    return { content: String(content), usedModel: String(data.model ?? model) };
  } finally {
    clearTimeout(timer);
  }
}

// One shared ~24s budget: model -> repair retry -> fallback model -> AIUnavailableError
export async function aiJson<T>(feature: string, system: string, user: string, schema: z.ZodType<T>): Promise<T> {
  const models = [process.env.OPENROUTER_MODEL, process.env.OPENROUTER_FALLBACK_MODEL].filter(Boolean) as string[];
  if (!process.env.OPENROUTER_API_KEY || models.length === 0) throw new AIUnavailableError("AI is not configured");
  const deadline = Date.now() + 50000;

  for (const model of models) {
    const messages = [
      { role: "system", content: system },
      { role: "user", content: user },
    ];
    for (let attempt = 1; attempt <= 2; attempt++) {
      const remaining = deadline - Date.now();
      if (remaining < 3000) break;
      const start = Date.now();
      try {
        const { content, usedModel } = await callModel(model, messages, Math.min(remaining, 40000));
        try {
          const parsed = schema.parse(extractJson(content));
          logger.info("ai_call", feature, {
            feature, model: usedModel, attempt, latency_ms: Date.now() - start,
            outcome: attempt === 1 ? "success" : "repaired",
          });
          return parsed;
        } catch {
          logger.warn("ai_call", feature, {
            feature, model: usedModel, attempt, latency_ms: Date.now() - start, outcome: "invalid_output",
          });
          messages.push(
            { role: "assistant", content },
            { role: "user", content: "That reply was not valid. Reply again with ONLY the corrected JSON object in the required shape." }
          );
        }
      } catch (e) {
        logger.warn("ai_call", feature, {
          feature, model, attempt, latency_ms: Date.now() - start, outcome: "error",
          error_message: e instanceof Error ? e.message : String(e),
        });
        break;
      }
    }
  }
  logger.error("ai_unavailable", feature, undefined, { feature });
  throw new AIUnavailableError("AI unavailable");
}
