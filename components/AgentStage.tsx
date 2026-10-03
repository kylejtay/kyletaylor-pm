"use client";

import { AnimatePresence, animate, motion, useReducedMotion, type Variants } from "framer-motion";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { type Artifact, buildFlows, type Flow, matchFlow, type Role } from "@/lib/content";
import { ArtifactPanel } from "./ArtifactPanel";
import { asciiField } from "./AsciiField";
import { LiveDot } from "./primitives";

type ToolState = { name: string; args: Record<string, string | number>; status: "running" | "done"; ms: number };

type Msg =
  | { id: string; role: "user"; text: string }
  | {
      id: string;
      role: "agent";
      text: string;
      streamed: number;
      reasoning?: string;
      tool?: ToolState;
      card?: { label: string; cta: string; artifact: Artifact };
    };

const EASE = [0.22, 1, 0.36, 1] as const;
/** Starts and ends at rest: for things that travel (the chat card). */
const GLIDE = [0.4, 0, 0.1, 1] as const;
/** Choreography timings, in seconds. */
const T = { introOut: 0.24, glide: 0.65, gap: 0.06, panelIn: 0.5, panelOut: 0.2 };

let uid = 0;
const nextId = () => `m${++uid}`;

/**
 * The whole page: an intro + composer when idle, a chat once the visitor asks
 * something, and a full-height chat | artifact split once they open a result.
 */
