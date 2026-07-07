/**
 * Match — embedded query chunks → ranked registry matches.
 *
 * Thin orchestration over store.nearest(): embed already happened upstream, so
 * this stays pure enough that replay/canary can feed it precomputed vectors.
 * A local cosine is provided for offline eval that shouldn't hit the database.
 */
import type { EmbeddedChunk, Match, RegistryEntry, Vector } from "./types";
import { nearest } from "./store";

export function cosine(a: Vector, b: Vector): number {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return na && nb ? dot / (Math.sqrt(na) * Math.sqrt(nb)) : 0;
}

/** Online path: query pgvector for each chunk. */
export async function matchChunks(
  chunks: EmbeddedChunk[],
  opts: { k?: number; registryVersion: string },
): Promise<Match[]> {
  const all: Match[] = [];
  for (const c of chunks) {
    const hits = await nearest(c.vector, opts);
    hits.forEach((h) => all.push({ ...h, queryIndex: c.index }));
  }
  return all;
}

/** Offline path: rank against an in-memory registry snapshot (replay/canary). */
export function matchInMemory(
  chunks: EmbeddedChunk[],
  registry: RegistryEntry[],
  k = 5,
): Match[] {
  const all: Match[] = [];
  for (const c of chunks) {
    const ranked = registry
      .map((entry) => ({ queryIndex: c.index, entry, similarity: cosine(c.vector, entry.vector) }))
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, k);
    all.push(...ranked);
  }
  return all;
}
