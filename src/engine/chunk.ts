/**
 * Chunking — Document → EmbeddedChunk[] (pre-embedding: content + seal only).
 *
 * The engine owns orchestration; the *segmentation rule* is SEAM 1, injected by
 * the domain (a legal clause splitter for Clause, a ticket normalizer for Echo).
 * A paragraph fallback ships here so the slice runs before the domain seam does.
 */
import type { Chunk, Document, Segmenter } from "./types";
import { sealChunk } from "./hash";

/** Default segmenter: split on blank lines, drop empties. Domains override this. */
export const paragraphSegmenter: Segmenter = (doc: Document): Chunk[] =>
  doc.text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((content, index) => ({ index, content }));

/** Run the (injected) segmenter and attach a tamper-evident seal to each chunk. */
export function chunk(doc: Document, segment: Segmenter = paragraphSegmenter) {
  return segment(doc).map((c) => ({ ...c, hash: sealChunk(c) }));
}
