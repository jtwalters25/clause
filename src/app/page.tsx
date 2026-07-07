"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Verdict, VerdictLevel } from "@/engine/types";
import { EXAMPLES } from "@/domain/clause/examples";
import fixtures from "@/domain/clause/fixtures.json";
import evalReport from "@/domain/clause/eval-report.json";

/** Verdict → brutalist swatch. Severity semantics: mint=safe, acid=caution, magenta=danger. */
const LEVEL: Record<VerdictLevel, { bg: string; fg: string; dot: string }> = {
  STANDARD: { bg: "bg-mint", fg: "text-ink", dot: "bg-mint" },
  REVIEW: { bg: "bg-acid", fg: "text-ink", dot: "bg-acid" },
  BLOCK: { bg: "bg-magenta", fg: "text-white", dot: "bg-magenta" },
};

const FIXTURES = fixtures as Record<string, Verdict>;
const THRESH = evalReport.thresholds; // { hit, escalate } — the calibrated cut-lines

export default function Home() {
  const [text, setText] = useState("");
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** Load an example: serve its precomputed fixture instantly if present,
   *  otherwise fall back to running it live. */
  function loadExample(id: string) {
    const ex = EXAMPLES.find((e) => e.id === id);
    if (!ex) return;
    setText(ex.text);
    setError(null);
    if (FIXTURES[id]) {
      setVerdict(FIXTURES[id]); // instant, no API call
    } else {
      setVerdict(null);
      run(ex.text);
    }
  }

  async function run(input = text) {
    setLoading(true);
    setError(null);
    setVerdict(null);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: input }),
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

  // Per-level tallies for the rollup strip.
  const counts = useMemo(() => {
    const c: Record<VerdictLevel, number> = { STANDARD: 0, REVIEW: 0, BLOCK: 0 };
    verdict?.chunks.forEach((k) => (c[k.level] += 1));
    return c;
  }, [verdict]);

  return (
    <main className="mx-auto max-w-4xl px-5 py-10">
      {/* ── Masthead ─────────────────────────────────────────── */}
      <header className="brutal-box shadow-brutal-lg">
        <div className="flex items-center justify-between border-b-3 border-ink bg-violet px-5 py-3">
          <span className="font-mono text-2xl font-bold uppercase tracking-tighter text-white">
            ▓ Clause
          </span>
          <span className="brutal-tag border-white bg-acid text-ink">
            contract·intel
          </span>
        </div>
        <p className="px-5 py-4 text-lg font-medium leading-snug">
          Paste a contract. Each clause is matched against your playbook and scored{" "}
          <Chip level="STANDARD" /> <Chip level="REVIEW" /> <Chip level="BLOCK" />{" "}
          — with the closest known clause as evidence.
        </p>
      </header>

      {/* ── Model-quality strip — the canary story, on screen ── */}
      <Link
        href="/eval"
        className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-1 border-3 border-ink bg-white px-4 py-2 font-mono text-sm shadow-brutal-sm transition-transform hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-brutal"
      >
        <span className="font-bold uppercase tracking-widest text-ink/70">Model quality</span>
        <span>accuracy <b className="tabular-nums">{evalReport.accuracy.toFixed(2)}</b></span>
        <span>BLOCK recall <b className="tabular-nums">{evalReport.blockRecall.toFixed(2)}</b></span>
        <span className={`px-1.5 ${evalReport.gate.pass ? "bg-mint" : "bg-magenta text-white"}`}>
          canary {evalReport.gate.pass ? "PASS" : "FAIL"}
        </span>
        <span className="ml-auto text-violet">gated before ship →</span>
      </Link>

      {/* ── Examples ─────────────────────────────────────────── */}
      <div className="mt-8 flex flex-wrap items-center gap-3">
        <span className="font-mono text-xs font-bold uppercase tracking-widest text-ink/60">
          Try →
        </span>
        {EXAMPLES.map((ex) => (
          <button
            key={ex.id}
            onClick={() => loadExample(ex.id)}
            className="border-3 border-ink bg-white px-3 py-1.5 font-mono text-sm font-bold shadow-brutal-sm transition-transform hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-brutal active:translate-x-0 active:translate-y-0 active:shadow-none"
          >
            {ex.title}
            <span className={`ml-2 inline-block h-2.5 w-2.5 ${LEVEL[ex.expected].dot} border border-ink`} />
          </button>
        ))}
      </div>

      {/* ── Input ────────────────────────────────────────────── */}
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="…or paste your own contract. Clauses are detected by their numbering (1., 1.2, (a), Section 3…)."
        className="mt-4 h-64 w-full resize-none border-3 border-ink bg-white p-4 font-mono text-sm shadow-brutal outline-none placeholder:text-ink/40 focus:shadow-brutal-violet"
      />

      <div className="mt-5 flex items-center gap-4">
        <button
          onClick={() => run()}
          disabled={loading || text.trim().length < 20}
          className="border-3 border-ink bg-acid px-6 py-3 font-mono text-base font-bold uppercase tracking-wide shadow-brutal transition-transform hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-brutal-lg active:translate-x-0 active:translate-y-0 active:shadow-none disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:translate-x-0 disabled:hover:translate-y-0 disabled:hover:shadow-brutal"
        >
          {loading ? "Analyzing…" : "▶ Analyze"}
        </button>
        {text.trim().length > 0 && text.trim().length < 20 && (
          <span className="font-mono text-xs text-ink/50">min 20 chars</span>
        )}
      </div>

      {error && (
        <div className="mt-6 border-3 border-ink bg-magenta px-4 py-3 font-mono text-sm font-bold text-white shadow-brutal">
          ✕ {error}
        </div>
      )}

      {/* ── Verdict ──────────────────────────────────────────── */}
      {verdict && (
        <section className="mt-10">
          {/* Rollup strip */}
          <div className="brutal-box shadow-brutal-lg">
            <div className={`flex flex-wrap items-center justify-between gap-3 border-b-3 border-ink px-5 py-4 ${LEVEL[verdict.level].bg} ${LEVEL[verdict.level].fg}`}>
              <div className="flex items-baseline gap-3">
                <span className="font-mono text-xs font-bold uppercase tracking-widest opacity-70">
                  document verdict
                </span>
                <span className="font-mono text-3xl font-bold uppercase tracking-tight">
                  {verdict.level}
                </span>
              </div>
              <div className="flex gap-2">
                <Tally label="STD" n={counts.STANDARD} level="STANDARD" />
                <Tally label="REV" n={counts.REVIEW} level="REVIEW" />
                <Tally label="BLK" n={counts.BLOCK} level="BLOCK" />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-1 px-5 py-3 font-mono text-xs text-ink/60">
              <span>{verdict.chunks.length} clauses analyzed</span>
              <span className="hidden sm:inline">·</span>
              <span>
                config <span className="font-bold text-violet">{verdict.configId}</span>
              </span>
              <span className="hidden sm:inline">·</span>
              <span>model + thresholds + registry, hashed for reproducibility</span>
            </div>
          </div>

          {/* Per-clause cards */}
          <ul className="mt-6 space-y-5">
            {verdict.chunks.map((c) => {
              const ev = c.evidence[0];
              const sim = ev?.similarity ?? 0;
              const pct = Math.max(0, Math.min(100, Math.round(sim * 100)));
              return (
                <li key={c.queryIndex} className="brutal-box">
                  <div className="flex items-stretch">
                    {/* severity spine */}
                    <div className={`w-2 shrink-0 border-r-3 border-ink ${LEVEL[c.level].bg}`} />
                    <div className="min-w-0 flex-1 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-mono text-xs font-bold uppercase tracking-widest text-ink/50">
                          clause #{c.queryIndex + 1}
                        </span>
                        <span className={`brutal-tag ${LEVEL[c.level].bg} ${LEVEL[c.level].fg}`}>
                          {c.level}
                        </span>
                      </div>

                      <p className="mt-3 text-sm font-medium leading-snug">{c.rationale}</p>

                      {ev && (
                        <div className="mt-4 border-3 border-ink bg-paper p-3">
                          {/* cosine meter */}
                          <div className="flex items-center gap-3">
                            <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">
                              cosine
                            </span>
                            <div className="relative h-3 flex-1 border-2 border-ink bg-white">
                              <div
                                className={`h-full ${LEVEL[c.level].bg}`}
                                style={{ width: `${pct}%` }}
                              />
                              {/* threshold cut-lines: below hit = novel/REVIEW, above escalate = strong */}
                              <div className="absolute inset-y-0 w-0.5 bg-ink/70" style={{ left: `${THRESH.hit * 100}%` }} />
                              <div className="absolute inset-y-0 w-0.5 bg-ink" style={{ left: `${THRESH.escalate * 100}%` }} />
                            </div>
                            <span className="font-mono text-sm font-bold tabular-nums">
                              {sim.toFixed(2)}
                            </span>
                            <span className="brutal-tag border-2 bg-white px-1.5 py-0 text-[10px]">
                              {ev.entry.label}
                            </span>
                          </div>
                          <div className="mt-1.5 flex gap-4 pl-[3.2rem] font-mono text-[10px] text-ink/45">
                            <span>▏hit {THRESH.hit}</span>
                            <span>▏escalate {THRESH.escalate}</span>
                            <span className="text-ink/60">rule: closest is &ldquo;{ev.entry.label}&rdquo; {sim >= THRESH.escalate ? "(strong)" : sim >= THRESH.hit ? "(match)" : "(below hit → novel)"} → {c.level}</span>
                          </div>
                          <p className="mt-3 font-mono text-xs leading-relaxed text-ink/70">
                            <span className="font-bold text-ink">closest ▸ </span>
                            {ev.entry.content.slice(0, 160)}
                            {ev.entry.content.length > 160 ? "…" : ""}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <footer className="mt-16 border-t-3 border-ink pt-4 font-mono text-xs text-ink/50">
        similarity engine · pgvector HNSW · calibrated thresholds · kayenta-style canary gate
      </footer>
    </main>
  );
}

/** Inline colored verdict word used in the intro sentence. */
function Chip({ level }: { level: VerdictLevel }) {
  return (
    <span className={`brutal-tag ${LEVEL[level].bg} ${LEVEL[level].fg} px-1.5 py-0 text-[11px]`}>
      {level}
    </span>
  );
}

/** Little counter in the rollup header. */
function Tally({ label, n, level }: { label: string; n: number; level: VerdictLevel }) {
  return (
    <span className={`brutal-tag border-ink bg-white text-ink`}>
      <span className={`mr-1.5 inline-block h-2.5 w-2.5 border border-ink ${LEVEL[level].dot}`} />
      {label} {n}
    </span>
  );
}
