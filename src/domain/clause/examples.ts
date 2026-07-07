/**
 * Curated demo inputs — one click removes the "go find a contract" friction.
 *
 * Each example is written to land a specific verdict against the seeded playbook,
 * so a visitor sees the full STANDARD / REVIEW / BLOCK range in three clicks.
 * `scripts/build-fixtures.ts` runs the real pipeline over these and writes
 * fixtures.json, so the demo serves precomputed results instantly (cold-start-
 * proof, zero API cost) while still being genuine engine output.
 */
import type { VerdictLevel } from "@/engine/types";

export interface Example {
  id: string;
  title: string;
  /** What this example is meant to demonstrate (for the chip label). */
  expected: VerdictLevel;
  text: string;
}

export const EXAMPLES: Example[] = [
  {
    id: "vendor-saas-risky",
    title: "Vendor SaaS agreement",
    expected: "BLOCK",
    text: `1. Fees. Customer shall pay the fees set out in the applicable Order Form within thirty (30) days of invoice.

2. Limitation of Liability. The Provider shall be liable for any and all damages of any kind arising out of or related to this Agreement without limitation, including indirect, incidental, and consequential damages.

3. Term. This Agreement shall automatically renew for successive twelve-month terms unless either party provides written notice of non-renewal at least ninety (90) days prior to the end of the then-current term.

4. Governing Law. This Agreement shall be governed by the laws of the State of Delaware.`,
  },
  {
    id: "services-review",
    title: "Professional services addendum",
    expected: "REVIEW",
    text: `1. Governing Law. This Agreement is governed by the laws of the State of New York, and the parties submit to the exclusive jurisdiction of the courts located in New York County.

2. Notices. All notices under this Agreement shall be in writing and delivered by email with confirmation of receipt to the addresses on the cover page.

3. Assignment. Neither party may assign this Agreement without the other party's prior written consent, which shall not be unreasonably withheld or delayed.`,
  },
  {
    id: "balanced-standard",
    title: "Balanced master agreement",
    expected: "STANDARD",
    text: `1. Limitation of Liability. Except for breaches of confidentiality or indemnification obligations, each party's total aggregate liability under this Agreement shall not exceed the fees paid or payable in the twelve (12) months preceding the claim.

2. Indemnification. Each party shall indemnify and hold harmless the other from third-party claims arising from the indemnifying party's gross negligence or willful misconduct, subject to prompt notice and control of the defense.

3. Termination. Either party may terminate this Agreement for convenience upon thirty (30) days' prior written notice, with a pro-rata refund of any prepaid, unused fees.`,
  },
];
