/**
 * Automated Canary Analysis  (Kayenta / Spinnaker, applied to a scoring model).
 *
 * Netflix's Kayenta promotes a deploy only if a *canary* is statistically
 * indistinguishable-or-better than the *baseline* on live-comparable signals.
 * Here the "deploy" is a change to the engine config (embedding model or
 * thresholds), and the signals are verdict quality on a frozen benchmark.
 *
 * Gate: a candidate PASSES only if, versus the current baseline config,
 *   1. BLOCK recall does not regress beyond REGRESSION_TOLERANCE  (don't start
 *      missing dangerous clauses), and
 *   2. overall accuracy does not regress beyond REGRESSION_TOLERANCE, and
 *   3. the net verdict churn (cases whose verdict flipped) is within CHURN_MAX.
 *
 * Run in CI on any PR that touches config → a red gate blocks the merge. That is
 * the whole idea of automated canary analysis, scaled down to one service.
 *
 * This file is domain-agnostic: it takes a `score` closure so Clause supplies
 * its VerdictPolicy without the engine importing anything domain-specific.
 */
import type { EngineConfig, Match, VerdictLevel } from "../types";
import type { Benchmark, CaseResult, EvalReport } from "./types";

const REGRESSION_TOLERANCE = 0.02; // 2 percentage points
const CHURN_MAX = 0.15; // ≤15% of cases may change verdict without review

/** Scores every benchmark case under one config. Injected by the domain. */
export type ScoreFn = (
  caseText: string,
  config: EngineConfig,
) => Promise<{ actual: VerdictLevel; matches: Match[] }>;

function precisionRecall(results: CaseResult[], cls: VerdictLevel) {
  const tp = results.filter((r) => r.actual === cls && r.expected === cls).length;
  const fp = results.filter((r) => r.actual === cls && r.expected !== cls).length;
  const fn = results.filter((r) => r.actual !== cls && r.expected === cls).length;
  return {
    precision: tp + fp ? tp / (tp + fp) : 1,
    recall: tp + fn ? tp / (tp + fn) : 1,
  };
}

export async function evaluate(
  config: EngineConfig,
  benchmark: Benchmark,
  score: ScoreFn,
): Promise<EvalReport> {
  const results: CaseResult[] = [];
  for (const c of benchmark.cases) {
    const { actual } = await score(c.text, config);
    results.push({ id: c.id, expected: c.expected, actual, correct: actual === c.expected });
  }
  const pr = precisionRecall(results, "BLOCK");
  return {
    config,
    n: results.length,
    accuracy: results.filter((r) => r.correct).length / (results.length || 1),
    blockPrecision: pr.precision,
    blockRecall: pr.recall,
    results,
  };
}

export interface CanaryVerdict {
  pass: boolean;
  reasons: string[];
  baseline: EvalReport;
  candidate: EvalReport;
  churn: number;
}

/** The gate. Compares candidate vs baseline and returns a pass/fail with reasons. */
export function analyzeCanary(baseline: EvalReport, candidate: EvalReport): CanaryVerdict {
  const reasons: string[] = [];

  const accDrop = baseline.accuracy - candidate.accuracy;
  if (accDrop > REGRESSION_TOLERANCE)
    reasons.push(`accuracy regressed ${(accDrop * 100).toFixed(1)}pp (> ${REGRESSION_TOLERANCE * 100}pp)`);

  const recallDrop = baseline.blockRecall - candidate.blockRecall;
  if (recallDrop > REGRESSION_TOLERANCE)
    reasons.push(`BLOCK recall regressed ${(recallDrop * 100).toFixed(1)}pp — missing dangerous clauses`);

  const flipped = candidate.results.filter(
    (r) => baseline.results.find((b) => b.id === r.id)?.actual !== r.actual,
  ).length;
  const churn = flipped / (candidate.n || 1);
  if (churn > CHURN_MAX)
    reasons.push(`verdict churn ${(churn * 100).toFixed(1)}% (> ${CHURN_MAX * 100}%) — too many verdicts changed`);

  return { pass: reasons.length === 0, reasons, baseline, candidate, churn };
}

/**
 * CLI entry: `npm run canary`.
 * Wires the domain's ScoreFn + Benchmark, evaluates baseline & candidate,
 * prints the gate, and exits non-zero on FAIL so CI blocks the merge.
 *
 * TODO(clause): import { scoreFn, baselineConfig, candidateConfig, benchmark }
 * from ../../domain/clause and run the four lines below.
 */
async function main() {
  console.log("canary: wire domain ScoreFn + benchmark, then evaluate() ×2 → analyzeCanary().");
  console.log("On FAIL, process.exit(1) so CI blocks the config change.");
}

if (process.argv[1] && process.argv[1].endsWith("canary.ts")) {
  main();
}
