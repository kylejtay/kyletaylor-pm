"use client";

import { useEffect, useRef } from "react";
import type { CareerLevel } from "@/lib/content";
import {
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
} from "./gameArt";

// Kyle's cannon: a little laptop with an ember screen.
const SHIP = [
  "......##......",
  ".....####.....",
  "..##########..",
  ".#oooooooooo#.",
  ".#oooooooooo#.",
  "##############",
  "##############",
];
const PER_ROW = 6;

/**
 * One career level as a lofi Space Invaders. Each row of invaders is a problem
 * from that job; wiping out a row reveals what Kyle did about it. If a row
 * reaches the ground it breaks through: points off and a red flash, never a
 * game over, and the accomplishment still shows.
 */
export function Invaders({
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
    let C = 3; // px per sprite cell
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const r = canvas.getBoundingClientRect();
      w = r.width;
      h = r.height;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.imageSmoothingEnabled = false;
      C = Math.max(2, Math.min(4, Math.floor(Math.min(h / 170, w / 260))));
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    // Formation: obstacle 0 is the bottom row, so the first problem is the first one you face.
    const n = level.obstacles.length;
    const rows = level.obstacles.map((o, i) => ({
      ...o,
      index: i,
      alive: Array.from({ length: PER_ROW }, () => true),
      state: "ahead" as "ahead" | "cleared" | "hit",
      broke: 0,
    }));
    const slotW = () => 22 * C; // widest sprite is 18 cells
    const rowH = () => 22 * C;
    const formW = () => (PER_ROW - 1) * slotW() + 18 * C;
    ctx.font = `12px ${MONO}`;
    const widestLabel = Math.max(...level.obstacles.map((o) => ctx.measureText(o.label).width));
    const labelW = () => widestLabel + 14;
    let fx = 0; // formation offset from its starting spot, px
    let fy = 0;
    let dir = 1;
    const goAt = countdown ? COUNT_STEP * 3 : 1.3;

    const start = performance.now() + startDelay * 1000;
    let raf = 0;
    let last = performance.now();
    let playing = false;
    let finished = false;
    let doneAt = 0;
    let score = 0;
    let shipX = 0.5; // 0..1 across the playfield
    let hitAt = 0;
    let flashAt = 0;
    let lastShot = 0;
    let nextEnemyShot = 0;
    const keys = new Set<string>();
    let pointerX: number | null = null;
    const shots: { x: number; y: number }[] = [];
    const bombs: { x: number; y: number }[] = [];
    const bursts: { x: number; y: number; t: number; color: string }[] = [];
    const floats: { text: string; color: string; x: number; y: number; t: number }[] = [];

    const fire = () => {
      const now = performance.now();
      if (!playing || finished || now - lastShot < 280) return;
      lastShot = now;
      shots.push({ x: shipX * w, y: shipTop() });
    };
    const onDown = (e: KeyboardEvent) => {
      if (["ArrowLeft", "ArrowRight", "KeyA", "KeyD"].includes(e.code)) {
        keys.add(e.code);
        pointerX = null;
      }
      if (e.code === "Space" || e.code === "ArrowUp") {
        e.preventDefault();
        fire();
      }
    };
    const onUp = (e: KeyboardEvent) => keys.delete(e.code);
    const onMove = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      pointerX = (e.clientX - r.left) / r.width;
    };
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerdown", fire);

    const groundY = () => Math.round(h * 0.86);
    const shipTop = () => groundY() - SHIP.length * C - 6;
    const formLeft = () => (w - formW()) / 2 + fx;
    const formTop = () => h * 0.3 + fy;
    const rowY = (r: number) => formTop() + (n - 1 - r) * rowH();
    const invaderAt = (r: number, c: number) => {
      const spr = OBSTACLES[rows[r].kind];
      const x = formLeft() + c * slotW() + ((18 - spr[0].length) * C) / 2;
      const y = rowY(r) + (14 - spr.length) * C;
      return { x, y, wpx: spr[0].length * C, hpx: spr.length * C, spr };
    };

    const resolve = (r: number, cleared: boolean, now: number) => {
      const row = rows[r];
      row.state = cleared ? "cleared" : "hit";
      if (cleared) {
        score += 100;
        floats.push({ text: "+100", color: EMBER, x: w / 2, y: rowY(r), t: now });
      } else {
        row.broke = now;
        flashAt = now;
        score = Math.max(0, score - 50);
        floats.push({ text: "−50", color: RED, x: w / 2, y: groundY() - 30, t: now });
        row.alive = row.alive.map(() => false);
        // Give the next row some room before it gets close.
        fy = Math.max(0, fy - rowH() * 1.5);
      }
      cb.current.onResult({ index: r, cleared });
      if (rows.every((x) => x.state !== "ahead")) doneAt = now;
    };

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
      const t = (now - start) / 1000;
      if (t >= goAt && !playing) {
        playing = true;
        nextEnemyShot = now + 1600;
      }
      const ground = groundY();

      // ---- simulation ----
      if (playing && !finished) {
        // Ship: keys or pointer.
        const v =
          (keys.has("ArrowLeft") || keys.has("KeyA") ? -1 : 0) + (keys.has("ArrowRight") || keys.has("KeyD") ? 1 : 0);
        if (v) shipX += v * dt * 0.75;
        else if (pointerX !== null) shipX += (pointerX - shipX) * Math.min(1, dt * 14);
        shipX = Math.min(0.97, Math.max(0.03, shipX));

        // Formation marches side to side and steps down at the edges. Fewer invaders, faster march.
        const left = rows.reduce((a, r) => a + r.alive.filter(Boolean).length, 0);
        const total = n * PER_ROW;
        const speed = (28 + 70 * (1 - left / total)) * (C / 3);
        fx += dir * speed * dt;
        // Row labels sit to the right of the formation, so keep room for them on that side.
        const half = (w - formW()) / 2 - 16;
        const minFx = -half;
        const maxFx = half - labelW();
        if (maxFx <= minFx)
          fx = (minFx + maxFx) / 2; // too narrow to march: hold still
        else if ((dir > 0 && fx > maxFx) || (dir < 0 && fx < minFx)) {
          fx = dir > 0 ? maxFx : minFx;
          dir = -dir;
          fy += rowH() * 0.45;
        }

        // Player shots.
        for (let i = shots.length - 1; i >= 0; i--) {
          const s = shots[i];
          s.y -= 640 * dt;
          let hit = false;
          for (let r = 0; r < n && !hit; r++) {
            if (rows[r].state !== "ahead") continue;
            for (let c = 0; c < PER_ROW; c++) {
              if (!rows[r].alive[c]) continue;
              const iv = invaderAt(r, c);
              if (s.x > iv.x && s.x < iv.x + iv.wpx && s.y > iv.y && s.y < iv.y + iv.hpx) {
                rows[r].alive[c] = false;
                score += 10;
                bursts.push({ x: iv.x + iv.wpx / 2, y: iv.y + iv.hpx / 2, t: now, color: EMBER });
                hit = true;
                if (rows[r].alive.every((a) => !a)) resolve(r, true, now);
                break;
              }
            }
          }
          if (hit || s.y < -10) shots.splice(i, 1);
        }

        // Rows that reach the ground break through.
        rows.forEach((row, r) => {
          if (row.state !== "ahead") return;
          if (rowY(r) + 14 * C >= shipTop() - 4) resolve(r, false, now);
        });

        // Invaders drop bombs from the lowest live one in a random column.
        if (now > nextEnemyShot) {
          nextEnemyShot = now + 900 + Math.random() * 900;
          const c = Math.floor(Math.random() * PER_ROW);
          for (let r = 0; r < n; r++) {
            if (rows[r].state === "ahead" && rows[r].alive[c]) {
              const iv = invaderAt(r, c);
              bombs.push({ x: iv.x + iv.wpx / 2, y: iv.y + iv.hpx });
              break;
            }
          }
        }
        for (let i = bombs.length - 1; i >= 0; i--) {
          const b = bombs[i];
          b.y += 210 * dt;
          const sx = shipX * w;
          const half = (SHIP[0].length * C) / 2;
          if (!hitAt && b.y > shipTop() && b.y < ground && b.x > sx - half && b.x < sx + half) {
            bombs.splice(i, 1);
            hitAt = now;
            flashAt = now;
            score = Math.max(0, score - 50);
            floats.push({ text: "−50", color: RED, x: sx, y: shipTop() - 16, t: now });
            continue;
          }
          if (b.y > ground) {
            bursts.push({ x: b.x, y: ground - 2, t: now, color: INK });
            bombs.splice(i, 1);
          }
        }
        if (hitAt && now - hitAt > 1200) hitAt = 0;

        if (doneAt && now - doneAt > 700 && !finished) {
          finished = true;
          cb.current.onFinish(Math.round(score));
        }
      }

      // ---- drawing ----
      ctx.clearRect(0, 0, w, h);

      // Faint ASCII "stars" drifting down, same characters as the home page.
      ctx.font = `11px ${MONO}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const drift = (now / 1000) * 14;
      for (let i = 0; i < 70; i++) {
        const x = hash(i + 3) * w;
        const y = (((hash(i + 40) * h + drift * (0.4 + hash(i + 80))) % ground) + ground) % ground;
        const v = hash(i + 120);
        ctx.fillStyle = v > 0.92 ? "rgba(255, 90, 31, 0.5)" : `rgba(83, 83, 83, ${0.1 + v * 0.18})`;
        ctx.fillText(RAMP[Math.floor(v * 977) % RAMP.length], x, y);
      }

      // Ground line with ASCII texture under it.
      ctx.fillStyle = INK;
      ctx.fillRect(0, ground, w, 2);
      for (let row = 0; ground + 14 + row * 16 < h - 4 && row < 5; row++) {
        for (let x = 7; x < w; x += 14) {
          const v = hash(Math.floor(x / 14) * 131 + row * 17);
          if (v < 0.6) continue;
          ctx.fillStyle = `rgba(83, 83, 83, ${(0.12 + v * 0.25) * (1 - row / 5)})`;
          ctx.fillText(RAMP[Math.floor(v * 977) % RAMP.length], x, ground + 14 + row * 16);
        }
      }

      // Invaders, with each row's problem written beside it. Two-frame wiggle.
      const wiggle = Math.floor(now / 450) % 2;
      rows.forEach((row, r) => {
        if (row.state === "cleared") return;
        if (row.state === "hit") {
          const a = (now - row.broke) / 1000;
          if (a > 0.6) return;
          ctx.globalAlpha = 1 - a / 0.6;
        }
        for (let c = 0; c < PER_ROW; c++) {
          if (row.state === "ahead" && !row.alive[c]) continue;
          const iv = invaderAt(r, c);
          drawSprite(ctx, iv.spr, iv.x, iv.y + (wiggle && c % 2 ? C : 0), C);
        }
        ctx.globalAlpha = 1;
        if (row.state === "ahead") {
          ctx.font = `12px ${MONO}`;
          ctx.fillStyle = INK;
          ctx.textAlign = "left";
          ctx.textBaseline = "middle";
          ctx.fillText(row.label, formLeft() + formW() + 14, rowY(r) + 7 * C);
        }
      });

      // Shots and bombs.
      ctx.fillStyle = INK;
      for (const s of shots) ctx.fillRect(s.x - 1, s.y, 3, 12);
      bombs.forEach((b) => {
        ctx.fillStyle = EMBER;
        const zig = Math.floor(b.y / 6) % 2 ? 2 : -2;
        ctx.fillRect(b.x - 1 + zig, b.y, 3, 4);
        ctx.fillRect(b.x - 1 - zig, b.y + 4, 3, 4);
      });

      // Bursts: a ring of pixels that fades.
      for (let i = bursts.length - 1; i >= 0; i--) {
        const p = bursts[i];
        const a = (now - p.t) / 1000;
        if (a > 0.35) {
          bursts.splice(i, 1);
          continue;
        }
        ctx.globalAlpha = 1 - a / 0.35;
        ctx.fillStyle = p.color;
        for (let k = 0; k < 8; k++) {
          const ang = (k / 8) * Math.PI * 2;
          ctx.fillRect(p.x + Math.cos(ang) * a * 90 - C / 2, p.y + Math.sin(ang) * a * 90 - C / 2, C, C);
        }
        ctx.globalAlpha = 1;
      }

      // Kyle's ship; blinks after it's hit.
      if (!hitAt || Math.floor((now - hitAt) / 100) % 2 === 0) {
        drawSprite(ctx, SHIP, shipX * w - (SHIP[0].length * C) / 2, shipTop(), C);
      }

      // Floating points.
      for (let i = floats.length - 1; i >= 0; i--) {
        const f = floats[i];
        const age = (now - f.t) / 1000;
        if (age > 1.1) {
          floats.splice(i, 1);
          continue;
        }
        ctx.globalAlpha = 1 - age / 1.1;
        ctx.font = `14px ${PIXEL}`;
        ctx.fillStyle = f.color;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(f.text, f.x, f.y - age * 40);
        ctx.globalAlpha = 1;
      }

      // Red warning flash.
      if (flashAt) {
        const k = Math.max(0, 1 - (now - flashAt) / 600);
        if (k > 0) {
          const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.75);
          g.addColorStop(0, "rgba(229, 72, 77, 0)");
          g.addColorStop(1, `rgba(229, 72, 77, ${0.35 * k})`);
          ctx.fillStyle = g;
          ctx.fillRect(0, 0, w, h);
        }
      }

      // HUD.
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
        const cy = h * 0.55;
        if (t < goAt) {
          if (countdown) {
            const k = Math.floor(t / COUNT_STEP);
            const p = (t % COUNT_STEP) / COUNT_STEP;
            const ease = 1 - (1 - Math.min(1, p * 2.2)) ** 3;
            centerText(String(3 - k), size, INK, p < 0.75 ? ease : 1 - (p - 0.75) / 0.25, 1.25 - 0.25 * ease, cy);
          } else {
            const e = Math.min(1, t / 0.3);
            centerText(
              level.company.toUpperCase(),
              Math.min(44, w / 18),
              INK,
              t > goAt - 0.25 ? (goAt - t) / 0.25 : e,
              1,
              cy,
            );
          }
        } else {
          centerText("GO!", size, EMBER, Math.max(0, 1 - (t - goAt) / 0.6), 1, cy);
        }
      }
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerdown", fire);
    };
  }, [level, countdown, startDelay, baseScore]);

  return (
    <canvas
      ref={ref}
      aria-label={`Level ${level.world}: ${level.company}`}
      className="block h-full w-full touch-none select-none"
    />
  );
}
