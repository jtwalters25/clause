import { NextRequest, NextResponse } from "next/server";
import { analyze } from "@/domain/clause/pipeline";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  let text: string;
  try {
    ({ text } = await req.json());
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }
  if (!text || typeof text !== "string" || text.trim().length < 20) {
    return NextResponse.json({ error: "paste a contract (min 20 chars)" }, { status: 400 });
  }

  try {
    const verdict = await analyze(text);
    return NextResponse.json(verdict);
  } catch (err) {
    console.error("analyze failed", err);
    return NextResponse.json({ error: "analysis failed — check server env" }, { status: 500 });
  }
}
