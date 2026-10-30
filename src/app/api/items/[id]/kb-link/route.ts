import { z } from "zod";
import { withApi, ok, AppError } from "@/lib/api";
import { getSupabase } from "@/lib/supabase";
import { must, getId } from "@/lib/db";
import { aiJson } from "@/lib/ai";
import { logger } from "@/lib/logger";

export const maxDuration = 60;
const Rerank = z.object({ links: z.array(z.object({ doc_id: z.string(), reason: z.string() })).default([]) });
const tok = (s: string) => new Set(s.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 3));

export const GET = withApi("item_kb_links", async (_req, ctx) => {
  const id = await getId(ctx);
  const links = must(await getSupabase().from("kb_links").select("score,reason,doc:kb_documents(id,title,source_type)").eq("item_id", id).order("score", { ascending: false }));
  return ok({ links });
});

export const POST = withApi("item_kb_link", async (_req, ctx) => {
  const id = await getId(ctx);
  const db = getSupabase();
  const item = must(await db.from("action_items").select("*").eq("id", id).maybeSingle());
  if (!item) throw new AppError("NOT_FOUND", "Item not found", 404);
  const docs = must(await db.from("kb_documents").select("id,title,content,source_ref"));

  const q = tok(`${item.title} ${item.source_quote ?? ""} ${item.outcome ?? ""}`);
  const scored = docs
    .filter((d: { source_ref: string | null }) => d.source_ref !== id)
    .map((d: { id: string; title: string; content: string }) => {
      const t = tok(`${d.title} ${d.content}`);
      const shared = [...q].filter((w) => t.has(w));
      return { doc: d, score: shared.length, shared };
    })
    .filter((x: { score: number }) => x.score > 0)
    .sort((a: { score: number }, b: { score: number }) => b.score - a.score)
    .slice(0, 5);

  let links = scored.slice(0, 3).map((x: { doc: { id: string }; score: number; shared: string[] }) => ({
    doc_id: x.doc.id, score: x.score, reason: `Shares keywords: ${x.shared.slice(0, 4).join(", ")}`, source: "keyword",
  }));

  if (scored.length) {
    try {
      const system = `You link a task to the most relevant knowledge-base documents. Reply with ONLY JSON: {"links":[{"doc_id": string, "reason": string (one short sentence on why this document helps with the task)}]}. Return at most 3, only documents genuinely relevant, doc_id must come from the candidates.`;
      const user = JSON.stringify({
        task: { title: item.title, quote: item.source_quote },
        candidates: scored.map((x: { doc: { id: string; title: string; content: string } }) => ({ doc_id: x.doc.id, title: x.doc.title, excerpt: x.doc.content.slice(0, 300) })),
      });
      const r = await aiJson("kb_link", system, user, Rerank);
      const valid = new Set(scored.map((x: { doc: { id: string } }) => x.doc.id));
      const ai = r.links.filter((l) => valid.has(l.doc_id)).slice(0, 3);
      if (ai.length) {
        links = ai.map((l, i) => ({ doc_id: l.doc_id, score: 3 - i, reason: l.reason, source: "ai" }));
      }
    } catch {
      logger.warn("kb_link_fallback", "Using keyword links", { item_id: id });
    }
  }

  must(await db.from("kb_links").delete().eq("item_id", id));
  if (links.length) {
    must(await db.from("kb_links").insert(links.map((l: { doc_id: string; score: number; reason: string }) => ({ item_id: id, doc_id: l.doc_id, score: l.score, reason: l.reason }))));
  }
  logger.info("kb_linked", item.title, { item_id: id, links: links.length });
  const out = must(await db.from("kb_links").select("score,reason,doc:kb_documents(id,title,source_type)").eq("item_id", id).order("score", { ascending: false }));
  return ok({ links: out });
});
