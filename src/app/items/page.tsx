/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useCallback, useEffect, useState } from "react";
import { api, Badge, btn, btn2, card, inp, riskReasons } from "@/lib/client";

function ItemRow({ item, users, onChange }: { item: any; users: any[]; onChange: () => void }) {
  const [closing, setClosing] = useState<"done" | "dropped" | null>(null);
  const [outcome, setOutcome] = useState("");
  const [detail, setDetail] = useState<any>(null);
  const [links, setLinks] = useState<any[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const closed = ["done", "dropped"].includes(item.status);

  async function loadDetail() {
    const d = await api(`/api/items/${item.id}`);
    setDetail(d);
    const l = await api(`/api/items/${item.id}/kb-link`);
    setLinks(l.links);
  }
  async function patch(body: any) {
    setErr("");
    try {
      await api(`/api/items/${item.id}`, { method: "PATCH", body: JSON.stringify(body) });
      setClosing(null); setOutcome(""); onChange();
      if (detail) await loadDetail();
    } catch (e: any) { setErr(e.message); }
  }
  async function findDocs() {
    setBusy(true); setErr("");
    try { const d = await api(`/api/items/${item.id}/kb-link`, { method: "POST" }); setLinks(d.links); }
    catch (e: any) { setErr(e.message); }
    setBusy(false);
  }
  return (
    <div className={card}>
      <div className="flex flex-wrap items-center gap-2">
        <span className={`font-medium ${closed ? "text-slate-400 line-through" : ""}`}>{item.title}</span>
        {item.ai_generated && <Badge text="AI" tone="blue" />}
        {item.quote_verified === true && <Badge text="quote verified" tone="green" />}
        {item.quote_verified === false && <Badge text="quote unverified" tone="amber" />}
        {riskReasons(item).map((r) => <Badge key={r} text={r} tone={r === "Overdue" || r === "Blocked" ? "red" : "amber"} />)}
        {closed && <Badge text={item.status} tone="green" />}
      </div>
      {item.meeting?.title && <p className="text-xs text-slate-500">Meeting: {item.meeting.title}</p>}
      {item.source_quote && <p className="mt-1 text-xs italic text-slate-500">From notes: {item.source_quote}</p>}
      {closed && item.outcome && <p className="mt-1 text-sm">Outcome: {item.outcome}</p>}
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <select className={inp} disabled={closed} value={item.owner_id ?? ""} onChange={(e) => patch({ owner_id: e.target.value || null })}>
          <option value="">Unassigned</option>
          {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
        <input type="date" className={inp} disabled={closed} value={item.due_date ?? ""} onChange={(e) => patch({ due_date: e.target.value || null })} />
        <select className={inp} disabled={closed} value={closed ? "open" : item.status} onChange={(e) => patch({ status: e.target.value })}>
          <option value="open">open</option><option value="in_progress">in_progress</option><option value="blocked">blocked</option>
        </select>
        {!closed && <button className={btn} onClick={() => setClosing("done")}>Mark done</button>}
        {!closed && <button className={btn2} onClick={() => setClosing("dropped")}>Drop</button>}
        <button className={btn2} onClick={() => (detail ? setDetail(null) : loadDetail())}>{detail ? "Hide" : "History and docs"}</button>
      </div>
      {closing && (
        <div className="mt-2 flex gap-2">
          <input className={`${inp} flex-1`} placeholder="Outcome (required): what happened?" value={outcome} onChange={(e) => setOutcome(e.target.value)} />
          <button className={btn} onClick={() => patch({ status: closing, outcome })}>Confirm</button>
          <button className={btn2} onClick={() => setClosing(null)}>Cancel</button>
        </div>
      )}
      {err && <p className="mt-2 text-sm text-red-600">{err}</p>}
      {detail && (
        <div className="mt-3 grid gap-4 border-t pt-3 md:grid-cols-2">
          <div>
            <h3 className="mb-1 text-sm font-semibold">History</h3>
            <ul className="space-y-1 text-xs text-slate-600">
              {detail.events.map((e: any) => (
                <li key={e.id}>{new Date(e.created_at).toLocaleString()} - <b>{e.event_type}</b> {JSON.stringify(e.payload).slice(0, 110)}</li>
              ))}
            </ul>
          </div>
          <div>
            <div className="mb-1 flex items-center gap-2">
              <h3 className="text-sm font-semibold">Related knowledge</h3>
              <button className={btn2} disabled={busy} onClick={findDocs}>{busy ? "Linking..." : "Find with AI"}</button>
            </div>
            {links && links.length === 0 && <p className="text-xs text-slate-500">No links yet.</p>}
            <ul className="space-y-1 text-xs">
              {(links ?? []).map((l: any, i: number) => <li key={i}><b>{l.doc?.title}</b> - {l.reason}</li>)}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ItemsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [filter, setFilter] = useState("");
  const [err, setErr] = useState("");
  const load = useCallback(async () => {
    try {
      const [i, u] = await Promise.all([api("/api/items" + (filter ? `?status=${filter}` : "")), api("/api/users")]);
      setItems(i.items); setUsers(u.users);
    } catch (e: any) { setErr(e.message); }
  }, [filter]);
  useEffect(() => { load(); }, [load]);
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Action Items</h1>
        <select className={inp} value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="">All statuses</option>
          {["open", "in_progress", "blocked", "done", "dropped"].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      {err && <p className="rounded bg-red-50 p-3 text-sm text-red-700">{err}</p>}
      {items.length === 0 && <p className="text-slate-500">No items yet. Create a meeting and generate a recap.</p>}
      {items.map((i) => <ItemRow key={i.id} item={i} users={users} onChange={load} />)}
    </div>
  );
}
