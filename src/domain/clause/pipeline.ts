/**
 * Clause pipeline — composes the engine spine with the three Clause seams into
 * a single analyze(text) call the API route and eval harness both use.
 *
 *   ingest → chunk(clauseSegmenter) → embed → match → score(clauseVerdictPolicy)
 *
 * This is the only place the engine and the domain are wired together.
 */
import { fromText } from "@/engine/ingest";
import { chunk } from "@/engine/chunk";
import { embedChunks } from "@/engine/embed";
import { matchChunks } from "@/engine/match";
import { scoreDocument } from "@/engine/score";
import { configId } from "@/engine/hash";
import type { EngineConfig, Thresholds, Verdict } from "@/engine/types";
import { clauseSegmenter } from "./segmenter";
import { clauseVerdictPolicy } from "./verdict";
import { REGISTRY_VERSION } from "./playbook";

/** Baseline calibrated config. Thresholds are tuned by the eval harness. */
export const baselineConfig: EngineConfig = {
  embedModel: process.env.EMBED_MODEL ?? "sentence-transformers/all-mpnet-base-v2",
  thresholds: { hit: 0.55, escalate: 0.8 } as Thresholds,
  registryVersion: REGISTRY_VERSION,
};

export async function analyze(text: string, config: EngineConfig = baselineConfig): Promise<Verdict> {
  const doc = fromText(text);
  const chunks = chunk(doc, clauseSegmenter);
  const embedded = await embedChunks(chunks, config.embedModel);
  const matches = await matchChunks(embedded, {
    registryVersion: config.registryVersion,
    k: 5,
  });
  return scoreDocument(
    doc.id,
    matches,
    clauseVerdictPolicy,
    config.thresholds,
    configId(config),
  );
}
