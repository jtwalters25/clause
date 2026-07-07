/**
 * SEAM 3 (Clause) — turn a clause's ranked matches into STANDARD/REVIEW/BLOCK.
 *
 * Registry labels encode playbook stance:
 *   "approved"  — preferred wording; matching it closely is good  → STANDARD
 *   "acceptable"— tolerated; note but don't escalate              → STANDARD/REVIEW
 *   "risky"     — disfavored wording; matching it is a problem    → REVIEW/BLOCK
 *   "prohibited"— never allow                                     → BLOCK
 *
 * Pure function of (matches, thresholds) — no I/O — so the canary can score
 * historical matches offline. Thresholds are calibrated by the eval harness.
 */
import type { Match, Thresholds, VerdictPolicy, VerdictLevel } from "@/engine/types";

const ESCALATION: Record<string, VerdictLevel> = {
  approved: "STANDARD",
  acceptable: "REVIEW",
  risky: "REVIEW",
  prohibited: "BLOCK",
};

export const clauseVerdictPolicy: VerdictPolicy = (queryIndex, matches, thresholds: Thresholds) => {
  const top = matches[0];

  // Nothing in the playbook is close → novel wording a human should read.
  if (!top || top.similarity < thresholds.hit) {
    return {
      queryIndex,
      level: "REVIEW",
      evidence: matches.slice(0, 3),
      rationale: `No playbook clause within ${thresholds.hit.toFixed(2)} cosine (best ${top?.similarity.toFixed(2) ?? "n/a"}) — novel wording.`,
    };
  }

  const base = ESCALATION[top.entry.label] ?? "REVIEW";
  // A strong match to disfavored wording hardens the verdict.
  const strong = top.similarity >= thresholds.escalate;
  let level: VerdictLevel = base;
  if (base === "REVIEW" && strong && top.entry.label === "risky") level = "BLOCK";
  if (base === "STANDARD" && !strong) level = "REVIEW"; // weakly-matched "approved" still deserves eyes

  return {
    queryIndex,
    level,
    evidence: matches.slice(0, 3),
    rationale: `Closest playbook clause is "${top.entry.label}" at ${top.similarity.toFixed(2)} cosine${strong ? " (strong)" : ""}.`,
  };
};
