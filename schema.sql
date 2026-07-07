-- Clause — Supabase schema (pgvector + HNSW)
--
-- Clause shares a Supabase PROJECT with other apps (e.g. Provenance) but lives in
-- its own `clause` schema, so its tables can never collide with theirs and the
-- whole app tears down with `drop schema clause cascade`.
--
-- Setup:
--   1. `vector` extension is already enabled at the project level — nothing to do.
--   2. Run this file in the Supabase SQL editor.
--   3. Dashboard → Settings → API → "Exposed schemas": add `clause` (so the REST
--      layer / supabase-js can reach it). store.ts sets db.schema = 'clause'.

create schema if not exists clause;
create extension if not exists vector;  -- no-op if already installed project-wide

-- The playbook / registry: canonical clauses we match incoming wording against.
create table if not exists clause.registry (
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
  on clause.registry using hnsw (embedding vector_cosine_ops);

create index if not exists registry_version_idx on clause.registry (registry_version);

-- Persisted verdicts — the audit trail. config_id pins model+thresholds+registry.
create table if not exists clause.verdicts (
  id            uuid primary key default gen_random_uuid(),
  document_id   text not null,
  level         text not null,                   -- STANDARD | REVIEW | BLOCK
  chunks        jsonb not null,                  -- per-clause ChunkVerdict[] incl. seals
  config_id     text not null,
  created_at    timestamptz not null default now()
);

-- kNN RPC: nearest playbook clauses to a query embedding, within a snapshot.
create or replace function clause.match_entries(
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
  from clause.registry r
  where r.registry_version = reg_version
  order by r.embedding <=> query_embedding
  limit match_count;
$$;

-- Let the API roles use the schema (service_role bypasses RLS; anon/authenticated
-- included so the exposed-schema REST layer resolves objects).
grant usage on schema clause to anon, authenticated, service_role;
grant all on all tables in schema clause to service_role;
grant execute on all functions in schema clause to anon, authenticated, service_role;
