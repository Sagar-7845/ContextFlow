/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api, Badge, card, riskReasons } from "@/lib/client";

export default function Home() {
  const [items, setItems] = useState<any[]>([]);
  const [meetings, setMeetings] = useState<any[]>([]);
  const [err, setErr] = useState("");
  useEffect(() => {
    Promise.all([api("/api/items"), api("/api/meetings")])
      .then(([i, m]) => { setItems(i.items); setMeetings(m.meetings); })
      .catch((e) => setErr(e.message));
  }, []);
  const open = items.filter((i) => !["done", "dropped"].includes(i.status));
  const risky = open.filter((i) => riskReasons(i).some((r) => r === "Overdue" || r === "Blocked" || r.startsWith("Carried")));
  const stat = (label: string, n: number, tone: string) => (
    <div className={card}><div className="text-sm text-slate-500">{label}</div><div className={`text-3xl font-bold ${tone}`}>{n}</div></div>
  );
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">ContextFlow</h1>
        <p className="text-slate-600">Never lose context when work changes hands.</p>
      </div>
      {err && <p className="rounded bg-red-50 p-3 text-sm text-red-700">{err}</p>}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {stat("Open items", open.length, "")}
        {stat("At risk", risky.length, "text-red-600")}
        {stat("Blocked", open.filter((i) => i.status === "blocked").length, "text-amber-600")}
        {stat("Closed", items.length - open.length, "text-green-600")}
      </div>
      <div className={card}>
        <h2 className="mb-2 font-semibold">Needs attention (risk radar)</h2>
        {risky.length === 0 && <p className="text-sm text-slate-500">Nothing at risk right now.</p>}
        <ul className="space-y-2">
          {risky.map((i) => (
            <li key={i.id} className="flex flex-wrap items-center gap-2 text-sm">
              <span className="font-medium">{i.title}</span>
              <span className="text-slate-500">{i.owner?.name ?? "unassigned"}</span>
              {riskReasons(i).map((r) => <Badge key={r} text={r} tone={r === "Overdue" || r === "Blocked" ? "red" : "amber"} />)}
            </li>
          ))}
        </ul>
      </div>
      <div className={card}>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-semibold">Recent meetings</h2>
          <Link href="/meetings" className="text-sm text-indigo-700">All meetings</Link>
        </div>
        <ul className="space-y-1 text-sm">
          {meetings.slice(0, 5).map((m) => (
            <li key={m.id}><Link href={`/meetings/${m.id}`} className="text-indigo-700 hover:underline">{m.title}</Link> <Badge text={m.status} /></li>
          ))}
        </ul>
      </div>
    </div>
  );
}
