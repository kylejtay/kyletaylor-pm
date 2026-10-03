"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import { CAREER_LEVELS, type CareerLevel } from "@/lib/content";
import { Invaders } from "./Invaders";
import { TrafficLight } from "./primitives";
import { type ObstacleResult, Runner } from "./Runner";

type Rect = { top: number; left: number; width: number; height: number };

const EASE = [0.76, 0, 0.24, 1] as const;

/**
 * A game controller parked in the bottom-right corner. Hover tilts it; click
 * launches "game mode", a window that grows out of the controller into the same
 * spot the artifact panel uses (under the header, page peeking around it) and
 * shrinks back into it on exit.
 */
export function GameMode({ hidden = false }: { hidden?: boolean }) {
  const reduce = useReducedMotion();
  const btnRef = useRef<HTMLButtonElement>(null);
  const [from, setFrom] = useState<Rect | null>(null);
  const [open, setOpen] = useState(false);
  const [hover, setHover] = useState(false);
  const [vp, setVp] = useState({ w: 0, h: 0 });

  // Same inset as the artifact panel: below the 72px header, page gutters on the other sides.
  const gutter = vp.w >= 640 ? 20 : 12;
  const target = { top: 72, left: gutter, width: vp.w - gutter * 2, height: vp.h - 72 - gutter };

  useEffect(() => {
    const read = () => setVp({ w: window.innerWidth, h: window.innerHeight });
    read();
    window.addEventListener("resize", read);
    return () => window.removeEventListener("resize", read);
  }, []);

  const launch = () => {
    const r = btnRef.current?.getBoundingClientRect();
    if (!r) return;
    setFrom({ top: r.top, left: r.left, width: r.width, height: r.height });
    setOpen(true);
  };
  const exit = useCallback(() => {
    // Re-measure in case the window was resized while playing.
    const r = btnRef.current?.getBoundingClientRect();
    if (r) setFrom({ top: r.top, left: r.left, width: r.width, height: r.height });
    setOpen(false);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && exit();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, exit]);

  return (
    <>
      <motion.button
        ref={btnRef}
        type="button"
        aria-label="Launch game mode"
        onClick={launch}
        onHoverStart={() => setHover(true)}
        onHoverEnd={() => setHover(false)}
        onFocus={() => setHover(true)}
        onBlur={() => setHover(false)}
        className="fixed bottom-6 right-6 z-40 hidden w-[112px] cursor-pointer rounded-2xl outline-offset-4 lg:block"
        style={{ perspective: 600 }}
        initial={false}
        animate={{
          opacity: open || hidden ? 0 : 1,
          scale: hidden ? 0.8 : 1,
          pointerEvents: open || hidden ? "none" : "auto",
        }}
        // Comes back only after the chat has glided home and the intro has settled.
        transition={{ duration: open ? 0.15 : 0.4, delay: open || hidden ? 0 : 1.2 }}
      >
        <AnimatePresence>
          {hover && !open && (
            <motion.span
              initial={{ opacity: 0, y: 6, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 4, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-ink px-2 py-1 font-mono text-[10.5px] uppercase tracking-[0.12em] text-white"
            >
              <span className="animate-blink text-ember">▶</span> press start
            </motion.span>
          )}
        </AnimatePresence>
        <motion.div
          animate={
            reduce
              ? {}
              : hover
                ? { rotateX: 18, rotateY: -24, rotateZ: -10, scale: 1.12, y: -6 }
                : { rotateX: 0, rotateY: 0, rotateZ: [0, -2, 0, 2, 0], scale: 1, y: [0, -3, 0] }
          }
          transition={
            hover
              ? { type: "spring", stiffness: 260, damping: 14 }
              : { duration: 5, repeat: Infinity, ease: "easeInOut" }
          }
          style={{ transformStyle: "preserve-3d" }}
        >
          <Controller active={hover} />
        </motion.div>
      </motion.button>

      <AnimatePresence>
        {open && from && (
          <motion.div
            key="game"
            role="dialog"
            aria-modal="true"
            aria-label="Game mode"
            className="fixed z-[25] overflow-hidden border border-line bg-card text-ink shadow-[0_30px_80px_-30px_rgba(18,18,18,0.35)]"
            initial={{ ...from, borderRadius: 28 }}
            animate={{ ...target, borderRadius: 24, opacity: 1 }}
            exit={{
              ...from,
              borderRadius: 28,
              opacity: [1, 1, 0],
              transition: reduce
                ? { duration: 0 }
                : { duration: 0.6, ease: EASE, delay: 0.12, opacity: { duration: 0.72, times: [0, 0.85, 1] } },
            }}
            transition={reduce ? { duration: 0 } : { duration: 0.65, ease: EASE }}
          >
            {/* Laid out at full size and clipped, so nothing reflows while the window grows. */}
            <motion.div
              className="absolute left-0 top-0"
              style={{ width: target.width, height: target.height }}
              exit={{ opacity: 0, transition: { duration: 0.15 } }}
            >
              <GameWindow onExit={exit} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

/* ------------------------------ The controller ----------------------------- */

function Controller({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 240 160" className="block w-full drop-shadow-[0_14px_18px_rgba(18,18,18,0.28)]" aria-hidden>
      <defs>
        <linearGradient id="gc-body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fbfaf8" />
          <stop offset="0.55" stopColor="#e9e6e1" />
          <stop offset="1" stopColor="#cfcac2" />
        </linearGradient>
        <linearGradient id="gc-shoulder" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#4a4744" />
          <stop offset="1" stopColor="#1d1c1b" />
        </linearGradient>
        <radialGradient id="gc-stick" cx="0.4" cy="0.35" r="0.7">
          <stop offset="0" stopColor="#5a5754" />
          <stop offset="0.6" stopColor="#262524" />
          <stop offset="1" stopColor="#111" />
        </radialGradient>
        <radialGradient id="gc-well" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0.6" stopColor="#bdb8b0" />
          <stop offset="1" stopColor="#e4e1dc" />
        </radialGradient>
        <linearGradient id="gc-shine" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.9" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Shoulder buttons */}
      <rect x="38" y="10" width="54" height="18" rx="9" fill="url(#gc-shoulder)" />
      <rect x="148" y="10" width="54" height="18" rx="9" fill="url(#gc-shoulder)" />

      {/* Body */}
      <path
        d="M62 20 C 42 20, 29 26, 23 40 C 13 62, 5 96, 7 120 C 9 140, 23 150, 37 148 C 51 146, 59 131, 71 119 C 79 111, 89 107, 101 107 L139 107 C 151 107, 161 111, 169 119 C 181 131, 189 146, 203 148 C 217 150, 231 140, 233 120 C 235 96, 227 62, 217 40 C 211 26, 198 20, 178 20 Z"
        fill="url(#gc-body)"
        stroke="#b9b3aa"
        strokeWidth="1.2"
      />
      {/* Grip shading */}
      <path
        d="M7 120 C 9 140, 23 150, 37 148 C 51 146, 59 131, 71 119 C 60 128, 45 136, 32 132 C 18 128, 12 112, 10 96 Z M233 120 C 231 140, 217 150, 203 148 C 189 146, 181 131, 169 119 C 180 128, 195 136, 208 132 C 222 128, 228 112, 230 96 Z"
        fill="#000"
        opacity="0.08"
      />
      {/* Top highlight */}
      <path
        d="M64 24 C 46 24, 34 30, 29 42 C 60 34, 180 34, 211 42 C 206 30, 194 24, 176 24 Z"
        fill="url(#gc-shine)"
        opacity="0.8"
      />

      {/* D-pad */}
      <circle cx="64" cy="64" r="22" fill="url(#gc-well)" />
      <path
        d="M58 48 h12 a2 2 0 0 1 2 2 v10 h10 a2 2 0 0 1 2 2 v12 a2 2 0 0 1 -2 2 h-10 v10 a2 2 0 0 1 -2 2 h-12 a2 2 0 0 1 -2 -2 v-10 h-10 a2 2 0 0 1 -2 -2 v-12 a2 2 0 0 1 2 -2 h10 v-10 a2 2 0 0 1 2 -2 z"
        fill="#222120"
      />
      <path d="M58 49 h12 v11 M45 62 h11" stroke="#fff" strokeOpacity="0.18" strokeWidth="1.2" fill="none" />
      <circle cx="64" cy="68" r="3" fill="#3a3836" />

      {/* Face buttons */}
      <circle cx="176" cy="64" r="24" fill="url(#gc-well)" />
      {[
        { cx: 176, cy: 49, c: "#e8b321", l: "Y" },
        { cx: 161, cy: 64, c: "#3b82c4", l: "X" },
        { cx: 191, cy: 64, c: "#e0483a", l: "B" },
        { cx: 176, cy: 79, c: "#3aa55c", l: "A" },
      ].map((b, i) => (
        <motion.g
          key={b.l}
          animate={active ? { y: [0, 1.5, 0] } : { y: 0 }}
          transition={
            active ? { duration: 0.35, repeat: Infinity, repeatDelay: 0.8, delay: i * 0.18 } : { duration: 0.2 }
          }
        >
          <circle cx={b.cx} cy={b.cy + 1.5} r="7.5" fill="#000" opacity="0.25" />
          <circle cx={b.cx} cy={b.cy} r="7.5" fill={b.c} />
          <circle cx={b.cx - 2} cy={b.cy - 2.5} r="2.6" fill="#fff" opacity="0.45" />
          <text
            x={b.cx}
            y={b.cy + 3}
            textAnchor="middle"
            fontSize="8"
            fontWeight="700"
            fill="#fff"
            opacity="0.85"
            fontFamily="ui-sans-serif, system-ui"
          >
            {b.l}
          </text>
        </motion.g>
      ))}

      {/* Center: select, start, home */}
      <rect x="100" y="56" width="14" height="6" rx="3" fill="#3a3836" />
      <rect x="126" y="56" width="14" height="6" rx="3" fill="#3a3836" />
      <circle cx="120" cy="40" r="7" fill="#1d1c1b" />
      <motion.circle
        cx="120"
        cy="40"
        r="3"
        fill="#ff5a1f"
        animate={{ opacity: active ? [1, 0.4, 1] : 1 }}
        transition={{ duration: 0.9, repeat: active ? Infinity : 0 }}
      />

      {/* Thumbsticks */}
      {[92, 148].map((x, i) => (
        <g key={x}>
          <circle cx={x} cy="92" r="15" fill="#2b2a28" />
          <motion.g
            animate={active ? { x: [0, 3, -2, 0], y: [0, -2, 2, 0] } : { x: 0, y: 0 }}
            transition={active ? { duration: 1.2, repeat: Infinity, delay: i * 0.3 } : { duration: 0.3 }}
          >
            <circle cx={x} cy="92" r="11" fill="url(#gc-stick)" />
            <circle cx={x} cy="92" r="7" fill="none" stroke="#4d4a47" strokeWidth="1" />
          </motion.g>
        </g>
      ))}
    </svg>
  );
}

/* ------------------------------ The game window ---------------------------- */

type Outcome = boolean | null; // true cleared, false tripped, null not reached yet

/**
 * Career Quest: one runner level per job. Obstacles are the problems from that
 * job; clearing or tripping on one shows what Kyle did about it, and each level
 * ends with a recap of the role.
 */
function GameWindow({ onExit }: { onExit: () => void }) {
  const [mode, setMode] = useState<"runner" | "invaders">("runner");
  const [game, setGame] = useState(0); // bump to restart from the top
  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState<"play" | "recap" | "done">("play");
  const [outcomes, setOutcomes] = useState<Outcome[][]>(() => CAREER_LEVELS.map((l) => l.obstacles.map(() => null)));
  const [toast, setToast] = useState<{ i: number; cleared: boolean } | null>(null);
  const [scores, setScores] = useState<number[]>([]);
  const level = CAREER_LEVELS[idx];
  const base = scores.reduce((a, b) => a + b, 0);
  const last = idx === CAREER_LEVELS.length - 1;

  // The short pause between finishing a level and its recap; cancelled on restart or exit.
  const recapTimer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(recapTimer.current), []);

  const restart = () => {
    window.clearTimeout(recapTimer.current);
    setGame((g) => g + 1);
    setIdx(0);
    setPhase("play");
    setOutcomes(CAREER_LEVELS.map((l) => l.obstacles.map(() => null)));
    setToast(null);
    setScores([]);
  };
  const next = useCallback(() => {
    setToast(null);
    if (last) setPhase("done");
    else {
      setIdx((i) => i + 1);
      setPhase("play");
    }
  }, [last]);

  // Enter or space moves on from a recap (after a beat, so a held jump doesn't skip it).
  useEffect(() => {
    if (phase !== "recap") return;
    const ready = performance.now() + 700;
    const onKey = (e: KeyboardEvent) => {
      if ((e.code === "Enter" || e.code === "Space") && performance.now() > ready) {
        e.preventDefault();
        next();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, next]);

  const onResult = useCallback(
    ({ index, cleared }: ObstacleResult) => {
      setOutcomes((o) => o.map((row, li) => (li === idx ? row.map((v, oi) => (oi === index ? cleared : v)) : row)));
      setToast({ i: index, cleared });
    },
    [idx],
  );
  const onFinish = useCallback(
    (score: number) => {
      setScores((s) => [...s.slice(0, idx), score]);
      window.clearTimeout(recapTimer.current);
      recapTimer.current = window.setTimeout(() => setPhase("recap"), 650);
    },
    [idx],
  );

  const row = outcomes[idx];
  const cleared = outcomes.flat().filter((v) => v === true).length;
  const total = outcomes.flat().length;

  return (
    <div className="flex h-full flex-col bg-paper text-ink">
      {/* Title bar */}
      <div className="flex h-12 shrink-0 items-center gap-3 border-b border-line bg-card px-4">
        <div className="group flex items-center gap-2">
          <TrafficLight color="#ff5f57" label="Exit game mode" onClick={onExit} glyph="×" />
          <TrafficLight color="#febc2e" label="Minimize to controller" onClick={onExit} glyph="–" />
          <TrafficLight color="#28c840" label="Restart from level 1-1" onClick={restart} glyph="↺" />
        </div>
        <div className="hidden flex-1 text-center font-mono text-[12px] text-muted sm:block">
          kyle.exe — career quest
        </div>
        {/* Which game tells the story */}
        <div
          className="ml-auto flex rounded-full border border-line bg-paper p-0.5 font-mono text-[10.5px] sm:ml-0"
          role="radiogroup"
          aria-label="Game style"
        >
          {(["runner", "invaders"] as const).map((m) => (
            // biome-ignore lint/a11y/useSemanticElements: styled segmented control using the ARIA radio pattern
            <button
              type="button"
              key={m}
              role="radio"
              aria-checked={mode === m}
              onClick={(e) => {
                e.currentTarget.blur(); // keep space for the game, not the button
                if (m === mode) return;
                setMode(m);
                restart();
              }}
              className={`rounded-full px-2.5 py-1 transition-colors ${mode === m ? "bg-ink text-white" : "text-muted hover:text-ink"}`}
            >
              {m}
            </button>
          ))}
        </div>
        {/* One pip per level */}
        <div
          className="flex w-[60px] items-center justify-end gap-1"
          role="img"
          aria-label={`Level ${idx + 1} of ${CAREER_LEVELS.length}`}
        >
          {CAREER_LEVELS.map((l, i) => (
            <span
              key={l.world}
              className={`h-1.5 w-1.5 rounded-full ${i < idx || phase === "done" ? "bg-ink/60" : i === idx ? "bg-ember" : "bg-line-strong"}`}
            />
          ))}
        </div>
      </div>

      {/* Screen */}
      <div className="relative flex min-h-0 flex-1 flex-col bg-paper">
        <div className="pointer-events-none absolute left-6 top-5 z-10 flex flex-col gap-1.5 sm:left-8 sm:top-7">
          <span className="font-pixel text-[10px] tracking-[0.12em] text-[#535353] sm:text-[11px]">
            LEVEL {level.world} <span className="text-ember">·</span> {level.company.toUpperCase()}
          </span>
          <span className="font-mono text-[11px] text-muted">
            {level.title} · {level.years}
          </span>
          {/* One box per obstacle in this level */}
          <div className="mt-1 flex gap-1.5">
            {row.map((v, i) => (
              <span
                // biome-ignore lint/suspicious/noArrayIndexKey: fixed-length row; position is the identity
                key={i}
                className={`h-2.5 w-2.5 border ${v === true ? "border-ember bg-ember" : v === false ? "border-[#e5484d] bg-[#e5484d]" : "border-[#535353]/50"}`}
              />
            ))}
          </div>
        </div>

        {/* What Kyle did, revealed by the obstacle just passed */}
        <div className="pointer-events-none absolute inset-x-0 top-[13%] z-10 flex justify-center px-6">
          <AnimatePresence mode="wait">
            {toast && phase === "play" && (
              <motion.div
                key={`${idx}-${toast.i}`}
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6, transition: { duration: 0.15 } }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                className="flex max-w-[560px] flex-col gap-1.5 rounded-xl border border-line bg-card px-5 py-3.5 shadow-[0_12px_30px_-18px_rgba(18,18,18,0.35)]"
              >
                <span
                  className={`font-pixel text-[9px] tracking-[0.1em] ${toast.cleared ? "text-ember" : "text-[#e5484d]"}`}
                >
                  {toast.cleared ? "+100 · CLEARED" : mode === "runner" ? "−50 · TRIPPED ON" : "−50 · BROKE THROUGH"}{" "}
                  {level.obstacles[toast.i].label.toUpperCase()}
                </span>
                <span className="text-[13px] italic text-muted">{level.obstacles[toast.i].quip}</span>
                <p className="text-[15px] leading-snug text-ink">{level.obstacles[toast.i].win}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="min-h-0 flex-1">
          {(() => {
            const Game = mode === "runner" ? Runner : Invaders;
            return (
              <Game
                key={`${mode}-${game}-${idx}`}
                level={level}
                countdown={idx === 0}
                startDelay={idx === 0 && game === 0 ? 0.9 : 0.3}
                baseScore={base - (scores[idx] ?? 0)}
                onResult={onResult}
                onFinish={onFinish}
              />
            );
          })()}
        </div>
        <span className="pointer-events-none absolute inset-x-0 bottom-4 text-center font-mono text-[11px] text-muted">
          {mode === "runner" ? "space to jump · esc to exit" : "← → to move · space to fire · esc to exit"}
        </span>

        <AnimatePresence>
          {phase !== "play" && (
            <motion.div
              key={phase === "done" ? "done" : `recap-${idx}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.15 } }}
              className="absolute inset-0 z-20 grid place-items-center bg-paper/75 p-4"
            >
              <motion.div
                initial={{ opacity: 0, y: 14, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1], delay: 0.05 }}
                className="scrollbar-none flex max-h-full w-full max-w-[600px] flex-col gap-5 overflow-y-auto rounded-2xl border border-line bg-card p-6 shadow-[0_30px_80px_-30px_rgba(18,18,18,0.35)] sm:p-8"
              >
                {phase === "recap" ? (
                  <Recap level={level} row={row} score={scores[idx] ?? 0} last={last} onNext={next} />
                ) : (
                  <Finale score={base} cleared={cleared} total={total} onReplay={restart} onExit={onExit} />
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function Recap({
  level,
  row,
  score,
  last,
  onNext,
}: {
  level: CareerLevel;
  row: Outcome[];
  score: number;
  last: boolean;
  onNext: () => void;
}) {
  const nextLevel = CAREER_LEVELS[CAREER_LEVELS.indexOf(level) + 1];
  return (
    <>
      <div className="flex flex-col gap-2">
        <span className="font-pixel text-[10px] tracking-[0.12em] text-ember">LEVEL {level.world} CLEAR</span>
        <h3 className="text-[26px] font-medium leading-tight tracking-[-0.02em]">{level.company}</h3>
        <span className="font-mono text-[12px] text-muted">
          {level.title} · {level.years}
        </span>
        <p className="text-[15px] leading-relaxed text-ink-2">{level.summary}</p>
      </div>
      <ul className="flex flex-col gap-3 border-t border-line pt-4">
        {level.obstacles.map((o, i) => (
          <li key={o.label} className="grid grid-cols-[16px_1fr] gap-x-3 gap-y-0.5">
            <span
              className={`mt-[3px] grid h-4 w-4 place-items-center text-[11px] font-bold text-white ${row[i] === false ? "bg-[#e5484d]" : "bg-ember"}`}
            >
              {row[i] === false ? "!" : "✓"}
            </span>
            <span className="font-mono text-[10.5px] uppercase tracking-[0.06em] text-muted">{o.label}</span>
            <span />
            <span className="text-[14px] leading-snug text-ink">{o.win}</span>
          </li>
        ))}
      </ul>
      <div className="flex items-center justify-between gap-3 border-t border-line pt-4">
        <span className="font-pixel text-[10px] text-[#535353]">+{score} PTS</span>
        <button
          type="button"
          onClick={onNext}
          className="flex items-center gap-2 rounded-lg bg-ink px-3.5 py-2 text-[13.5px] font-medium text-white transition-colors hover:bg-ink-2"
        >
          {last ? "Finish" : `Next: ${nextLevel.world} ${nextLevel.company}`} <span aria-hidden>→</span>
          <kbd className="rounded bg-white/15 px-1.5 font-mono text-[10px]">enter</kbd>
        </button>
      </div>
    </>
  );
}

function Finale({
  score,
  cleared,
  total,
  onReplay,
  onExit,
}: {
  score: number;
  cleared: number;
  total: number;
  onReplay: () => void;
  onExit: () => void;
}) {
  return (
    <>
      <div className="flex flex-col gap-2">
        <span className="font-pixel text-[10px] tracking-[0.12em] text-ember">CAREER COMPLETE</span>
        <h3 className="text-[26px] font-medium leading-tight tracking-[-0.02em]">That&apos;s the highlight reel.</h3>
        <p className="text-[15px] leading-relaxed text-ink-2">
          Six jobs, from writing code and designing UX to leading product on AI platforms. Want the longer version? Ask
          the chat, or get in touch.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-line bg-line">
        <div className="bg-card px-4 py-3">
          <div className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted">Score</div>
          <div className="font-pixel mt-1.5 text-[16px] text-ink">{String(score).padStart(5, "0")}</div>
        </div>
        <div className="bg-card px-4 py-3">
          <div className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted">Obstacles cleared</div>
          <div className="font-pixel mt-1.5 text-[16px] text-ink">
            {cleared}/{total}
          </div>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-end gap-2">
        <button
          type="button"
          onClick={onReplay}
          className="rounded-lg border border-line px-3.5 py-2 text-[13.5px] text-ink-2 transition-colors hover:border-ink hover:text-ink"
        >
          Play again
        </button>
        <button
          type="button"
          onClick={onExit}
          className="rounded-lg border border-line px-3.5 py-2 text-[13.5px] text-ink-2 transition-colors hover:border-ink hover:text-ink"
        >
          Back to the site
        </button>
        <a
          href="#"
          className="rounded-lg bg-ember px-3.5 py-2 text-[13.5px] font-medium text-white transition-opacity hover:opacity-90"
        >
          Get in touch
        </a>
      </div>
    </>
  );
}
