"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { IconCollapse, IconExpand, IconPause, IconPlay } from "@/components/icons";
import { useDialogFocus } from "./use-dialog-focus";

/** Shared expand/collapse state for an activity stage. */
export function useStage() {
  const [expanded, setExpanded] = useState(false);
  const toggle = useCallback(() => setExpanded((value) => !value), []);
  const collapse = useCallback(() => setExpanded(false), []);
  const expand = useCallback(() => setExpanded(true), []);
  return { expanded, toggle, collapse, expand };
}

/** Wraps an activity. Collapsed it fills its flex slot; expanded it becomes a
    full-viewport overlay (Escape collapses, body scroll is locked).
    Both branches keep the exact same subtree shape (outer > inner >
    children) so toggling never remounts — and never resets — the activity. */
export function StageViewport({
  expanded,
  onCollapse,
  children,
  className = "",
}: {
  expanded: boolean;
  onCollapse: () => void;
  children: ReactNode;
  className?: string;
}) {
  const dialogRef = useDialogFocus<HTMLDivElement>(expanded);

  useEffect(() => {
    if (!expanded) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCollapse();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
    };
  }, [expanded, onCollapse]);

  return (
    <div
      ref={dialogRef}
      tabIndex={expanded ? -1 : undefined}
      role={expanded ? "dialog" : undefined}
      aria-modal={expanded ? true : undefined}
      aria-label={expanded ? "النشاط بملء الشاشة" : undefined}
      data-testid={expanded ? "stage-fullscreen" : undefined}
      className={
        expanded
          ? "fixed inset-0 z-50 flex flex-col overflow-hidden bg-void p-2 outline-none sm:p-3"
          : "flex min-h-0 flex-1 flex-col"
      }
    >
      <div className={["flex min-h-0 flex-1 flex-col", className].filter(Boolean).join(" ")}>
        {children}
      </div>
    </div>
  );
}

/** Compact icon button that toggles an activity between inline and fullscreen. */
export function StageToggle({
  expanded,
  onToggle,
  testId,
}: {
  expanded: boolean;
  onToggle: () => void;
  testId?: string;
}) {
  return (
    <button
      type="button"
      data-testid={testId}
      onClick={onToggle}
      aria-label={expanded ? "تصغير النشاط" : "عرض بملء الشاشة"}
      title={expanded ? "تصغير النشاط" : "عرض بملء الشاشة"}
      className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-line bg-abyss/60 text-muted transition hover:border-cyan/50 hover:text-cyan focus-visible:border-cyan focus-visible:text-cyan focus-visible:outline-none"
    >
      {expanded ? <IconCollapse className="h-4 w-4" /> : <IconExpand className="h-4 w-4" />}
    </button>
  );
}

/** Compact icon button that pauses/resumes an arcade activity. */
export function PauseToggle({
  paused,
  onToggle,
  testId = "pause-toggle",
}: {
  paused: boolean;
  onToggle: () => void;
  testId?: string;
}) {
  return (
    <button
      type="button"
      data-testid={testId}
      onClick={onToggle}
      aria-pressed={paused}
      aria-label={paused ? "متابعة اللعب" : "إيقاف اللعب مؤقتًا"}
      title={paused ? "متابعة" : "إيقاف مؤقت"}
      className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-line bg-abyss/60 text-muted transition hover:border-cyan/50 hover:text-cyan focus-visible:border-cyan focus-visible:text-cyan focus-visible:outline-none"
    >
      {paused ? <IconPlay className="h-4 w-4" /> : <IconPause className="h-4 w-4" />}
    </button>
  );
}

/** Full-board overlay shown while an activity is paused; blocks pointers and
    offers an explicit resume affordance. */
export function PausedOverlay({
  show,
  onResume,
  testId = "paused-overlay",
}: {
  show: boolean;
  onResume: () => void;
  testId?: string;
}) {
  if (!show) return null;
  return (
    <div
      data-testid={testId}
      className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-void/80 p-6 text-center backdrop-blur-sm"
    >
      <IconPause className="h-9 w-9 text-cyan" />
      <p className="lang-ar text-lg font-bold text-cream">اللعب متوقف مؤقتًا</p>
      <button type="button" onClick={onResume} className="btn-cyan">
        <span className="lang-ar">متابعة</span>
      </button>
    </div>
  );
}
