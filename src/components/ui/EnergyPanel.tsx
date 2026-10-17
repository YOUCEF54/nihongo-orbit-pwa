"use client";

import { useEffect, useRef, useState } from "react";
import { IconWave } from "@/components/icons";
import { ENERGY_MAX, initEnergy, regenEnergy, msUntilNextEnergy } from "@/lib/gamification";
import { loadEnergy, saveEnergy } from "@/lib/progress-state";

function formatCountdown(ms: number): string {
  const total = Math.ceil(ms / 1000);
  const mm = Math.floor(total / 60);
  const ss = total % 60;
  return `${mm}:${ss.toString().padStart(2, "0")}`;
}

export default function EnergyPanel({
  userId,
  className = "",
}: {
  userId: string;
  className?: string;
}) {
  const [energy, setEnergy] = useState(() => initEnergy(ENERGY_MAX));
  const hydrated = useRef(false);

  useEffect(() => {
    void queueMicrotask(() => {
      const stored = loadEnergy(userId);
      if (stored) setEnergy(stored);
      else saveEnergy(userId, initEnergy(ENERGY_MAX));
      hydrated.current = true;
    });
  }, [userId]);

  useEffect(() => {
    const id = setInterval(() => setEnergy((prev) => regenEnergy(prev)), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (hydrated.current) saveEnergy(userId, energy);
  }, [userId, energy]);

  const pct = Math.round((energy.value / ENERGY_MAX) * 100);
  const next = msUntilNextEnergy(energy);



  return (
    <div className={["panel", className].filter(Boolean).join(" ")}>
      <div className="panel-head">
        <span className="panel-title lang-ar">طاقة الصفاء الذهني</span>
        <span className="telemetry text-cyan">{pct}%</span>
      </div>
      <div className="panel-body flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <span className="hud-pill">
            <IconWave className="h-4 w-4 text-cyan" />
            <span className="telemetry text-cream" dir="ltr">
              {energy.value} / {ENERGY_MAX}
            </span>
          </span>
          <span className="telemetry text-muted" dir="ltr" suppressHydrationWarning>
            +1 / 8:00 · {formatCountdown(next)}
          </span>
        </div>
        <div className="meter">
          <div className="meter-fill is-cyan" style={{ width: `${pct}%` }} />
        </div>
        <div className="text-xs text-muted lang-ar">تُخصم ١٠ نقاط تلقائيًا عند كل مراجعة فعلية.</div>
      </div>
    </div>
  );
}

