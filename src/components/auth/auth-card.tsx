import { Sparkles } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

export function AuthCard({
  title,
  description,
  error,
  message,
  children,
  footer,
}: {
  title: string;
  description: string;
  error?: string;
  message?: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-12">
      <div className="w-full max-w-md">
        <Link href="/" className="mb-8 flex items-center justify-center gap-3 text-white">
          <span className="flex size-10 items-center justify-center rounded-xl bg-indigo-500 shadow-lg shadow-indigo-950/40">
            <Sparkles className="size-5" />
          </span>
          <span className="text-lg font-extrabold tracking-wide">BIZFLOW AI</span>
        </Link>
        <section className="rounded-2xl border border-slate-800 bg-white p-6 shadow-2xl sm:p-8">
          <h1 className="text-2xl font-extrabold text-slate-950">{title}</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
          {error ? (
            <p className="mt-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
              {error}
            </p>
          ) : null}
          {message ? (
            <p className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
              {message}
            </p>
          ) : null}
          <div className="mt-6">{children}</div>
          <div className="mt-6 border-t border-slate-100 pt-5 text-center text-sm text-slate-500">
            {footer}
          </div>
        </section>
      </div>
    </main>
  );
}

export const authInputClassName =
  "mt-1.5 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100";

export const authButtonClassName =
  "mt-2 inline-flex h-11 w-full items-center justify-center rounded-lg bg-indigo-600 px-4 text-sm font-bold text-white transition hover:bg-indigo-700";
