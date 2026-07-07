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
 * Scoring embeds each benchmark case via HF, so this needs .env.local.
 */
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });

import { writeFileSync, readFileSync, existsSync } from "fs";
import { join } from "path";
import { evaluate, analyzeCanary, type ScoreFn } from "@/engine/eval/canary";
import type { EvalReport } from "@/engine/eval/types";
import type { EngineConfig } from "@/engine/types";
import { analyze, baselineConfig } from "@/domain/clause/pipeline";
import { BENCHMARK } from "@/domain/clause/benchmark";

const BASELINE_PATH = join(process.cwd(), "src/domain/clause/canary-baseline.json");

/** Domain ScoreFn: run the real pipeline, return the document verdict. */
const score: ScoreFn = async (text, cfg) => {
  const verdict = await analyze(text, cfg);
  return { actual: verdict.level, matches: [] };
};

/** Candidate config = baseline, optionally perturbed via env to demonstrate a FAIL. */
function candidateConfig(): EngineConfig {
  const hit = process.env.CANDIDATE_HIT ? Number(process.env.CANDIDATE_HIT) : baselineConfig.thresholds.hit;
  const escalate = process.env.CANDIDATE_ESCALATE ? Number(process.env.CANDIDATE_ESCALATE) : baselineConfig.thresholds.escalate;
  return { ...baselineConfig, thresholds: { ...baselineConfig.thresholds, hit, escalate } };
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
