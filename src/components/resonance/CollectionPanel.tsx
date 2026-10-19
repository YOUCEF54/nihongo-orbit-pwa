"use client";

import { useState, type ReactNode } from "react";
import { consumeItem, equipTitle, ownedOf } from "@/lib/inventory";
import { useResonance } from "@/lib/use-resonance";
import { IconCrystal } from "@/components/icons";
import { RARITY_COLOR, RARITY_STARS, itemIcon } from "./item-visuals";

export default function CollectionPanel({ userId }: { userId: string }) {
  const wallet = useResonance(userId);
  const [notice, setNotice] = useState<string | null>(null);

  const themes = ownedOf(wallet, "theme");
  const styles = ownedOf(wallet, "style");
  const titles = ownedOf(wallet, "title");
  const consumables = ownedOf(wallet, "consumable");
  const activeTitle = wallet.equippedTitle || "title-explorer";

  const equip = (itemId: string) => {
    const outcome = equipTitle(userId, itemId);
    setNotice(outcome.ok ? `تم تعيين اللقب.` : "تعذّر التعيين.");
  };

  const consume = (itemId: string) => {
    const outcome = consumeItem(userId, itemId);
    setNotice(outcome.ok ? "تم استخدام الشحنة." : "تعذّر الاستخدام.");
  };

  return (
    <section className="panel">
      <div className="panel-body space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="lang-ar text-lg font-extrabold text-cream">الخزانة</h2>
          <span className="lang-ar text-[11px] text-faint">
            الأنماط تُطبَّق تلقائيًا على بطاقات الدراسة (الأفضل المسحوب)
          </span>
        </div>
        {notice && (
          <p className="lang-ar text-xs font-bold text-cyan" role="status">
            {notice}
          </p>
        )}

        <CollectionGroup titleAr="السمات والأنماط" items={[...themes, ...styles]} />
        <CollectionGroup
          titleAr="الألقاب"
          items={titles}
          renderAction={(item) => (
            <button
              type="button"
              onClick={() => equip(item.id)}
              disabled={activeTitle === item.id}
              className="btn-mini"
            >
              <span className="lang-ar">
                {activeTitle === item.id ? "مُعيَّن" : "تعيين"}
              </span>
            </button>
          )}
        />
        <CollectionGroup
          titleAr="الشحنات"
          items={consumables}
          renderBadge={(item) => `×${wallet.owned[item.id] ?? 0}`}
          renderAction={(item) => (
            <button type="button" onClick={() => consume(item.id)} className="btn-mini">
              <span className="lang-ar">استخدام</span>
            </button>
          )}
        />
      </div>
    </section>
  );
}

function CollectionGroup({
  titleAr,
  items,
  renderAction,
  renderBadge,
}: {
  titleAr: string;
  items: ReturnType<typeof ownedOf>;
  renderAction?: (item: ReturnType<typeof ownedOf>[number]) => ReactNode;
  renderBadge?: (item: ReturnType<typeof ownedOf>[number]) => string;
}) {
  return (
    <div>
      <h3 className="lang-ar text-xs font-bold text-muted">{titleAr}</h3>
      {items.length === 0 ? (
        <p className="lang-ar mt-2 flex items-center gap-2 text-xs text-faint">
          <IconCrystal className="h-4 w-4 text-faint" />
          لا شيء بعد — يُكتسب من السحب أو التبادل.
        </p>
      ) : (
        <ul className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => {
            const Icon = itemIcon(item);
            const color = RARITY_COLOR[item.rarity];
            return (
              <li
                key={item.id}
                className="flex items-center justify-between gap-2 rounded-xl border border-line bg-void/50 px-3 py-2.5"
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <Icon className="h-4 w-4 shrink-0" style={{ color }} />
                  <div className="min-w-0">
                    <p className="lang-ar truncate text-sm font-bold text-cream">{item.nameAr}</p>
                    <p className="telemetry" style={{ color }} dir="ltr">
                      {RARITY_STARS[item.rarity]}
                      {renderBadge ? ` · ${renderBadge(item)}` : ""}
                    </p>
                  </div>
                </div>
                {renderAction?.(item)}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
