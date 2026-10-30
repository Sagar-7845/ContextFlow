/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api, Badge, btn, btn2, card, inp } from "@/lib/client";

export default function MeetingDetail() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [notes, setNotes] = useState("");
  const [draft, setDraft] = useState<any>(null);
  const [briefUser, setBriefUser] = useState("");
  const [brief, setBrief] = useState<any>(null);
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    try {
      const [d, u] = await Promise.all([api(`/api/meetings/${id}`), api("/api/users")]);
      setData(d); setUsers(u.users);
      setNotes((n) => n || d.meeting.raw_notes || "");
    } catch (e: any) { setErr(e.message); }
  }, [id]);
  useEffect(() => { load(); }, [load]);

  async function run(name: string, fn: () => Promise<void>) {
    setErr(""); setBusy(name);
    try { await fn(); } catch (e: any) { setErr(e.message); }
    setBusy("");
  }
  const recap = () => run("recap", async () => {
    const r = await api(`/api/meetings/${id}/recap`, { method: "POST", body: JSON.stringify({ raw_notes: notes }) });
    setDraft(r.draft);
  });
  const save = () => run("save", async () => {
    await api(`/api/meetings/${id}/recap/save`, {
      method: "POST",
      body: JSON.stringify({
        summary: draft.summary,
        decisions: draft.decisions.filter((d: any) => d.content.trim()),
        action_items: draft.action_items.filter((a: any) => a.title.trim()).map((a: any) => ({
          title: a.title, owner_id: a.owner_id || null, due_date: a.due_date || null,
          source_quote: a.source_quote, quote_verified: a.quote_verified, ai_generated: true,
        })),
      }),
    });
    setDraft(null); await load();
  });
  const getBrief = () => run("brief", async () => {
    setBrief(await api(`/api/meetings/${id}/brief` + (briefUser ? `?user_id=${briefUser}` : "")));
  });
  const patchMeeting = (body: any) => run("patch", async () => {
    await api(`/api/meetings/${id}`, { method: "PATCH", body: JSON.stringify(body) }); await load();
  });

  if (!data) return <p>{err || "Loading..."}</p>;
  const { meeting, participants, decisions, items } = data;
  const setItem = (idx: number, patch: any) =>
    setDraft((d: any) => ({ ...d, action_items: d.action_items.map((a: any, i: number) => (i === idx ? { ...a, ...patch } : a)) }));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold">{meeting.title}</h1>
        <Badge text={meeting.type} />
        <select className={inp} value={meeting.status} onChange={(e) => patchMeeting({ status: e.target.value })}>
          <option value="planned">planned</option><option value="held">held</option><option value="closed">closed</option>
        </select>
      </div>
      {err && <p className="rounded bg-red-50 p-3 text-sm text-red-700">{err}</p>}

      <div className="grid gap-4 md:grid-cols-2">
        <div className={card}>
          <h2 className="mb-2 font-semibold">Agenda</h2>
          <ul className="list-disc space-y-1 pl-5 text-sm">
            {meeting.agenda.length === 0 && <li className="list-none text-slate-500">No agenda items.</li>}
            {meeting.agenda.map((a: string, i: number) => <li key={i}>{a}</li>)}
          </ul>
        </div>
        <div className={card}>
          <h2 className="mb-2 font-semibold">Participants</h2>
          {participants.length === 0 && <p className="text-sm text-slate-500">None added.</p>}
          {participants.map((p: any) => (
            <div key={p.user_id} className="mb-1 flex items-center justify-between text-sm">
              <span>{p.user?.name}</span>
              <select className={inp} value={p.attendance}
                onChange={(e) => patchMeeting({ attendance: [{ user_id: p.user_id, attendance: e.target.value }] })}>
                {["invited", "attended", "missed", "no_response"].map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          ))}
        </div>
      </div>

      <div className={`${card} space-y-2`}>
        <h2 className="font-semibold">Raw notes to AI recap</h2>
        <textarea className={`${inp} w-full`} rows={6} value={notes} onChange={(e) => setNotes(e.target.value)}
          placeholder="Paste messy notes, chat, or a transcript here..." />
        <button className={btn} disabled={busy === "recap" || notes.trim().length < 20} onClick={recap}>
          {busy === "recap" ? "AI is working (up to 40s)..." : "Generate structured recap"}
        </button>
        <p className="text-xs text-slate-500">AI output is a draft. Review and edit before saving.</p>
      </div>

      {draft && (
        <div className={`${card} space-y-3 border-indigo-300`}>
          <h2 className="font-semibold">Draft recap (review before saving)</h2>
          <textarea className={`${inp} w-full`} rows={4} value={draft.summary} onChange={(e) => setDraft({ ...draft, summary: e.target.value })} />
          <h3 className="text-sm font-semibold">Decisions</h3>
          {draft.decisions.map((d: any, i: number) => (
            <div key={i} className="flex items-center gap-2">
              <input className={`${inp} flex-1`} value={d.content}
                onChange={(e) => setDraft({ ...draft, decisions: draft.decisions.map((x: any, j: number) => (j === i ? { ...x, content: e.target.value } : x)) })} />
              <Badge text={d.quote_verified ? "quote verified" : "quote unverified"} tone={d.quote_verified ? "green" : "amber"} />
              <button className={btn2} onClick={() => setDraft({ ...draft, decisions: draft.decisions.filter((_: any, j: number) => j !== i) })}>Remove</button>
            </div>
          ))}
          <h3 className="text-sm font-semibold">Action items</h3>
          {draft.action_items.map((a: any, i: number) => (
            <div key={i} className="space-y-1 rounded border border-slate-200 p-2">
              <div className="flex flex-wrap items-center gap-2">
                <input className={`${inp} flex-1`} value={a.title} onChange={(e) => setItem(i, { title: e.target.value })} />
                <select className={inp} value={a.owner_id ?? ""} onChange={(e) => setItem(i, { owner_id: e.target.value || null })}>
                  <option value="">Unassigned</option>
                  {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
                <input type="date" className={inp} value={a.due_date ?? ""} onChange={(e) => setItem(i, { due_date: e.target.value || null })} />
                <button className={btn2} onClick={() => setDraft({ ...draft, action_items: draft.action_items.filter((_: any, j: number) => j !== i) })}>Remove</button>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <Badge text={a.quote_verified ? "quote verified" : "quote unverified"} tone={a.quote_verified ? "green" : "amber"} />
                {a.owner_unmatched && <Badge text={`Owner "${a.owner_name}" not matched, pick one`} tone="red" />}
                {a.source_quote && <span className="italic">From notes: {a.source_quote}</span>}
              </div>
            </div>
          ))}
          <div className="flex gap-2">
            <button className={btn} disabled={busy === "save"} onClick={save}>{busy === "save" ? "Saving..." : "Confirm and save"}</button>
            <button className={btn2} onClick={() => setDraft(null)}>Discard</button>
          </div>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <div className={card}>
          <h2 className="mb-2 font-semibold">Summary and decisions</h2>
          <p className="text-sm">{meeting.summary || "No recap saved yet."}</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
            {decisions.map((d: any) => <li key={d.id}>{d.content}</li>)}
          </ul>
        </div>
        <div className={card}>
          <h2 className="mb-2 font-semibold">Action items in this meeting</h2>
          {items.length === 0 && <p className="text-sm text-slate-500">None yet.</p>}
          <ul className="space-y-1 text-sm">
            {items.map((i: any) => (
              <li key={i.id} className="flex flex-wrap items-center gap-2">
                {i.title} <span className="text-slate-500">{i.owner?.name ?? "unassigned"}</span>
                <Badge text={i.status} tone={["done", "dropped"].includes(i.status) ? "green" : "blue"} />
                {i.carry_count > 0 && <Badge text={`carried ${i.carry_count}x`} tone="amber" />}
              </li>
            ))}
          </ul>
          <a href="/items" className="mt-2 inline-block text-sm text-indigo-700">Manage on the items page</a>
        </div>
      </div>

      <div className={`${card} space-y-2`}>
        <h2 className="font-semibold">Catch-up brief</h2>
        <div className="flex flex-wrap gap-2">
          <select className={inp} value={briefUser} onChange={(e) => setBriefUser(e.target.value)}>
            <option value="">General brief</option>
            {users.map((u) => <option key={u.id} value={u.id}>For {u.name}</option>)}
          </select>
          <button className={btn} disabled={busy === "brief"} onClick={getBrief}>{busy === "brief" ? "Writing..." : "Generate brief"}</button>
        </div>
        {brief && (
          <div className="text-sm">
            <p>{brief.brief}</p>
            {brief.your_actions?.length > 0 && (
              <ul className="mt-2 list-disc pl-5">{brief.your_actions.map((a: string, i: number) => <li key={i}>{a}</li>)}</ul>
            )}
            <p className="mt-1 text-xs text-slate-500">Source: {brief.source === "ai" ? "AI" : "automatic fallback (AI unavailable)"}</p>
          </div>
        )}
      </div>
    </div>
  );
}
