/**
 * Precompute demo fixtures: run the real analyze() pipeline over every curated
 * example and snapshot the result to src/domain/clause/fixtures.json.
 *
 * The public demo serves these instantly for the example chips — cold-start-proof
 * and zero API cost — while still being genuine engine output. Re-run whenever the
 * examples, playbook, model, or thresholds change:  npm run fixtures
 *
 * Requires the registry to be seeded first (npm run seed).
 */
import { config } from "dotenv";
config({ path: ".env.local" });
import { writeFileSync } from "fs";
import { join } from "path";
import { analyze } from "@/domain/clause/pipeline";
import { EXAMPLES } from "@/domain/clause/examples";
import type { Verdict } from "@/engine/types";

async function main() {
  const fixtures: Record<string, Verdict> = {};
  for (const ex of EXAMPLES) {
    process.stdout.write(`analyzing "${ex.title}"… `);
    const verdict = await analyze(ex.text);
    fixtures[ex.id] = verdict;
    const match = verdict.level === ex.expected ? "✓" : `✗ got ${verdict.level}, expected ${ex.expected}`;
    console.log(`${verdict.level} ${match}`);
  }
  const out = join(process.cwd(), "src/domain/clause/fixtures.json");
  writeFileSync(out, JSON.stringify(fixtures, null, 2) + "\n");
  console.log(`\nwrote ${Object.keys(fixtures).length} fixtures → ${out}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
