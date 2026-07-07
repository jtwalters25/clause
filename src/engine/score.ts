/**
 * Score — matches → Verdict, via an injected VerdictPolicy (SEAM 3).
 *
 * The engine groups matches per query chunk, hands each group to the domain's
 * policy, and rolls the chunk verdicts up into a document verdict (worst level
 * wins). The policy itself is a pure function so canary/replay can score
 * historical matches with zero I/O.
 */
import type {
  ChunkVerdict,
  Match,
  Thresholds,
  Verdict,
  VerdictLevel,
  VerdictPolicy,
} from "./types";

const RANK: Record<VerdictLevel, number> = { STANDARD: 0, REVIEW: 1, BLOCK: 2 };

function groupByChunk(matches: Match[]): Map<number, Match[]> {
  const groups = new Map<number, Match[]>();
  for (const m of matches) {
    const g = groups.get(m.queryIndex) ?? [];
    g.push(m);
    groups.set(m.queryIndex, g);
  }
  for (const g of groups.values()) g.sort((a, b) => b.similarity - a.similarity);
  return groups;
}

export function scoreDocument(
  documentId: string,
  matches: Match[],
  policy: VerdictPolicy,
  thresholds: Thresholds,
  configId: string,
): Verdict {
  const chunks: ChunkVerdict[] = [];
  for (const [queryIndex, group] of groupByChunk(matches)) {
    chunks.push(policy(queryIndex, group, thresholds));
  }
  chunks.sort((a, b) => a.queryIndex - b.queryIndex);
  const level = chunks.reduce<VerdictLevel>(
    (worst, c) => (RANK[c.level] > RANK[worst] ? c.level : worst),
    "STANDARD",
  );
  return { documentId, level, chunks, configId };
}
