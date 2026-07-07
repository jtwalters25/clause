-- Clause — Supabase schema (pgvector + HNSW)
-- Run in the Supabase SQL editor after enabling the `vector` extension.

create extension if not exists vector;

-- The playbook / registry: canonical clauses we match incoming wording against.
create table if not exists registry (
  id                text primary key,
  content           text not null,
  embedding         vector(768) not null,        -- all-mpnet-base-v2 = 768 dims
  label             text not null,               -- approved | acceptable | risky | prohibited
  meta              jsonb not null default '{}',
  registry_version  text not null,
  created_at        timestamptz not null default now()
);

-- Approximate-nearest-neighbour index (cosine). Mirrors Provenance's HNSW setup.
create index if not exists registry_embedding_hnsw
  on registry using hnsw (embedding vector_cosine_ops);

create index if not exists registry_version_idx on registry (registry_version);

-- Persisted verdicts — the audit trail. config_id pins model+thresholds+registry.
create table if not exists verdicts (
  id            uuid primary key default gen_random_uuid(),
  document_id   text not null,
  level         text not null,                   -- STANDARD | REVIEW | BLOCK
  chunks        jsonb not null,                  -- per-clause ChunkVerdict[] incl. seals
  config_id     text not null,
  created_at    timestamptz not null default now()
);

-- kNN RPC: nearest playbook clauses to a query embedding, within a snapshot.
create or replace function match_entries(
  query_embedding vector(768),
  match_count int,
  reg_version text
)
returns table (
  id text,
  content text,
  label text,
  meta jsonb,
  registry_version text,
  similarity float
)
language sql stable as $$
  select
    r.id, r.content, r.label, r.meta, r.registry_version,
    1 - (r.embedding <=> query_embedding) as similarity   -- cosine similarity
  from registry r
  where r.registry_version = reg_version
  order by r.embedding <=> query_embedding
  limit match_count;
$$;
