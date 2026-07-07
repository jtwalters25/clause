/**
 * Engine contract — domain-agnostic.
 *
 * This file is the boundary between the reusable similarity engine and any
 * domain built on top of it (Clause, Echo, ...). Nothing here knows what a
 * "clause" or a "ticket" is. Domains plug in via three seams:
 *
 *   1. Segmenter    — how raw text becomes Chunks         (chunk.ts consumes it)
 *   2. Registry     — the corpus we match against         (store.ts persists it)
 *   3. VerdictPolicy — how matches become a Verdict        (score.ts consumes it)
 *
 * Keep this file free of domain vocabulary. If a type needs the word "clause",
 * it belongs in src/domain/clause, not here.
 */

// ── Ingestion ────────────────────────────────────────────────

/** A normalized source document, post text-extraction, pre-chunking. */
export interface Document {
  id: string;
  /** Extracted, normalized plain text. */
  text: string;
  /** Free-form provenance (filename, url, source system). */
  source?: Record<string, unknown>;
}

// ── Chunking ─────────────────────────────────────────────────

/** A semantically meaningful unit of a document. Domains define what a unit is. */
export interface Chunk {
  /** Stable index within the parent document (0-based, ordered). */
  index: number;
  content: string;
  /** Domain metadata (section number, heading, page, etc.). */
  meta?: Record<string, unknown>;
}

/** SEAM 1: turns normalized text into ordered chunks. Injected per domain. */
export type Segmenter = (doc: Document) => Chunk[];

// ── Embedding ────────────────────────────────────────────────

export type Vector = number[];

export interface EmbeddedChunk extends Chunk {
  vector: Vector;
  /** Content-addressable seal: sha256(content + canonical meta). Tamper-evident. */
  hash: string;
}

// ── Registry (the corpus we match against) ───────────────────

/** SEAM 2: one entry in the corpus. `label` is the domain's verdict-relevant tag. */
export interface RegistryEntry {
  id: string;
  content: string;
  vector: Vector;
  /** Domain label, e.g. clause: "approved" | "risky"; echo: resolution id. */
  label: string;
  meta?: Record<string, unknown>;
  /** Version of the registry snapshot this entry belongs to (for canary/replay). */
  registryVersion: string;
}

// ── Matching ─────────────────────────────────────────────────

export interface Match {
  /** The query chunk that produced this match. */
  queryIndex: number;
  entry: RegistryEntry;
  /** Cosine similarity in [-1, 1]; higher = closer. */
  similarity: number;
}

// ── Scoring / Verdict ────────────────────────────────────────

export type VerdictLevel = "STANDARD" | "REVIEW" | "BLOCK";

/** Per-chunk decision with the evidence that produced it. */
export interface ChunkVerdict {
  queryIndex: number;
  level: VerdictLevel;
  /** The nearest registry entries, best-first — the evidence trail. */
  evidence: Match[];
  /** Why this level fired (threshold crossed, label of nearest, etc.). */
  rationale: string;
}

/** Whole-document verdict = rollup of chunk verdicts. */
export interface Verdict {
  documentId: string;
  level: VerdictLevel;
  chunks: ChunkVerdict[];
  /** Config fingerprint (model + thresholds + registryVersion) for reproducibility. */
  configId: string;
}

/**
 * SEAM 3: turn a chunk's ranked matches into a verdict. Injected per domain.
 * Pure function of (matches, thresholds) — no I/O — so canary/replay can call it
 * offline against historical matches.
 */
export type VerdictPolicy = (
  queryIndex: number,
  matches: Match[],
  thresholds: Thresholds,
) => ChunkVerdict;

/** Calibrated cut points. Tuned by the eval harness, gated by canary. */
export interface Thresholds {
  /** At/above this similarity, a match is considered a real hit. */
  hit: number;
  /** At/above this, escalate STANDARD → REVIEW/BLOCK depending on label. */
  escalate: number;
  [k: string]: number;
}

// ── Engine configuration ─────────────────────────────────────

/** Everything that makes a run reproducible. Its hash is Verdict.configId. */
export interface EngineConfig {
  embedModel: string;
  thresholds: Thresholds;
  registryVersion: string;
}
