import { z } from "zod";
import { withApi, ok } from "@/lib/api";
import { getSupabase } from "@/lib/supabase";
import { must, readJson } from "@/lib/db";
import { aiJson } from "@/lib/ai";
import { logger } from "@/lib/logger";

export const maxDuration = 60;
const Body = z.object({ question: z.string().trim().min(5, "Ask a full question").max(500) });
const Answer = z.object({ answer: z.string().min(1), source_ids: z.array(z.string()).default([]) });
const tok = (s: string) => new Set(s.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 2));

export const POST = withApi("kb_ask", async (req) => {
  const { question } = Body.parse(await readJson(req));
  const docs = must(await getSupabase().from("kb_documents").select("id,title,content,source_type"));
  const q = tok(question);
  const top: { id: string; title: string; content: string; source_type: string }[] = docs
    .map((d: { id: string; title: string; content: string; source_type: string }) => {
      const t = tok(`${d.title} ${d.content}`);
      return { d, score: [...q].filter((w) => t.has(w)).length };
    })
    .filter((x: { score: number }) => x.score > 0)
    .sort((a: { score: number }, b: { score: number }) => b.score - a.score)
    .slice(0, 4)
    .map((x: { d: unknown }) => x.d as { id: string; title: string; content: string; source_type: string });

  if (top.length === 0) {
    return ok({ answer: "I could not find anything relevant in the knowledge base.", sources: [], mode: "none" });
  }
  try {
    const system = `Answer the question using ONLY the provided documents. If the documents do not contain the answer, say so. Reply with ONLY JSON: {"answer": string (2-4 sentences), "source_ids": [ids of documents you used]}.`;
    const r = await aiJson("kb_ask", system, JSON.stringify({ question, documents: top.map((d) => ({ id: d.id, title: d.title, content: d.content })) }), Answer);
    const used = top.filter((d) => r.source_ids.includes(d.id));
    logger.info("kb_answered", "Question answered", { sources: used.length });
    return ok({ answer: r.answer, sources: (used.length ? used : top).map((d) => ({ id: d.id, title: d.title, type: d.source_type })), mode: "ai" });
  } catch {
    logger.warn("kb_ask_fallback", "Returning matching documents only");
    return ok({
      answer: "AI is unavailable. Here are the most relevant documents:",
      sources: top.map((d) => ({ id: d.id, title: d.title, type: d.source_type, excerpt: d.content.slice(0, 200) })),
      mode: "fallback",
    });
  }
});
