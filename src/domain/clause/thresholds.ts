/**
 * Baseline calibrated thresholds — a single source of truth, free of server-only
 * imports so both the pipeline and the offline canary CLI can use it without
 * drift. Tuned against the benchmark; changes are gated by `npm run canary`.
 */
import type { Thresholds } from "@/engine/types";

export const BASELINE_THRESHOLDS: Thresholds = { hit: 0.55, escalate: 0.8 } as Thresholds;
