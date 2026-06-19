# OVERVIEW — steering doc for agents & contributors

> **Read this first.** This is the orientation / steering guide for anyone — a
> human or an **AI coding agent** — who needs to **install, build, fork, improve,
> integrate, or extend** this product. It is deliberately written so an agent can
> land here cold and be productive.
>
> - `README.md` = how a *user* installs and uses it.
> - **`OVERVIEW.md` (this file)** = how it's *built*, the contracts you must not
>   break, and how to work on it.

---

## 1. What this product is

**Video Bubble Onboarding** is a portable, **zero-backend** React **runtime** that
shows floating video "cam bubble" product tours and **spotlights real UI elements**
in sync with the narration (pulsing ring + caption + a little click demo).

- Tours are **plain JSON** (`videoUrl` + `trigger` + `steps`). No database, no
  server, no Tailwind — just **React + one CSS file**.
- Framework-agnostic: Next.js, Vite, CRA, Remix, React Router — anything React.
- This repo is the **runtime** (what end-users see). The **authoring** half
  (record → AI-transcribe → click-to-pin elements) is a *separate reference app*
  (Next.js + Supabase + OpenAI) that simply emits the same tour JSON. **You do not
  need it** to ship tours — JSON can be hand-written or come from any source.

---

## 2. Repo map — every file, what it does

```
src/
  index.ts                 Public API surface (the only things consumers import)
  VideoBubbleOnboarding.tsx  THE provider. Mount once. Matches the route, picks the
                             tour to show, handles replay/first-visit/dismiss.
  VideoBubble.tsx          The round cam bubble: video player, whole-surface drag,
                             neon, progress ring, controls, multi-part stepper.
  HighlightLayer.tsx       The spotlight overlay (ring + caption + click demo),
                             rendered via createPortal; tracks the target with rAF.
  usePathname.ts           Framework-agnostic current route (patches History API).
  storage.ts               Per-viewer localStorage: completion, dropped position,
                             first-visit flag.
  types.ts                 Public types + ACCENTS / SIZES presets + helpers.
  styles.css               ALL visuals + animations. No Tailwind. Themeable via vars.
example/
  tours.json               A sample tour config.
  usage.tsx                Minimal integration (Next.js + generic React).
package.json               peerDeps react/react-dom; exports "." and "./styles.css".
tsconfig.json              Standalone typecheck config (jsx: react-jsx).
README.md / LICENSE        User docs / MIT.
```

Rule of thumb: **`types.ts` is the contract, `styles.css` is the look, the three
`*.tsx` are the behaviour.**

---

## 3. How it works (architecture)

- **Provider (`VideoBubbleOnboarding`)** — `usePathname()` → filter `tours` by their
  `trigger` (route/first_visit) → pick the first eligible tour the viewer should
  still see → render `<VideoBubble>`. It **takes tours as a prop** (no fetching);
  honours completion (localStorage), one-time first-visit, "closed on this route",
  and manual replay (`window.vboPlay(id)` / `vbo:play` event / `?vbo=id`). No-ops
  inside iframes and on `exclude` routes.
- **`VideoBubble`** — circular `object-fit:cover` video; accent applied as CSS vars;
  size + glow + muted autoplay options; **whole-surface drag** (works paused *or*
  playing) with a 4px click-vs-drag threshold and persisted/edge-peeking position;
  progress ring; multi-part Next/Prev stepper; drives the highlight from the video's
  `timeupdate` (per-step **`hold`**: stay until next vs a `time→endTime` window).
- **`HighlightLayer`** — resolves `step.selector` with `querySelector`, measures it
  every frame (`requestAnimationFrame`) so the overlay follows scroll/resize, and
  draws a ring + caption + one-shot click demo in a portal. **It never mutates the
  target element.**
- **Theming** — `--vbo-base` / `--vbo-soft` / `--vbo-deep` CSS variables are set
  inline per bubble (from `ACCENTS`); `styles.css` consumes them (with `color-mix`
  for alpha) and falls back to indigo.
- **Persistence** — localStorage keys: `vbo:status:v1`, `vbo:pos:v1`,
  `vbo:first-visit:v1`.

---

## 4. Install · typecheck · build · verify

