import { z } from "zod";
import { withApi, ok, AppError } from "@/lib/api";
import { getSupabase } from "@/lib/supabase";
import { must, getId } from "@/lib/db";
import { aiJson } from "@/lib/ai";
import { logger } from "@/lib/logger";

export const maxDuration = 60;
const Brief = z.object({ brief: z.string().min(1), your_actions: z.array(z.string()).default([]) });

export const GET = withApi("meeting_brief", async (req, ctx) => {
  const id = await getId(ctx);
  const userId = z.string().uuid().nullable().parse(new URL(req.url).searchParams.get("user_id"));
  const db = getSupabase();
  const meeting = must(await db.from("meetings").select("*").eq("id", id).maybeSingle());
  if (!meeting) throw new AppError("NOT_FOUND", "Meeting not found", 404);
  const decisions = must(await db.from("decisions").select("content").eq("meeting_id", id));
  const items = must(await db.from("action_items").select("title,status,due_date,carry_count,owner_id,owner:users(name)").eq("meeting_id", id));
  const user = userId ? must(await db.from("users").select("name,role").eq("id", userId).maybeSingle()) : null;
  const mine = userId ? items.filter((i: { owner_id: string }) => i.owner_id === userId) : [];
  const att = userId ? must(await db.from("participants").select("attendance").eq("meeting_id", id).eq("user_id", userId).maybeSingle()) : null;

  const today = new Date().toISOString().slice(0, 10);
  const open = items.filter((i: { status: string }) => !["done", "dropped"].includes(i.status));
  const overdue = open.filter((i: { due_date: string | null }) => i.due_date && i.due_date < today);

  const facts = {
    meeting: meeting.title, date: (meeting.scheduled_at || meeting.created_at).slice(0, 10),
    summary: meeting.summary, decisions: decisions.map((d: { content: string }) => d.content),
    open_items: open.map((i: { title: string; owner: { name: string } | null; due_date: string | null; status: string }) => `${i.title} | owner: ${i.owner?.name ?? "unassigned"} | due: ${i.due_date ?? "none"} | ${i.status}`),
    reader: user ? { name: user.name, attendance: att?.attendance ?? "unknown", their_items: mine.map((i: { title: string; due_date: string | null }) => `${i.title} (due ${i.due_date ?? "none"})`) } : null,
    today,
  };

  try {
    const system = `You write short catch-up briefs for someone who missed a meeting or is taking over work. Reply with ONLY a JSON object: {"brief": string (5-8 plain sentences: what happened, what was decided, what is risky or overdue), "your_actions": [string]}. your_actions lists what the reader personally must do, empty if no reader. Use only the facts provided; never invent anything.`;
    const r = await aiJson("catchup_brief", system, JSON.stringify(facts), Brief);
    return ok({ brief: r.brief, your_actions: r.your_actions, source: "ai" });
  } catch {
    logger.warn("brief_fallback", "Using deterministic brief", { meeting_id: id });
    const lines = [
      `${meeting.title} (${facts.date}).`,
      meeting.summary ? `Summary: ${meeting.summary}` : "No summary has been recorded yet.",
      decisions.length ? `Decisions: ${facts.decisions.join("; ")}.` : "No decisions recorded.",
      `${open.length} open action item(s), ${overdue.length} overdue.`,
    ];
    return ok({
      brief: lines.join(" "),
      your_actions: facts.reader ? facts.reader.their_items : [],
      source: "fallback",
    });
  }
});
