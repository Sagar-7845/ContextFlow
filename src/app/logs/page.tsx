/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useCallback, useEffect, useState } from "react";
import { api, Badge, btn2, inp } from "@/lib/client";

export default function LogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [level, setLevel] = useState("");
  const [err, setErr] = useState("");
  const load = useCallback(async () => {
    try { setLogs((await api("/api/logs" + (level ? `?level=${level}` : ""))).logs); }
    catch (e: any) { setErr(e.message); }
  }, [level]);
  useEffect(() => { load(); }, [load]);
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Application Logs</h1>
        <div className="flex gap-2">
          <select className={inp} value={level} onChange={(e) => setLevel(e.target.value)}>
            <option value="">All levels</option><option value="info">info</option><option value="warn">warn</option><option value="error">error</option>
          </select>
          <button className={btn2} onClick={load}>Refresh</button>
        </div>
      </div>
      <p className="text-sm text-slate-500">Structured events with request IDs. Secrets are redacted. Latest 150 entries.</p>
      {err && <p className="text-red-600">{err}</p>}
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-100"><tr><th className="p-2">Time</th><th>Level</th><th>Event</th><th>Message</th><th>Request</th><th>Details</th></tr></thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l.id} className="border-t align-top">
                <td className="p-2 whitespace-nowrap">{new Date(l.created_at).toLocaleTimeString()}</td>
                <td><Badge text={l.level} tone={l.level === "error" ? "red" : l.level === "warn" ? "amber" : "blue"} /></td>
                <td>{l.event}</td><td>{l.message}</td>
                <td className="font-mono">{(l.request_id ?? "").slice(0, 8)}</td>
                <td className="max-w-xs truncate font-mono">{JSON.stringify(l.meta)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
