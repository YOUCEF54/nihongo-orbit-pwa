"use client";

import { useEffect, useRef, useState } from "react";
import { IconBolt, IconShield } from "@/components/icons";
import {
  MAX_REST_BUFFERS,
  initStreak,
  recordActivity,
  toDateKey,
  type StreakState,
} from "@/lib/gamification";
import { loadStreak, saveStreak } from "@/lib/progress-state";

export default function StreakPanel({
  userId,
  className = "",
}: {
  userId: string;
  className?: string;
}) {
  const [streak, setStreak] = useState<StreakState>(() => initStreak());
  const [note, setNote] = useState<string | null>(null);
  const hydrated = useRef(false);

  useEffect(() => {
    void queueMicrotask(() => {
      const stored = loadStreak(userId);
      if (stored) setStreak(stored);
      else saveStreak(userId, initStreak());
      hydrated.current = true;
    });
  }, [userId]);

  useEffect(() => {
    if (hydrated.current) saveStreak(userId, streak);
  }, [userId, streak]);

  const recordToday = () => {
    const result = recordActivity(streak, toDateKey(new Date()));
    setStreak(result.state);
    setNote(
      result.broken
        ? "انكسرت السلسلة — بدأت من جديد."
        : result.usedBuffer
          ? "تم إنقاذ السلسلة باستخدام مخزن راحة."
          : "تم تسجيل يوم نشاط جديد.",
    );
  };

  return (
    <div className={["panel", className].filter(Boolean).join(" ")}>
      <div className="panel-head">
        <span className="panel-title lang-ar">حماية السلسلة اليومية</span>
        <span className="telemetry text-cyan" dir="ltr">
          ×{streak.current}
        </span>
      </div>
      <div className="panel-body flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex flex-col gap-1">
            <span className="telemetry-label lang-ar text-faint">الحالية</span>
            <span className="font-display text-3xl font-extrabold text-cyan" dir="ltr">
              {streak.current}
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="telemetry-label lang-ar text-faint">الأطول</span>
            <span className="font-display text-3xl font-extrabold text-cream" dir="ltr">
              {streak.longest}
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="telemetry-label lang-ar text-faint">مخازن الراحة</span>
            <span className="flex gap-1.5 pt-2">
              {Array.from({ length: MAX_REST_BUFFERS }).map((_, index) => (
                <IconShield
                  key={index}
                  className={index < streak.buffers ? "h-5 w-5 text-cyan" : "h-5 w-5 text-faint"}
                />
              ))}
            </span>
          </div>
        </div>
        <button type="button" className="btn-cyan self-start" onClick={recordToday}>
          <IconBolt className="h-4 w-4" />
          <span className="lang-ar">سجّل اليوم</span>
        </button>
        {note && <p className="lang-ar text-xs text-muted">{note}</p>}
      </div>
    </div>
  );
}