export function AgentStage({
  role,
  open,
  setOpen,
}: {
  role: Role;
  open: Artifact | null;
  setOpen: (a: Artifact | null) => void;
}) {
  const flows = useMemo(() => buildFlows(role), [role]);
  const reduce = useReducedMotion();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState("");
  const timers = useRef<number[]>([]);
  const listRef = useRef<HTMLDivElement>(null);
  const started = messages.length > 0;

  const later = (fn: () => void, ms: number) => {
    const id = window.setTimeout(
      () => {
        timers.current = timers.current.filter((t) => t !== id);
        fn();
      },
      reduce ? Math.min(ms, 60) : ms,
    );
    timers.current.push(id);
  };

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  // A different role is a different page: start fresh.
  // biome-ignore lint/correctness/useExhaustiveDependencies: runs only when the role changes
  useEffect(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setMessages([]);
    setOpen(null);
    setBusy(false);
  }, [role]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll to the bottom whenever messages change
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: reduce ? "auto" : "smooth" });
  }, [messages, reduce]);

  // Opening and closing run as separate steps, never overlapping:
  //   open:  intro fades up and out → chat card glides into the left column → artifact slides in
  //   close: artifact slides out → chat card glides back → intro settles back in
  const [split, setSplit] = useState(false);
  const [introVisible, setIntroVisible] = useState(true);
  const [panel, setPanel] = useState<Artifact | null>(null);
  const [wide, setWide] = useState(false);

  const stageRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const glideFrom = useRef<DOMRect | null>(null);

  // Remember where the card is right before the layout flips, so it can glide from there.
  const flip = (next: boolean) => {
    glideFrom.current = reduce ? null : (cardRef.current?.getBoundingClientRect() ?? null);
    setSplit(next);
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: the open/close sequence is driven by `open` alone; split is read as of that moment
  useEffect(() => {
    const ids: number[] = [];
    const at = (fn: () => void, ms: number) => ids.push(window.setTimeout(fn, reduce ? 0 : ms));
    if (open) {
      asciiField.paused = true; // the background holds still while the layout moves
      if (split)
        setPanel(open); // already split: just swap what the panel shows
      else {
        setIntroVisible(false);
        at(() => flip(true), T.introOut * 1000);
        at(() => setPanel(open), (T.introOut + T.glide + T.gap) * 1000);
      }
    } else {
      setPanel(null);
      setWide(false);
      if (!split) {
        setIntroVisible(true);
        asciiField.paused = false;
      } else {
        at(() => flip(false), T.panelOut * 1000);
        at(() => setIntroVisible(true), (T.panelOut + T.glide + T.gap) * 1000);
        at(() => (asciiField.paused = false), (T.panelOut + T.glide + T.gap + 0.6) * 1000);
      }
    }
    return () => ids.forEach(clearTimeout);
  }, [open]);

  // The glide itself. The card is lifted out of the flow and its real box (not a scale
  // transform) animates from the old spot to the new one, so text reflows instead of
  // stretching. Once it lands it drops back into the flow.
  // biome-ignore lint/correctness/useExhaustiveDependencies: measures after each layout flip
  useLayoutEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
    const card = cardRef.current;
    const stage = stageRef.current;
    const from = glideFrom.current;
    glideFrom.current = null;
    if (!card || !stage || !from) return;
    const to = card.getBoundingClientRect();
    const s = stage.getBoundingClientRect();
    const box = (r: DOMRect) => ({ top: r.top - s.top, left: r.left - s.left, width: r.width, height: r.height });
    const a = box(from);
    const b = box(to);
    card.dataset.gliding = "";
    Object.assign(card.style, {
      position: "absolute",
      zIndex: "10",
      maxHeight: "none",
      minHeight: "0",
      top: `${a.top}px`,
      left: `${a.left}px`,
      width: `${a.width}px`,
      height: `${a.height}px`,
    });
    const anim = animate(card, b, { duration: T.glide, ease: GLIDE });
    const settle = () => {
      delete card.dataset.gliding;
      for (const k of ["position", "zIndex", "maxHeight", "minHeight", "top", "left", "width", "height"] as const)
        card.style[k] = "";
      if (list) list.scrollTop = list.scrollHeight;
    };
    anim.then(settle);
    return () => {
      anim.stop();
      settle();
    };
  }, [split]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setOpen]);

  const patch = (id: string, fn: (m: Extract<Msg, { role: "agent" }>) => Partial<Extract<Msg, { role: "agent" }>>) =>
    setMessages((ms) => ms.map((m) => (m.id === id && m.role === "agent" ? { ...m, ...fn(m) } : m)));

  // biome-ignore lint/correctness/useExhaustiveDependencies: later/patch only touch refs and state setters
  const run = useCallback(
    (flow: Flow, text?: string) => {
      if (busy) return;
      setBusy(true);
      const agentId = nextId();
      setMessages((ms) => [...ms, { id: nextId(), role: "user", text: text ?? flow.prompt }]);

      later(
        () =>
          setMessages((ms) => [
            ...ms,
            { id: agentId, role: "agent", text: "", streamed: 0, reasoning: flow.reasoning },
          ]),
        450,
      );
      later(() => patch(agentId, () => ({ tool: { ...flow.tool, status: "running", ms: 0 } })), 1100);
      const ms = 140 + Math.floor(Math.random() * 120);
      later(
        () => patch(agentId, (m) => ({ tool: m.tool && { ...m.tool, status: "done", ms }, text: flow.reply })),
        2200,
      );

      const words = flow.reply.split(" ").length;
      for (let i = 1; i <= words; i++) later(() => patch(agentId, () => ({ streamed: i })), 2250 + i * 36);
      later(
        () => {
          patch(agentId, () => ({ card: { label: flow.cardLabel, cta: flow.cta, artifact: flow.artifact } }));
          setBusy(false);
        },
        2400 + words * 36,
      );
    },
    [busy, reduce],
  );

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text || busy) return;
    setDraft("");
    run(matchFlow(flows, text), text);
  };

  return (
    <div ref={stageRef} className={`relative flex h-full min-h-0 ${split ? "" : "justify-center"}`}>
      {/* Chat column. In split mode its width is a CSS variable so the green window button can fold it away. */}
      <motion.section
        initial={false}
        animate={{ "--chat-open": wide ? 0 : 1, opacity: wide ? 0 : 1 } as never}
        transition={reduce ? { duration: 0 } : { duration: 0.5, ease: GLIDE }}
        className={`relative flex h-full min-h-0 w-full flex-col ${
          split
            ? "md:mr-[calc(var(--chat-open)*16px)] md:w-[calc(var(--chat-open)*340px)] md:shrink-0 lg:w-[calc(var(--chat-open)*380px)] xl:w-[calc(var(--chat-open)*420px)]"
            : "max-w-[760px] justify-center"
        }`}
      >
        {!split && <Intro role={role} visible={introVisible} />}

        <div
          ref={cardRef}
          className={`relative ${split ? "min-h-0 flex-1 md:w-[340px] lg:w-[380px] xl:w-[420px]" : "flex min-h-[300px] max-h-[500px] flex-1 flex-col"}`}
        >
          {/* Soft color behind the glass so it reads as glass. */}
          <div aria-hidden className="pointer-events-none absolute inset-0">
            {/* Radial gradients rather than blur filters: same softness, nothing to re-rasterize mid-glide. */}
            <div className="absolute -left-28 top-[2%] h-96 w-96 bg-[radial-gradient(closest-side,rgb(255_90_31/0.2),transparent)]" />
            <div className="absolute -right-28 -bottom-[6%] h-[26rem] w-[26rem] bg-[radial-gradient(closest-side,rgb(255_90_31/0.15),transparent)]" />
            <div className="absolute left-[22%] top-[38%] h-72 w-[26rem] bg-[radial-gradient(closest-side,rgb(214_211_205/0.6),transparent)]" />
          </div>
          <div
            data-calm="inset"
            className="relative flex h-full min-h-0 flex-1 flex-col overflow-hidden rounded-3xl border border-white/80 bg-white/45 shadow-[0_24px_60px_-30px_rgba(18,18,18,0.3),inset_0_1px_0_rgba(255,255,255,0.9)] ring-1 ring-ink/5"
          >
            {!started && <EmptyState flows={flows} busy={busy} onChip={(f) => run(f)} />}
            {started && (
              <div
                ref={listRef}
                className="scrollbar-none flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-4 py-5 sm:px-6"
              >
                <AnimatePresence initial={false}>
                  {messages.map((m) => (
                    <motion.div
                      key={m.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.35, ease: EASE }}
                    >
                      {m.role === "user" ? (
                        <UserBubble text={m.text} />
                      ) : (
                        <AgentMessage msg={m} openId={open?.id} onOpen={setOpen} />
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
            <Composer
              flows={flows}
              busy={busy}
              draft={draft}
              setDraft={setDraft}
              onChip={(f) => run(f)}
              onSubmit={submit}
              started={started}
            />
          </div>
        </div>
      </motion.section>

      {/* Artifact column: enters only after the chat card has landed, leaves before it moves back. */}
      <AnimatePresence>
        {panel && (
          <motion.aside
            key="panel"
            initial={{ opacity: 0, x: 28, scale: 0.985 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 20, scale: 0.99, transition: { duration: T.panelOut, ease: [0.4, 0, 1, 1] } }}
            transition={reduce ? { duration: 0 } : { duration: T.panelIn, ease: EASE }}
            style={{ originX: 0 }}
            className="fixed inset-x-3 bottom-3 top-[calc(env(safe-area-inset-top,0px)+3.75rem)] z-40 min-w-0 md:relative md:inset-auto md:z-auto md:h-full md:flex-1"
          >
            <div
              data-calm
              className="h-full overflow-hidden rounded-3xl border border-line bg-card shadow-[0_30px_80px_-30px_rgba(18,18,18,0.35)] md:shadow-[0_20px_60px_-40px_rgba(18,18,18,0.3)]"
            >
              <ArtifactPanel
                artifact={panel}
                onClose={() => setOpen(null)}
                wide={wide}
                onToggleWide={() => setWide((w) => !w)}
              />
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </div>
  );
}

// The orange highlight sweeps in once per visit, not every time the intro comes back.
let highlightSwept = false;

const introVariants: Variants = {
  hide: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.02 } },
};
const introItem: Variants = {
  hide: { opacity: 0, y: -14, transition: { duration: T.introOut, ease: [0.4, 0, 1, 1] } },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE } },
};

function Intro({ role, visible }: { role: Role; visible: boolean }) {
  const [sweep] = useState(() => !highlightSwept);
  return (
    <motion.div
      variants={introVariants}
      initial={visible ? "enter" : "hide"}
      animate={visible ? "show" : "hide"}
      data-calm
      className="mb-7 flex shrink-0 flex-col items-center text-center sm:mb-9"
    >
      <motion.span
        variants={{ ...introItem, enter: { opacity: 0, y: 12 } }}
        className="mb-4 flex items-center gap-2 rounded-full border border-line bg-card/90 py-1 pl-2 pr-3 font-mono text-[11px] text-ink-2 backdrop-blur"
      >
        <LiveDot className="scale-75" /> hello, {role.company} team
      </motion.span>
      <motion.h1
        variants={{ ...introItem, enter: { opacity: 0, y: 12 } }}
        className="whitespace-nowrap text-[clamp(3.4rem,min(11vw,17vh),9rem)] font-medium leading-[0.92] tracking-[-0.06em]"
      >
        Hi, I&apos;m Kyle<span className="text-ember">.</span>
      </motion.h1>
      <motion.p
        variants={{ ...introItem, enter: { opacity: 0, y: 12 } }}
        className="mt-5 max-w-[40ch] text-[clamp(1.2rem,2.3vw,1.75rem)] font-medium leading-[1.2] tracking-[-0.03em] text-muted"
      >
        Frontier models changed how quickly we can ship, but product taste and{" "}
        <motion.span
          initial={sweep ? { backgroundSize: "0% 100%", color: "#121212" } : false}
          animate={{ backgroundSize: "100% 100%", color: "#ffffff" }}
          transition={{ duration: 0.7, delay: 0.6, ease: EASE }}
          onAnimationComplete={() => (highlightSwept = true)}
          className="rounded-md bg-ember bg-no-repeat px-1.5 sm:whitespace-nowrap [box-decoration-break:clone] [-webkit-box-decoration-break:clone]"
          style={{
            backgroundImage: "linear-gradient(var(--color-ember), var(--color-ember))",
            backgroundColor: "transparent",
          }}
        >
          building the right thing
        </motion.span>{" "}
        are more important than ever.
      </motion.p>
    </motion.div>
  );
}

function EmptyState({ flows, busy, onChip }: { flows: Flow[]; busy: boolean; onChip: (f: Flow) => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6, delay: 0.3 }}
      className="flex min-h-0 flex-1 flex-col items-center justify-center gap-5 overflow-hidden px-5 py-6"
    >
      <Orbit />
      <p className="text-[17px] font-medium tracking-[-0.02em] text-ink">What would you like to know?</p>
      <div className="flex max-w-[560px] flex-wrap justify-center gap-2">
        {flows.map((f, i) => (
          <motion.button
            key={f.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.45 + i * 0.06, ease: EASE }}
            onClick={() => onChip(f)}
            disabled={busy}
            className="rounded-full border border-line/80 bg-white/60 px-3.5 py-1.5 text-[13px] text-ink-2 transition-colors hover:border-ink hover:bg-card hover:text-ink disabled:opacity-40"
          >
            {f.chip}
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}

/** The agent mark with a few "tools" orbiting it. */
function Orbit() {
  const reduce = useReducedMotion();
  return (
    <div
      className="relative grid h-[92px] w-[92px] shrink-0 place-items-center [@media(max-height:760px)]:hidden"
      aria-hidden
    >
      <svg className="absolute inset-0" viewBox="0 0 92 92" fill="none" aria-hidden>
        <circle cx="46" cy="46" r="40" stroke="var(--color-line-strong)" strokeDasharray="2 5" />
        <circle cx="46" cy="46" r="27" stroke="var(--color-line)" />
      </svg>
      {[
        { r: 40, size: 7, dur: 14, delay: 0, color: "bg-ember" },
        { r: 40, size: 5, dur: 14, delay: -7, color: "bg-ink" },
        { r: 27, size: 5, dur: 9, delay: -3, color: "bg-line-strong" },
      ].map((d, i) => (
        <motion.div
          // biome-ignore lint/suspicious/noArrayIndexKey: static list
          key={i}
          className="absolute inset-0"
          animate={reduce ? undefined : { rotate: 360 }}
          transition={{ duration: d.dur, repeat: Infinity, ease: "linear", delay: d.delay }}
        >
          <span
            className={`absolute left-1/2 rounded-full ${d.color}`}
            style={{ width: d.size, height: d.size, top: 46 - d.r - d.size / 2, marginLeft: -d.size / 2 }}
          />
        </motion.div>
      ))}
      <AgentMark size={40} />
    </div>
  );
}

export function AgentMark({ size = 28 }: { size?: number }) {
  return (
    <span className="grid place-items-center rounded-md bg-ink text-white" style={{ width: size, height: size }}>
      <svg width={size * 0.55} height={size * 0.55} viewBox="0 0 16 16" fill="none" aria-hidden>
        <path d="M3 3v10M3 8l6-5M3 8l6 5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        <circle cx="12.5" cy="8" r="1.6" fill="#ff5a1f" />
      </svg>
    </span>
  );
}

function UserBubble({ text }: { text: string }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[85%] rounded-2xl rounded-br-md bg-ink px-4 py-2.5 text-[14.5px] leading-relaxed text-white">
        {text}
      </div>
    </div>
  );
}

function AgentMessage({
  msg,
  openId,
  onOpen,
}: {
  msg: Extract<Msg, { role: "agent" }>;
  openId?: string;
  onOpen: (a: Artifact) => void;
}) {
  const words = msg.text ? msg.text.split(" ") : [];
  const shown = words.slice(0, msg.streamed).join(" ");
  const streaming = msg.text && msg.streamed < words.length;
  const thinking = !msg.text && !msg.tool;

  return (
    <div className="flex max-w-[95%] flex-col gap-2.5">
      {msg.reasoning && (
        <div className="flex items-start gap-2 font-mono text-[11px] leading-relaxed text-muted">
          <span className="text-ember">↳</span>
          {thinking ? <span className="shimmer-text">{msg.reasoning}</span> : <span>{msg.reasoning}</span>}
        </div>
      )}
      {msg.tool && <ToolCall tool={msg.tool} />}
      {msg.text && (
        <p className="text-[15px] leading-relaxed text-ink">
          {shown}
          {streaming && (
            <span className="ml-0.5 inline-block h-[1.05em] w-[7px] translate-y-[2px] bg-ember animate-blink" />
          )}
        </p>
      )}
      <AnimatePresence>
        {msg.card && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.45, ease: EASE }}
          >
            <ResultCard card={msg.card} active={openId === msg.card.artifact.id} fresh={!openId} onOpen={onOpen} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ToolCall({ tool }: { tool: ToolState }) {
  const args = Object.entries(tool.args)
    .map(([k, v]) => `${k}: ${typeof v === "string" ? `"${v}"` : v}`)
    .join(", ");
  const running = tool.status === "running";
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-2.5 overflow-hidden rounded-lg border border-line bg-paper px-3 py-2 font-mono text-[11.5px]"
    >
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${running ? "bg-ember animate-pulse" : "bg-ok"}`} />
      <span className="min-w-0 flex-1 truncate">
        <span className="text-ember-ink">{tool.name}</span>
        <span className="text-muted">({args})</span>
      </span>
      <span className="shrink-0 tabular-nums text-muted">
        {running ? <span className="shimmer-text">running</span> : `✓ ${tool.ms}ms`}
      </span>
    </motion.div>
  );
}

function ResultCard({
  card,
  active,
  fresh,
  onOpen,
}: {
  card: { label: string; cta: string; artifact: Artifact };
  active: boolean;
  fresh: boolean;
  onOpen: (a: Artifact) => void;
}) {
  return (
    <div
      className={`group relative flex items-stretch overflow-hidden rounded-xl border bg-card transition-colors ${active ? "border-ember" : "border-line hover:border-line-strong"}`}
    >
      <CardGlyph kind={card.artifact.kind} />
      <div className="flex min-w-0 flex-1 flex-col gap-2 p-3">
        <div className="flex min-w-0 flex-col">
          <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-ember-ink">{card.label}</span>
          <span className="truncate text-[14.5px] font-medium tracking-[-0.01em]">{card.artifact.title}</span>
          <span className="line-clamp-1 text-[12.5px] text-muted">{card.artifact.subtitle}</span>
        </div>
        <button
          type="button"
          onClick={() => onOpen(card.artifact)}
          disabled={active}
          className="relative inline-flex w-fit items-center gap-1.5 rounded-md bg-ink px-2.5 py-1.5 text-[12.5px] font-medium text-white transition-transform hover:-translate-y-px active:translate-y-0 disabled:bg-ember"
        >
          {fresh && <span className="absolute inset-0 rounded-md animate-ring-pulse" aria-hidden />}
          <span className="relative">{active ? "Viewing" : card.cta}</span>
          {!active && (
            <span className="relative transition-transform group-hover:translate-x-0.5" aria-hidden>
              →
            </span>
          )}
        </button>
      </div>
    </div>
  );
}

const GLYPHS: Record<Artifact["kind"], string[]> = {
  "case-study": ["╔═╗ ▓▓", "║▒║ ░▓", "╚═╝ ▓░"],
  experience: ["●──○", "│  ", "○──○"],
  architecture: ["┌─┐", "├┼┤", "└─┘"],
  fit: ["▇▇▇▇▁", "▇▇▇▁▁", "▇▇▇▇▇"],
};

function CardGlyph({ kind }: { kind: Artifact["kind"] }) {
  return (
    <div className="relative hidden w-[84px] shrink-0 items-center justify-center overflow-hidden border-r border-line bg-paper sm:flex">
      <div className="bg-rule absolute inset-0 opacity-60 [background-size:12px_12px]" />
      <pre className="relative font-mono text-[11px] leading-[1.15] text-ember-ink">{GLYPHS[kind].join("\n")}</pre>
    </div>
  );
}

function Composer({
  flows,
  busy,
  draft,
  setDraft,
  onChip,
  onSubmit,
  started,
}: {
  flows: Flow[];
  busy: boolean;
  draft: string;
  setDraft: (s: string) => void;
  onChip: (f: Flow) => void;
  onSubmit: (e: React.FormEvent) => void;
  started: boolean;
}) {
  return (
    <div className={`px-3 pb-3 sm:px-4 sm:pb-4 ${started ? "border-t border-white/70 pt-2.5" : ""}`}>
      {started && (
        <div className="scrollbar-none -mx-1 mb-2.5 flex gap-1.5 overflow-x-auto px-1 [mask-image:linear-gradient(to_right,black_88%,transparent)]">
          {flows.map((f) => (
            <button
              type="button"
              key={f.id}
              onClick={() => onChip(f)}
              disabled={busy}
              className="shrink-0 rounded-full border border-line bg-paper px-3 py-1 text-[12.5px] text-ink-2 transition-colors hover:border-ink hover:text-ink disabled:opacity-40"
            >
              {f.chip}
            </button>
          ))}
        </div>
      )}
      <form
        onSubmit={onSubmit}
        className="flex items-end gap-2 rounded-2xl border border-ember/60 bg-white/85 py-2 pl-4 pr-2 transition-colors animate-glow focus-within:border-ember"
      >
        <label htmlFor="agent-input" className="sr-only">
          Ask Kyle anything
        </label>
        <textarea
          id="agent-input"
          rows={started ? 1 : 2}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              e.currentTarget.form?.requestSubmit();
            }
          }}
          placeholder={started ? "Ask a follow-up…" : "Ask me anything…"}
          className="scrollbar-none max-h-32 min-w-0 flex-1 resize-none bg-transparent py-1.5 text-[15px] leading-relaxed text-ink outline-none placeholder:text-muted"
          autoComplete="off"
        />
        <button
          type="submit"
          disabled={busy || !draft.trim()}
          className="mb-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-ember text-white transition-opacity disabled:opacity-30"
          aria-label="Send"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
            <path
              d="M8 13V3M3.5 7.5L8 3l4.5 4.5"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </form>
    </div>
  );
}
