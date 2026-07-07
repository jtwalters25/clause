/**
 * "How it works" strip — the pipeline + the shared-engine transplant story.
 *
 * The architecture flex: one domain-agnostic engine (ingest → embed → pgvector
 * kNN) powers both Clause and Echo; only a few seams differ. Marked seams (*) are
 * the domain-specific swaps.
 */
const STAGES = [
  { label: "Ingest", seam: false },
  { label: "Chunk", seam: true, note: "clause splitter" },
  { label: "Embed", seam: false, note: "mpnet 768-d" },
  { label: "pgvector kNN", seam: false, note: "HNSW cosine" },
  { label: "Score", seam: true, note: "verdict policy" },
];

export function HowItWorks() {
  return (
    <section className="mt-12 brutal-box shadow-brutal-lg">
      <div className="border-b-3 border-ink bg-ink px-5 py-2">
        <span className="font-mono text-xs font-bold uppercase tracking-widest text-paper">
          ▓ How it works
        </span>
      </div>

      <div className="p-5">
        <div className="flex flex-wrap items-stretch gap-2">
          {STAGES.map((s, i) => (
            <div key={s.label} className="flex items-stretch gap-2">
              <div
                className={`flex min-w-[7rem] flex-col justify-center border-3 border-ink px-3 py-2 ${
                  s.seam ? "bg-acid" : "bg-white"
                }`}
              >
                <span className="font-mono text-sm font-bold">
                  {s.label}
                  {s.seam && <sup className="text-magenta">*</sup>}
                </span>
                {s.note && <span className="font-mono text-[10px] text-ink/50">{s.note}</span>}
              </div>
              {i < STAGES.length - 1 && (
                <span className="self-center font-mono text-lg font-bold text-ink/40">→</span>
              )}
            </div>
          ))}
        </div>

        <p className="mt-4 font-mono text-xs leading-relaxed text-ink/70">
          <span className="bg-acid px-1 font-bold text-ink">*</span> = domain seam. The rest —
          ingest, embedding, and the pgvector kNN search — is a{" "}
          <span className="font-bold text-ink">domain-agnostic engine</span> shared verbatim with
          its sibling project.
        </p>

        <a
          href="https://github.com/jtwalters25/echo"
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-flex items-center gap-2 border-3 border-ink bg-violet px-3 py-1.5 font-mono text-xs font-bold text-white shadow-brutal-sm transition-transform hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-brutal"
        >
          ▸ Same engine, ranking instead of classification → Echo
        </a>
      </div>
    </section>
  );
}
