import { useEffect, useRef, useState, CSSProperties } from "react";
import { createPortal } from "react-dom";
import { Accent, ACCENTS, HighlightStep } from "./types";

interface Box {
  top: number;
  left: number;
  width: number;
  height: number;
}

function measure(selector: string): Box | null {
  let el: Element | null = null;
  try {
    el = document.querySelector(selector);
  } catch {
    return null;
  }
  if (!el) return null;
  const r = el.getBoundingClientRect();
  if (r.width === 0 && r.height === 0) return null;
  return { top: r.top, left: r.left, width: r.width, height: r.height };
}

// Spotlights the element a step points at: a pulsing ring + caption, plus a
// one-shot "click demo" (ripple + tapping cursor). Pure overlay in a portal — it
// never mutates the target element, and follows it on scroll/resize.
export default function HighlightLayer({
  step,
  accent = ACCENTS.indigo,
}: {
  step: HighlightStep | null;
  accent?: Accent;
}) {
  const [box, setBox] = useState<Box | null>(null);
  const [mounted, setMounted] = useState(false);
  const rafRef = useRef<number | null>(null);
  const scrolledFor = useRef<string | null>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!step) {
      setBox(null);
      scrolledFor.current = null;
      return;
    }
    if (scrolledFor.current !== step.id) {
      scrolledFor.current = step.id;
      try {
        document
          .querySelector(step.selector)
          ?.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
      } catch {
        /* ignore */
      }
    }
    const tick = () => {
      setBox(measure(step.selector));
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [step]);

  if (!mounted || !step || !box) return null;

  const pad = 6;
  const top = box.top - pad;
  const left = box.left - pad;
  const width = box.width + pad * 2;
  const height = box.height + pad * 2;
  const cx = box.left + box.width / 2;
  const cy = box.top + box.height / 2;
  const rippleSize = Math.min(Math.max(box.width, box.height), 150);
  const captionBelow = top + height + 44 < window.innerHeight;

  const vars = {
    ["--vbo-base"]: accent.base,
    ["--vbo-soft"]: accent.soft,
    ["--vbo-deep"]: accent.deep,
  } as CSSProperties;

  return createPortal(
    <div className="vbo-hl-root" style={vars} aria-hidden>
      <div key={`ring-${step.id}`} className="vbo-hl-ring" style={{ top, left, width, height }} />
      <span
        key={`ripple-${step.id}`}
        className="vbo-click-ripple"
        style={{ top: cy, left: cx, width: rippleSize, height: rippleSize }}
      />
      <svg
        key={`cursor-${step.id}`}
        className="vbo-click-cursor"
        style={{ top: cy, left: cx }}
        width={26}
        height={26}
        viewBox="0 0 24 24"
      >
        <path d="M5 3l15 9-6 1.5L10.5 20 5 3z" fill="#fff" stroke={accent.deep} strokeWidth={1.4} strokeLinejoin="round" />
      </svg>
      <div
        className="vbo-hl-caption"
        style={{
          top: captionBelow ? top + height + 8 : top - 8,
          left: left + width / 2,
          transform: `translate(-50%, ${captionBelow ? "0" : "-100%"})`,
        }}
      >
        {step.label}
      </div>
    </div>,
    document.body
  );
}
