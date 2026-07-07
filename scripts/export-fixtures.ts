/**
 * Export the canary fixture — `npm run export-fixtures`
 *
 * Snapshots everything the canary needs to run WITHOUT secrets:
 *   - the registry (playbook clauses + their vectors), pulled from Supabase
 *   - each benchmark case's embedding, computed once via HF
 * written to src/domain/clause/canary-fixture.json. The canary then scores
 * entirely in-memory (matchInMemory + verdict policy) — so it runs in CI with no
 * HF/Supabase keys. Re-run whenever the playbook, benchmark, or model changes.
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { writeFileSync } from "fs";
import { join } from "path";
import { loadCorpus } from "@/engine/store";
import { embedText } from "@/engine/embed";
import { BENCHMARK } from "@/domain/clause/benchmark";
import { REGISTRY_VERSION } from "@/domain/clause/playbook";

async function main() {
  const registry = await loadCorpus(REGISTRY_VERSION);
  if (registry.length === 0) {
    console.error(`no registry for ${REGISTRY_VERSION} — run \`npm run seed\` first.`);
    process.exit(1);
  }
  const cases = [];
  for (const c of BENCHMARK.cases) {
    process.stdout.write(`embedding ${c.id}… `);
    const vector = await embedText(c.text);
    cases.push({ id: c.id, text: c.text, expected: c.expected, vector });
    console.log("ok");
  }
  const out = join(process.cwd(), "src/domain/clause/canary-fixture.json");
  writeFileSync(
    out,
    JSON.stringify({ registryVersion: REGISTRY_VERSION, benchmarkVersion: BENCHMARK.version, registry, cases }, null, 2) + "\n",
  );
  console.log(`\nexported registry(${registry.length}) + cases(${cases.length}) → ${out}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
