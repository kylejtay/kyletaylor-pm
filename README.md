# Kyle's agent portfolio (homepage v0)

Visual-only homepage: one full screen, no page scroll. The intro and an "ask me anything" box are all there is until the visitor asks something; then it becomes a chat. Tool calls render as cards; opening one turns the screen into a chat | artifact split.

No agent or backend is wired yet. All responses are scripted in `lib/content.ts`, which also holds the placeholder roles, tools, guardrails and case studies to swap for real context.

```bash
npm install
npm run dev            # http://localhost:3000
npm run preview:build  # dist/preview.html, a single self-contained file of the same page
npm run check          # Biome lint + format check, then TypeScript
npm run lint:fix       # apply Biome's safe fixes and formatting
```

## Code quality
[Biome](https://biomejs.dev) handles linting and formatting (`biome.json`); ESLint isn't used because typescript-eslint doesn't support TypeScript 7 yet. A pre-commit hook (simple-git-hooks + lint-staged, installed by `npm install`) auto-fixes staged files and runs `tsc`, and CI runs `npm run check` before every build, so nothing unlinted reaches `main`.

## Map
- `components/Home.tsx`: full-screen shell and top bar. Role state lives here; for now `#growth`, `#devtools` or `#ai-platform` in the URL picks the role (these become real per-role routes later).
- `components/AgentStage.tsx`: intro, composer, chat, scripted flow runner, tool-call card, result card, split layout animation.
- `components/ArtifactPanel.tsx`: renderers for each artifact kind (case study, experience, architecture, role fit).
- `components/GameMode.tsx`: the game controller in the bottom-right corner (desktop widths) and the full-screen "game mode" window it launches. The game itself is not built yet; levels come from `CAREER_LEVELS` in `lib/content.ts`.
- `components/AsciiField.tsx`: ASCII noise canvas behind everything. The cursor lights it up in orange, reveals hidden shapes, and clicks send out ripples.
- `app/globals.css`: Tailwind v4 theme tokens (paper, ink, ember accent, Geist + Geist Mono).

Stack: Next.js 16, React 19, Tailwind CSS 4, Framer Motion.

## Deploy (GitHub Pages)
`next.config.mjs` uses `output: "export"`, so `npm run build` writes a static site to `out/`. `.github/workflows/deploy.yml` builds and publishes it on every push to `main`. In the GitHub repo, set **Settings → Pages → Source** to **GitHub Actions**. The workflow passes the Pages base path (e.g. `/kyletaylor-pm`) through `PAGES_BASE_PATH`; locally it's empty.

## Syncing from the Claude project
The site is still being iterated on in the Claude project's shared folder (`portfolio-site/`). To pull newer versions, ask Claude in the project to re-sync this repo from the shared folder (skipping `dist/` and keeping `next.config.mjs` and `.github/`), then review the diff and commit.
