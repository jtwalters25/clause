/**
 * SEAM 1 (Clause) — split a contract into individual clauses.
 *
 * Contracts are numbered/lettered hierarchies ("1.", "1.1", "(a)", "Section 4")
 * far more than they are blank-line paragraphs, so we segment on clause markers
 * and carry the marker into metadata (it shows up in the evidence trail and the
 * redline). Falls back to paragraphs when a block has no marker.
 */
import type { Chunk, Document, Segmenter } from "@/engine/types";

// Start-of-clause markers: "1.", "1.2.3", "(a)", "Section 5", "ARTICLE II".
// No trailing \b — "1." followed by a space has no word boundary there, which
// silently collapsed every numbered clause into one chunk. Optional [.)] then
// required whitespace separates the marker from the clause body.
const MARKER = /^\s*((?:\d+\.)+\d*|\([a-z0-9]+\)|Section\s+\d+|ARTICLE\s+[IVX\d]+)[.)]?\s+/i;

export const clauseSegmenter: Segmenter = (doc: Document): Chunk[] => {
  const lines = doc.text.split("\n");
  const clauses: { marker?: string; buf: string[] }[] = [];
  let current: { marker?: string; buf: string[] } | null = null;

  for (const line of lines) {
    const m = line.match(MARKER);
    if (m) {
      if (current) clauses.push(current);
      current = { marker: m[1], buf: [line.slice(m[0].length)] };
    } else if (current) {
      current.buf.push(line);
    } else if (line.trim()) {
      current = { buf: [line] }; // preamble before the first marker
    }
  }
  if (current) clauses.push(current);

  return clauses
    .map((c, index) => ({
      index,
      content: c.buf.join("\n").trim(),
      meta: c.marker ? { marker: c.marker } : undefined,
    }))
    .filter((c) => c.content.length > 0);
};
