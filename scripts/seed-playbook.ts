/**
 * Seed the registry: embed every PLAYBOOK clause and upsert it.
 * Run once after schema.sql:  npm run seed
 */
import { config } from "dotenv";
config({ path: ".env.local" });
import { embedText } from "@/engine/embed";
import { upsertEntries } from "@/engine/store";
import { PLAYBOOK, REGISTRY_VERSION } from "@/domain/clause/playbook";
import type { RegistryEntry } from "@/engine/types";

async function main() {
  const entries: RegistryEntry[] = [];
  for (const clause of PLAYBOOK) {
    process.stdout.write(`embedding ${clause.id}… `);
    const vector = await embedText(clause.content);
    entries.push({
      id: clause.id,
      content: clause.content,
      vector,
      label: clause.label,
      meta: { category: clause.category },
      registryVersion: REGISTRY_VERSION,
    });
    console.log("ok");
  }
  await upsertEntries(entries);
  console.log(`\nseeded ${entries.length} clauses @ ${REGISTRY_VERSION}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
