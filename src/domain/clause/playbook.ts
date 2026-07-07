/**
 * SEAM 2 (Clause) — the playbook: canonical clauses with a stance label.
 *
 * This is the seed corpus the engine matches against. In production it lives in
 * the `registry` table; this file is the source of truth `npm run seed` embeds
 * and upserts. Keep it small but real so demos and the canary benchmark aren't
 * empty. `registryVersion` is bumped whenever wording changes so canary/replay
 * can pin a snapshot.
 */
export const REGISTRY_VERSION = "playbook-2026-07-06";

export interface PlaybookClause {
  id: string;
  label: "approved" | "acceptable" | "risky" | "prohibited";
  category: string;
  content: string;
}

export const PLAYBOOK: PlaybookClause[] = [
  {
    id: "liability-cap-approved",
    label: "approved",
    category: "Limitation of Liability",
    content:
      "Except for breaches of confidentiality or indemnification obligations, each party's total aggregate liability under this Agreement shall not exceed the fees paid or payable in the twelve (12) months preceding the claim.",
  },
  {
    id: "liability-uncapped-prohibited",
    label: "prohibited",
    category: "Limitation of Liability",
    content:
      "The Provider shall be liable for any and all damages of any kind arising out of or related to this Agreement without limitation, including indirect, incidental, and consequential damages.",
  },
  {
    id: "indemnity-mutual-approved",
    label: "approved",
    category: "Indemnification",
    content:
      "Each party shall indemnify and hold harmless the other from third-party claims arising from the indemnifying party's gross negligence or willful misconduct, subject to prompt notice and control of the defense.",
  },
  {
    id: "indemnity-one-sided-risky",
    label: "risky",
    category: "Indemnification",
    content:
      "Customer shall defend, indemnify, and hold harmless Provider from any and all claims arising from Customer's use of the services, regardless of cause and including Provider's own negligence.",
  },
  {
    id: "governing-law-neutral-acceptable",
    label: "acceptable",
    category: "Governing Law",
    content:
      "This Agreement shall be governed by the laws of the State of Delaware, without regard to its conflict of laws principles, and the parties consent to the exclusive jurisdiction of the state and federal courts located therein.",
  },
  {
    id: "auto-renew-risky",
    label: "risky",
    category: "Term & Termination",
    content:
      "This Agreement shall automatically renew for successive twelve-month terms unless either party provides written notice of non-renewal at least ninety (90) days prior to the end of the then-current term.",
  },
  {
    id: "termination-convenience-approved",
    label: "approved",
    category: "Term & Termination",
    content:
      "Either party may terminate this Agreement for convenience upon thirty (30) days' prior written notice, with a pro-rata refund of any prepaid, unused fees.",
  },
  {
    id: "ip-assignment-broad-prohibited",
    label: "prohibited",
    category: "Intellectual Property",
    content:
      "All intellectual property conceived by either party during the term, whether or not related to the services, shall be the sole and exclusive property of the Provider.",
  },
];
