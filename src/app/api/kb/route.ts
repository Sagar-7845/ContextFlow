import { z } from "zod";
import { withApi, ok } from "@/lib/api";
import { getSupabase } from "@/lib/supabase";
import { must, readJson, addKb } from "@/lib/db";

const Add = z.object({
  title: z.string().trim().min(3).max(200),
  content: z.string().trim().min(10, "Content needs at least 10 characters").max(10000),
});

export const GET = withApi("kb_list", async () => {
  const docs = must(await getSupabase().from("kb_documents").select("*").order("created_at", { ascending: false }));
  return ok({ documents: docs });
});

export const POST = withApi("kb_add", async (req) => {
  const b = Add.parse(await readJson(req));
  await addKb(b.title, b.content, "doc");
  return ok({ added: true }, 201);
});
