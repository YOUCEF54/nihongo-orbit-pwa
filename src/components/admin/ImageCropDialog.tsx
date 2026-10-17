"use client";

import { useEffect, useRef, useState } from "react";

interface ImageCropDialogProps {
  /** Object URL (or any src) of the picked image. */
  src: string;
  /** Frame ratio, width / height. */
  aspect?: number;
  /** Exported webp width in px; height follows the frame ratio. */
  outputWidth?: number;
  /** Upload already in flight — disables the confirm button. */
  busy?: boolean;
  onCancel: () => void;
  onConfirm: (blob: Blob) => void;
}

const MIN_ZOOM = 1;
const MAX_ZOOM = 4;

/**
 * Pan/zoom cropper. The view is stored as a focal point (image pixels pinned to
 * the frame centre) plus a zoom factor, so the pixel offset is derived — the
 * on-screen canvas and the exported webp use the exact same source-rect math.
 */
export default function ImageCropDialog({
  src,
  aspect = 16 / 9,
  outputWidth = 1280,
  busy = false,
  onCancel,
  onConfirm,
}: ImageCropDialogProps) {
  const frameRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const dragRef = useRef<{
    startX: number;
    startY: number;
    focalX: number;
    focalY: number;
  } | null>(null);

  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [frame, setFrame] = useState({ w: 0, h: 0 });
  const [zoom, setZoom] = useState(MIN_ZOOM);
  const [focal, setFocal] = useState({ x: 0, y: 0 });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const image = new Image();
    image.onload = () => {
      imageRef.current = image;
      setImg(image);
      setFocal({ x: image.naturalWidth / 2, y: image.naturalHeight / 2 });
    };
    image.onerror = () => setError("تعذّر تحميل الصورة.");
    image.src = src;
    return () => {
      imageRef.current = null;
    };
  }, [src]);

  useEffect(() => {
    const el = frameRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (rect) setFrame({ w: rect.width, h: rect.height });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  const baseScale =
    img && frame.w > 0 && frame.h > 0
      ? Math.max(frame.w / img.naturalWidth, frame.h / img.naturalHeight)
      : 0;
  const scale = baseScale * zoom;
  const dispW = img ? img.naturalWidth * scale : 0;
  const dispH = img ? img.naturalHeight * scale : 0;

  const offsetX = Math.min(0, Math.max(frame.w - dispW, frame.w / 2 - focal.x * scale));
  const offsetY = Math.min(0, Math.max(frame.h - dispH, frame.h / 2 - focal.y * scale));

  useEffect(() => {
    const canvas = canvasRef.current;
    const image = imageRef.current;
    if (!canvas || !image || frame.w <= 0 || frame.h <= 0 || scale <= 0) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const cw = Math.round(frame.w * dpr);
    const ch = Math.round(frame.h * dpr);
    if (canvas.width !== cw) canvas.width = cw;
    if (canvas.height !== ch) canvas.height = ch;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, cw, ch);
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(
      image,
      -offsetX / scale,
      -offsetY / scale,
      frame.w / scale,
      frame.h / scale,
      0,
      0,
      cw,
      ch,
    );
  }, [img, frame.w, frame.h, scale, offsetX, offsetY]);

  const clampFocal = (x: number, y: number) => {
    if (scale <= 0 || !img) return { x, y };
    const halfX = frame.w / (2 * scale);
    const halfY = frame.h / (2 * scale);
    return {
      x: Math.min(img.naturalWidth - halfX, Math.max(halfX, x)),
      y: Math.min(img.naturalHeight - halfY, Math.max(halfY, y)),
    };
  };

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!img) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      focalX: focal.x,
      focalY: focal.y,
    };
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || scale <= 0) return;
    setFocal(
      clampFocal(
        drag.focalX - (event.clientX - drag.startX) / scale,
        drag.focalY - (event.clientY - drag.startY) / scale,
      ),
    );
  };

  const onPointerUp = () => {
    dragRef.current = null;
  };

  const handleConfirm = async () => {
    const image = imageRef.current;
    if (!image || frame.w <= 0 || frame.h <= 0 || scale <= 0) return;
    setSaving(true);
    setError(null);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = outputWidth;
      canvas.height = Math.max(1, Math.round(outputWidth * (frame.h / frame.w)));
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("not_webp");
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(
        image,
        -offsetX / scale,
        -offsetY / scale,
        frame.w / scale,
        frame.h / scale,
        0,
        0,
        canvas.width,
        canvas.height,
      );
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/webp", 0.85),
      );
      if (!blob) throw new Error("not_webp");
      onConfirm(blob);
    } catch {
      setError("تعذّر تجهيز الصورة.");
      setSaving(false);
    }
  };

  const working = saving || busy;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" dir="rtl">
      <button
        type="button"
        aria-label="إغلاق"
        onClick={onCancel}
        className="absolute inset-0 cursor-default bg-void/75 backdrop-blur-sm"
      />
      <div
        data-testid="crop-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="قصّ الصورة"
        className="glass-panel relative z-10 w-full max-w-[480px] rounded-2xl p-4"
      >
        <div className="mb-3 flex items-center justify-between">
          <span className="lang-ar text-sm font-bold text-cream">قصّ الصورة</span>
          <button
            type="button"
            onClick={onCancel}
            aria-label="إغلاق"
            className="btn-ghost px-3 py-1"
          >
            <span aria-hidden="true">✕</span>
          </button>
        </div>

        <div
          ref={frameRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          style={{ aspectRatio: String(aspect) }}
          className="relative w-full cursor-grab touch-none overflow-hidden rounded-xl border border-line bg-void/60 active:cursor-grabbing"
        >
          <canvas ref={canvasRef} className="block h-full w-full" />
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute inset-y-0 left-1/3 w-px bg-cream/15" />
            <div className="absolute inset-y-0 left-2/3 w-px bg-cream/15" />
            <div className="absolute inset-x-0 top-1/3 h-px bg-cream/15" />
            <div className="absolute inset-x-0 top-2/3 h-px bg-cream/15" />
          </div>
          {!img ? (
            <span className="lang-ar absolute inset-0 grid place-items-center text-xs text-muted">
              {error ?? "جارٍ التحميل…"}
            </span>
          ) : null}
        </div>

        <div className="mt-3 flex items-center gap-3">
          <span className="lang-ar text-xs text-muted">تكبير</span>
          <input
            type="range"
            min={MIN_ZOOM}
            max={MAX_ZOOM}
            step={0.01}
            value={zoom}
            disabled={!img}
            onChange={(event) => setZoom(Number(event.target.value))}
            data-testid="crop-zoom"
            aria-label="تكبير"
            className="flex-1 accent-cyan"
          />
        </div>

        <p className="lang-ar mt-2 text-[11px] leading-relaxed text-muted">
          اسحب الصورة لتحديد الجزء المرغوب، واستخدم شريط التكبير للتقريب.
        </p>

        {error && img ? <p className="lang-ar mt-2 text-xs text-danger">{error}</p> : null}

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            data-testid="crop-confirm"
            onClick={() => void handleConfirm()}
            disabled={!img || working}
            className="btn-cyan flex-1 disabled:opacity-50"
          >
            <span className="lang-ar">{working ? "جارٍ المعالجة…" : "اعتماد ورفع"}</span>
          </button>
          <button
            type="button"
            data-testid="crop-cancel"
            onClick={onCancel}
            className="btn-ghost"
          >
            <span className="lang-ar">إلغاء</span>
          </button>
        </div>
      </div>
    </div>
  );
}
