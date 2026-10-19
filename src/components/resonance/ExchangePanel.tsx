"use client";

import { useState, useTransition } from "react";
import { EXCHANGE_OFFERS, itemById } from "@/lib/items";
import { redeemOfferAction } from "@/lib/resonance-actions";
import { mirrorOutcome } from "@/lib/resonance-client";
import { useResonance } from "@/lib/use-resonance";
import { IconCrystal, IconShard, IconTicket } from "@/components/icons";

export default function ExchangePanel({
  userId,
  online = true,
}: {
  userId: string;
  online?: boolean;
}) {
  const wallet = useResonance(userId);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const redeem = (offerId: string) => {
    setNotice(null);
    startTransition(async () => {
      const outcome = await redeemOfferAction(offerId);
      mirrorOutcome(userId, outcome);
      if (outcome.ok) {
        setNotice("تم الاستبدال بنجاح.");
      } else {
        setNotice(
          outcome.error === "insufficient"
            ? "شظايا غير كافية لهذا العرض."
            : outcome.error === "owned"
              ? "تملك هذا العنصر بالفعل."
              : "تعذّر الاستبدال.",
        );
      }
    });
  };

  return (
    <section className="panel">
      <div className="panel-body space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="lang-ar text-lg font-extrabold text-cream">ورشة التبادل</h2>
          <span className="flex items-center gap-1.5 text-xs text-muted">
            <IconShard className="h-4 w-4 text-amber" />
            <span className="telemetry text-cream" dir="ltr">
              {wallet.shards}
            </span>
          </span>
        </div>
        {notice && (
          <p className="lang-ar text-xs font-bold text-cyan" role="status">
            {notice}
          </p>
        )}
        <ul className="space-y-2.5">
          {EXCHANGE_OFFERS.map((offer) => {
            const item = offer.itemId ? itemById(offer.itemId) : null;
            const owned = Boolean(offer.itemId && wallet.owned[offer.itemId]);
            const affordable = wallet.shards >= offer.costShards;
            const Icon = offer.grants?.crystals
              ? IconCrystal
              : offer.grants?.passes
                ? IconTicket
                : IconCrystal;
            return (
              <li
                key={offer.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-line bg-void/50 px-3 py-3"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <Icon className="h-5 w-5 shrink-0 text-amethyst" />
                  <div className="min-w-0">
                    <p className="lang-ar text-sm font-bold text-cream">
                      {item ? item.nameAr : offer.nameAr}
                    </p>
                    <p className="lang-ar text-[11px] leading-relaxed text-muted">
                      {offer.descAr}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="flex items-center gap-1 text-xs text-amber">
                    <IconShard className="h-3.5 w-3.5" />
                    <span className="telemetry" dir="ltr">
                      {offer.costShards}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => redeem(offer.id)}
                    disabled={!online || pending || owned || !affordable}
                    className="btn-mini"
                  >
                    <span className="lang-ar">{owned ? "مملوك" : "استبدال"}</span>
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
