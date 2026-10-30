import { z } from "zod";
import { AppError } from "./api";
import { getSupabase } from "./supabase";
import { getRequestId, logger } from "./logger";

export const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD");

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function must(res: { data: any; error: { message: string } | null }): any {
  if (res.error) {
    logger.error("db_error", "Database operation failed", new Error(res.error.message));
    throw new AppError("DB_ERROR", "Database operation failed", 500);
  }
  return res.data;
}

export async function readJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    throw new AppError("BAD_JSON", "Request body must be valid JSON", 400);
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getId(ctx: any): Promise<string> {
  return z.string().uuid("Invalid id").parse((await ctx.params).id);
}

export async function logEvent(item_id: string, event_type: string, payload: Record<string, unknown> = {}) {
  must(
    await getSupabase()
      .from("item_events")
      .insert({ item_id, event_type, payload, request_id: getRequestId() ?? null })
  );
  logger.info(`item_${event_type}`, "Action item event", { item_id, ...payload });
}

export async function addKb(title: string, content: string, source_type: "doc" | "meeting" | "outcome", source_ref?: string) {
  must(
    await getSupabase()
      .from("kb_documents")
      .insert({ title, content, source_type, source_ref: source_ref ?? null })
  );
  logger.info("kb_document_added", title, { source_type });
}
