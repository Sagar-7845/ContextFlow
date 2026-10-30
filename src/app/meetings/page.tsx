/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, Badge, btn, card, inp } from "@/lib/client";

export default function MeetingsPage() {
  const router = useRouter();
  const [meetings, setMeetings] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [title, setTitle] = useState("");
  const [type, setType] = useState("meeting");
  const [prev, setPrev] = useState("");
  const [agenda, setAgenda] = useState("");
  const [pids, setPids] = useState<string[]>([]);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    Promise.all([api("/api/meetings"), api("/api/users")])
      .then(([m, u]) => { setMeetings(m.meetings); setUsers(u.users); })
      .catch((e) => setErr(e.message));
  }, []);

  async function create() {
    setErr(""); setBusy(true);
    try {
      const r = await api("/api/meetings", {
        method: "POST",
        body: JSON.stringify({
          title, type, previous_meeting_id: prev || null, participant_ids: pids,
          agenda: agenda.split("\n").map((s) => s.trim()).filter(Boolean),
        }),
      });
      router.push(`/meetings/${r.meeting.id}`);
    } catch (e: any) { setErr(e.message); setBusy(false); }
  }
  const toggle = (id: string) => setPids((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Meetings and Work Transfers</h1>
      <div className={`${card} space-y-3`}>
        <h2 className="font-semibold">New meeting</h2>
        <div className="flex flex-wrap gap-2">
          <input className={`${inp} flex-1`} placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <select className={inp} value={type} onChange={(e) => setType(e.target.value)}>
            <option value="meeting">Meeting</option><option value="work_transfer">Work transfer</option>
          </select>
        </div>
        <div>
          <label className="text-sm font-medium">Continue from previous meeting (Agenda Autopilot carries over open items)</label>
          <select className={`${inp} mt-1 block w-full`} value={prev} onChange={(e) => setPrev(e.target.value)}>
            <option value="">None (fresh meeting)</option>
            {meetings.map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}
          </select>
        </div>
        <div>
          <label className="text-sm font-medium">Participants {prev && "(defaults to the previous meeting if none selected)"}</label>
          <div className="mt-1 flex flex-wrap gap-3 text-sm">
            {users.map((u) => (
              <label key={u.id} className="flex items-center gap-1">
                <input type="checkbox" checked={pids.includes(u.id)} onChange={() => toggle(u.id)} /> {u.name}
              </label>
            ))}
          </div>
        </div>
        <textarea className={`${inp} w-full`} rows={3} placeholder="Extra agenda items, one per line" value={agenda} onChange={(e) => setAgenda(e.target.value)} />
        {err && <p className="text-sm text-red-600">{err}</p>}
        <button className={btn} disabled={busy} onClick={create}>{busy ? "Creating..." : "Create"}</button>
      </div>
      <div className="space-y-2">
        {meetings.map((m) => (
          <div key={m.id} className={`${card} flex items-center justify-between`}>
            <Link href={`/meetings/${m.id}`} className="font-medium text-indigo-700 hover:underline">{m.title}</Link>
            <div className="flex gap-2"><Badge text={m.type} /><Badge text={m.status} tone={m.status === "closed" ? "green" : "blue"} /></div>
          </div>
        ))}
      </div>
    </div>
  );
}
