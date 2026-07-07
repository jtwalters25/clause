import Link from "next/link";
import report from "@/domain/clause/eval-report.json";

export const metadata = {
  title: "Clause — model quality",
  description: "Automated Canary Analysis: accuracy, BLOCK recall, and the ship/block gate over a labeled benchmark.",
};

function Cell({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="brutal-box p-4">
      <div className="font-mono text-xs font-bold uppercase tracking-widest text-ink/60">{label}</div>
      <div className="mt-1 font-mono text-3xl font-bold tabular-nums">{value}</div>
      {sub && <div className="mt-0.5 font-mono text-xs text-ink/50">{sub}</div>}
    </div>
  );
}

export default function EvalPage() {
  const { accuracy, blockPrecision, blockRecall, churn, cases, classBreakdown, gate, thresholds, generatedAt } = report;
  return (
    <main className="mx-auto max-w-4xl px-5 py-10">
      <header className="brutal-box shadow-brutal-lg">
        <div className="flex items-center justify-between border-b-3 border-ink bg-violet px-5 py-3">
          <span className="font-mono text-xl font-bold uppercase tracking-tighter text-white">▓ Model quality</span>
          <Link href="/" className="brutal-tag border-white bg-acid text-ink">← back</Link>
        </div>
        <p className="px-5 py-4 font-medium leading-snug">
          Every change to the embedding model or scoring thresholds is scored against a frozen,
          labeled benchmark and gated <span className="font-bold">before it ships</span> — a
          Kayenta-style automated canary. A candidate that regresses BLOCK recall or accuracy, or
          churns too many verdicts, fails the gate and blocks the merge.
        </p>
      </header>

      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Cell label="accuracy" value={accuracy.toFixed(2)} sub={`${cases} labeled clauses`} />
        <Cell label="BLOCK recall" value={blockRecall.toFixed(2)} sub="don't miss dangerous clauses" />
        <Cell label="BLOCK precision" value={blockPrecision.toFixed(2)} sub="don't over-block" />
        <Cell label="verdict churn" value={`${Math.round(churn * 100)}%`} sub="vs committed baseline" />
        <Cell label="thresholds" value={`${thresholds.hit}/${thresholds.escalate}`} sub="hit / escalate" />
        <Cell label="gate" value={gate.pass ? "PASS" : "FAIL"} sub={gate.pass ? "safe to ship" : "blocked"} />
      </div>

      <div className="mt-6 brutal-box p-4 font-mono text-sm">
        <span className="font-bold">Benchmark mix:</span>{" "}
        <span className="bg-magenta px-1.5 text-white">{classBreakdown.BLOCK} BLOCK</span>{" "}
        <span className="bg-acid px-1.5 text-ink">{classBreakdown.REVIEW} REVIEW</span>{" "}
        <span className="bg-mint px-1.5 text-ink">{classBreakdown.STANDARD} STANDARD</span>
        <span className="ml-1 text-ink/50"> · paraphrased, not verbatim (a verbatim set self-matches at 1.0 and can&apos;t detect regressions)</span>
      </div>

      <p className="mt-4 font-mono text-xs text-ink/40">
        Evaluated {generatedAt} · benchmark {report.benchmarkVersion} · model {report.embedModel}
      </p>
    </main>
  );
}
