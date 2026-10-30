import { withApi, ok } from "@/lib/api";
import { getSupabase } from "@/lib/supabase";
import { getRequestId } from "@/lib/logger";


export const GET = withApi("health", async () => {
  const names = [
    "SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "OPENROUTER_API_KEY",
    "OPENROUTER_MODEL",
    "OPENROUTER_FALLBACK_MODEL",
  ];
  const env: Record<string, boolean> = {};
  for (const n of names) env[n] = !!process.env[n];

  let db: "ok" | "error" = "ok";
  try {
    const { error } = await getSupabase().from("users").select("id").limit(1);
    if (error) db = "error";
  } catch {
    db = "error";
  }
  const allEnv = Object.values(env).every(Boolean);
  return ok({
    status: db === "ok" && allEnv ? "ok" : "degraded",
    time: new Date().toISOString(),
    db,
    env,
    request_id: getRequestId(),
  });
});
