/* eslint-disable @typescript-eslint/no-explicit-any */
export async function api(path: string, opts: RequestInit = {}): Promise<any> {
  const res = await fetch(path, { ...opts, headers: { "Content-Type": "application/json", ...(opts.headers || {}) } });
  let data: any = null;
  try { data = await res.json(); } catch {}
  if (!res.ok) throw new Error(data?.error?.message || `Request failed (${res.status})`);
  return data;
}
export const today = () => new Date().toISOString().slice(0, 10);
export const inp = "rounded border border-slate-300 bg-white px-2 py-1 text-sm";
export const btn = "rounded bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50";
export const btn2 = "rounded border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium hover:bg-slate-100 disabled:opacity-50";
export const card = "rounded-lg border border-slate-200 bg-white p-4 shadow-sm";
export function Badge({ text, tone }: { text: string; tone?: string }) {
  const c = tone === "red" ? "bg-red-100 text-red-700" : tone === "green" ? "bg-green-100 text-green-700"
    : tone === "amber" ? "bg-amber-100 text-amber-800" : tone === "blue" ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-700";
  return <span className={`rounded px-2 py-0.5 text-xs font-medium ${c}`}>{text}</span>;
}
export function riskReasons(i: any): string[] {
  const r: string[] = [];
  if (["done", "dropped"].includes(i.status)) return r;
  if (i.due_date && i.due_date < today()) r.push("Overdue");
  if (i.status === "blocked") r.push("Blocked");
  if (i.carry_count >= 1) r.push(`Carried forward ${i.carry_count}x`);
  if (!i.due_date) r.push("No due date");
  if (!i.owner_id) r.push("No owner");
  return r;
}