- **Install / consume:** copy `src/` into a host app, **or**
  `npm install github:betterlabsAU/video-bubble-onboarding`. Import the component +
  `styles.css`. (Full steps in `README.md`.)
- **Typecheck:** `npx tsc -p tsconfig.json` (it's `noEmit`). Needs `react` /
  `@types/react` available (peer deps).
- **Build:** there is **no bundle step yet** — the package ships **TypeScript
  source** and relies on the host's bundler (Next/Vite/etc.) to compile it. To make
  it a published npm package, see §7.
- **Tests:** there is **no test framework yet**. Verify a change by integrating into
  a host app (or the source studio app) and exercising it in a browser:
  bubble appears on the trigger route, plays, highlights resolve on the right
  elements, drag/persist works, completion stops it re-nagging.

---

## 5. The public contract — don't break this casually

These are what consumers depend on. Treat changes as **semver**: additive = minor,
remove/rename = **breaking (major)**.

1. **Component API:** `<VideoBubbleOnboarding tours={Tour[]} exclude={string[]} />`.
2. **`Tour` / `HighlightStep` shapes** in `types.ts` — the JSON contract.
3. **CSS:** every class is `.vbo-*` and themes via `--vbo-*` vars. Keep that prefix
   and the variable names; don't reintroduce a Tailwind/runtime-CSS dependency.
4. **localStorage key names** (`:v1` suffixed) — renaming them silently resets every
   user; bump the version suffix deliberately if the shape changes.
5. **Invariants that keep it working:** mount once at the app root; SPA routing must
   use the History API (handled by `usePathname`); selectors must resolve at runtime;
   stay **backend-free** and **framework-agnostic** (no `next/*` or router imports);
   stay **SSR-safe** (guard `window`/`document`).

---

## 6. How to fork & improve (common tasks → where)

| I want to… | Change |
|---|---|
| Add an accent colour | `types.ts` → `ACCENTS` (themes everything via vars automatically) |
| Add a bubble size | `types.ts` → `SIZES` |
| Restyle the bubble / ring / neon | `src/styles.css` (`.vbo-*`) + markup in `VideoBubble.tsx` |
| Change *when* tours show | `routeMatches` + the auto-pick `useEffect` in `VideoBubbleOnboarding.tsx` |
| Add a new step option | `HighlightStep` in `types.ts`, then `HighlightLayer.tsx` / `VideoBubble.tsx` |
| Add a new public prop | `types.ts` + the provider, and export it in `index.ts` |
| Change completion rules | `storage.ts` (`shouldShow`, `RANK`) |

Keep it dependency-light: the only runtime dependency is React (peer).

---

## 7. Publishing to npm (optional, if you want `npm i video-bubble-onboarding`)

1. Add a build that emits JS + `.d.ts` (e.g. `tsup src/index.ts --format esm,cjs --dts`)
   and copies `styles.css` to `dist/`.
2. Point `package.json` `main` / `module` / `types` / `exports` at `dist/`, set
   `"files": ["dist"]`, add `"prepublishOnly": "<build>"`, and remove the
   source-import note from the README's Option B.
3. `npm publish` (or keep the current Git-install path — both are documented).

---

## 8. Relationship to the source / authoring app

The original project (`betterlabs-interviews`, an AI video interview screener) is
where this product was extracted from. There it lives at
`packages/video-bubble-onboarding/` **and** ships the **authoring studio** — a
record-in-browser → Whisper-transcribe → **click-the-element-on-your-live-page**
editor that writes exactly the tour JSON this runtime consumes. Treat **this repo as
the canonical product**; the app is the reference authoring environment and a
real-world consumer.

---

## 9. Gotchas (the ones that bite)

- **Highlight not showing?** The `selector` almost certainly doesn't match at that
  moment — check `document.querySelector("…")` on the page.
- **No video in Safari?** Use **MP4 / H.264** (some WebM codecs are unsupported).
- **Mount it once** — two providers render two bubbles.
- **`color-mix`** is used for theming → evergreen browsers only (Chrome/Edge 111+,
  Safari 16.2+, Firefox 113+).
- **Reduced motion** is respected (the neon/click-demo animations drop out).
- Cross-origin videos **play fine**; they just can't be read pixel-by-pixel (not needed).
