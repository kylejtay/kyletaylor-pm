// Builds dist/preview.html: one self-contained file (inline CSS + JS) of the homepage.

import { execSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { build } from "esbuild";

const root = path.resolve(import.meta.dirname, "..");
mkdirSync(path.join(root, "dist"), { recursive: true });

execSync("npx @tailwindcss/cli -i app/globals.css -o dist/preview.css --minify", { cwd: root, stdio: "inherit" });

const js = await build({
  entryPoints: [path.join(root, "preview/entry.tsx")],
  bundle: true,
  minify: true,
  write: false,
  format: "iife",
  jsx: "automatic",
  define: { "process.env.NODE_ENV": '"production"' },
  alias: { "@": root },
});

const css = readFileSync(path.join(root, "dist/preview.css"), "utf8");
const script = js.outputFiles[0].text.replace(/<\/script/gi, "<\\/script");

const html = `<title>Kyle's Agent Portfolio</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Geist:wght@300..700&family=Geist+Mono:wght@400;500&family=Press+Start+2P&display=swap">
<style>${css}</style>
<div id="root"></div>
<script>${script}</script>
`;
writeFileSync(path.join(root, "dist/preview.html"), html);
console.log(`dist/preview.html ${(html.length / 1024).toFixed(0)}kb`);
