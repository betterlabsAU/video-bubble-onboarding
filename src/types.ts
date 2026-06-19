// Public config types for a Video Bubble Onboarding "tour".
// A tour is plain JSON — no backend required at runtime.

export type AccentKey = "indigo" | "violet" | "sky" | "emerald" | "rose" | "amber";
export type BubbleSize = "sm" | "md" | "lg";
export type BubblePosition = "br" | "bl" | "tr" | "tl";
export type TriggerType = "route" | "first_visit" | "manual";

export interface HighlightStep {
  /** Stable id (any unique string). */
  id: string;
  /** A CSS selector for the element to spotlight. Prefer a data-attribute or id. */
  selector: string;
  /** Short caption shown beside the highlight. */
  label: string;
  /** Seconds into the video when this highlight starts. */
  time: number;
  /** Seconds when it ends — only used when `hold` is false. */
  endTime?: number;
  /** Keep highlighted until the next step (default true). If false, uses time→endTime. */
  hold?: boolean;
}

export interface Trigger {
  type: TriggerType;
  /** For "route" / "first_visit": the pathname to match (e.g. "/dashboard"). */
  path?: string;
  /** "exact" (default) or "prefix". */
  match?: "exact" | "prefix";
}

export interface Tour {
  /** Stable id — used as the localStorage key for completion/position. */
  id: string;
  title?: string;
  /** A reachable MP4 (recommended for cross-browser) or WebM URL. */
  videoUrl: string;
  trigger: Trigger;
  /** If false (default), it won't auto-show again once watched/skipped/closed. */
  showAgain?: boolean;
  /** Starting corner: bottom-right (default), bottom-left, top-right, top-left. */
  position?: BubblePosition;
  /** Colour theme (default "indigo"). */
  accent?: AccentKey;
  /** Bubble size (default "md"). */
  size?: BubbleSize;
  /** Neon glow around the bubble (default true). */
  glow?: boolean;
  /** Auto-play (muted) when it appears (default false). */
  autoplay?: boolean;
  steps?: HighlightStep[];
}

export interface Accent {
  base: string;
  soft: string;
  deep: string;
}

export const ACCENTS: Record<AccentKey, Accent> = {
  indigo: { base: "#6366f1", soft: "#a5b4fc", deep: "#312e81" },
  violet: { base: "#8b5cf6", soft: "#c4b5fd", deep: "#4c1d95" },
  sky: { base: "#0ea5e9", soft: "#7dd3fc", deep: "#0c4a6e" },
  emerald: { base: "#10b981", soft: "#6ee7b7", deep: "#064e3b" },
  rose: { base: "#f43f5e", soft: "#fda4af", deep: "#881337" },
  amber: { base: "#f59e0b", soft: "#fcd34d", deep: "#78350f" },
};

export const SIZES: Record<BubbleSize, number> = { sm: 140, md: 176, lg: 212 };

export function accentOf(t: { accent?: AccentKey }): Accent {
  return ACCENTS[t.accent || "indigo"] || ACCENTS.indigo;
}
export function sizeOf(t: { size?: BubbleSize }): number {
  return SIZES[t.size || "md"] || SIZES.md;
}
export function stepHolds(s: { hold?: boolean }): boolean {
  return s.hold !== false;
}
