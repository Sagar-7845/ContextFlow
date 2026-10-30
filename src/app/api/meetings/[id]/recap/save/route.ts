import { z } from "zod";
import { withApi, ok, AppError } from "@/lib/api";
import { getSupabase } from "@/lib/supabase";
import { must, readJson, getId, logEvent, addKb, dateStr } from "@/lib/db";
import { logger } from "@/lib/logger";

const Save = z.object({
  summary: z.string().trim().min(1).max(5000),
  decisions: z.array(z.object({
    content: z.string().trim().min(1).max(1000),
    source_quote: z.string().nullable().optional(),
    quote_verified: z.boolean().nullable().optional(),
  })).default([]),
  action_items: z.array(z.object({
    title: z.string().trim().min(2).max(300),
    owner_id: z.string().uuid().nullable().optional(),
    due_date: dateStr.nullable().optional(),
    source_quote: z.string().nullable().optional(),
    quote_verified: z.boolean().nullable().optional(),
    ai_generated: z.boolean().default(true),
  })).default([]),
});

export const POST = withApi("recap_save", async (req, ctx) => {
  const id = await getId(ctx);
  const b = Save.parse(await readJson(req));
  const db = getSupabase();
  const meeting = must(await db.from("meetings").select("*").eq("id", id).maybeSingle());
  if (!meeting) throw new AppError("NOT_FOUND", "Meeting not found", 404);

  if (b.decisions.length) {
    must(await db.from("decisions").insert(b.decisions.map((d) => ({ ...d, meeting_id: id }))));
  }
  let created = 0;
  for (const a of b.action_items) {
    const row = must(
      await db.from("action_items").insert({
        meeting_id: id, origin_meeting_id: id, title: a.title, owner_id: a.owner_id ?? null,
        due_date: a.due_date ?? null, source_quote: a.source_quote ?? null,
        quote_verified: a.quote_verified ?? null, ai_generated: a.ai_generated,
      }).select("id").single()
    );
    await logEvent(row.id, "created", { meeting_id: id, owner_id: a.owner_id ?? null, ai_generated: a.ai_generated });
    created++;
  }
  must(await db.from("meetings").update({ summary: b.summary, status: meeting.status === "closed" ? "closed" : "held" }).eq("id", id));
  await addKb(
    `Meeting: ${meeting.title}`,
    `${b.summary}\nDecisions: ${b.decisions.map((d) => d.content).join("; ") || "none"}`,
    "meeting", id
  );
  logger.info("recap_saved", meeting.title, { meeting_id: id, items_created: created, decisions: b.decisions.length });
  return ok({ saved: true, items_created: created }, 201);
});
