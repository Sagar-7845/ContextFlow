import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "ContextFlow",
  description: "Never lose context when work changes hands",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900">
        <nav className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-5xl items-center gap-6 px-4 py-3">
            <Link href="/" className="text-lg font-bold text-indigo-700">ContextFlow</Link>
            <Link href="/meetings" className="text-sm hover:text-indigo-700">Meetings</Link>
            <Link href="/items" className="text-sm hover:text-indigo-700">Action Items</Link>
            <Link href="/logs" className="text-sm hover:text-indigo-700">Logs</Link>
          </div>
        </nav>
        <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
