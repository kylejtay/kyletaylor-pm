import type { ObstacleKind } from "@/lib/content";

// Shared pixel art and palette for the Career Quest games (runner and invaders).

export const INK = "#535353"; // the offline-dino gray
export const FAINT = "rgba(83, 83, 83, 0.35)";
export const EMBER = "#ff5a1f";
export const RED = "#e5484d";
export const PIXEL = `"Press Start 2P", ui-monospace, monospace`;
export const MONO = `"Geist Mono", ui-monospace, monospace`;
export const RAMP = ".·:-=+*";

// Sprites: '#' gray, '-' skin, 'o' ember, 'w' white, 'c' cloud edge, '.' empty. One cell is drawn as an S×S block.
export const COLORS: Record<string, string> = { "#": INK, "-": "#cdc9c2", o: EMBER, w: "#ffffff", c: "#bdb9b2" };

export const HEAD = [
  "....#######.....",
  "...##########...",
  "..###########...",
  "..##########-...",
  "..#########---..",
  "..#####------...",
  "..####----#--...",
  "..###-#-------..",
  "..###--------...",
  "...##-------....",
  ".....------.....",
  "......---.......",
];
export const LEGS_1 = [
  // reach: front leg forward, back leg pushing off
  ".....oooooo.....",
  "....ooooooooo...",
  "...-ooooooooo--.",
  "..--oooooooo..-.",
  ".--.oooooooo....",
  "....oooooooo....",
  "....########....",
  "....###..####...",
  "...###....####..",
  "..###......###..",
  ".###........##..",
  "###.........###.",
];
export const LEGS_2 = [
  // passing: back knee comes through
  ".....oooooo.....",
  "....oooooooo....",
  "....oooooooo-...",
  "...-oooooooo-...",
  "...-oooooooo....",
  "....oooooooo....",
  "....########....",
  ".....#######....",
  ".....###.####...",
  ".....###...##...",
  "....###....#....",
  "....####........",
];
export const LEGS_3 = [
  // reach, other side: arms swapped
  ".....oooooo.....",
  "....ooooooooo...",
  "....ooooooooo-..",
  "...-oooooooo--..",
  "..--oooooooo....",
  "..-.oooooooo....",
  "....########....",
  "....####.###....",
  "...####...###...",
  "..###......###..",
  ".##.........##..",
  "###.........###.",
];
export const LEGS_4 = [
  // passing, other knee
  ".....oooooo.....",
  "....oooooooo....",
  "...-oooooooo....",
  "...-oooooooo-...",
  "....oooooooo-...",
  "....oooooooo....",
  "....########....",
  "....#######.....",
  "...####.###.....",
  "...##...###.....",
  "...#...###......",
  ".......####.....",
];
export const LEGS_IDLE = [
  ".....oooooo.....",
  "....oooooooo....",
  "...-oooooooo-...",
  "...-oooooooo-...",
  "...-oooooooo-...",
  "....oooooooo....",
  "....########....",
  "....###..###....",
  "....###..###....",
  "....###..###....",
  "....###..###....",
  "...####..####...",
];
// Clouds: 'c' soft outline, 'w' white fill.
export const CLOUD_L = [
  "..............cccccc..................",
  "............ccwwwwwwcc................",
  "...........cwwwwwwwwwwc...cccc........",
  ".....cccc.cwwwwwwwwwwwwc.cwwwwcc......",
  "....cwwwwccwwwwwwwwwwwwwccwwwwwwc.....",
  "...cwwwwwwwwwwwwwwwwwwwwwwwwwwwwwccc..",
  "..cwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwc.",
  ".cwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwc",
  ".cwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwc",
  "..cccccccccccccccccccccccccccccccccccc.",
];
export const CLOUD_S = [
  ".......cccc...........",
  ".....ccwwwwcc.ccc.....",
  "....cwwwwwwwwcwwwcc...",
  "..ccwwwwwwwwwwwwwwwc..",
  ".cwwwwwwwwwwwwwwwwwwc.",
  "..cccccccccccccccccc..",
];

// Kyle faces right: head plus a four-beat run cycle (reach, pass, reach, pass).
export const RUN = [LEGS_1, LEGS_2, LEGS_3, LEGS_4].map((body) => [...HEAD, ...body]);
export const STAND = [...HEAD, ...LEGS_IDLE];
export const SPRITE_H = STAND.length;
export const SPRITE_W = STAND[0].length;

// Obstacles: the problems in each job.
export const OBSTACLES: Record<ObstacleKind, string[]> = {
  bug: [
    "..#........#..",
    "...#......#...",
    "....######....",
    "..##oooooo##..",
    ".#oo#oooo#oo#.",
    "#.oooooooooo.#",
    ".#oo#oooo#oo#.",
    "#.oooooooooo.#",
    "..##########..",
    ".#..#....#..#.",
  ],
  barrier: [
    "oowwoowwoowwoo",
    "oowwoowwoowwoo",
    "##############",
    ".##........##.",
    ".##........##.",
    "wwoowwoowwoowo",
    "wwoowwoowwoowo",
    "##############",
    ".##........##.",
    ".##........##.",
    "###........###",
  ],
  stack: [
    "..########....",
    "..#wwwwww#....",
    "..#w####w#....",
    "..#wwwwww#....",
    "##########....",
    "#wwwwwwww#....",
    "#w######w#####",
    "#wwwwwwww#www#",
    "##########w#w#",
    "#wwwwwwww#www#",
    "#w##oo##w#w#w#",
    "##############",
  ],
  hippo: [
    "...##....##.......",
    "..####..####......",
    ".##############...",
    "####w###########..",
    "#################.",
    "#o##############..",
    "#################.",
    ".################.",
    "..###oo#######.##.",
    "..###.o.######....",
    "..###..##..###....",
    "..###..##..###....",
    ".####.###.####....",
  ],
  fire: [
    "......o.......",
    ".....oo.......",
    ".....ooo..o...",
    "....oooo..oo..",
    "...ooowoo.oo..",
    "...oowwwoooo..",
    "..ooowwwwooo..",
    "..oowwwwwwoo..",
    "..oowwwwwwoo..",
    "...oowwwwoo...",
    "..##########..",
    ".############.",
  ],
  clock: [
    "....######....",
    "..##wwwwww##..",
    ".#wwwwo#wwww#.",
    "#wwwwww#wwwww#",
    "#wwwwww#wwwww#",
    "#wwwwww#oooww#",
    "#wwwwwwwwwwww#",
    ".#wwwwwwwwww#.",
    "..##wwwwww##..",
    "....######....",
    "..#........#..",
    ".##........##.",
  ],
};

/** Deterministic 0..1 hash so the scenery is the same every run. */
export const hash = (n: number) => {
  const v = Math.sin(n * 12.9898) * 43758.5453;
  return v - Math.floor(v);
};

export const COUNT_STEP = 0.75; // seconds per countdown beat

export type ObstacleResult = { index: number; cleared: boolean };

/** Draw a sprite: one character per cell, each cell an `size`×`size` block. */
export function drawSprite(ctx: CanvasRenderingContext2D, rows: string[], x: number, top: number, size: number) {
  for (let r = 0; r < rows.length; r++)
    for (let c = 0; c < rows[r].length; c++) {
      const ch = rows[r][c];
      if (ch === ".") continue;
      ctx.fillStyle = COLORS[ch];
      ctx.fillRect(Math.round(x + c * size), Math.round(top + r * size), size, size);
    }
}
