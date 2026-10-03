"use client";

import { motion } from "framer-motion";
import { createContext, useContext, useRef } from "react";
import type { ArchitectureArtifact, Artifact, CaseStudyArtifact, ExperienceArtifact, FitArtifact } from "@/lib/content";
import { TOOLS } from "@/lib/content";
import { Label, TrafficLight } from "./primitives";

/** Seconds before the content starts to rise: waits for the panel itself on first open, quick on a swap. */
const BaseDelay = createContext(0);

const rise = {
  hidden: { opacity: 0, y: 10 },
  show: ([i, base]: [number, number]) => ({
    opacity: 1,
    y: 0,
    transition: { delay: base + i * 0.05, duration: 0.45, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

export function ArtifactPanel({
  artifact,
  onClose,
  wide,
  onToggleWide,
}: {
  artifact: Artifact;
  onClose: () => void;
  wide: boolean;
  onToggleWide: () => void;
}) {
  // The first artifact waits for the panel to finish sliding in; later swaps start right away.
  const initialId = useRef(artifact.id);
  const swapped = useRef(false);
  if (artifact.id !== initialId.current) swapped.current = true;
  const base = swapped.current ? 0.08 : 0.2;

  return (
    <div className="flex h-full min-h-0 flex-col bg-card">
      <div className="flex items-center justify-between gap-4 border-b border-line py-3 pl-4 pr-5">
        <div className="group flex items-center gap-2">
          <TrafficLight color="#ff5f57" label="Close (esc)" onClick={onClose} glyph="×" />
          <TrafficLight color="#febc2e" label="Minimize to chat" onClick={onClose} glyph="–" />
          <span className="hidden md:contents">
            <TrafficLight
              color="#28c840"
              label={wide ? "Show chat" : "Full width"}
              onClick={onToggleWide}
              glyph={wide ? "–" : "+"}
            />
          </span>
        </div>
        <div className="flex min-w-0 items-center gap-3 font-mono text-[11px] text-muted">
          <span className="min-w-0 truncate">
            <span className="text-line-strong">artifacts /</span> {artifact.kind}{" "}
            <span className="text-line-strong">/</span> <span className="text-ink">{artifact.id}</span>
          </span>
          <kbd className="hidden shrink-0 rounded border border-line bg-paper px-1.5 py-px text-[10px] text-muted sm:inline">
            esc
          </kbd>
        </div>
      </div>

      <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto px-6 py-7 sm:px-9">
        <BaseDelay.Provider value={base}>
          <ArtifactBody artifact={artifact} />
        </BaseDelay.Provider>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-5 py-2.5 font-mono text-[10.5px] text-muted">
        <span>
          source: <span className="text-ink-2">{artifact.path}</span>
        </span>
        <span>
          via <span className="text-ember-ink">mcp://portfolio-context</span>
        </span>
      </div>
    </div>
  );
}

function ArtifactBody({ artifact }: { artifact: Artifact }) {
  const base = useContext(BaseDelay);
  return (
    <motion.div key={artifact.id} initial="hidden" animate="show" className="mx-auto flex max-w-[860px] flex-col gap-7">
      <motion.header custom={[0, base]} variants={rise} className="flex flex-col gap-2">
        <Label>{artifact.kind.replace("-", " ")}</Label>
        <h3 className="text-[clamp(1.6rem,3vw,2.2rem)] font-medium leading-[1.05] tracking-[-0.03em]">
          {artifact.title}
        </h3>
        <p className="max-w-[56ch] text-[15px] leading-relaxed text-ink-2">{artifact.subtitle}</p>
      </motion.header>

      {artifact.kind === "case-study" && <CaseStudy a={artifact} />}
      {artifact.kind === "experience" && <Experience a={artifact} />}
      {artifact.kind === "architecture" && <Architecture a={artifact} />}
      {artifact.kind === "fit" && <Fit a={artifact} />}
    </motion.div>
  );
}

function CaseStudy({ a }: { a: CaseStudyArtifact }) {
  const base = useContext(BaseDelay);
  return (
    <>
      <motion.dl
        custom={[1, base]}
        variants={rise}
        className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-4"
      >
        {a.meta.map((m) => (
          <div key={m.label} className="bg-card px-3 py-2.5">
            <dt className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted">{m.label}</dt>
            <dd className="mt-0.5 text-[13.5px] text-ink">{m.value}</dd>
          </div>
        ))}
      </motion.dl>
      <motion.div custom={[2, base]} variants={rise} className="grid grid-cols-3 gap-4">
        {a.metrics.map((m) => (
          <div key={m.label} className="flex flex-col gap-1 border-l border-ember pl-3">
            <span className="text-[clamp(1.5rem,3vw,2rem)] font-medium tracking-[-0.03em] tabular-nums">{m.value}</span>
            <span className="text-[12.5px] text-muted">{m.label}</span>
          </div>
        ))}
      </motion.div>
      {a.sections.map((s, i) => (
        <motion.section key={s.heading} custom={[3 + i, base]} variants={rise} className="flex flex-col gap-2">
          <h4 className="font-mono text-[11px] uppercase tracking-[0.08em] text-ember-ink">{s.heading}</h4>
          <p className="max-w-[62ch] text-[15px] leading-[1.65] text-ink-2">{s.body}</p>
        </motion.section>
      ))}
    </>
  );
}

function Experience({ a }: { a: ExperienceArtifact }) {
  const base = useContext(BaseDelay);
  return (
    <ol className="relative flex flex-col gap-6 border-l border-line pl-6">
      {a.roles.map((r, i) => (
        <motion.li key={r.company} custom={[1 + i, base]} variants={rise} className="relative flex flex-col gap-1.5">
          <span
            className={`absolute -left-[29px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-card ${i === 0 ? "bg-ember" : "bg-line-strong"}`}
          />
          <div className="flex flex-wrap items-baseline justify-between gap-x-4">
            <h4 className="text-[16px] font-medium tracking-[-0.01em]">{r.title}</h4>
            <span className="font-mono text-[11px] text-muted tabular-nums">{r.dates}</span>
          </div>
          <span className="text-[13.5px] text-muted">{r.company}</span>
          <p className="max-w-[60ch] text-[14.5px] leading-relaxed text-ink-2">{r.summary}</p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {r.tags.map((t) => (
              <span key={t} className="rounded-full border border-line px-2 py-0.5 font-mono text-[10.5px] text-ink-2">
                {t}
              </span>
            ))}
          </div>
        </motion.li>
      ))}
    </ol>
  );
}

function Node({ title, sub, accent = false }: { title: string; sub: string; accent?: boolean }) {
  return (
    <div className={`rounded-lg border px-3 py-2.5 ${accent ? "border-ember bg-ember-soft" : "border-line bg-paper"}`}>
      <div className="text-[13.5px] font-medium">{title}</div>
      <div className="font-mono text-[10.5px] text-muted">{sub}</div>
    </div>
  );
}

function Wire() {
  return (
    <div className="relative mx-auto h-7 w-px bg-line-strong" aria-hidden>
      <motion.span
        className="absolute -left-[2px] h-[5px] w-[5px] rounded-full bg-ember"
        animate={{ top: ["0%", "100%"], opacity: [0, 1, 0] }}
        transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}

function Architecture({ a }: { a: ArchitectureArtifact }) {
  const base = useContext(BaseDelay);
  return (
    <>
      <motion.div custom={[1, base]} variants={rise} className="rounded-xl border border-line p-4">
        <Node title="Visitor" sub="asks a question in chat" />
        <Wire />
        <div className="rounded-lg border border-ember bg-ember-soft/60 p-3">
          <div className="flex items-center justify-between">
            <span className="text-[13.5px] font-medium">Agent loop</span>
            <span className="font-mono text-[10.5px] text-ember-ink">model + system prompt</span>
          </div>
          <div className="mt-2 grid grid-cols-4 gap-1.5 font-mono text-[10.5px]">
            {["plan", "call tool", "observe", "respond"].map((s, i) => (
              <motion.span
                key={s}
                className="rounded border border-line bg-card px-1.5 py-1 text-center text-ink-2"
                animate={{ borderColor: ["#e5e3df", "#ff5a1f", "#e5e3df"] }}
                transition={{ duration: 2.4, repeat: Infinity, delay: i * 0.6, times: [0, 0.15, 0.4] }}
              >
                {s}
              </motion.span>
            ))}
          </div>
        </div>
        <Wire />
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5 rounded-lg border border-line p-3">
            <span className="font-mono text-[10.5px] uppercase tracking-[0.08em] text-muted">tools</span>
            {TOOLS.slice(0, 4).map((t) => (
              <code key={t.name} className="truncate font-mono text-[11.5px] text-ink-2">
                {t.name}()
              </code>
            ))}
          </div>
          <div className="flex flex-col gap-1.5 rounded-lg border border-line p-3">
            <span className="font-mono text-[10.5px] uppercase tracking-[0.08em] text-muted">mcp server</span>
            <code className="font-mono text-[11.5px] text-ember-ink">portfolio-context</code>
            <code className="font-mono text-[11.5px] text-ink-2">resources: resume, case studies</code>
            <code className="font-mono text-[11.5px] text-ink-2">resources: jd/&lt;role&gt;</code>
          </div>
        </div>
      </motion.div>
      {a.notes.map((n, i) => (
        <motion.section key={n.heading} custom={[2 + i, base]} variants={rise} className="flex flex-col gap-1.5">
          <h4 className="font-mono text-[11px] uppercase tracking-[0.08em] text-ember-ink">{n.heading}</h4>
          <p className="max-w-[62ch] text-[15px] leading-[1.65] text-ink-2">{n.body}</p>
        </motion.section>
      ))}
    </>
  );
}

function Fit({ a }: { a: FitArtifact }) {
  const base = useContext(BaseDelay);
  return (
    <div className="flex flex-col divide-y divide-line rounded-xl border border-line">
      {a.rows.map((r, i) => (
        <motion.div
          key={r.requirement}
          custom={[1 + i, base]}
          variants={rise}
          className="grid gap-2 p-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] sm:gap-5"
        >
          <div className="flex flex-col gap-2">
            <span className="text-[14px] font-medium">{r.requirement}</span>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-paper">
              <motion.div
                className="h-full rounded-full bg-ember"
                initial={{ width: 0 }}
                animate={{ width: `${r.strength * 100}%` }}
                transition={{ delay: base + 0.2 + i * 0.1, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              />
            </div>
            <span className="font-mono text-[10.5px] text-muted tabular-nums">
              match {Math.round(r.strength * 100)}%
            </span>
          </div>
          <p className="min-w-0 text-[14px] leading-relaxed text-ink-2">{r.evidence}</p>
        </motion.div>
      ))}
    </div>
  );
}
