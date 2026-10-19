"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { IconCrystal, IconShard, IconShield, IconSpark, IconTicket } from "@/components/icons";
import { initStarlight, readStarlightOrDefault, type StarlightState } from "@/lib/starlight";
import { useResonance } from "@/lib/use-resonance";

export default function StarlightPanel({
  userId,
  className = "",
}: {
  userId: string;
  className?: string;
}) {
  const [state, setState] = useState<StarlightState>(() => initStarlight());
  const wallet = useResonance(userId);

  useEffect(() => {
    // Local hydrate after mount (avoids SSR/client mismatch).
    void queueMicrotask(() => setState(readStarlightOrDefault(userId)));
  }, [userId]);

  return (
    <div className={["panel", className].filter(Boolean).join(" ")}>
      <div className="panel-head">
        <span className="panel-title lang-ar">الزخم</span>
        <span className="telemetry text-amber" dir="ltr">
          ×{state.level.toFixed(2)}
        </span>
      </div>
      <div className="panel-body flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <span className="hud-pill">
            <IconSpark className="h-4 w-4 text-amber" />
            <span className="telemetry text-cream" dir="ltr">
              {state.jade}
            </span>
          </span>
          <span className="lang-ar text-xs text-muted">اليشم المجموع</span>
        </div>
        <p className="lang-ar text-xs leading-relaxed text-muted">
          معامل الزخم يتدرّج بنشاطك ويذوب ببطء عند الغياب بدل أن ينكسر — كل مراجعة تكسبك يشمًا مضروبًا في
          ×{state.level.toFixed(2)}.
        </p>
        <div className="flex items-center gap-2">
          <IconShield className="h-4 w-4 flex-none text-amethyst" />
          <span className="lang-ar text-xs text-muted">
            مخزون التعافي: {state.cache > 0 ? `${state.cache} عناصر بانتظارك — أنجزها لمكافأة إضافية.` : "صافٍ."}
          </span>
        </div>
        <Link
          href="/resonance"
          className="flex items-center justify-between rounded-xl border border-line bg-void/50 px-3 py-2 transition hover:border-amethyst/50"
        >
          <span className="lang-ar text-xs font-bold text-cream">محطة الرنين</span>
          <span className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <IconCrystal className="h-3.5 w-3.5 text-amethyst" />
              <span className="telemetry text-cream" dir="ltr">
                {wallet.crystals}
              </span>
            </span>
            <span className="flex items-center gap-1">
              <IconTicket className="h-3.5 w-3.5 text-cyan" />
              <span className="telemetry text-cream" dir="ltr">
                {wallet.passes}
              </span>
            </span>
            <span className="flex items-center gap-1">
              <IconShard className="h-3.5 w-3.5 text-amber" />
              <span className="telemetry text-cream" dir="ltr">
                {wallet.shards}
              </span>
            </span>
          </span>
        </Link>
      </div>
    </div>
  );
}
