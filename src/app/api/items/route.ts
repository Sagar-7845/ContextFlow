import { z } from "zod";
import { withApi, ok } from "@/lib/api";
import { getSupabase } from "@/lib/supabase";
import { must, readJson, logEvent, dateStr } from "@/lib/db";

const Create = z.object({
  meeting_id: z.string().uuid(),
  title: z.string().trim().min(2).max(300),
  owner_id: z.string().uuid().nullable().optional(),
  due_date: dateStr.nullable().optional(),
});

export const GET = withApi("items_list", async (req) => {
  const sp = new URL(req.url).searchParams;
  let q = getSupabase().from("action_items").select("*, owner:users(name), meeting:meetings!action_items_meeting_id_fkey(title)").order("created_at", { ascending: false });
  const status = sp.get("status");
  const owner = sp.get("owner_id");
  if (status) q = q.eq("status", status);
  if (owner) q = q.eq("owner_id", owner);
  return ok({ items: must(await q) });
});

export const POST = withApi("item_create", async (req) => {
  const b = Create.parse(await readJson(req));
  const row = must(
    await getSupabase().from("action_items").insert({
      meeting_id: b.meeting_id, origin_meeting_id: b.meeting_id, title: b.title,
      owner_id: b.owner_id ?? null, due_date: b.due_date ?? null, ai_generated: false,
    }).select("*").single()
  );
  await logEvent(row.id, "created", { meeting_id: b.meeting_id, manual: true });
  return ok({ item: row }, 201);
});
