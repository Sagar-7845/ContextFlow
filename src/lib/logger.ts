import { AsyncLocalStorage } from "node:async_hooks";
import fs from "node:fs";
import path from "node:path";
import { getSupabase } from "./supabase";

type Level = "debug" | "info" | "warn" | "error";
const ORDER: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };

const als = new AsyncLocalStorage<{ requestId: string }>();
export function runWithRequestId<T>(id: string, fn: () => T): T {
  return als.run({ requestId: id }, fn);
}
export function getRequestId(): string | undefined {
  return als.getStore()?.requestId;
}

const SENSITIVE_KEY = /key|token|secret|password|authorization/i;
const SENSITIVE_VAL =
  /(sk-[A-Za-z0-9_-]{8,}|Bearer\s+[A-Za-z0-9._-]+|eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9._-]+)/g;

function redact(v: unknown, depth = 0): unknown {
  if (depth > 5) return "[truncated]";
  if (typeof v === "string") return v.replace(SENSITIVE_VAL, "[REDACTED]");
  if (Array.isArray(v)) return v.map((x) => redact(x, depth + 1));
  if (v && typeof v === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
      out[k] = SENSITIVE_KEY.test(k) ? "[REDACTED]" : redact(val, depth + 1);
    }
    return out;
  }
  return v;
}

const pending = new Set<Promise<void>>();
export async function flushLogs(): Promise<void> {
  if (pending.size) await Promise.allSettled(Array.from(pending));
}

function write(level: Level, event: string, message: string, meta: Record<string, unknown> = {}) {
  const min = (process.env.LOG_LEVEL as Level) || "info";
  if (ORDER[level] < (ORDER[min] ?? ORDER.info)) return;

  const request_id = getRequestId();
  const safeMeta = redact(meta) as Record<string, unknown>;
  const ts = new Date().toISOString();
  const line = JSON.stringify({ ts, level, event, message, request_id, ...safeMeta });

  console.log(line);

  try {
    const file = process.env.VERCEL
      ? "/tmp/app.log"
      : path.join(process.cwd(), "logs", "app.log");
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.appendFileSync(file, line + "\n");
  } catch {
    // file logging is best effort
  }

  if (ORDER[level] >= ORDER.info) {
    const p = (async () => {
      try {
        const { error } = await getSupabase()
          .from("app_logs")
          .insert({ level, event, message, meta: safeMeta, request_id: request_id ?? null });
        if (error) console.log(JSON.stringify({ ts, level: "warn", event: "log_db_failed", message: error.message }));
      } catch {
        // never let logging break the app
      }
    })();
    pending.add(p);
    p.finally(() => pending.delete(p));
  }
}

function errInfo(err: unknown): Record<string, unknown> {
  if (err instanceof Error) {
    return { error_name: err.name, error_message: err.message, stack: (err.stack || "").split("\n").slice(0, 5).join(" | ") };
  }
  return { error_message: String(err) };
}

export const logger = {
  debug: (event: string, message: string, meta?: Record<string, unknown>) => write("debug", event, message, meta),
  info: (event: string, message: string, meta?: Record<string, unknown>) => write("info", event, message, meta),
  warn: (event: string, message: string, meta?: Record<string, unknown>) => write("warn", event, message, meta),
  error: (event: string, message: string, err?: unknown, meta?: Record<string, unknown>) =>
    write("error", event, message, { ...(err ? errInfo(err) : {}), ...(meta ?? {}) }),
};
