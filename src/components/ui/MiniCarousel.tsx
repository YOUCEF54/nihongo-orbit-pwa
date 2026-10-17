"use client";

import { useEffect, useRef, type ReactNode } from "react";

export interface CarouselItem {
  id: string;
  render: () => ReactNode;
  /** Accessible label for the option button. */
  ariaLabel?: string;
}

/** Compact single-row picker: a horizontally scrollable chip strip with step
    arrows. Keeps long option sets (kanji, reviewed words) to one slim row
    instead of a wrapping wall of buttons. */
export default function MiniCarousel({
  items,
  activeId,
  onSelect,
  ariaLabel,
  chipTestId,
  testId,
  className = "",
}: {
  items: CarouselItem[];
  activeId: string;
  onSelect: (id: string) => void;
  ariaLabel?: string;
  chipTestId?: string;
  testId?: string;
  className?: string;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const index = items.findIndex((item) => item.id === activeId);

  useEffect(() => {
    const track = trackRef.current;
    const active = track?.querySelector<HTMLElement>('[data-active="true"]');
    if (!track || !active) return;
    const tRect = track.getBoundingClientRect();
    const aRect = active.getBoundingClientRect();
    const delta = aRect.left + aRect.width / 2 - (tRect.left + tRect.width / 2);
    track.scrollTo({ left: track.scrollLeft + delta, behavior: "smooth" });
  }, [activeId]);

  const step = (delta: -1 | 1) => {
    const next = Math.min(items.length - 1, Math.max(0, index + delta));
    const item = items[next];
    if (item) onSelect(item.id);
  };

  const arrowClass =
    "grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-line bg-abyss/60 text-muted transition hover:border-cyan/50 hover:text-cyan disabled:opacity-30";

  return (
    <div
      data-testid={testId}
      role="group"
      aria-label={ariaLabel}
      dir="rtl"
      className={["flex items-center gap-2", className].filter(Boolean).join(" ")}
    >
      <button
        type="button"
        onClick={() => step(-1)}
        disabled={index <= 0}
        aria-label="الخيار السابق"
        className={arrowClass}
      >
        <span aria-hidden="true">→</span>
      </button>
      <div ref={trackRef} className="no-scrollbar flex min-w-0 flex-1 gap-2 overflow-x-auto py-0.5">
        {items.map((item) => {
          const active = item.id === activeId;
          return (
            <button
              key={item.id}
              type="button"
              data-testid={chipTestId}
              data-active={active ? "true" : "false"}
              aria-pressed={active}
              aria-label={item.ariaLabel}
              onClick={() => onSelect(item.id)}
              className={[
                "shrink-0 rounded-lg border px-3 py-1.5 text-sm transition",
                active
                  ? "border-cyan/60 bg-cyan/15 text-cream"
                  : "border-line bg-abyss/40 text-faint hover:bg-white/5",
              ].join(" ")}
            >
              {item.render()}
            </button>
          );
        })}
      </div>
      <button
        type="button"
        onClick={() => step(1)}
        disabled={index >= items.length - 1}
        aria-label="الخيار التالي"
        className={arrowClass}
      >
        <span aria-hidden="true">←</span>
      </button>
    </div>
  );
}
