"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import type { SVGStrokeGroup } from "@/lib/data";
import { sampleSvgPath, type SvgPoint } from "@/lib/svg-path";
import {
  gradeDrawnPolyline,
  STROKE_GRADE_DEFAULTS,
  type StrokeFailReason,
} from "@/lib/stroke-grader";

interface KanjiMatrixProps {
  character: string;
  strokes?: SVGStrokeGroup[];
  status?: "ready" | "loading" | "unavailable";
  onComplete?: () => void;
  onRetry?: () => void;
  className?: string;
}

const SAMPLES = 48;
const MIN_STEP = 1.5;
const VIEW = 109;

const FAIL_TEXT: Record<Exclude<StrokeFailReason, "ok">, string> = {
  short: "الرسم قصير جدًا — ارسم السكتة كاملة من بدايتها إلى نهايتها.",
  direction: "ابدأ من نقطة البداية وانتهِ عند نقطة النهاية.",
  drift: "انحرف القلم عن مسار السكتة — أعد الرسم فوق المخطط.",
  coverage: "لم تُغطِّ كامل مسار السكتة — تابعها حتى النهاية.",
};

function clampView(value: number): number {
  return Math.max(0, Math.min(VIEW, value));
}

export default function KanjiMatrix({
  character,
  strokes = [],
  status = "ready",
  onComplete,
  onRetry,
  className = "",
}: KanjiMatrixProps) {
  const [completed, setCompleted] = useState<number[]>([]);
  const [drawn, setDrawn] = useState<SvgPoint[]>([]);
  const [drawing, setDrawing] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const surfaceRef = useRef<SVGSVGElement>(null);
  const hintTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const firedRef = useRef(false);
  // Coalesce pointermove bursts to one state update per frame.
  const drawRaf = useRef<number | null>(null);
  const pendingPoint = useRef<SvgPoint | null>(null);

  const flushDrawn = useCallback(() => {
    drawRaf.current = null;
    const point = pendingPoint.current;
    pendingPoint.current = null;
    if (!point) return;
    setDrawn((prev) => {
      const last = prev[prev.length - 1];
      if (last && Math.hypot(point.x - last.x, point.y - last.y) < MIN_STEP) {
        return prev;
      }
      return [...prev, point];
    });
  }, []);

  useEffect(
    () => () => {
      if (drawRaf.current !== null) cancelAnimationFrame(drawRaf.current);
    },
    [],
  );

  const targets = useMemo(
    () => strokes.map((stroke) => sampleSvgPath(stroke.d, SAMPLES)),
    [strokes],
  );

  const busy = status === "loading" || status === "unavailable";
  const done = !busy && strokes.length > 0 && completed.length === strokes.length;
  const currentIndex = completed.length;

  const flashHint = (text: string) => {
    if (hintTimer.current) clearTimeout(hintTimer.current);
    setHint(text);
    hintTimer.current = setTimeout(() => setHint(null), 3200);
  };

  const toView = (event: ReactPointerEvent<SVGSVGElement>): SvgPoint => {
    const rect = surfaceRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0 || rect.height === 0) return { x: 0, y: 0 };
    return {
      x: clampView(((event.clientX - rect.left) / rect.width) * VIEW),
      y: clampView(((event.clientY - rect.top) / rect.height) * VIEW),
    };
  };

  const handlePointerDown = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (busy || done) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    setHint(null);
    setDrawing(true);
    setDrawn([toView(event)]);
  };

  const handlePointerMove = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (!drawing) return;
    pendingPoint.current = toView(event);
    if (drawRaf.current === null) {
      drawRaf.current = requestAnimationFrame(flushDrawn);
    }
  };

  const handlePointerUp = () => {
    if (!drawing) return;
    if (drawRaf.current !== null) {
      cancelAnimationFrame(drawRaf.current);
      drawRaf.current = null;
    }
    const pending = pendingPoint.current;
    pendingPoint.current = null;
    setDrawing(false);

    const target = targets[currentIndex];
    const trail = pending ? [...drawn, pending] : drawn;
    if (!target) {
      setDrawn([]);
      return;
    }

    const grade = gradeDrawnPolyline(trail, target);
    setDrawn([]);

    if (!grade.pass) {
      flashHint(FAIL_TEXT[grade.reason as Exclude<StrokeFailReason, "ok">]);
      return;
    }

    const next = [...completed, currentIndex];
    setCompleted(next);
    if (next.length === strokes.length && !firedRef.current) {
      firedRef.current = true;
      onComplete?.();
    }
  };

  const handleUndo = () => {
    setHint(null);
    setDrawn([]);
    setCompleted((prev) => prev.slice(0, -1));
  };

  const reset = () => {
    if (hintTimer.current) clearTimeout(hintTimer.current);
    setHint(null);
    setDrawn([]);
    setDrawing(false);
    setCompleted([]);
    firedRef.current = false;
  };

  const drawnPath = drawn.length
    ? `M${drawn[0].x.toFixed(2)},${drawn[0].y.toFixed(2)} ` +
      drawn
        .slice(1)
        .map((point) => `L${point.x.toFixed(2)},${point.y.toFixed(2)}`)
        .join(" ")
    : "";

  return (
    <div
      data-testid="kanji-matrix"
      className={[
        "glass-panel mx-auto flex h-full min-h-0 w-full max-w-md flex-col items-center overflow-hidden p-4",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="mb-2 flex w-full items-center justify-between text-xs">
        <span className="lang-ar text-amber">
          الهدف: <span className="font-jp text-sm"> {character}</span>
        </span>
        <span className="lang-ar text-frequency">
          سكتة: {String(completed.length).padStart(2, "0")} /{" "}
          {String(strokes.length).padStart(2, "0")}
        </span>
      </div>

      <div className="flex min-h-0 w-full flex-1 items-center justify-center [container-type:size]">
        <div className="relative aspect-square w-[min(100%,100cqh)] max-w-[320px] select-none overflow-hidden rounded-xl border border-frequency/30 bg-abyss/60 shadow-[var(--card-shadow)]">
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full opacity-20"
          viewBox={`0 0 ${VIEW} ${VIEW}`}
          aria-hidden="true"
        >
          <line x1="54.5" y1="0" x2="54.5" y2="109" className="stroke-frequency" strokeDasharray="2 2" />
          <line x1="0" y1="54.5" x2="109" y2="54.5" className="stroke-frequency" strokeDasharray="2 2" />
          <circle cx="54.5" cy="54.5" r="40" className="stroke-frequency" fill="none" strokeDasharray="1 3" />
        </svg>

        {!busy && (
          <svg
            ref={surfaceRef}
            className="absolute inset-4 h-[calc(100%-2rem)] w-[calc(100%-2rem)] touch-none"
            viewBox={`0 0 ${VIEW} ${VIEW}`}
            role="img"
            aria-label={`ارسم كانجي ${character} بالسكتات`}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
          >
            <g className="pointer-events-none">
              {strokes.map((stroke, index) => {
                const isCompleted = completed.includes(index);
                const isCurrent = index === currentIndex;
                return (
                  <path
                    key={index}
                    d={stroke.d}
                    aria-label={`السكتة ${index + 1}`}
                    className={[
                      "fill-none transition-all duration-300",
                      isCompleted
                        ? "stroke-amber stroke-[5] drop-shadow-[0_0_6px_var(--color-amber)]"
                        : isCurrent
                          ? "animate-pulse stroke-frequency stroke-[5] drop-shadow-[0_0_8px_var(--color-frequency)]"
                          : "stroke-white/20 stroke-[3]",
                    ].join(" ")}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                );
              })}
              {drawnPath && (
                <path
                  d={drawnPath}
                  className="fill-none stroke-frequency stroke-[5] drop-shadow-[0_0_6px_var(--color-frequency)]"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}
            </g>
          </svg>
        )}

        {!busy && hint && (
          <div role="status" className="pointer-events-none absolute inset-x-2 bottom-2 rounded-lg bg-void/85 px-3 py-1.5 text-center">
            <span className="lang-ar text-[11px] text-amber">{hint}</span>
          </div>
        )}

        {done && (
          <div role="status" className="absolute inset-0 grid place-items-center bg-void/70">
            <span className="status-badge is-ok">
              <span className="lang-ar">سلسلة مكتملة</span>
            </span>
          </div>
        )}

        {status === "loading" && (
          <div className="absolute inset-0 grid place-items-center bg-void/40">
            <span className="lang-ar animate-pulse text-sm text-muted">
              جارٍ تحميل بيانات السكتات…
            </span>
          </div>
        )}

        {status === "unavailable" && (
          <div className="absolute inset-0 grid place-items-center bg-void/40">
            <div className="flex flex-col items-center gap-2 px-6 text-center">
              <span className="lang-ar text-sm text-muted">
                تعذّر تحميل السكتات — تفقّد الاتصال ثم أعد المحاولة.
              </span>
              {onRetry && (
                <button type="button" onClick={onRetry} className="btn-ghost px-4 py-1.5">
                  <span className="lang-ar">إعادة المحاولة</span>
                </button>
              )}
            </div>
          </div>
        )}
        </div>
      </div>

      <p className="lang-ar mt-2 text-center text-xs text-muted">
        ارسم السكتة المضيئة بالتردد السماوي بالقلم فوق مخططها، من البداية إلى النهاية، بالترتيب.
      </p>

      <div className="mt-2 flex items-center gap-2">
        <button
          type="button"
          data-testid="matrix-undo"
          onClick={handleUndo}
          disabled={completed.length === 0 || busy}
          className="btn-ghost disabled:opacity-40"
        >
          <span className="lang-ar">تراجع</span>
        </button>
        <button type="button" data-testid="matrix-reset" onClick={reset} className="btn-ghost">
          <span className="lang-ar">إعادة المحاولة</span>
        </button>
      </div>

      <p className="lang-ar mt-3 text-[10px] text-faint">
        بيانات السكتات · KanjiVG (CC-BY-SA 3.0) · اجتياز ≤ {STROKE_GRADE_DEFAULTS.maxDeviation}u
      </p>
    </div>
  );
}
