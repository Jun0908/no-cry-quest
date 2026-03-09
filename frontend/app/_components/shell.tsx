"use client";

import Link from "next/link";
import { useMemo } from "react";
import { usePathname } from "next/navigation";

const nav = [
  { href: "/zanei", label: "Zanei (Game)" },
  { href: "/final", label: "Final (Debug)" },
  { href: "/chat", label: "Chat" },
  { href: "/quest", label: "Quest" },
  { href: "/unlock", label: "Unlock" },
  { href: "/payout", label: "Payout" },
];

export function AppShell({ title, children }: { title: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const date = useMemo(() => new Date().toLocaleString(), []);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#f6eee4_0%,#f4f6f9_45%,#e8eef5_100%)] text-slate-900">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 pt-6 pb-4">
        <Link href="/" className="text-lg font-semibold tracking-tight text-slate-900">
          No-Cry Quest
        </Link>
        <div className="text-xs text-slate-500">synced {date}</div>
      </header>
      <div className="mx-auto mb-6 flex w-full max-w-6xl gap-2 px-6">
        {nav.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-full border px-4 py-2 text-sm transition ${active ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300 bg-white text-slate-700 hover:border-slate-500"
                }`}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
      <main className="mx-auto w-full max-w-6xl px-6 pb-10">
        <h1 className="mb-5 text-3xl font-semibold tracking-tight">{title}</h1>
        {children}
      </main>
    </div>
  );
}

export function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-[0_10px_30px_rgba(15,23,42,0.08)] backdrop-blur">
      <h2 className="mb-3 text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}

export function Pill({ ok, text }: { ok: boolean; text: string }) {
  return (
    <span className={`rounded-full px-2 py-1 text-xs font-medium ${ok ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
      {text}
    </span>
  );
}
