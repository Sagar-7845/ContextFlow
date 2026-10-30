import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { flushLogs, logger, runWithRequestId, getRequestId } from "./logger";

export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public status = 400,
    public details?: unknown
  ) {
    super(message);
  }
}

export function ok(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function withApi(name: string, handler: (req: Request, ctx: any) => Promise<Response>) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return async (req: Request, ctx: any): Promise<Response> => {
    const id = req.headers.get("x-request-id") || crypto.randomUUID();
    return runWithRequestId(id, async () => {
      const start = Date.now();
      const path = new URL(req.url).pathname;
      logger.info("request_started", name, { method: req.method, path });
      let res: Response;
      try {
        res = await handler(req, ctx);
      } catch (e) {
        if (e instanceof ZodError) {
          logger.warn("validation_failed", name, { issues: e.issues.slice(0, 5) });
          res = NextResponse.json(
            { error: { code: "VALIDATION_ERROR", message: "Invalid input", details: e.issues, request_id: getRequestId() } },
            { status: 400 }
          );
        } else if (e instanceof AppError) {
          logger.warn("app_error", e.message, { code: e.code, status: e.status });
          res = NextResponse.json(
            { error: { code: e.code, message: e.message, details: e.details, request_id: getRequestId() } },
            { status: e.status }
          );
        } else {
          logger.error("unhandled_error", name, e);
          res = NextResponse.json(
            { error: { code: "INTERNAL_ERROR", message: "Something went wrong", request_id: getRequestId() } },
            { status: 500 }
          );
        }
      }
      res.headers.set("x-request-id", id);
      logger.info("request_completed", name, { method: req.method, path, status: res.status, duration_ms: Date.now() - start });
      await flushLogs();
      return res;
    });
  };
}
