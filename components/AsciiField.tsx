"use client";

import { useEffect, useRef } from "react";

const RAMP = " .·:-=+*%#";
const INK = "18, 18, 18";
const EMBER = "255, 90, 31";
const RADIUS = 160; // px reach of the cursor highlight

type Ripple = { x: number; y: number; t: number; strong: boolean };

/** Set `paused` while something big animates so the field leaves the main thread alone. */
export const asciiField = { paused: false };

/**
 * Ambient ASCII field around the edges of the page. It fades out behind the
 * headline and chat (elements marked data-calm). The characters near the
 * cursor turn ember, and clicks send a ripple out.
 */
export function AsciiField({ className = "" }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const cell = 14;
    const rowH = cell * 1.25;
    let w = 0;
    let h = 0;
    let cols = 0;
    let rows = 0;
    let left = 0;
    let top = 0;
    let raf = 0;
    let visible = true;
    let last = 0;
    let lastMove = 0;
    let lastZones = 0;
    let nextAmbient = performance.now() + 2500;
    let pointer: { x: number; y: number } | null = null;
    const cur = { x: 0, y: 0 };
    const ripples: Ripple[] = [];

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      left = rect.left;
      top = rect.top;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cols = Math.ceil(w / cell);
      rows = Math.ceil(h / rowH);
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
    };

    const noise = (x: number, y: number, t: number) =>
      (Math.sin(x * 0.11 + t * 0.6) +
        Math.sin(y * 0.17 - t * 0.4) +
        Math.sin((x + y) * 0.07 + t * 0.3) +
        Math.sin(Math.hypot(x - cols * 0.3, y - rows * 0.6) * 0.18 - t * 0.9)) /
      4;

    // Areas to keep calm (headline, chat). Marked with data-calm in the DOM;
    // data-calm="inset" lets a little texture show under a glass surface.
    let zones: { l: number; t: number; r: number; b: number; pad: number }[] = [];
    let mask = new Float32Array(0);
    const readZones = () => {
      zones = Array.from(document.querySelectorAll<HTMLElement>("[data-calm]")).map((el) => {
        const r = el.getBoundingClientRect();
        return {
          l: r.left - left,
          t: r.top - top,
          r: r.right - left,
          b: r.bottom - top,
          pad: el.dataset.calm === "inset" ? -36 : 40,
        };
      });
      // The mask only changes when the zones do, so compute it here rather than every frame.
      if (mask.length !== cols * rows) mask = new Float32Array(cols * rows);
      for (let y = 0; y < rows; y++)
        for (let x = 0; x < cols; x++) mask[y * cols + x] = calm(x * cell + cell / 2, y * rowH + cell / 2);
    };
    const FADE = 110;
    const calm = (px: number, py: number) => {
      let m = 1;
      for (const z of zones) {
        const dx = Math.max(z.l - px, 0, px - z.r);
        const dy = Math.max(z.t - py, 0, py - z.b);
        const inside = dx === 0 && dy === 0 ? -Math.min(px - z.l, z.r - px, py - z.t, z.b - py) : Math.hypot(dx, dy);
        const v = Math.min(1, Math.max(0, (inside - z.pad) / FADE));
        if (v < m) m = v;
      }
      return m * m * (3 - 2 * m); // smoothstep
    };

    const draw = (now: number) => {
      const t = now / 1000;
      ctx.clearRect(0, 0, w, h);
      ctx.font = `11px "Geist Mono", ui-monospace, monospace`;

      for (let i = ripples.length - 1; i >= 0; i--) if (now - ripples[i].t > 2600) ripples.splice(i, 1);

      // Smoothly chase the pointer; the highlight fades after it stops moving.
      if (pointer) {
        cur.x += (pointer.x - cur.x) * 0.35;
        cur.y += (pointer.y - cur.y) * 0.35;
      }
      const alive = pointer ? Math.max(0, 1 - Math.max(0, now - lastMove - 400) / 700) : 0;

      for (let y = 0; y < rows; y++) {
        const py = y * rowH + cell / 2;
        for (let x = 0; x < cols; x++) {
          const px = x * cell + cell / 2;
          const m = mask[y * cols + x];
          if (m <= 0.01) continue;

          const n = (noise(x, y, t) + 1) / 2;
          const v = n * m;
          const idx = Math.floor(v * (RAMP.length - 1));
          if (idx <= 0) continue;

          // Cursor: tint the characters already there, in a circle around it.
          let light = 0;
          if (alive > 0) {
            const d = Math.hypot(px - cur.x, py - cur.y);
            if (d < RADIUS) light = (1 - d / RADIUS) ** 1.4 * alive;
          }

          // Expanding rings from clicks and the occasional ambient pulse.
          let ring = 0;
          for (const r of ripples) {
            const age = (now - r.t) / 1000;
            const radius = age * (r.strong ? 520 : 360);
            const band = Math.abs(Math.hypot(px - r.x, py - r.y) - radius);
            if (band < 22) ring = Math.max(ring, (1 - band / 22) * (1 - age / 2.6) * (r.strong ? 1 : 0.5));
          }

          const flare = n > 0.84 && (x * 7 + y * 13 + Math.floor(t * 0.5)) % 11 === 0;
          const heat = Math.max(light, ring, flare ? 0.45 : 0);
          ctx.fillStyle =
            heat > 0.05
              ? `rgba(${EMBER}, ${Math.min(1, (0.28 + heat * 1.0) * (0.45 + 0.55 * m) + v * 0.2)})`
              : `rgba(${INK}, ${0.06 + v * 0.28})`;
          ctx.fillText(RAMP[idx], px, py);
        }
      }
    };

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      if (!visible || asciiField.paused) return;
      // Faster frames while the cursor is active, slow ambient otherwise.
      const active = now - lastMove < 1300 || ripples.length > 0;
      if (now - lastZones > 400) {
        readZones();
        lastZones = now;
      }
      if (now - last < (active ? 33 : 60)) return;
      last = now;
      if (now > nextAmbient) {
        ripples.push({ x: Math.random() * w, y: Math.random() * h, t: now, strong: false });
        nextAmbient = now + 4500 + Math.random() * 3000;
      }
      draw(now);
    };

    const onMove = (e: PointerEvent) => {
      const x = e.clientX - left;
      const y = e.clientY - top;
      if (!pointer) {
        cur.x = x;
        cur.y = y;
      }
      pointer = { x, y };
      lastMove = performance.now();
      if (reduce) {
        cur.x = x;
        cur.y = y;
        stillAt = lastMove;
        readZones();
        draw(stillAt);
      }
    };
    const onDown = (e: PointerEvent) => {
      if (reduce) return;
      ripples.push({ x: e.clientX - left, y: e.clientY - top, t: performance.now(), strong: true });
    };

    // Reduced motion has no frame loop, so re-read the calm zones on a slow tick to follow layout changes.
    let stillAt = 4000;
    const still = reduce
      ? window.setInterval(() => {
          if (!visible || asciiField.paused) return;
          readZones();
          draw(stillAt);
        }, 500)
      : undefined;

    resize();
    readZones();
    draw(stillAt);
    if (!reduce) raf = requestAnimationFrame(loop);

    const ro = new ResizeObserver(() => {
      resize();
      readZones();
      draw(performance.now());
    });
    ro.observe(canvas);
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting));
    io.observe(canvas);
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });

    return () => {
      cancelAnimationFrame(raf);
      window.clearInterval(still);
      ro.disconnect();
      io.disconnect();
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
    };
  }, []);

  return <canvas ref={ref} aria-hidden className={`pointer-events-none block h-full w-full ${className}`} />;
}
