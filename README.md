# Video Bubble Onboarding

A floating, draggable **video "cam bubble"** that plays a short narrated clip and
**spotlights your real UI** in sync with it — pulsing ring, caption, and a little
click demo on each element. Drop it into any React app. **No backend at runtime.**

- 🎈 Round, draggable bubble (Loom-style) — moves anywhere, remembers where it was dropped
- 🔦 Highlights real elements by CSS selector, in time with the video
- 🎨 Per-tour colour, size, neon glow, autoplay; multi-part **Next/Prev** stepper
- 🧠 Remembers completion per viewer (localStorage) so it doesn't nag
- ⚛️ Framework-agnostic React (Next.js, Vite, CRA, Remix, React Router…)
- 🪶 Zero dependencies (just React) and zero backend to *show* tours

> **Two halves of the product.** This package is the **runtime** — the part your
> users see. Tours are plain JSON you provide (`videoUrl` + `steps`). *Authoring*
> (record → AI-transcribe → click-to-pin elements) needs a backend and ships
> separately as a reference app — see [Authoring](#authoring-tours). You do **not**
> need it to run tours; you can hand-write the JSON.

---

## a) Where it lives & how it's actioned

You mount **one component** (`<VideoBubbleOnboarding tours={…} />`) near your app
root. From then on it watches the URL and:

- **Auto-shows** the matching tour when a user lands on a route you configured
  (or on their **first visit**), as a fixed bubble in a corner — it never blocks
  the page (no backdrop; the page stays scrollable and clickable).
- Lets the user **play / pause / drag / mute / close** it, and step through parts.
- Can be **triggered manually** from your own code (a "Show me how" button):
  `window.vboPlay("tour-id")`, a `vbo:play` event, or a `?vbo=tour-id` URL.
- Remembers per browser what's been watched/closed, and offers a quiet **"Replay
  tour"** pill for tours already seen.

Nothing renders on excluded routes (e.g. `/login`) and nothing renders inside
iframes.

---

## Requirements

- **React 17+** (uses hooks + `createPortal`).
- A modern evergreen browser (uses CSS `color-mix` for theming — Chrome/Edge 111+,
  Safari 16.2+, Firefox 113+).
- Your tour **videos hosted somewhere reachable** (any URL). **MP4 (H.264)** is
  recommended for the widest browser support.

---

## Install / download

### Option A — copy the folder (works everywhere, nothing to publish) ✅ recommended

Copy the `src/` folder into your project, e.g. to
`src/lib/video-bubble-onboarding/`, and import from it:

```tsx
import { VideoBubbleOnboarding } from "@/lib/video-bubble-onboarding";
import "@/lib/video-bubble-onboarding/styles.css";
```

### Option B — install from Git

```bash
npm install github:betterlabsAU/video-bubble-onboarding
# or: pnpm add / yarn add the same
```

Then import from the package name. (Ships TypeScript source; your bundler — Next,
Vite, etc. — compiles it. If your setup doesn't transpile `node_modules`, use
Option A.)

---

## b) Integrate with any codebase — 3 steps

### 1. Mount it once, at your app root

It **must** live somewhere that stays mounted across navigation (a root layout /
top-level component) so it can follow route changes and not reset.

```tsx
// Next.js App Router — app/layout.tsx
import { VideoBubbleOnboarding } from "video-bubble-onboarding";
import "video-bubble-onboarding/styles.css";
import tours from "./tours.json";

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
        <VideoBubbleOnboarding tours={tours} exclude={["/login"]} />
      </body>
    </html>
  );
}
```

```tsx
// Any React app — render it once next to <App />
import { createRoot } from "react-dom/client";
import { VideoBubbleOnboarding } from "video-bubble-onboarding";
import "video-bubble-onboarding/styles.css";
import tours from "./tours.json";

createRoot(document.getElementById("root")!).render(
  <>
    <App />
    <VideoBubbleOnboarding tours={tours} />
  </>
);
```

### 2. Import the stylesheet (once)

`import "video-bubble-onboarding/styles.css";` — or copy `src/styles.css` and
import that. It's self-contained (no Tailwind required).

### 3. Give the elements you spotlight a stable selector

Add a `data-onb` attribute (or a stable `id`) to each element a tour points at,
and use that in the step's `selector`:

```html
<button data-onb="new-project">+ New project</button>
```
```json
{ "selector": "[data-onb='new-project']", "label": "Start here", "time": 4 }
```

---

## 🚀 Your first tour, step by step

A tour = a **video** + the **elements** it points at + **where it should show**.
The widget *plays* tours — it doesn't record them — so here's the whole flow.

### 1. Record your clip
Use any screen/cam recorder — **Loom**, **QuickTime** (macOS: ⌘⇧5), **OBS**, your
OS recorder. Talk through what you're showing; **30–60s** is ideal. Export as
**MP4 (H.264)** for the widest browser support (Safari included).

> Don't want to do this by hand? An optional **point-and-click studio** (record in
> the browser → auto-transcribe → click elements on your live page) generates the
> JSON for you — see [Authoring tours](#authoring-tours) below.

### 2. Put the video where it can be reached ("where it lives")
Upload the MP4 anywhere that serves a public URL, e.g.:
- your app's **`public/`** folder → `"/tours/welcome.mp4"` (simplest), or
- **S3 / Cloudflare R2 / Supabase Storage / any CDN**.

That URL becomes the tour's `videoUrl`. The tour **definition** (the JSON below)
lives wherever you like — a **`tours.json`** in your repo, a CMS, or your own API
that the app reads and passes to the component.

### 3. Tag the things you'll point at
On the page you're explaining, give each element a stable handle:
```html
<button data-onb="new-project">+ New project</button>
<input  data-onb="search" placeholder="Search…" />
```

### 4. Write the tour — and choose where/how people reach it
The **`trigger`** is *where to use this product* — the route (or first-visit, or a
manual button):
```jsonc
{
  "id": "first-tour",
  "title": "Welcome 👋",
  "videoUrl": "/tours/welcome.mp4",

  // ↓↓  WHERE / HOW it shows  ↓↓
  "trigger": { "type": "route", "path": "/dashboard", "match": "exact" },

  "accent": "indigo", "size": "md",
  "steps": [
    { "id": "a", "selector": "[data-onb='new-project']", "label": "Start a project here", "time": 4 },
    { "id": "b", "selector": "[data-onb='search']",      "label": "Find anything fast",   "time": 9 }
  ]
}
```

| To make it appear… | Set `trigger` to |
|---|---|
| on one page | `{ "type": "route", "path": "/dashboard" }` |
| on a section + its sub-pages | `{ "type": "route", "path": "/settings", "match": "prefix" }` |
| once, on a user's very first visit | `{ "type": "first_visit", "path": "/" }` |
| only when you call it (a "Show me how" button) | `{ "type": "manual" }` → `window.vboPlay("first-tour")` |

`time` = the second in the clip when each spotlight should pop — scrub the video to
find them. Leave `hold` on (default) so each spotlight stays until the next one.

### 5. Ship it
Add the tour to the array you pass the provider (see *Integrate*, step 1), open the
route, and your bubble appears in the corner and plays — drag it anywhere; it
remembers where it's dropped. Tweak `accent`, `size`, `glow`, `position` to taste.

---

## ✅ MUST-DO checklist (do these or it won't work)

1. **Mount exactly one** `<VideoBubbleOnboarding>` at the app **root** — not inside
   a page that unmounts on navigation.
2. **Import the CSS** (`styles.css`) once.
3. **Host each video** and put a reachable URL in `videoUrl`. Use **MP4/H.264** for
   cross-browser (Safari).
4. **Give every highlighted element a stable selector** — add `data-onb="…"` or an
   `id`. ← *the #1 reason a highlight "doesn't show": the selector doesn't match.*
5. **Set each tour's `trigger`** (`route` + `path`, `first_visit`, or `manual`).
   Paths are matched against `window.location.pathname`.
6. Make sure the **target element is actually rendered/visible** at the moment its
   `time` hits (if it's behind a tab/scroll, the bubble scrolls to it, but it must
   exist in the DOM).
7. **SPA routing must use the History API** — Next.js and React Router do, so this
   just works. (The widget patches `pushState`/`replaceState` to follow client
   navigations.)

---

## Tour config (JSON)

A tour is plain data — keep it in a `.json` file, a CMS, or your own API.

| Field | Type | Notes |
|---|---|---|
| `id` | string | **required**, unique. Used as the localStorage key. |
| `videoUrl` | string | **required**. MP4 (recommended) or WebM URL. |
| `trigger` | object | **required**. `{ type, path?, match? }` — see below. |
| `title` | string | Shown on hover. |
| `showAgain` | boolean | `false` (default) = stop after watched/closed. `true` = every visit. |
| `position` | `br`\|`bl`\|`tr`\|`tl` | Starting corner (default `br`). |
| `accent` | `indigo`\|`violet`\|`sky`\|`emerald`\|`rose`\|`amber` | Colour (default `indigo`). |
| `size` | `sm`\|`md`\|`lg` | 140 / 176 / 212 px (default `md`). |
| `glow` | boolean | Neon glow (default `true`). |
| `autoplay` | boolean | Muted autoplay on appear (default `false`). |
| `steps` | array | Highlights — see below. |

**Trigger** `{ type, path, match }`:
- `type: "route"` — show on a page. `path` = pathname, `match: "exact"` (default) or `"prefix"`.
- `type: "first_visit"` — like `route`, but only the **first time** the viewer ever sees a tour (once per browser).
- `type: "manual"` — never auto-shows; only via `window.vboPlay(id)` / `vbo:play` / `?vbo=id` / the Replay pill.

**Step** `{ id, selector, label, time, hold?, endTime? }`:
- `selector` — CSS selector for the element (prefer `data-onb` / `id`).
- `label` — the caption.
- `time` — seconds into the video when it appears.
- `hold` *(default `true`)* — stay highlighted **until the next step** (recommended; lingers so it's easy to find).
- `endTime` — only used when `hold: false`; the highlight shows for `time → endTime` then clears.

See [`example/tours.json`](./example/tours.json) and [`example/usage.tsx`](./example/usage.tsx).

---

## Authoring tours

The full walkthrough is **[Your first tour](#-your-first-tour-step-by-step)** above
(record → host → tag elements → set the trigger). Two quick tips:

- **Selectors** — add `data-onb="…"` (most reliable), or in devtools right-click the
  element → *Copy → Copy selector*.
- **Times** — scrub the clip and note the second you mention each thing.

**Optional point-and-click studio.** A full authoring experience — record in the
browser, auto-transcribe with Whisper, and **click the element on your live page**
to capture the selector + timing — exists as a reference implementation
(Next.js + Supabase + OpenAI) in the source project. Use it if you want
non-technical teammates to build tours; it writes exactly this JSON shape.

---

## Triggering & persistence

```js
// play a specific tour now (ignores completion)
window.vboPlay("welcome-dashboard");
// or from anywhere, decoupled:
window.dispatchEvent(new CustomEvent("vbo:play", { detail: { id: "welcome-dashboard" } }));
// or deep-link a preview:  https://app.example.com/?vbo=welcome-dashboard
```

State lives in `localStorage`: `vbo:status:v1` (completion), `vbo:pos:v1`
(dropped position), `vbo:first-visit:v1`. Clear those keys to reset a viewer.

---

## Gotchas

- **Highlight not showing?** 99% of the time the `selector` doesn't match at that
  moment — verify with `document.querySelector("…")` in the console on that page.
- **No video in Safari?** Use **MP4/H.264** (some WebM codecs aren't supported).
- **Mount it once.** Two providers = two bubbles.
- **Reduced motion** is respected (animations/click-demo are dropped).
- Cross-origin videos **play fine**; they just can't be read pixel-by-pixel (not needed here).

## License

MIT © BetterLabs
