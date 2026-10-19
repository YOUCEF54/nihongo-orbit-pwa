"use client";

import { itemById } from "@/lib/items";
import { useResonance } from "@/lib/use-resonance";
import { IconShard } from "@/components/icons";
import { RARITY_COLOR, RARITY_STARS, itemIcon } from "./item-visuals";

const VISIBLE = 24;

export default function HistoryPanel({ userId }: { userId: string }) {
  const wallet = useResonance(userId);
  const records = wallet.history.slice(-VISIBLE).reverse();

  return (
    <section className="panel">
      <div className="panel-body space-y-3">
        <h2 className="lang-ar text-lg font-extrabold text-cream">سجل الرنين</h2>
        {records.length === 0 ? (
          <p className="lang-ar text-xs text-faint">لا سحوبات بعد — أول تذكرة على بعد مراجعات قليلة.</p>
        ) : (
          <ul className="space-y-1.5">
            {records.map((record, index) => {
              const item = itemById(record.itemId);
              const Icon = item ? itemIcon(item) : null;
              const color = RARITY_COLOR[record.rarity];
              return (
                <li
                  key={`${record.at}-${record.itemId}-${index}`}
                  className="flex items-center justify-between gap-3 rounded-lg border border-line/60 bg-void/40 px-3 py-2"
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    {Icon && <Icon className="h-4 w-4 shrink-0" style={{ color }} />}
                    <span className="lang-ar truncate text-xs font-bold text-cream">
                      {item?.nameAr ?? record.itemId}
                    </span>
                    <span className="telemetry" style={{ color }} dir="ltr">
                      {RARITY_STARS[record.rarity]}
                    </span>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {record.dup && (
                      <span className="flex items-center gap-1 text-[11px] text-amber">
                        <IconShard className="h-3 w-3" />
                        <span className="telemetry" dir="ltr">
                          +{record.shards}
                        </span>
                      </span>
                    )}
                    <time className="telemetry text-[10px] text-faint" dir="ltr">
                      {new Date(record.at).toLocaleDateString("ar", {
                        month: "short",
                        day: "numeric",
                      })}
                    </time>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
