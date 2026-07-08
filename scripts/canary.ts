/**
 * Automated Canary Analysis CLI — `npm run canary`
 *
 * Kayenta in miniature: a change to the engine config (embedding model or
 * scoring thresholds) is a "deploy". Before it ships we score a frozen benchmark
 * under the CANDIDATE config and compare it to a committed BASELINE report. The
 * gate fails the deploy if the candidate regresses BLOCK recall or accuracy, or
 * churns too many verdicts — so a red canary blocks the merge in CI.
 *
 *   npm run canary -- --save-baseline     snapshot the current config as baseline
 *   npm run canary                        score current config, gate vs baseline
 *   CANDIDATE_HIT=0.9 npm run canary       score a perturbed candidate (demo a FAIL)
 *
 * Scores entirely in-memory from a committed fixture (matchInMemory + verdict
 * policy) — no HF, no Supabase, no secrets — so it runs in CI. Refresh the
 * fixture with `npm run export-fixtures` whenever playbook/benchmark/model change.
 */
import { writeFileSync, readFileSync, existsSync } from "fs";
import { join } from "path";
import { evaluate, analyzeCanary, type ScoreFn } from "@/engine/eval/canary";
import type { EvalReport } from "@/engine/eval/types";
import type { EngineConfig, RegistryEntry, Thresholds, VerdictLevel } from "@/engine/types";
import { matchInMemory } from "@/engine/match";
import { scoreDocument } from "@/engine/score";
import { clauseVerdictPolicy } from "@/domain/clause/verdict";
import { BASELINE_THRESHOLDS } from "@/domain/clause/thresholds";
import { REGISTRY_VERSION } from "@/domain/clause/playbook";
import { BENCHMARK } from "@/domain/clause/benchmark";

const BASELINE_PATH = join(process.cwd(), "src/domain/clause/canary-baseline.json");
const EVAL_REPORT_PATH = join(process.cwd(), "src/domain/clause/eval-report.json");
const FIXTURE_PATH = join(process.cwd(), "src/domain/clause/canary-fixture.json");

interface CanaryFixture {
  registry: RegistryEntry[];
  cases: { id: string; text: string; expected: VerdictLevel; vector: number[] }[];
}

function loadFixture(): CanaryFixture {
  try {
    return JSON.parse(readFileSync(FIXTURE_PATH, "utf8")) as CanaryFixture;
  } catch {
    console.error("no canary-fixture.json — run `npm run export-fixtures` first.");
    process.exit(1);
  }
}

const FIXTURE = loadFixture();
const VEC_BY_TEXT = new Map(FIXTURE.cases.map((c) => [c.text, c.vector]));

const baselineConfig: EngineConfig = {
  embedModel: process.env.EMBED_MODEL ?? "sentence-transformers/all-mpnet-base-v2",
  thresholds: BASELINE_THRESHOLDS,
  registryVersion: REGISTRY_VERSION,
};

/**
 * Offline ScoreFn — reproduces analyze() for a single-clause case using the
 * precomputed case vector + registry: matchInMemory → verdict policy. Pure.
 */
const score: ScoreFn = async (text, cfg) => {
  const vector = VEC_BY_TEXT.get(text);
  if (!vector) throw new Error(`no fixture vector for case text (stale fixture?)`);
  const matches = matchInMemory([{ index: 0, content: text, vector, hash: "" }], FIXTURE.registry, 5);
  const verdict = scoreDocument("case", matches, clauseVerdictPolicy, cfg.thresholds, "offline");
  return { actual: verdict.level, matches: [] };
};

/** Candidate config = baseline, optionally perturbed via env to demonstrate a FAIL. */
function candidateConfig(): EngineConfig {
  const t = baselineConfig.thresholds;
  const hit = process.env.CANDIDATE_HIT ? Number(process.env.CANDIDATE_HIT) : t.hit;
  const escalate = process.env.CANDIDATE_ESCALATE ? Number(process.env.CANDIDATE_ESCALATE) : t.escalate;
  return { ...baselineConfig, thresholds: { ...t, hit, escalate } as Thresholds };
}

function summarize(label: string, r: EvalReport, detail = false) {
  console.log(`\n▓ ${label}  (config ${r.config.thresholds.hit}/${r.config.thresholds.escalate}, n=${r.n})`);
  console.log(`  accuracy ${r.accuracy.toFixed(2)}   BLOCK precision ${r.blockPrecision.toFixed(2)}   BLOCK recall ${r.blockRecall.toFixed(2)}`);
  if (detail) {
    for (const c of r.results) {
      console.log(`  ${c.correct ? "✓" : "✗"} ${c.id.padEnd(24)} expected ${c.expected.padEnd(9)} got ${c.actual}`);
    }
  }
}

async function main() {
  const saveBaseline = process.argv.includes("--save-baseline");

  if (saveBaseline) {
    console.log("scoring benchmark under baseline config…");
    const report = await evaluate(baselineConfig, BENCHMARK, score);
    writeFileSync(BASELINE_PATH, JSON.stringify(report, null, 2) + "\n");
    summarize("baseline (saved)", report, true);
    console.log(`\nwrote baseline → ${BASELINE_PATH}`);
    return;
  }

  if (!existsSync(BASELINE_PATH)) {
    console.error("no baseline — run `npm run canary -- --save-baseline` first.");
    process.exit(1);
  }
  const baseline: EvalReport = JSON.parse(readFileSync(BASELINE_PATH, "utf8"));

  console.log("scoring benchmark under candidate config…");
  const candidate = await evaluate(candidateConfig(), BENCHMARK, score);

  summarize("baseline", baseline);
  summarize("candidate", candidate);

  const verdict = analyzeCanary(baseline, candidate);

  // Panel-facing report — committed and rendered at /eval. Only refresh it for a
  // real evaluation of the shipped config; a perturbed demo run (CANDIDATE_* set)
  // must NOT overwrite the committed baseline numbers.
  const isDemo = !!(process.env.CANDIDATE_HIT || process.env.CANDIDATE_ESCALATE);
  const byLevel = (lvl: string) => candidate.results.filter((r) => r.expected === lvl).length;
  if (!isDemo)
  writeFileSync(
    EVAL_REPORT_PATH,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString().slice(0, 10),
        benchmarkVersion: BENCHMARK.version,
        registryVersion: candidate.config.registryVersion,
        embedModel: candidate.config.embedModel,
        thresholds: candidate.config.thresholds,
        cases: candidate.n,
        classBreakdown: { BLOCK: byLevel("BLOCK"), REVIEW: byLevel("REVIEW"), STANDARD: byLevel("STANDARD") },
        accuracy: candidate.accuracy,
        blockPrecision: candidate.blockPrecision,
        blockRecall: candidate.blockRecall,
        churn: verdict.churn,
        gate: { pass: verdict.pass, reasons: verdict.reasons },
      },
      null,
      2,
    ) + "\n",
  );

  console.log(`\nverdict churn: ${(verdict.churn * 100).toFixed(0)}%`);
  if (verdict.pass) {
    console.log("\ncanary: PASS ✓  — safe to ship this config change.");
    process.exit(0);
  }
  console.log("\ncanary: FAIL ✗  — blocking. Reasons:");
  verdict.reasons.forEach((r) => console.log(`  · ${r}`));
  process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
