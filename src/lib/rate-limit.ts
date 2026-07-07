/**
 * Demo protection for the public deploy.
 *
 * The analyze route uses the server's own paid API keys, so an unauthenticated
 * public endpoint is a door anyone can push credits through. Two cheap guards:
 *   - guardInput(): hard cap on input size (reject pathological payloads),
 *   - limit():      per-IP rate limit via Upstash (sliding window).
 *
 * Both degrade gracefully: with no Upstash env (local dev), limit() is a no-op,
 * so nothing here blocks development. Mirrors Provenance's @upstash/ratelimit use.
 */
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

export const MAX_INPUT_CHARS = 8000; // ~a few pages; enough for a real contract

export function guardInput(text: string): string | null {
  if (text.length > MAX_INPUT_CHARS) {
    return `Input too long for the demo (${text.length} chars, max ${MAX_INPUT_CHARS}). Clone the repo to run unbounded.`;
  }
  return null;
}

let limiter: Ratelimit | null = null;
function getLimiter(): Ratelimit | null {
  if (limiter) return limiter;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null; // no Upstash configured → no-op (dev)
  limiter = new Ratelimit({
    redis: new Redis({ url, token }),
    limiter: Ratelimit.slidingWindow(10, "1 m"), // 10 analyses / IP / minute
    prefix: "clause-demo",
  });
  return limiter;
}

/** Returns null if allowed, or a message if rate-limited. */
export async function limit(ip: string): Promise<string | null> {
  const rl = getLimiter();
  if (!rl) return null;
  const { success } = await rl.limit(ip);
  return success ? null : "Rate limit reached for the demo — try again in a minute.";
}

export function clientIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "anon"
  );
}
