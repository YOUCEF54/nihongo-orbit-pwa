"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface Point {
  x: number;
  y: number;
}

interface Stroke {
  points: Point[];
}

interface HanziWriterLike {
  animateCharacter: () => void;
}

interface KanjiCanvasProps {
  char?: string;
  size?: number;
  className?: string;
}

/** Read a theme token at draw time so canvas colors follow data-theme. */
function cssToken(name: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

function tracePath(ctx: CanvasRenderingContext2D, stroke: Stroke) {
  const { points } = stroke;
  if (points.length === 0) return;
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  if (points.length === 1) {
    ctx.lineTo(points[0].x + 0.01, points[0].y + 0.01);
  } else {
    for (let i = 1; i < points.length; i += 1) {
      ctx.lineTo(points[i].x, points[i].y);
    }
  }
  ctx.stroke();
}

export default function KanjiCanvas({ char = "花", size = 260, className }: KanjiCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const modelRef = useRef<HTMLDivElement>(null);
  const writerRef = useRef<HanziWriterLike | null>(null);
  const drawing = useRef(false);
  const active = useRef<Stroke | null>(null);

  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [showGrid, setShowGrid] = useState(true);
  const [showModel, setShowModel] = useState(true);
  const [modelLoaded, setModelLoaded] = useState(false);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const cyan = cssToken("--color-cyan", "#00f0ff");
    const dpr = window.devicePixelRatio || 1;
    const w = size;
    const h = size;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    if (showGrid) {
      ctx.save();
      ctx.strokeStyle = "rgba(255,255,255,0.12)";
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 6]);
      ctx.beginPath();
      ctx.moveTo(w / 2, 0);
      ctx.lineTo(w / 2, h);
      ctx.moveTo(0, h / 2);
      ctx.lineTo(w, h / 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.strokeStyle = `${cyan}38`;
      ctx.strokeRect(1, 1, w - 2, h - 2);
      ctx.restore();
    }

    ctx.save();
    ctx.lineWidth = 9;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = cyan;
    ctx.shadowColor = `${cyan}BF`;
    ctx.shadowBlur = 10;
    for (const stroke of strokes) tracePath(ctx, stroke);
    if (active.current) tracePath(ctx, active.current);
    ctx.restore();
  }, [size, showGrid, strokes]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    redraw();
  }, [size, redraw]);

  useEffect(() => {
    let cancelled = false;
    async function loadWriter() {
      try {
        const mod = await import("hanzi-writer");
        if (cancelled || !modelRef.current) return;
        modelRef.current.innerHTML = "";
        const writer = mod.default.create(modelRef.current, char, {
          width: size,
          height: size,
          padding: 8,
          showOutline: true,
          showCharacter: false,
          strokeColor: "rgba(255,255,255,0.20)",
          outlineColor: `${cssToken("--color-cyan", "#00f0ff")}29`,
          drawingColor: cssToken("--color-cyan", "#00f0ff"),
        });
        writerRef.current = writer;
        setModelLoaded(true);
      } catch {
        setModelLoaded(false);
      }
    }
    void loadWriter();
    return () => {
      cancelled = true;
      writerRef.current = null;
    };
  }, [char, size]);

  const pointerPos = (event: React.PointerEvent<HTMLCanvasElement>): Point => {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };

  const handleDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    drawing.current = true;
    active.current = { points: [pointerPos(event)] };
    redraw();
  };

  const handleMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current || !active.current) return;
    active.current.points.push(pointerPos(event));
    redraw();
  };

  const handleUp = () => {
    if (!drawing.current) return;
    drawing.current = false;
    if (active.current) {
      setStrokes((prev) => [...prev, active.current as Stroke]);
      setShowModel(false);
    }
    active.current = null;
  };

  const undo = () => {
    setStrokes((prev) => prev.slice(0, -1));
    setShowModel(false);
  };

  const clear = () => {
    setStrokes([]);
    setShowModel(true);
  };

  const animate = () => {
    writerRef.current?.animateCharacter();
  };

  return (
    <div className={["glass-panel rounded-2xl p-5", className].filter(Boolean).join(" ")}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <span className="hud-pill" dir="rtl">
          <span className="lang-ar telemetry-label">ترتيب السكتات</span>
          <span className="font-jp text-lg leading-none">{char}</span>
        </span>
        <span className="lang-ar text-cyan">
          {strokes.length.toString().padStart(2, "0")} <span className="text-muted">سكتات</span>
        </span>
      </div>

      <div
        className="relative mx-auto overflow-hidden rounded-xl border border-line bg-void/60"
        style={{ width: size, height: size }}
      >
        <div ref={modelRef} className="pointer-events-none absolute inset-0 grid place-items-center" />
        {!modelLoaded && showModel && (
          <div className="pointer-events-none absolute inset-0 grid place-items-center">
            <span className="font-jp text-[170px] leading-none text-cyan/15">{char}</span>
          </div>
        )}
        <canvas
          ref={canvasRef}
          onPointerDown={handleDown}
          onPointerMove={handleMove}
          onPointerUp={handleUp}
          onPointerLeave={handleUp}
          className="absolute inset-0 touch-none"
        />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button type="button" onClick={undo} disabled={strokes.length === 0} className="btn-ghost disabled:opacity-40">
          <span className="lang-ar">تراجع</span>
        </button>
        <button type="button" onClick={clear} disabled={strokes.length === 0} className="btn-ghost disabled:opacity-40">
          <span className="lang-ar">مسح</span>
        </button>
        <button type="button" onClick={() => setShowGrid((v) => !v)} className="btn-telemetry">
          {showGrid ? "إخفاء الشبكة" : "إظهار الشبكة"}
        </button>
        <button type="button" onClick={animate} className="btn-cyan">
          <span className="lang-ar">ترتيب الرسم</span>
        </button>
      </div>
    </div>
  );
}
