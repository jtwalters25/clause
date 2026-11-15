import { NextRequest, NextResponse } from "next/server";
import { analyze } from "@/domain/clause/pipeline";
import { guardInput, limit, clientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 60;

// The public demo runs without paid keys: the example contracts are served from
// precomputed fixtures, and pasted contracts get a clear message instead of a 500.
const LIVE_ANALYSIS = Boolean(process.env.HF_API_TOKEN && process.env.NEXT_PUBLIC_SUPABASE_URL);

export async function POST(req: NextRequest) {
  if (!LIVE_ANALYSIS) {
    return NextResponse.json(
      { error: "Live analysis is off on this public demo. Try one of the example contracts above, or clone the repo and add your keys to analyze your own." },
      { status: 503 },
    );
  }
  let text: string;
  try {
    ({ text } = await req.json());
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }
  if (!text || typeof text !== "string" || text.trim().length < 20) {
    return NextResponse.json({ error: "paste a contract (min 20 chars)" }, { status: 400 });
  }

  // Demo guards (no-op locally): cap input size, rate-limit per IP.
  const tooBig = guardInput(text);
  if (tooBig) return NextResponse.json({ error: tooBig }, { status: 413 });
  const limited = await limit(clientIp(req));
  if (limited) return NextResponse.json({ error: limited }, { status: 429 });

  try {
    const verdict = await analyze(text);
    return NextResponse.json(verdict);
  } catch (err) {
    console.error("analyze failed", err);
    return NextResponse.json({ error: "analysis failed — check server env" }, { status: 500 });
  }
}
