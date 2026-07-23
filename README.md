# Clause

[![eval-gate](https://github.com/jtwalters25/clause/actions/workflows/eval.yml/badge.svg)](https://github.com/jtwalters25/clause/actions/workflows/eval.yml)

**Contract clause intelligence.** Paste a contract; Clause segments it into individual
clauses, matches each against your playbook of known-good / known-bad wording, and returns
a calibrated **STANDARD / REVIEW / BLOCK** verdict — with the closest known clause as evidence.

Built on a domain-agnostic similarity engine (`src/engine/`) that also powers a sibling
project, [Echo](../echo). See [`PLAN.md`](./PLAN.md) for the architecture and roadmap.

## How it works

```
ingest → chunk(clause splitter) → embed → pgvector kNN → score(calibrated policy) → verdict
```

The engine is domain-agnostic; the contract-specific behavior lives in `src/domain/clause`
behind three seams: **segmenter**, **playbook registry**, and **verdict policy**.

### Automated Canary Analysis

Any change to the embedding model or scoring thresholds is gated by a Kayenta-style canary
(`npm run canary`): a candidate config must not regress BLOCK recall or accuracy beyond
tolerance, and must keep verdict churn low — otherwise the gate fails and CI blocks the merge.

The current config scores **accuracy 1.00 · BLOCK recall 1.00** over a 9-case labeled
benchmark of *paraphrased* clauses (a verbatim benchmark self-matches at 1.0 and can't detect
regressions). The gate is demonstrably sensitive — e.g. nudging the escalation threshold
`0.8 → 0.9` drops accuracy to 0.89 (11% verdict churn) and the canary fails:

```
$ npm run canary                     # no change  → PASS ✓ (churn 0%)
$ CANDIDATE_ESCALATE=0.9 npm run canary   # regression → FAIL ✗ (accuracy −11pp)
```

Snapshot a new baseline with `npm run canary -- --save-baseline`.

## Tech

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router), React 19, Tailwind |
| Database | Supabase Postgres + pgvector (HNSW) |
| Embeddings | HuggingFace Inference — `all-mpnet-base-v2` (768-dim) |
| LLM | Anthropic Claude (redline generation) |
| Hosting | Vercel |

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in Supabase + HF + Anthropic keys
# In Supabase SQL editor: enable the `vector` extension, then run schema.sql
npm run seed                 # embed + upsert the playbook
npm run dev                  # http://localhost:3000
```

## Status

Working end-to-end: the engine spine, the three Clause seams, the `analyze()`
pipeline, the API route, and the UI are wired and typecheck clean — and the
CI-gating evaluation is live. Every push runs an offline Automated Canary
Analysis ([eval.yml](.github/workflows/eval.yml)) that exits non-zero on a
config regression and blocks the merge; the current config scores accuracy 1.00
· BLOCK recall 1.00.

The deliberate limitation is corpus size, not completeness: the benchmark is a
hand-labeled **n=9** set of paraphrased clauses. So the artifact here is the
*harness* — the calibrated pipeline plus a sensitive, reproducible regression
gate — rather than a production-scale model. Scaling the corpus and playbook is
the next step; build order is tracked in [`PLAN.md`](./PLAN.md).
