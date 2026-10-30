import { z } from "zod";
import { withApi, ok, AppError } from "@/lib/api";
import { getSupabase } from "@/lib/supabase";
import { must, readJson, logEvent } from "@/lib/db";
import { logger } from "@/lib/logger";

const CreateSchema = z.object({
  title: z.string().trim().min(3, "Title needs at least 3 characters").max(200),
  type: z.enum(["meeting", "work_transfer"]).default("meeting"),
  scheduled_at: z.string().optional().nullable(),
  agenda: z.array(z.string().trim().min(1)).default([]),
  participant_ids: z.array(z.string().uuid()).default([]),
  previous_meeting_id: z.string().uuid().optional().nullable(),
});

export const GET = withApi("meetings_list", async () => {
  const meetings = must(await getSupabase().from("meetings").select("*").order("created_at", { ascending: false }));
  return ok({ meetings });
});

export const POST = withApi("meeting_create", async (req) => {
  const b = CreateSchema.parse(await readJson(req));
  const db = getSupabase();
  const today = new Date().toISOString().slice(0, 10);

  let scheduled: string | null = null;
  if (b.scheduled_at) {
    const d = new Date(b.scheduled_at);
    if (isNaN(d.getTime())) throw new AppError("VALIDATION_ERROR", "Invalid date/time", 400);
    scheduled = d.toISOString();
  }

  // Carry-forward + Agenda Autopilot
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let carried: any[] = [];
  let prevParticipants: string[] = [];
  if (b.previous_meeting_id) {
    const prev = must(await db.from("meetings").select("id").eq("id", b.previous_meeting_id).maybeSingle());
    if (!prev) throw new AppError("NOT_FOUND", "Previous meeting not found", 404);
    carried = must(
      await db.from("action_items").select("*, owner:users(name)")
        .eq("meeting_id", b.previous_meeting_id).in("status", ["open", "in_progress", "blocked"])
    );
    const pp = must(await db.from("participants").select("user_id").eq("meeting_id", b.previous_meeting_id));
    prevParticipants = pp.map((p: { user_id: string }) => p.user_id);
  }

  const score = (i: { due_date: string | null; status: string; carry_count: number }) =>
    (i.due_date && i.due_date < today ? 4 : 0) + (i.status === "blocked" ? 2 : 0) + Math.min(i.carry_count, 3);
  carried.sort((a, b2) => score(b2) - score(a));

  const autoAgenda = carried.map((i) => {
    const tags: string[] = [];
    if (i.due_date && i.due_date < today) tags.push("OVERDUE");
    if (i.status === "blocked") tags.push("BLOCKED");
    if (i.carry_count >= 1) tags.push(`carried ${i.carry_count + 1}x`);
    const owner = i.owner?.name ? ` (${i.owner.name})` : " (unassigned)";
    return `Follow up: ${i.title}${owner}${tags.length ? " [" + tags.join(", ") + "]" : ""}`;
  });
  const agenda = [...autoAgenda, ...b.agenda];

  const meeting = must(
    await db.from("meetings").insert({
      title: b.title, type: b.type, scheduled_at: scheduled, agenda,
      previous_meeting_id: b.previous_meeting_id ?? null,
    }).select("*").single()
  );

  const pids = b.participant_ids.length ? b.participant_ids : prevParticipants;
  if (pids.length) {
    must(await db.from("participants").insert(pids.map((user_id) => ({ meeting_id: meeting.id, user_id }))));
  }

  for (const it of carried) {
    must(await db.from("action_items").update({ meeting_id: meeting.id, carry_count: it.carry_count + 1 }).eq("id", it.id));
    await logEvent(it.id, "carried_forward", { from_meeting: b.previous_meeting_id, to_meeting: meeting.id, carry_count: it.carry_count + 1 });
  }
  if (b.previous_meeting_id) {
    must(await db.from("meetings").update({ status: "closed" }).eq("id", b.previous_meeting_id));
  }

  logger.info("meeting_created", meeting.title, { meeting_id: meeting.id, type: b.type, carried_count: carried.length });
  return ok({ meeting, carried_count: carried.length, agenda }, 201);
});
