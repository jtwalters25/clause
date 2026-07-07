# Clause — build plan

Portfolio project #1 of a two-project set (**Clause** + **Echo**) built on one shared
similarity engine. Goal: demonstrate a production-grade retrieval + calibrated-scoring
system, isolated and legible — not a sprawling product.

## Premise (one sentence)

Paste a contract; each clause is matched against your playbook and returned as
**STANDARD / REVIEW / BLOCK** with the closest known clause as evidence.

## Working principles (the shared spine)

> ingest → chunk → embed → store(pgvector) → match → score(calibrated verdict)

The engine (`src/engine/`) is domain-agnostic. Domains plug in via **three seams**:

| Seam | Type | Clause implementation |
|---|---|---|
| 1. Segmenter | `Segmenter` | `domain/clause/segmenter.ts` — clause splitter (numbering/markers) |
| 2. Registry | `RegistryEntry[]` | `domain/clause/playbook.ts` — labeled canonical clauses |
| 3. Verdict policy | `VerdictPolicy` | `domain/clause/verdict.ts` — label + threshold → verdict |

`domain/clause/pipeline.ts` is the only file that wires engine + seams together.

## Netflix hook — Automated Canary Analysis (Kayenta)

A change to the engine config (embedding model or thresholds) is a "deploy". Before it
ships, `src/engine/eval/canary.ts` scores a frozen benchmark under **baseline vs candidate**
and gates on:
1. BLOCK recall must not regress > 2pp (don't start missing dangerous clauses),
2. accuracy must not regress > 2pp,
3. verdict churn ≤ 15%.

Wired as a CI check (`npm run canary`, exits non-zero on FAIL) so a red gate blocks the
merge. Echo's counterpart is offline **replay** (recall@k / MRR) — same discipline, two
expressions, sharing `engine/eval/types.ts`.

## Build order

- [x] 0. Scaffold: Next.js 15, engine boundary w/ typed stubs, schema.sql, env, this plan
- [ ] 1. Engine vertical slice runs: paste → chunk → embed → match → score (prove via script)
- [ ] 2. `npm run seed` populates the playbook registry in Supabase
- [ ] 3. UI: paste contract → per-clause verdict list with evidence  *(scaffolded)*
- [ ] 4. LLM redline per REVIEW/BLOCK clause (Anthropic) + SHA-256 audit seal surfaced
- [ ] 5. Canary: build the labeled benchmark set + wire the CI gate
- [ ] 6. Calibration pass: tune thresholds against the benchmark, record the baseline

## Scope discipline (lesson from Provenance-as-portfolio)

No auth providers, no collectives, no billing, no referral codes. One engine, one domain,
one demo path, one calibration/canary story. Keep it legible.

## Stack

Next.js 15 (App Router) · Supabase + pgvector (HNSW) · HF Inference (all-mpnet-base-v2,
general-purpose — *not* academic SPECTER2) · Anthropic (redline) · Vercel.
