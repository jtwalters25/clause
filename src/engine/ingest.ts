/**
 * Ingestion — raw input → normalized Document.
 *
 * Domain-agnostic text extraction + normalization. PDF/DOCX extractors are
 * added here as needed; the scaffold ships with plain text so the vertical
 * slice runs before any parser dependency is wired.
 */
import { randomUUID } from "crypto";
import type { Document } from "./types";

/** Collapse whitespace, normalize newlines, strip zero-width junk. */
export function normalize(raw: string): string {
  return raw
    .replace(/\r\n?/g, "\n")
    .replace(/[​-‍﻿]/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function fromText(raw: string, source?: Record<string, unknown>): Document {
  return { id: randomUUID(), text: normalize(raw), source };
}

// TODO(clause): fromPdf(buffer) via pdfjs-dist, fromDocx(buffer) — extract then normalize().
