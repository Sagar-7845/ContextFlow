import { withApi, ok } from "@/lib/api";
import { getSupabase } from "@/lib/supabase";
import { must } from "@/lib/db";

export const GET = withApi("logs_list", async (req) => {
  const level = new URL(req.url).searchParams.get("level");
  let q = getSupabase().from("app_logs").select("*").order("created_at", { ascending: false }).limit(150);
  if (level) q = q.eq("level", level);
  return ok({ logs: must(await q) });
});
