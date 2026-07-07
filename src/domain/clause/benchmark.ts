/**
 * Canary benchmark — labeled single-clause cases with their expected verdict.
 *
 * This is the frozen ground truth the Automated Canary Analysis scores a config
 * against. Each case is one clause so the document verdict equals the clause
 * verdict. Bump `version` whenever the set changes; the canary snapshots a
 * baseline report against a version so drift is attributable.
 */
import type { Benchmark } from "@/engine/eval/types";
import { REGISTRY_VERSION } from "./playbook";

export const BENCHMARK: Benchmark = {
  version: "bench-2026-07-06",
  registryVersion: REGISTRY_VERSION,
  // Cases are PARAPHRASES of playbook wording, not verbatim — so matches land
  // in a realistic ~0.85–0.93 band and the canary is actually sensitive to
  // threshold/model changes (a verbatim benchmark self-matches at 1.0 and can't
  // detect any regression).
  cases: [
    // ── BLOCK: paraphrased prohibited wording ──
    {
      id: "b-uncapped-liability",
      expected: "BLOCK",
      text: "The Provider will bear responsibility for every category of loss connected to this Agreement, with no cap whatsoever, expressly including indirect, incidental, and consequential losses.",
    },
    {
      id: "b-broad-ip-assignment",
      expected: "BLOCK",
      text: "Any invention or work product created by either side over the course of the engagement, whether or not related to the services, vests solely and exclusively in the Provider.",
    },
    {
      id: "b-one-sided-indemnity",
      expected: "BLOCK",
      text: "The Customer shall defend and indemnify the Provider against every claim connected to the Customer's use of the services, regardless of cause and even where the Provider was itself negligent.",
    },
    // ── REVIEW: acceptable-but-notable, or novel wording with no close match ──
    {
      id: "r-governing-law",
      expected: "REVIEW",
      text: "The construction and enforcement of this contract are subject to Massachusetts law, and both sides accept the sole venue of the state and federal courts sitting in Suffolk County.",
    },
    {
      id: "r-notices",
      expected: "REVIEW",
      text: "Any formal notice under this contract must be sent in writing by email with a read receipt to the contacts named on the signature page.",
    },
    {
      id: "r-assignment-consent",
      expected: "REVIEW",
      text: "Neither side may transfer its rights under this contract to a third party absent the counterparty's advance written approval, which will not be withheld unreasonably.",
    },
    // ── STANDARD: paraphrased approved wording (still a strong match) ──
    {
      id: "s-liability-cap",
      expected: "STANDARD",
      text: "Other than for breaches of confidentiality or indemnity obligations, neither party's cumulative liability under this contract will exceed the total fees paid or payable in the preceding twelve months.",
    },
    {
      id: "s-mutual-indemnity",
      expected: "STANDARD",
      text: "Each side will indemnify and hold the other harmless against third-party claims stemming from the indemnifying side's gross negligence or willful misconduct, provided it receives prompt notice and controls the defense.",
    },
    {
      id: "s-termination-convenience",
      expected: "STANDARD",
      text: "Either side may end this contract for convenience on thirty days' written notice, refunding any prepaid but unused fees on a pro-rata basis.",
    },
  ],
};
