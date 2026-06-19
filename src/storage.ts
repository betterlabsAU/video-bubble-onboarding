// Per-viewer state in the browser (localStorage): completion, dropped position,
// and a one-time "first visit" flag. No backend needed.

export type OnboardingStatus =
  | "not_started"
  | "watched_25"
  | "watched_50"
  | "watched_100"
  | "skipped"
  | "dismissed";

const STATUS_KEY = "vbo:status:v1";
const POS_KEY = "vbo:pos:v1";
const FV_KEY = "vbo:first-visit:v1";

function readMap(key: string): Record<string, any> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(key) || "{}");
  } catch {
    return {};
  }
}
function writeMap(key: string, map: Record<string, any>) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(map));
  } catch {
    /* quota / private mode */
  }
}

const RANK: Record<OnboardingStatus, number> = {
  not_started: 0,
  watched_25: 1,
  watched_50: 2,
  watched_100: 3,
  skipped: 4,
  dismissed: 4,
};

export function getStatus(id: string): OnboardingStatus | undefined {
  return readMap(STATUS_KEY)[id]?.status;
}
export function setStatus(id: string, status: OnboardingStatus) {
  const m = readMap(STATUS_KEY);
  const prev: OnboardingStatus | undefined = m[id]?.status;
  // progress only moves forward; terminal actions always win
  if (prev && status.startsWith("watched_") && RANK[prev] >= RANK[status]) {
    m[id] = { status: prev, at: new Date().toISOString() };
  } else {
    m[id] = { status, at: new Date().toISOString() };
  }
  writeMap(STATUS_KEY, m);
}
export function resetStatus(id: string) {
  const m = readMap(STATUS_KEY);
  delete m[id];
  writeMap(STATUS_KEY, m);
}
function isSettled(s: OnboardingStatus | undefined) {
  return s === "watched_100" || s === "skipped" || s === "dismissed";
}
export function shouldShow(id: string, showAgain: boolean) {
  return showAgain ? true : !isSettled(getStatus(id));
}

export function getPos(id: string): { x: number; y: number } | null {
  const p = readMap(POS_KEY)[id];
  return p && typeof p.x === "number" && typeof p.y === "number" ? p : null;
}
export function setPos(id: string, pos: { x: number; y: number }) {
  const m = readMap(POS_KEY);
  m[id] = pos;
  writeMap(POS_KEY, m);
}

export function firstVisitDone(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(FV_KEY) === "1";
  } catch {
    return false;
  }
}
export function markFirstVisitDone() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(FV_KEY, "1");
  } catch {
    /* ignore */
  }
}
