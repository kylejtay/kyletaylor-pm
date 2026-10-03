import type { ReactNode } from "react";

/** Hairline frame with small "+" ticks at each corner. */
export function Frame({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`relative border border-line ${className}`}>
      <Tick className="-left-[5px] -top-[5px]" />
      <Tick className="-right-[5px] -top-[5px]" />
      <Tick className="-bottom-[5px] -left-[5px]" />
      <Tick className="-bottom-[5px] -right-[5px]" />
      {children}
    </div>
  );
}

function Tick({ className }: { className: string }) {
  return (
    <svg aria-hidden width="9" height="9" viewBox="0 0 9 9" className={`absolute z-10 text-line-strong ${className}`}>
      <path d="M4.5 0v9M0 4.5h9" stroke="currentColor" strokeWidth="1" fill="none" />
    </svg>
  );
}

/** Bracketed mono label, e.g. [ 02 / TOOLS ]. */
export function Label({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <span className={`font-mono text-[11px] uppercase tracking-[0.08em] text-muted ${className}`}>
      <span className="text-line-strong">[</span> {children} <span className="text-line-strong">]</span>
    </span>
  );
}

export function LiveDot({ className = "" }: { className?: string }) {
  return (
    <span className={`relative inline-flex h-2 w-2 ${className}`}>
      <span className="absolute inset-0 rounded-full bg-ember animate-ping-soft" />
      <span className="relative h-2 w-2 rounded-full bg-ember" />
    </span>
  );
}

export function SectionHeader({
  index,
  label,
  title,
  body,
}: {
  index: string;
  label: string;
  title: ReactNode;
  body?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 max-w-2xl">
      <Label>
        {index} / {label}
      </Label>
      <h2 className="text-[clamp(1.9rem,4vw,2.9rem)] font-medium leading-[1.05] tracking-[-0.035em]">{title}</h2>
      {body && <p className="text-[17px] leading-relaxed text-ink-2 max-w-[60ch]">{body}</p>}
    </div>
  );
}

/** A macOS window button. Its glyph shows when the surrounding `.group` is hovered. */
export function TrafficLight({
  color,
  label,
  onClick,
  glyph,
}: {
  color: string;
  label: string;
  onClick: () => void;
  glyph: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="grid h-3.5 w-3.5 place-items-center rounded-full text-[10px] font-bold leading-none text-black/0 transition-colors group-hover:text-black/55"
      style={{ background: color, boxShadow: "inset 0 0 0 0.5px rgba(0,0,0,0.25)" }}
    >
      {glyph}
    </button>
  );
}
