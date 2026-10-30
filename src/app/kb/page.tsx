/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useEffect, useState } from "react";
import { api, Badge, btn, card, inp } from "@/lib/client";

export default function KbPage() {
  const [docs, setDocs] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [res, setRes] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const load = () => api("/api/kb").then((d) => setDocs(d.documents)).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, []);

  async function ask() {
    setBusy(true); setErr(""); setRes(null);
    try { setRes(await api("/api/kb/ask", { method: "POST", body: JSON.stringify({ question: q }) })); }
    catch (e: any) { setErr(e.message); }
    setBusy(false);
  }
  async function add() {
    setErr("");
    try { await api("/api/kb", { method: "POST", body: JSON.stringify({ title, content }) }); setTitle(""); setContent(""); load(); }
    catch (e: any) { setErr(e.message); }
  }
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">Knowledge Base</h1>
      <div className={`${card} space-y-2`}>
        <h2 className="font-semibold">Ask the knowledge base</h2>
        <div className="flex gap-2">
          <input className={`${inp} flex-1`} placeholder="e.g. Why is QA blocked and what is the policy for test data?" value={q} onChange={(e) => setQ(e.target.value)} />
          <button className={btn} disabled={busy || q.trim().length < 5} onClick={ask}>{busy ? "Thinking..." : "Ask"}</button>
        </div>
        {res && (
          <div className="text-sm">
            <p>{res.answer}</p>
            <ul className="mt-2 space-y-1">
              {res.sources.map((s: any) => (
                <li key={s.id}><Badge text={s.type} tone="blue" /> <b>{s.title}</b> {s.excerpt && <span className="text-slate-500">- {s.excerpt}</span>}</li>
              ))}
            </ul>
          </div>
        )}
        <p className="text-xs text-slate-500">Answers use only stored documents, past meetings and closed outcomes, and cite their sources.</p>
      </div>
      {err && <p className="rounded bg-red-50 p-3 text-sm text-red-700">{err}</p>}
      <div className={`${card} space-y-2`}>
        <h2 className="font-semibold">Add a document</h2>
        <input className={`${inp} w-full`} placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
        <textarea className={`${inp} w-full`} rows={3} placeholder="Content" value={content} onChange={(e) => setContent(e.target.value)} />
        <button className={btn} onClick={add}>Add</button>
      </div>
      <div className="space-y-2">
        {docs.map((d) => (
          <div key={d.id} className={card}>
            <div className="flex items-center gap-2"><b>{d.title}</b><Badge text={d.source_type} /></div>
            <p className="mt-1 text-sm text-slate-600">{d.content.slice(0, 220)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
