"use client";

import { useEffect, useRef } from "react";
import type { CareerLevel } from "@/lib/content";
import {
  CLOUD_L,
  CLOUD_S,
  COUNT_STEP,
  drawSprite,
  EMBER,
  FAINT,
  hash,
  INK,
  MONO,
  OBSTACLES,
  type ObstacleResult,
  PIXEL,
  RAMP,
  RED,
  RUN,
  SPRITE_H,
  SPRITE_W,
  STAND,
} from "./gameArt";

export type { ObstacleResult };

const SPEED = 52; // cells per second at full speed
const FIRST = 150; // cells from the start to the first obstacle
const GAP = 230; // cells between obstacles (~4.4s: time to read what you just cleared)
const RUNWAY = 170; // cells from the last obstacle to the finish flag

/**
 * One career level as an offline-dino style runner. Each obstacle is a problem
 * from that job; jumping it (or tripping on it) reveals what Kyle did about it.
 * Tripping never ends the run: Kyle falls, loses a few points, gets back up.
 */
export function Runner({
  level,
  countdown,
  startDelay = 0.8,
  baseScore = 0,
  onResult,
  onFinish,
}: {
  level: CareerLevel;
  countdown: boolean;
  startDelay?: number;
  baseScore?: number;
  onResult: (r: ObstacleResult) => void;
  onFinish: (score: number) => void;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const cb = useRef({ onResult, onFinish });
  cb.current = { onResult, onFinish };

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    let w = 0;
    let h = 0;
    let S = 3; // px per sprite cell; the whole world is measured in cells
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const r = canvas.getBoundingClientRect();
      w = r.width;
      h = r.height;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.imageSmoothingEnabled = false;
      S = Math.max(3, Math.min(6, Math.floor(h / 95)));
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const obstacles = level.obstacles.map((o, i) => ({
      ...o,
      x: FIRST + i * GAP,
      state: "ahead" as "ahead" | "cleared" | "hit",
      knock: 0, // when it was knocked away (ms)
    }));
    const finishX = FIRST + (obstacles.length - 1) * GAP + RUNWAY;
    const goAt = countdown ? COUNT_STEP * 3 : 1.3;

    const start = performance.now() + startDelay * 1000;
    let raf = 0;
    let last = performance.now();
    let dist = 0; // cells travelled
    let speed = 0;
    let y = 0; // cells above ground
    let vy = 0;
    let runStart = 0;
    let fallAt = 0; // ms when Kyle tripped
    let finished = false;
    let score = 0;
    const floats: { text: string; color: string; x: number; y: number; t: number }[] = [];
    const dust: { x: number; y: number; t: number }[] = [];

    const jump = () => {
      if (runStart && !finished && !fallAt && y === 0) vy = 125;
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "ArrowUp") {
        e.preventDefault();
        jump();
      }
    };
    window.addEventListener("keydown", onKey);
    canvas.addEventListener("pointerdown", jump);

    const sprite = (rows: string[], x: number, top: number, size: number) => drawSprite(ctx, rows, x, top, size);

    const centerText = (text: string, size: number, color: string, alpha: number, scale: number, cy: number) => {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(w / 2, cy);
      ctx.scale(scale, scale);
      ctx.font = `${size}px ${PIXEL}`;
      ctx.fillStyle = color;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(text, 0, 0);
      ctx.restore();
    };

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const t = (now - start) / 1000; // seconds since the intro began

      const ground = Math.round(h * 0.7);
      const heroX = Math.round(Math.min(w * 0.14, 180));

      // ---- simulation (in cells) ----
      if (t >= goAt && !runStart) runStart = now;
      if (runStart && !finished) {
        if (fallAt) {
          // Down for a beat, then back up and ramping again.
          speed = Math.max(0, speed - 160 * dt);
          if (now - fallAt > 1100) {
            fallAt = 0;
            runStart = now;
          }
        } else {
          const ramp = Math.min(1, (now - runStart) / 1200);
          speed = SPEED * (1 - (1 - ramp) ** 3);
        }
        // Ease to a stop at the finish flag.
        const toGo = finishX - dist;
        if (toGo < 40) speed = Math.min(speed, Math.max(4, toGo * 1.4));
        dist = Math.min(finishX, dist + speed * dt);
        score += speed * dt * 0.2;
        if (dist >= finishX && !finished) {
          finished = true;
          speed = 0;
          cb.current.onFinish(Math.round(score));
        }
      }
      if (y > 0 || vy > 0) {
        vy -= 313 * dt;
        y = Math.max(0, y + vy * dt);
        if (y === 0) vy = 0;
      }

      // Collisions, in cells. Kyle's box is a little forgiving on every side.
      const heroL = dist + 5;
      const heroR = dist + SPRITE_W - 5;
      obstacles.forEach((o, i) => {
        if (o.state !== "ahead") return;
        const sprite = OBSTACLES[o.kind];
        const oL = o.x + 2;
        const oR = o.x + sprite[0].length - 2;
        const oH = sprite.length - 3; // forgiving: grazing the top still counts as a clear
        const overlapping = heroR > oL && heroL < oR;
        if (overlapping && y < oH && !fallAt) {
          o.state = "hit";
          o.knock = now;
          fallAt = now;
          vy = 0;
          y = 0;
          score = Math.max(0, score - 50);
          floats.push({
            text: "−50",
            color: RED,
            x: heroX + SPRITE_W * S * 0.5,
            y: ground - (SPRITE_H + 4) * S,
            t: now,
          });
          cb.current.onResult({ index: i, cleared: false });
        } else if (heroL > oR) {
          o.state = "cleared";
          score += 100;
          floats.push({
            text: "+100",
            color: EMBER,
            x: heroX + SPRITE_W * S * 0.5,
            y: ground - (SPRITE_H + 4 + y) * S,
            t: now,
          });
          cb.current.onResult({ index: i, cleared: true });
        }
      });

      // ---- drawing ----
      const px = dist * S; // world offset in px
      ctx.clearRect(0, 0, w, h);

      // Clouds in two layers: small faint ones far back, bigger ones closer.
      const drift = (now / 1000) * 6;
      for (let i = 0; i < 8; i++) {
        const near = i % 3 === 0;
        const span = w + 400;
        const cxw = hash(i + 1) * span - (px + drift) * (near ? 0.22 : 0.08);
        const cx = (((cxw % span) + span) % span) - 200;
        const cy = ground * (near ? 0.18 + hash(i + 9) * 0.32 : 0.08 + hash(i + 9) * 0.3);
        ctx.globalAlpha = near ? 1 : 0.6;
        sprite(near ? CLOUD_L : CLOUD_S, cx, cy, near ? Math.max(3, S - 1) : Math.max(2, S - 3));
      }
      ctx.globalAlpha = 1;

      // Horizon: a 2px line with the odd bump, like the original.
      ctx.fillStyle = INK;
      ctx.fillRect(0, ground, w, 2);
      const step = 6;
      const off = px % step;
      for (let x = -off; x < w; x += step) {
        if (hash(Math.floor((x + px) / step)) > 0.93) ctx.fillRect(x, ground - 2, step, 2);
      }

      // ASCII ground texture scrolling under the line, same characters as the home page.
      ctx.font = `11px ${MONO}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const cell = 14;
      const coff = px % cell;
      for (let row = 0; row * 16 + ground + 14 < h - 6 && row < 8; row++) {
        const fade = 1 - row / 8;
        for (let x = -coff; x < w + cell; x += cell) {
          const v = hash(Math.floor((x + px) / cell) * 131 + row * 17);
          if (v < 0.55) continue;
          ctx.fillStyle =
            v > 0.985 ? `rgba(255, 90, 31, ${0.7 * fade})` : `rgba(83, 83, 83, ${(0.12 + v * 0.3) * fade})`;
          ctx.fillText(RAMP[Math.floor(v * 977) % RAMP.length], x, ground + 14 + row * 16);
        }
      }

      const toScreen = (cellX: number) => heroX + (cellX - dist) * S;

      // Start and finish flags.
      const flag = (cellX: number, label: string, color: string) => {
        const fx = toScreen(cellX);
        if (fx < -200 || fx > w + 50) return;
        const ph = 22 * S;
        ctx.fillStyle = INK;
        ctx.fillRect(fx, ground - ph, S, ph);
        ctx.font = `${Math.max(9, 2 * S)}px ${PIXEL}`;
        const tw = ctx.measureText(label).width;
        ctx.fillStyle = color;
        ctx.fillRect(fx + S, ground - ph, tw + 3 * S, 5 * S);
        ctx.fillStyle = "#fff";
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.fillText(label, fx + 2.5 * S, ground - ph + 2.6 * S);
      };
      flag(30, level.world, EMBER);
      flag(finishX + SPRITE_W + 6, level.company.toUpperCase(), INK);

      // Obstacles, each with its label floating above it.
      obstacles.forEach((o) => {
        const rows = OBSTACLES[o.kind];
        let ox = toScreen(o.x);
        let oy = ground - rows.length * S;
        let alpha = 1;
        if (o.state === "hit") {
          // Knocked away: it tumbles off forward and fades.
          const a = (now - o.knock) / 1000;
          ox += a * 420;
          oy -= a * 260 - a * a * 600;
          alpha = Math.max(0, 1 - a / 0.7);
        }
        if (alpha <= 0 || ox < -120 || ox > w + 40) return;
        ctx.globalAlpha = alpha;
        sprite(rows, ox, oy, S);
        if (o.state === "ahead") {
          ctx.font = `12px ${MONO}`;
          ctx.textAlign = "center";
          ctx.textBaseline = "bottom";
          ctx.fillStyle = INK;
          ctx.fillText(o.label, ox + (rows[0].length * S) / 2, oy - 10);
        }
        ctx.globalAlpha = 1;
      });

      // Kyle: run cycle, a fall when he trips, standing still at the finish.
      const heroTop = ground - SPRITE_H * S - y * S;
      if (fallAt) {
        // Tip over backwards fast, lie there, spring back up.
        const a = (now - fallAt) / 1000;
        const ang = a < 0.18 ? (a / 0.18) * 90 : a < 0.85 ? 90 : Math.max(0, 90 * (1 - (a - 0.85) / 0.25));
        ctx.save();
        ctx.translate(heroX + SPRITE_W * S * 0.3, ground);
        ctx.rotate((-ang * Math.PI) / 180);
        sprite(STAND, -SPRITE_W * S * 0.3, -SPRITE_H * S, S);
        ctx.restore();
        if (a > 0.2 && a < 0.85) {
          ctx.font = `${Math.max(10, 2 * S)}px ${PIXEL}`;
          ctx.fillStyle = RED;
          ctx.textAlign = "left";
          ctx.fillText("✱", heroX - 2 * S + Math.sin(a * 18) * 6, ground - 9 * S);
        }
      } else {
        const beat = runStart && !finished && speed > 1 ? Math.floor(dist / 7) % 4 : -1;
        const rows = y > 0 ? RUN[0] : beat === -1 ? STAND : RUN[beat];
        const bob = beat % 2 === 1 && y === 0 ? -S : 0;
        sprite(rows, heroX, heroTop + bob, S);
        if (beat >= 0 && y === 0 && speed > 15 && hash(Math.floor(dist * 1.5)) > 0.72 && dust.length < 30)
          dust.push({ x: heroX + 3 * S, y: ground - 2, t: now });
      }
      for (let i = dust.length - 1; i >= 0; i--) {
        const d = dust[i];
        const age = (now - d.t) / 1000;
        if (age > 0.45) {
          dust.splice(i, 1);
          continue;
        }
        ctx.fillStyle = `rgba(255, 90, 31, ${0.8 * (1 - age / 0.45)})`;
        ctx.fillRect(d.x - age * speed * S * 0.5, d.y - age * 26, Math.ceil(S / 2), Math.ceil(S / 2));
      }

      // Points that float up from Kyle.
      for (let i = floats.length - 1; i >= 0; i--) {
        const f = floats[i];
        const age = (now - f.t) / 1000;
        if (age > 1.1) {
          floats.splice(i, 1);
          continue;
        }
        ctx.globalAlpha = 1 - age / 1.1;
        ctx.font = `${Math.max(11, 2 * S + 2)}px ${PIXEL}`;
        ctx.fillStyle = f.color;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(f.text, f.x, f.y - age * 40);
        ctx.globalAlpha = 1;
      }

      // Red warning flash when he trips.
      if (fallAt) {
        const a = (now - fallAt) / 1000;
        const k = Math.max(0, 1 - a / 0.6);
        if (k > 0) {
          const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.75);
          g.addColorStop(0, "rgba(229, 72, 77, 0)");
          g.addColorStop(1, `rgba(229, 72, 77, ${0.35 * k})`);
          ctx.fillStyle = g;
          ctx.fillRect(0, 0, w, h);
        }
      }

      // HUD: score, offline-dino style.
      ctx.font = `13px ${PIXEL}`;
      ctx.textAlign = "right";
      ctx.textBaseline = "top";
      ctx.fillStyle = FAINT;
      ctx.fillText("SCORE", w - 32 - 7 * 13 - 10, 28);
      ctx.fillStyle = INK;
      ctx.fillText(String(Math.round(baseScore + score)).padStart(5, "0"), w - 32, 28);

      // Intro: 3-2-1-GO on the first level, the company name on later ones.
      if (t >= 0 && t < goAt + 0.6) {
        const size = Math.min(96, w / 9);
        if (t < goAt) {
          if (countdown) {
            const n = Math.floor(t / COUNT_STEP);
            const p = (t % COUNT_STEP) / COUNT_STEP;
            const ease = 1 - (1 - Math.min(1, p * 2.2)) ** 3;
            centerText(
              String(3 - n),
              size,
              INK,
              p < 0.75 ? ease : 1 - (p - 0.75) / 0.25,
              1.25 - 0.25 * ease,
              ground * 0.45,
            );
          } else {
            const e = Math.min(1, t / 0.3);
            centerText(
              level.company.toUpperCase(),
              Math.min(44, w / 18),
              INK,
              t > goAt - 0.25 ? (goAt - t) / 0.25 : e,
              1,
              ground * 0.45,
            );
          }
        } else {
          centerText("GO!", size, EMBER, Math.max(0, 1 - (t - goAt) / 0.6), 1, ground * 0.45);
        }
      }
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("keydown", onKey);
      canvas.removeEventListener("pointerdown", jump);
    };
  }, [level, countdown, startDelay, baseScore]);

  return (
    <canvas
      ref={ref}
      aria-label={`Level ${level.world}: ${level.company}`}
      className="block h-full w-full touch-none select-none [mask-image:linear-gradient(to_right,transparent,black_3%,black_97%,transparent)]"
    />
  );
}
