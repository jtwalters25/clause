/**
 * Embedding — chunk content → vectors via HuggingFace Inference API.
 *
 * Lifted from the Guardian engine: batched, retried with backoff, model-agnostic.
 * Clause uses a general-purpose model (all-mpnet-base-v2), not academic SPECTER2.
 * The model name lives in config so a swap is a one-line change the canary gates.
 */
import { HfInference } from "@huggingface/inference";
import type { Chunk, EmbeddedChunk, Vector } from "./types";
import { sealChunk } from "./hash";

const BATCH = 8;

function client(): HfInference {
  const token = process.env.HF_API_TOKEN;
  if (!token) throw new Error("HF_API_TOKEN is not set");
  return new HfInference(token);
}

async function embedBatch(hf: HfInference, model: string, inputs: string[]): Promise<Vector[]> {
  // featureExtraction returns number[] for one input, number[][] for many.
  const out = (await hf.featureExtraction({ model, inputs })) as number[] | number[][];
  return Array.isArray(out[0]) ? (out as number[][]) : [out as number[]];
}

async function withRetry<T>(fn: () => Promise<T>, tries = 3): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < tries; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      await new Promise((r) => setTimeout(r, 2 ** i * 500));
    }
  }
  throw lastErr;
}

/** Embed already-sealed chunks. Preserves order; batches to respect rate limits. */
export async function embedChunks(
  chunks: Chunk[],
  model = process.env.EMBED_MODEL ?? "sentence-transformers/all-mpnet-base-v2",
): Promise<EmbeddedChunk[]> {
  const hf = client();
  const result: EmbeddedChunk[] = [];
  for (let i = 0; i < chunks.length; i += BATCH) {
    const slice = chunks.slice(i, i + BATCH);
    const vectors = await withRetry(() => embedBatch(hf, model, slice.map((c) => c.content)));
    slice.forEach((c, j) => result.push({ ...c, vector: vectors[j], hash: c.hash ?? sealChunk(c) }));
  }
  return result;
}

/** Embed a single free-text query (registry seeding, ad-hoc lookups). */
export async function embedText(text: string, model?: string): Promise<Vector> {
  const [v] = await embedChunks([{ index: 0, content: text }], model);
  return v.vector;
}
