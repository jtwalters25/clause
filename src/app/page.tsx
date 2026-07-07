"use client";

import { useState } from "react";
import type { Verdict, VerdictLevel } from "@/engine/types";

const LEVEL_STYLE: Record<VerdictLevel, string> = {
  STANDARD: "bg-teal-100 text-teal-800 border-teal-300",
  REVIEW: "bg-amber-100 text-amber-800 border-amber-300",
  BLOCK: "bg-red-100 text-red-800 border-red-300",
};

export default function Home() {
  const [text, setText] = useState("");
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setLoading(true);
    setError(null);
    setVerdict(null);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "failed");
      setVerdict(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-3xl font-semibold tracking-tight">Clause</h1>
      <p className="mt-2 text-neutral-600">
        Paste a contract. Each clause is matched against your playbook and scored{" "}
        <span className="font-medium text-teal-700">STANDARD</span> /{" "}
        <span className="font-medium text-amber-700">REVIEW</span> /{" "}
        <span className="font-medium text-red-700">BLOCK</span> — with the closest known clause as evidence.
      </p>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Paste contract text… clauses are detected by their numbering (1., 1.2, (a), Section 3…)."
        className="mt-6 h-64 w-full rounded-lg border border-neutral-300 p-4 font-mono text-sm focus:border-teal-500 focus:outline-none"
      />

      <button
        onClick={run}
        disabled={loading || text.trim().length < 20}
        className="mt-4 rounded-lg bg-teal-600 px-5 py-2.5 font-medium text-white disabled:opacity-40"
      >
        {loading ? "Analyzing…" : "Analyze"}
      </button>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      {verdict && (
        <section className="mt-8">
          <div className="flex items-center gap-3">
            <span className={`rounded-md border px-3 py-1 text-sm font-semibold ${LEVEL_STYLE[verdict.level]}`}>
              {verdict.level}
            </span>
            <span className="text-sm text-neutral-500">
              {verdict.chunks.length} clauses · config {verdict.configId}
            </span>
          </div>

          <ul className="mt-6 space-y-4">
            {verdict.chunks.map((c) => (
              <li key={c.queryIndex} className="rounded-lg border border-neutral-200 bg-white p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-neutral-500">clause #{c.queryIndex + 1}</span>
                  <span className={`rounded border px-2 py-0.5 text-xs font-semibold ${LEVEL_STYLE[c.level]}`}>
                    {c.level}
                  </span>
                </div>
                <p className="mt-2 text-sm text-neutral-700">{c.rationale}</p>
                {c.evidence[0] && (
                  <p className="mt-2 border-l-2 border-neutral-200 pl-3 text-xs text-neutral-500">
                    closest: <span className="font-medium">{c.evidence[0].entry.label}</span> ·{" "}
                    {c.evidence[0].similarity.toFixed(2)} cosine — {c.evidence[0].entry.content.slice(0, 120)}…
                  </p>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
