import { withApi, ok } from "@/lib/api";
import { getSupabase } from "@/lib/supabase";
import { must } from "@/lib/db";

export const GET = withApi("items_list", async (req) => {
  const sp = new URL(req.url).searchParams;
  let q = getSupabase().from("action_items").select("*, owner:users(name)").order("created_at", { ascending: false });
  const status = sp.get("status");
  const owner = sp.get("owner_id");
  if (status) q = q.eq("status", status);
  if (owner) q = q.eq("owner_id", owner);
  return ok({ items: must(await q) });
});
