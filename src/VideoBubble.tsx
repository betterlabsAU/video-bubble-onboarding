import { useCallback, useEffect, useMemo, useRef, useState, CSSProperties } from "react";
import { Tour, HighlightStep, accentOf, sizeOf, stepHolds } from "./types";
import { getPos, setPos as savePos, setStatus, OnboardingStatus } from "./storage";
import HighlightLayer from "./HighlightLayer";

const MARGIN = 20;
const KEEP = 48; // min px kept on-screen (allows edge "peeking")

function cornerPos(corner: Tour["position"], D: number) {
  const vw = typeof window !== "undefined" ? window.innerWidth : 1280;
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;
  const right = vw - D - MARGIN;
  const bottom = vh - D - MARGIN;
  switch (corner) {
    case "bl":
      return { x: MARGIN, y: bottom };
    case "tr":
      return { x: right, y: MARGIN };
    case "tl":
      return { x: MARGIN, y: MARGIN };
    default:
      return { x: right, y: bottom };
  }
}

// The round, draggable cam bubble. Plays the clip, drives the HighlightLayer, and
// records completion progress to localStorage.
export default function VideoBubble({
  tour,
  onDismiss,
}: {
  tour: Tour;
  onDismiss: (status: OnboardingStatus) => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const D = sizeOf(tour);
  const accent = accentOf(tour);
  const showGlow = tour.glow !== false;
  const src = tour.videoUrl;

  const [pos, setPos] = useState(() => getPos(tour.id) || cornerPos(tour.position, D));
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [activeStep, setActiveStep] = useState<HighlightStep | null>(null);
  const progressMark = useRef(0);

  const steps = useMemo(
    () => [...(tour.steps || [])].sort((a, b) => a.time - b.time),
    [tour.steps]
  );

  // --- drag: whole surface, paused or playing, with a click threshold ---
  const drag = useRef<{ x: number; y: number; px: number; py: number; moved: boolean } | null>(null);
  const justDragged = useRef(false);
  const clampPos = (x: number, y: number) => ({
    x: Math.min(Math.max(KEEP - D, x), window.innerWidth - KEEP),
    y: Math.min(Math.max(KEEP - D, y), window.innerHeight - KEEP),
  });
  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if ((e.target as HTMLElement).closest("button, a")) return;
      drag.current = { x: e.clientX, y: e.clientY, px: pos.x, py: pos.y, moved: false };
      (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    },
    [pos]
  );
  const onPointerMove = useCallback((e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (!d.moved && Math.hypot(dx, dy) < 4) return;
    d.moved = true;
    setPos(clampPos(d.px + dx, d.py + dy));
  }, []);
  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      const d = drag.current;
      if (d?.moved) {
        const final = clampPos(d.px + (e.clientX - d.x), d.py + (e.clientY - d.y));
        setPos(final);
        savePos(tour.id, final);
        justDragged.current = true;
        setTimeout(() => (justDragged.current = false), 0);
      }
      drag.current = null;
    },
    [tour.id]
  );

  useEffect(() => {
    const reclamp = () =>
      setPos((p) => {
        const c = clampPos(p.x, p.y);
        if (c.x !== p.x || c.y !== p.y) savePos(tour.id, c);
        return c;
      });
    reclamp();
    window.addEventListener("resize", reclamp);
    return () => window.removeEventListener("resize", reclamp);
  }, [tour.id]);

  // autoplay (muted) when chosen
  useEffect(() => {
    if (!tour.autoplay) return;
    const v = videoRef.current;
    if (!v) return;
    setMuted(true);
    v.muted = true;
    v.play().catch(() => {});
  }, [tour.autoplay]);

  // --- playback → highlight + progress ---
  const onTimeUpdate = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    const t = v.currentTime;
    setCurrent(t);

    let latest: HighlightStep | null = null;
    for (const s of steps) {
      if (t >= s.time) latest = s;
    }
    const active: HighlightStep | null =
      latest && !stepHolds(latest) && t > (latest.endTime ?? latest.time) ? null : latest;
    setActiveStep((prev) => (prev?.id === active?.id ? prev : active));

    const d = v.duration;
    if (Number.isFinite(d) && d > 0) {
      const frac = t / d;
      let rank: OnboardingStatus | null = null;
      if (frac >= 0.5 && progressMark.current < 2) rank = "watched_50";
      else if (frac >= 0.25 && progressMark.current < 1) rank = "watched_25";
      if (rank) {
        progressMark.current = rank === "watched_50" ? 2 : 1;
        setStatus(tour.id, rank);
      }
    }
  }, [steps, tour.id]);

  const onEnded = useCallback(() => {
    setPlaying(false);
    setActiveStep(null);
    progressMark.current = 3;
    setStatus(tour.id, "watched_100");
  }, [tour.id]);

  const togglePlay = useCallback(() => {
    if (justDragged.current) return;
    const v = videoRef.current;
    if (!v) return;
    if (v.ended || (v.duration && v.currentTime >= v.duration - 0.05)) {
      v.currentTime = 0;
      v.play().catch(() => {});
      return;
    }
    if (v.paused) v.play().catch(() => {});
    else v.pause();
  }, []);

  const goToStep = useCallback(
    (i: number) => {
      const v = videoRef.current;
      const s = steps[i];
      if (!v || !s) return;
      v.currentTime = s.time;
      v.play().catch(() => {});
    },
    [steps]
  );

  const close = (status: OnboardingStatus) => {
    videoRef.current?.pause();
    setActiveStep(null);
    onDismiss(status);
  };

  if (!src) return null;

  const pct = duration > 0 ? Math.min(100, (current / duration) * 100) : 0;
  const R = D / 2 - 3;
  const C = 2 * Math.PI * R;
  const multiPart = steps.length >= 2;
  const partIndex = steps.reduce((acc, s, i) => (current >= s.time ? i : acc), -1);
  const atLast = partIndex >= steps.length - 1;
  const nextTarget = partIndex < 0 ? 0 : partIndex + 1;

  const vars = {
    left: pos.x,
    top: pos.y,
    width: D,
    height: D,
    ["--vbo-base"]: accent.base,
    ["--vbo-soft"]: accent.soft,
    ["--vbo-deep"]: accent.deep,
  } as CSSProperties;

  return (
    <>
      <HighlightLayer step={activeStep} accent={accent} />
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        className="vbo-bubble"
        style={vars}
      >
        {showGlow && <div className="vbo-neon" aria-hidden />}

        <div className="vbo-circle">
          <video
            ref={videoRef}
            src={src}
            playsInline
            muted={muted}
            className="vbo-video"
            onClick={togglePlay}
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onTimeUpdate={onTimeUpdate}
            onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || 0)}
            onEnded={onEnded}
          />
          {!playing && (
            <div className="vbo-play-overlay" role="button" aria-label="Play" onClick={togglePlay}>
              <span className="vbo-play-badge">
                <PlayIcon big />
              </span>
            </div>
          )}
        </div>

        <svg className="vbo-ring" width={D} height={D} viewBox={`0 0 ${D} ${D}`}>
          <circle cx={D / 2} cy={D / 2} r={R} fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth={3} />
          <circle
            cx={D / 2}
            cy={D / 2}
            r={R}
            fill="none"
            stroke={accent.base}
            strokeWidth={3.5}
            strokeLinecap="round"
            strokeDasharray={C}
            strokeDashoffset={C * (1 - pct / 100)}
          />
        </svg>

        <button className="vbo-ctl vbo-close" title="Close" onClick={() => close("dismissed")}>
          <XIcon />
        </button>
        <button
          className="vbo-ctl vbo-mute"
          title={muted ? "Unmute" : "Mute"}
          onClick={() => setMuted((m) => !m)}
        >
          {muted ? <MuteIcon /> : <VolIcon />}
        </button>

        {tour.title && <div className="vbo-title">{tour.title}</div>}

        {multiPart && (
          <div className="vbo-stepper" onPointerDown={(e) => e.stopPropagation()}>
            <button
              className="vbo-step-btn"
              title="Previous"
              disabled={partIndex <= 0}
              onClick={() => goToStep(Math.max(0, partIndex - 1))}
            >
              <ChevronIcon dir="left" />
            </button>
            <span className="vbo-step-count">
              {Math.min(steps.length, Math.max(1, partIndex + 1))} / {steps.length}
            </span>
            <button
              className="vbo-step-next"
              title={atLast ? "Done" : "Next"}
              onClick={() => (atLast ? close("watched_100") : goToStep(nextTarget))}
            >
              {atLast ? "Done" : "Next"}
              {!atLast && <ChevronIcon dir="right" />}
            </button>
          </div>
        )}
      </div>
    </>
  );
}

function PlayIcon({ big }: { big?: boolean }) {
  const s = big ? 22 : 16;
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}
function VolIcon() {
  return (
    <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 5 6 9H2v6h4l5 4z" />
      <path d="M15.5 8.5a5 5 0 0 1 0 7" />
    </svg>
  );
}
function MuteIcon() {
  return (
    <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 5 6 9H2v6h4l5 4z" />
      <path d="m22 9-6 6M16 9l6 6" />
    </svg>
  );
}
function XIcon() {
  return (
    <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}
function ChevronIcon({ dir }: { dir: "left" | "right" }) {
  return (
    <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      {dir === "left" ? <path d="M15 18l-6-6 6-6" /> : <path d="M9 18l6-6-6-6" />}
    </svg>
  );
}
