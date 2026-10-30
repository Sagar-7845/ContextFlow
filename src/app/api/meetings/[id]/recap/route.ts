import { z } from "zod";
import { withApi, ok, AppError } from "@/lib/api";
import { getSupabase } from "@/lib/supabase";
import { must, readJson, getId } from "@/lib/db";
import { aiJson, AIUnavailableError } from "@/lib/ai";
import { logger } from "@/lib/logger";

export const maxDuration = 60;

const Body = z.object({ raw_notes: z.string().trim().min(20, "Paste at least a few sentences of notes").max(20000) });
const Recap = z.object({
  summary: z.string().min(1),
  decisions: z.array(z.object({ content: z.string(), source_quote: z.string().nullable().optional() })).default([]),
  action_items: z.array(z.object({
    title: z.string(),
    owner_name: z.string().nullable().optional(),
    due_date: z.string().nullable().optional(),
    source_quote: z.string().nullable().optional(),
  })).default([]),
});

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

export const POST = withApi("meeting_recap", async (req, ctx) => {
  const id = await getId(ctx);
  const { raw_notes } = Body.parse(await readJson(req));
  const db = getSupabase();
  const meeting = must(await db.from("meetings").select("*").eq("id", id).maybeSingle());
  if (!meeting) throw new AppError("NOT_FOUND", "Meeting not found", 404);

  must(await db.from("meetings").update({ raw_notes }).eq("id", id)); // notes are saved even if AI fails
  const people = must(await db.from("participants").select("user:users(id,name)").eq("meeting_id", id));
  const everyone = must(await db.from("users").select("id,name").eq("status", "active"));
  const names: { id: string; name: string }[] = people.length ? people.map((p: { user: { id: string; name: string } }) => p.user) : everyone;
  const meetingDate = (meeting.scheduled_at || meeting.created_at).slice(0, 10);

  const system = `You turn raw, messy meeting notes into structured minutes. Reply with ONLY one JSON object, no markdown, in exactly this shape:
{"summary": string (3-5 sentences), "decisions": [{"content": string, "source_quote": string}], "action_items": [{"title": string, "owner_name": string|null, "due_date": "YYYY-MM-DD"|null, "source_quote": string}]}
Rules: source_quote MUST be an exact copied substring of the notes that supports the item. owner_name must be one of the participant names or null. Resolve relative dates like "Friday" or "next week" using the meeting date; if no date is stated use null. Never invent owners, dates, decisions or tasks. Use empty arrays if there are none.`;
  const user = `Meeting title: ${meeting.title}\nMeeting date: ${meetingDate}\nParticipants: ${names.map((n) => n.name).join(", ")}\n\nRAW NOTES:\n${raw_notes.slice(0, 12000)}`;

  let r;
  try {
    r = await aiJson("recap", system, user, Recap);
  } catch (e) {
    if (e instanceof AIUnavailableError) {
      throw new AppError("AI_UNAVAILABLE", "AI is unavailable right now. Your notes are saved; you can add decisions and action items manually.", 503);
    }
    throw e;
  }

  const notesN = norm(raw_notes);
  const verify = (q?: string | null) => (q && q.trim().length > 3 ? notesN.includes(norm(q)) : false);
  const match = (n?: string | null) => {
    if (!n) return null;
    const x = n.trim().toLowerCase();
    return names.find((u) => u.name.toLowerCase() === x) ?? names.find((u) => u.name.toLowerCase().split(" ")[0] === x.split(" ")[0]) ?? null;
  };

  const draft = {
    summary: r.summary,
    decisions: r.decisions.map((d) => ({ content: d.content, source_quote: d.source_quote ?? null, quote_verified: verify(d.source_quote) })),
    action_items: r.action_items.map((a) => {
      const owner = match(a.owner_name);
      return {
        title: a.title,
        owner_id: owner?.id ?? null,
        owner_name: owner?.name ?? a.owner_name ?? null,
        owner_unmatched: !!a.owner_name && !owner,
        due_date: a.due_date && /^\d{4}-\d{2}-\d{2}$/.test(a.due_date) ? a.due_date : null,
        source_quote: a.source_quote ?? null,
        quote_verified: verify(a.source_quote),
      };
    }),
  };
  logger.info("recap_generated", meeting.title, {
    meeting_id: id, decisions: draft.decisions.length, items: draft.action_items.length,
    unverified_quotes: [...draft.decisions, ...draft.action_items].filter((x) => !x.quote_verified).length,
  });
  return ok({ draft });
});
