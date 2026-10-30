import { z } from "zod";
import { withApi, ok, AppError } from "@/lib/api";
import { getSupabase } from "@/lib/supabase";
import { must, readJson, getId, logEvent, addKb, dateStr } from "@/lib/db";

const Patch = z.object({
  status: z.enum(["open", "in_progress", "blocked", "done", "dropped"]).optional(),
  owner_id: z.string().uuid().nullable().optional(),
  due_date: dateStr.nullable().optional(),
  outcome: z.string().trim().min(3, "Outcome needs at least 3 characters").max(2000).optional(),
});

export const GET = withApi("item_get", async (_req, ctx) => {
  const id = await getId(ctx);
  const db = getSupabase();
  const item = must(await db.from("action_items").select("*, owner:users(name)").eq("id", id).maybeSingle());
  if (!item) throw new AppError("NOT_FOUND", "Item not found", 404);
  const events = must(await db.from("item_events").select("*").eq("item_id", id).order("created_at"));
  return ok({ item, events });
});

export const PATCH = withApi("item_update", async (req, ctx) => {
  const id = await getId(ctx);
  const b = Patch.parse(await readJson(req));
  const db = getSupabase();
  const item = must(await db.from("action_items").select("*").eq("id", id).maybeSingle());
  if (!item) throw new AppError("NOT_FOUND", "Item not found", 404);

  const upd: Record<string, unknown> = {};
  const closing = b.status === "done" || b.status === "dropped";
  if (closing) {
    const outcome = b.outcome ?? item.outcome;
    if (!outcome || !String(outcome).trim()) {
      throw new AppError("OUTCOME_REQUIRED", "Please record the outcome before closing this item", 400);
    }
    upd.outcome = outcome;
    upd.closed_at = new Date().toISOString();
  } else if (b.outcome !== undefined) {
    upd.outcome = b.outcome;
  }
  if (b.status && !closing) { upd.status = b.status; upd.closed_at = null; }
  if (closing) upd.status = b.status;
  if (b.owner_id !== undefined) upd.owner_id = b.owner_id;
  if (b.due_date !== undefined) upd.due_date = b.due_date;

  const updated = must(await db.from("action_items").update(upd).eq("id", id).select("*, owner:users(name)").single());

  if (b.owner_id !== undefined && b.owner_id !== item.owner_id) await logEvent(id, "reassigned", { from: item.owner_id, to: b.owner_id });
  if (b.due_date !== undefined && b.due_date !== item.due_date) await logEvent(id, "edited", { due_date_from: item.due_date, due_date_to: b.due_date });
  if (b.status && b.status !== item.status) await logEvent(id, "status_changed", { from: item.status, to: b.status });
  if (closing) {
    await logEvent(id, "closed", { status: b.status, outcome: upd.outcome });
    await addKb(`Outcome: ${item.title}`, `${item.title}\nOutcome: ${upd.outcome}`, "outcome", id);
  }
  return ok({ item: updated });
});
