import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Tour } from "./types";
import { usePathname } from "./usePathname";
import {
  shouldShow,
  setStatus,
  resetStatus,
  firstVisitDone,
  markFirstVisitDone,
  OnboardingStatus,
} from "./storage";
import VideoBubble from "./VideoBubble";

function routeMatches(tour: Tour, pathname: string): boolean {
  const t = tour.trigger;
  if (t.type === "manual") return false;
  const path = t.path || "/";
  return t.match === "prefix" ? pathname.startsWith(path) : pathname === path;
}

export interface VideoBubbleOnboardingProps {
  /** Your tours (plain JSON). */
  tours: Tour[];
  /** Pathname prefixes to never show a bubble on (e.g. ["/login"]). */
  exclude?: string[];
}

// Mount ONCE near your app root. Watches the route, shows the right tour bubble,
// and remembers per-viewer completion in localStorage. Also exposes manual replay
// via `window.vboPlay(id)`, a `vbo:play` CustomEvent, and a `?vbo=<id>` URL param.
export default function VideoBubbleOnboarding({ tours, exclude = [] }: VideoBubbleOnboardingProps) {
  const pathname = usePathname();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [forced, setForced] = useState(false);
  const [inFrame] = useState(
    () => typeof window !== "undefined" && window.self !== window.top
  );

  const isExcluded = useCallback(
    (p: string) => exclude.some((x) => p === x || p.startsWith(x.endsWith("/") ? x : x + "/")),
    [exclude]
  );

  const activeIdRef = useRef<string | null>(null);
  useEffect(() => {
    activeIdRef.current = activeId;
  }, [activeId]);

  // Tours closed on the current route — don't auto-reopen until navigation.
  const dismissedRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    dismissedRef.current.clear();
    setForced(false);
  }, [pathname]);

  const matching = useMemo(
    () => (isExcluded(pathname) ? [] : tours.filter((t) => routeMatches(t, pathname))),
    [tours, pathname, isExcluded]
  );

  useEffect(() => {
    if (inFrame || isExcluded(pathname)) {
      setActiveId(null);
      return;
    }
    if (forced) return;
    const cur = activeIdRef.current;
    if (cur && matching.some((t) => t.id === cur)) return; // keep a still-valid bubble
    const auto = matching.find(
      (t) =>
        !dismissedRef.current.has(t.id) &&
        !(t.trigger.type === "first_visit" && firstVisitDone()) &&
        shouldShow(t.id, t.showAgain === true)
    );
    if (auto?.trigger.type === "first_visit") markFirstVisitDone();
    setActiveId(auto ? auto.id : null);
  }, [matching, pathname, forced, inFrame, isExcluded]);

  const play = useCallback(
    (id: string) => {
      if (!tours.some((t) => t.id === id)) return;
      resetStatus(id);
      dismissedRef.current.delete(id);
      setForced(true);
      setActiveId(id);
    },
    [tours]
  );

  useEffect(() => {
    (window as any).vboPlay = play;
    const onPlay = (e: Event) => {
      const id = (e as CustomEvent).detail?.id;
      if (id) play(id);
    };
    window.addEventListener("vbo:play", onPlay);
    return () => window.removeEventListener("vbo:play", onPlay);
  }, [play]);

  // `?vbo=<id>` deep-link for previews.
  const handledVbo = useRef(false);
  useEffect(() => {
    if (inFrame || handledVbo.current || tours.length === 0) return;
    const id = new URLSearchParams(window.location.search).get("vbo");
    if (id && tours.some((t) => t.id === id)) {
      handledVbo.current = true;
      play(id);
    }
  }, [tours, inFrame, play]);

  const active = useMemo(
    () => (activeId ? tours.find((t) => t.id === activeId) || null : null),
    [activeId, tours]
  );

  const onDismiss = useCallback((status: OnboardingStatus) => {
    const id = activeIdRef.current;
    if (id) {
      setStatus(id, status);
      dismissedRef.current.add(id);
    }
    setActiveId(null);
    setForced(false);
  }, []);

  if (inFrame || isExcluded(pathname)) return null;

  const replayId = !active ? matching[0]?.id : undefined;

  return (
    <>
      {active && <VideoBubble key={active.id} tour={active} onDismiss={onDismiss} />}
      {!active && replayId && (
        <button className="vbo-replay" onClick={() => play(replayId)}>
          <svg width={16} height={16} viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z" />
          </svg>
          Replay tour
        </button>
      )}
    </>
  );
}
