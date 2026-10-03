"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { type Artifact, ROLES, type RoleId } from "@/lib/content";
import { AgentMark, AgentStage } from "./AgentStage";
import { AsciiField } from "./AsciiField";
import { GameMode } from "./GameMode";

const isRole = (s: string): s is RoleId => ROLES.some((r) => r.id === s);

/** One screen, no page scroll. The chat is the site. */
export function Home({ initialRole = "ai-platform" }: { initialRole?: RoleId }) {
  const [roleId, setRoleId] = useState<RoleId>(initialRole);
  const [open, setOpen] = useState<Artifact | null>(null);
  const role = ROLES.find((r) => r.id === roleId) ?? ROLES[0];

  // Per-role pages will be real routes; until then #growth, #devtools etc. switch the context.
  useEffect(() => {
    const read = () => {
      const h = window.location.hash.slice(1);
      if (isRole(h)) setRoleId(h);
    };
    read();
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, []);

  return (
    <div className="relative flex h-dvh flex-col overflow-hidden">
      <motion.div className="absolute inset-0" animate={{ opacity: open ? 0.35 : 1 }} transition={{ duration: 0.6 }}>
        <AsciiField />
      </motion.div>

      <TopBar />

      <main className="relative min-h-0 flex-1 px-3 pb-3 sm:px-5 sm:pb-5">
        <AgentStage role={role} open={open} setOpen={setOpen} />
      </main>

      <GameMode hidden={!!open} />
    </div>
  );
}

function TopBar() {
  return (
    <header className="relative z-30 flex h-[72px] shrink-0 items-center justify-center px-3">
      <div className="flex items-center gap-1 rounded-full border border-white/80 bg-white/50 py-1 pl-2 pr-1 shadow-[0_8px_30px_-18px_rgba(18,18,18,0.35)] ring-1 ring-ink/5 backdrop-blur-xl">
        <a
          href="#"
          className="flex items-center gap-2 rounded-full py-1 pl-0.5 pr-2.5"
          onClick={(e) => e.preventDefault()}
        >
          <AgentMark size={24} />
          <span className="text-[15px] font-medium tracking-[-0.02em]">kyle</span>
        </a>
        <span className="mx-1 h-4 w-px bg-line-strong" aria-hidden />
        <nav className="flex items-center gap-0.5 text-[13px] text-ink-2">
          <a
            href="#"
            className="whitespace-nowrap rounded-full px-2 py-1.5 transition-colors hover:bg-white sm:px-3 hover:text-ink"
          >
            Resume
          </a>
          <a
            href="#"
            className="whitespace-nowrap rounded-full px-2 py-1.5 transition-colors hover:bg-white sm:px-3 hover:text-ink"
          >
            LinkedIn
          </a>
          <a
            href="#"
            className="ml-1 whitespace-nowrap rounded-full bg-ink px-3 py-1.5 sm:px-3.5 font-medium text-white transition-colors hover:bg-ink-2"
          >
            Get in touch
          </a>
        </nav>
      </div>
    </header>
  );
}
