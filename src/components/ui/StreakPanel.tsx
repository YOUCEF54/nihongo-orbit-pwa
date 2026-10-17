"use client";

import { useEffect, useState } from "react";
import { IconBolt } from "@/components/icons";
import { initStreak, type StreakState } from "@/lib/gamification";
import { loadStreak } from "@/lib/progress-state";

export default function StreakPanel({
  userId,
  className = "",
}: {
  userId: string;
  className?: string;
}) {
  const [streak, setStreak] = useState<StreakState>(() => initStreak());

  useEffect(() => {
    // Local hydrate after mount (avoids SSR/client mismatch).
    void queueMicrotask(() => setStreak(loadStreak(userId) ?? initStreak()));
  }, [userId]);

  return (
    <div className={["panel", className].filter(Boolean).join(" ")}>
      <div className="panel-head">
        <span className="panel-title lang-ar">سلسلة النشاط</span>
        <span className="telemetry text-cyan" dir="ltr">
          ×{streak.current}
        </span>
      </div>
      <div className="panel-body flex flex-col gap-4">
        <div className="flex items-center gap-6">
          <div className="flex flex-col gap-1">
            <span className="telemetry-label lang-ar text-faint">أيام النشاط</span>
            <span className="font-display text-3xl font-extrabold text-cyan" dir="ltr">
              {streak.current}
            </span>
          </div>
          <span className="hud-pill">
            <IconBolt className="h-4 w-4 text-amber" />
            <span className="lang-ar text-xs text-muted">لا تُصفَّر أبدًا</span>
          </span>
        </div>
        <p className="lang-ar text-xs leading-relaxed text-muted">
          كل يوم تنشط فيه يُضاف إلى رصيدك ولا يُطرح منه — التخطّي لا يبدأ العدّ من جديد، بل يذوّب زخمك
          ويملأ مخزون التعافي فقط.
        </p>
      </div>
    </div>
  );
}
