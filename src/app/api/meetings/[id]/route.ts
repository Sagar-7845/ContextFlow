import { z } from "zod";
import { withApi, ok, AppError } from "@/lib/api";
import { getSupabase } from "@/lib/supabase";
import { must, readJson, getId } from "@/lib/db";
import { logger } from "@/lib/logger";

const PatchSchema = z.object({
  title: z.string().trim().min(3).max(200).optional(),
  status: z.enum(["planned", "held", "closed"]).optional(),
  agenda: z.array(z.string().trim().min(1)).optional(),
  raw_notes: z.string().max(20000).optional(),
  attendance: z.array(z.object({
    user_id: z.string().uuid(),
    attendance: z.enum(["invited", "attended", "missed", "no_response"]),
  })).optional(),
});

export const GET = withApi("meeting_get", async (_req, ctx) => {
  const id = await getId(ctx);
  const db = getSupabase();
  const meeting = must(await db.from("meetings").select("*").eq("id", id).maybeSingle());
  if (!meeting) throw new AppError("NOT_FOUND", "Meeting not found", 404);
  const participants = must(await db.from("participants").select("user_id, attendance, user:users(name,email,role)").eq("meeting_id", id));
  const decisions = must(await db.from("decisions").select("*").eq("meeting_id", id).order("created_at"));
  const items = must(await db.from("action_items").select("*, owner:users(name)").eq("meeting_id", id).order("created_at"));
  return ok({ meeting, participants, decisions, items });
});

export const PATCH = withApi("meeting_update", async (req, ctx) => {
  const id = await getId(ctx);
  const b = PatchSchema.parse(await readJson(req));
  const db = getSupabase();
  const { attendance, ...fields } = b;
  if (Object.keys(fields).length) must(await db.from("meetings").update(fields).eq("id", id));
  if (attendance) {
    for (const a of attendance) {
      must(await db.from("participants").upsert({ meeting_id: id, user_id: a.user_id, attendance: a.attendance }));
    }
  }
  logger.info("meeting_updated", "Meeting updated", { meeting_id: id, fields: Object.keys(b) });
  return ok({ updated: true });
});
