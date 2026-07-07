/**
 * Offline evaluation contract — shared by Clause's canary and Echo's replay.
 *
 * Both repos evaluate a candidate config against ground truth *before* shipping.
 * Clause specializes this into a statistical gate (canary.ts); Echo specializes
 * it into retrieval metrics (replay.ts). Same discipline, two expressions.
 */
import type { EngineConfig, VerdictLevel } from "../types";

/** One labeled example: a chunk of text and the verdict it *should* receive. */
export interface LabeledCase {
  id: string;
  text: string;
  expected: VerdictLevel;
}

/** A frozen benchmark set + the registry snapshot it was labeled against. */
export interface Benchmark {
  version: string;
  registryVersion: string;
  cases: LabeledCase[];
}

/** Result of scoring one case under one config. */
export interface CaseResult {
  id: string;
  expected: VerdictLevel;
  actual: VerdictLevel;
  correct: boolean;
}

/** Aggregate metrics for one config over the whole benchmark. */
export interface EvalReport {
  config: EngineConfig;
  n: number;
  accuracy: number;
  /** Precision on the "must not miss" class — BLOCK for Clause. */
  blockPrecision: number;
  blockRecall: number;
  results: CaseResult[];
}
