/**
 * Store — pgvector persistence + kNN retrieval (Supabase).
 *
 * The engine only knows "registry entries" and "nearest neighbours". Similarity
 * search runs in Postgres via an HNSW index and a SQL RPC (see schema.sql:
 * match_entries). Keeping the ANN query server-side is the same pattern used in
 * Provenance's match_provenance().
 */
import { createClient } from "@supabase/supabase-js";
import type { Match, RegistryEntry, Vector } from "./types";

/**
 * Service-role client scoped to the `clause` schema. Clause shares a Supabase
 * project with other apps (Provenance) but is namespaced into its own schema, so
 * `.from("registry")` / `.rpc("match_entries")` resolve to clause.* and can never
 * touch another app's tables. Schema must be listed under Settings → API →
 * Exposed schemas (see schema.sql).
 */
const SCHEMA = process.env.SUPABASE_SCHEMA ?? "clause";

export function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase env not set");
  return createClient(url, key, {
    auth: { persistSession: false },
    db: { schema: SCHEMA },
  });
}

/** Upsert registry entries (playbook clauses / resolved tickets). */
export async function upsertEntries(entries: RegistryEntry[], db = admin()): Promise<void> {
  const rows = entries.map((e) => ({
    id: e.id,
    content: e.content,
    embedding: e.vector,
    label: e.label,
    meta: e.meta ?? {},
    registry_version: e.registryVersion,
  }));
  const { error } = await db.from("registry").upsert(rows);
  if (error) throw error;
}

/**
 * k-nearest registry entries for one query vector, scoped to a registry version
 * (so canary/replay can query a frozen snapshot). Returns cosine similarity.
 */
export async function nearest(
  vector: Vector,
  opts: { k?: number; registryVersion: string },
  db = admin(),
): Promise<Omit<Match, "queryIndex">[]> {
  const { data, error } = await db.rpc("match_entries", {
    query_embedding: vector,
    match_count: opts.k ?? 5,
    reg_version: opts.registryVersion,
  });
  if (error) throw error;
  return (data ?? []).map((row: any) => ({
    similarity: row.similarity as number,
    entry: {
      id: row.id,
      content: row.content,
      vector: [],
      label: row.label,
      meta: row.meta,
      registryVersion: row.registry_version,
    } as RegistryEntry,
  }));
}

/** pgvector columns come back over PostgREST as a JSON-array string; parse to number[]. */
function parseVector(v: unknown): Vector {
  if (Array.isArray(v)) return v as Vector;
  if (typeof v === "string") return JSON.parse(v) as Vector;
  return [];
}

/**
 * Load the full registry for a version (content, label, meta, and the vector).
 * Used by the fixture exporter so the canary can score offline — no per-query
 * database round trips, no secrets in CI.
 */
export async function loadCorpus(registryVersion: string, db = admin()): Promise<RegistryEntry[]> {
  const { data, error } = await db
    .from("registry")
    .select("id, content, embedding, label, meta, registry_version")
    .eq("registry_version", registryVersion);
  if (error) throw error;
  return (data ?? []).map((row: any) => ({
    id: row.id,
    content: row.content,
    vector: parseVector(row.embedding),
    label: row.label,
    meta: row.meta,
    registryVersion: row.registry_version,
  }));
}
