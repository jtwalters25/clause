# Clause

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

Scaffold stage — engine boundary, Clause seams, pipeline, API, and UI are in place.
Build order tracked in [`PLAN.md`](./PLAN.md).
