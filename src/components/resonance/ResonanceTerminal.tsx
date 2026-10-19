"use client";

import { useState, useTransition } from "react";
import { useResonance } from "@/lib/use-resonance";
import { STANDARD_BANNER, pityFor, type PullResult } from "@/lib/gacha";
import { pullAction } from "@/lib/resonance-actions";
import { mirrorOutcome } from "@/lib/resonance-client";
import { REVIEWS_PER_PASS } from "@/lib/resonance";
import { IconCrystal, IconShard, IconTicket } from "@/components/icons";
import PullReveal from "./PullReveal";
import CollectionPanel from "./CollectionPanel";
import ExchangePanel from "./ExchangePanel";
import HistoryPanel from "./HistoryPanel";

function CurrencyChip({
  icon: Icon,
  labelAr,
  value,
  color,
}: {
  icon: React.ElementType;
  labelAr: string;
  value: number;
  color: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-line bg-void/50 px-3 py-2">
      <Icon className="h-4 w-4" style={{ color }} />
      <span className="lang-ar text-xs text-muted">{labelAr}</span>
      <span className="telemetry text-cream" dir="ltr">
        {value}
      </span>
    </div>
  );
}

const PULL_ERROR_AR: Record<string, string> = {
  insufficient: "لا تملك تذاكر كافية — تابع المراجعة لتكسب المزيد.",
  unavailable: "تعذّر الاتصال بالمحطة — حاول مجددًا.",
};

export default function ResonanceTerminal({
  userId,
  online = true,
}: {
  userId: string;
  /** False when the server wallet is unavailable (migration pending). */
  online?: boolean;
}) {
  const wallet = useResonance(userId);
  const banner = STANDARD_BANNER;
  const [reveal, setReveal] = useState<PullResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const pity = pityFor(wallet, banner.id);
  const pityRatio = Math.min(1, pity.count / banner.pity.hardCap);
  const softRatio = banner.pity.softStart / banner.pity.hardCap;

  const pull = (count: number) => {
    setError(null);
    startTransition(async () => {
      try {
        const outcome = await pullAction(banner.id, count);
        if (!outcome.ok) {
          setError(PULL_ERROR_AR[outcome.error ?? ""] ?? "تعذّر السحب — حاول مجددًا.");
          return;
        }
        mirrorOutcome(userId, outcome);
        if (outcome.results) setReveal(outcome.results);
      } catch {
        setError("تعذّر الاتصال بالمحطة — حاول مجددًا.");
      }
    });
  };

  return (
    <div className="space-y-5">
      {!online && (
        <p
          role="status"
          className="lang-ar rounded-xl border border-hazard/40 bg-hazard/10 px-4 py-3 text-xs font-bold text-cream"
        >
          المحطة غير متصلة — فعّل جداول المحطة (ترحيلة 0026) ثم أعد تحميل الصفحة.
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <CurrencyChip
          icon={IconCrystal}
          labelAr="بلورات المدار"
          value={wallet.crystals}
          color="var(--color-amethyst)"
        />
        <CurrencyChip
          icon={IconTicket}
          labelAr="تذاكر الإشارة"
          value={wallet.passes}
          color="var(--color-cyan)"
        />
        <CurrencyChip
          icon={IconShard}
          labelAr="شظايا الرنين"
          value={wallet.shards}
          color="var(--color-amber)"
        />
        <div className="flex min-w-40 flex-1 items-center gap-2 rounded-xl border border-line bg-void/50 px-3 py-2">
          <span className="lang-ar text-xs text-faint">
            التذكرة التالية: {wallet.passProgress}/{REVIEWS_PER_PASS}
          </span>
          <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-void">
            <span
              className="block h-full rounded-full bg-cyan"
              style={{ width: `${(wallet.passProgress / REVIEWS_PER_PASS) * 100}%` }}
            />
          </span>
        </div>
      </div>

      <section className="glass-panel p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="telemetry text-faint" dir="ltr">
              {banner.jp}
            </p>
            <h2 className="lang-ar text-xl font-extrabold text-cream">{banner.titleAr}</h2>
            <p className="lang-ar mt-1 max-w-md text-xs leading-relaxed text-muted">
              {banner.descAr}
            </p>
          </div>
          {pity.guaranteed && (
            <span className="chip is-gold">
              <span className="lang-ar">القمة مضمونة</span>
            </span>
          )}
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between">
            <span className="lang-ar text-xs text-muted">
              عدّاد الرحمة: {pity.count}/{banner.pity.hardCap}
            </span>
            <span className="lang-ar text-[11px] text-faint">
              يتصاعد الاحتمال بعد السحبة {banner.pity.softStart}
            </span>
          </div>
          <div className="relative mt-2 h-2 overflow-hidden rounded-full bg-void" dir="ltr">
            <span
              className="absolute inset-y-0 start-0 rounded-full bg-gradient-to-r from-cyan to-amethyst"
              style={{ width: `${pityRatio * 100}%` }}
            />
            <span
              className="absolute inset-y-0 w-px bg-amber/70"
              style={{ insetInlineStart: `${softRatio * 100}%` }}
            />
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            type="button"
            data-testid="pull-1"
            onClick={() => pull(1)}
            disabled={!online || pending || wallet.passes < 1}
            className="btn-primary"
          >
            <span className="lang-ar">{pending ? "جارٍ السحب…" : "سحب ×١"}</span>
            <span className="telemetry text-[10px]" dir="ltr">
              1 PASS
            </span>
          </button>
          <button
            type="button"
            data-testid="pull-10"
            onClick={() => pull(10)}
            disabled={!online || pending || wallet.passes < 10}
            className="btn-primary"
          >
            <span className="lang-ar">{pending ? "جارٍ السحب…" : "سحب ×١٠"}</span>
            <span className="telemetry text-[10px]" dir="ltr">
              10 PASS
            </span>
          </button>
          <span className="lang-ar text-[11px] text-faint">
            كل سحب ×١٠ يضمن عنصر ★4 على الأقل.
          </span>
        </div>
        {error && (
          <p className="lang-ar mt-3 text-xs font-bold text-crimson" role="alert">
            {error}
          </p>
        )}
      </section>

      <CollectionPanel userId={userId} online={online} />
      <ExchangePanel userId={userId} online={online} />
      <HistoryPanel userId={userId} />

      <PullReveal results={reveal} onClose={() => setReveal(null)} />
    </div>
  );
}
