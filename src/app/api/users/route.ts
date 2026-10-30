import { withApi, ok } from "@/lib/api";
import { getSupabase } from "@/lib/supabase";
import { must } from "@/lib/db";

export const GET = withApi("users_list", async () => {
  const users = must(await getSupabase().from("users").select("*").order("name"));
  return ok({ users });
});
