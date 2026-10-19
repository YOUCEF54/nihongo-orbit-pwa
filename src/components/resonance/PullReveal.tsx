"use client";

import { AnimatePresence, motion } from "framer-motion";
import { itemById } from "@/lib/items";
import type { PullResult } from "@/lib/gacha";
import { RARITY_COLOR, RARITY_STARS, itemIcon } from "./item-visuals";

/**
 * Full-screen reveal for a pull batch. Cards cascade in seeded by
 * index; duplicates show their shard conversion instead of "جديد".
 */
export default function PullReveal({
  results,
  onClose,
}: {
  results: PullResult[] | null;
  onClose: () => void;
}) {
  return (
    <AnimatePresence>
      {results && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="reward-backdrop"
          onClick={onClose}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="نتائج السحب"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", damping: 22, stiffness: 280 }}
            className="w-full max-w-md rounded-2xl border border-line bg-abyss p-5 text-center"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 className="lang-ar text-lg font-bold text-cream">نتائج الرنين</h2>
            <div className="mt-4 grid max-h-[50dvh] grid-cols-2 gap-2.5 overflow-y-auto sm:grid-cols-2">
              {results.map((result, index) => {
                const item = itemById(result.itemId);
                const Icon = item ? itemIcon(item) : null;
                const color = RARITY_COLOR[result.rarity];
                return (
                  <motion.div
                    key={`${result.itemId}-${index}`}
                    initial={{ opacity: 0, y: 14, scale: 0.94 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ delay: 0.05 * index, type: "spring", damping: 20 }}
                    className="rounded-xl border bg-void/60 p-3 text-start"
                    style={{
                      borderColor: color,
                      boxShadow:
                        result.rarity === 5 ? "0 0 18px rgba(243, 209, 132, 0.35)" : undefined,
                    }}
                  >
                    <div className="flex items-center justify-between">
                      {Icon ? (
                        <Icon className="h-5 w-5" style={{ color }} />
                      ) : (
                        <span className="h-5 w-5" />
                      )}
                      <span className="telemetry" style={{ color }} dir="ltr">
                        {RARITY_STARS[result.rarity]}
                      </span>
                    </div>
                    <p className="lang-ar mt-2 text-sm font-bold text-cream">
                      {item?.nameAr ?? result.itemId}
                    </p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      {result.dup ? (
                        <span className="chip is-gold" dir="rtl">
                          <span className="lang-ar">مكرر</span>
                          <span className="telemetry" dir="ltr">
                            +{result.shards}
                          </span>
                        </span>
                      ) : result.shards > 0 ? (
                        <span className="chip is-gold" dir="rtl">
                          <span className="telemetry" dir="ltr">
                            +{result.shards}
                          </span>
                          <span className="lang-ar">شظية</span>
                        </span>
                      ) : (
                        <span className="chip is-cyan">
                          <span className="lang-ar">جديد</span>
                        </span>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
            <button type="button" onClick={onClose} className="btn-mini mt-5 w-full">
              <span className="lang-ar">تم</span>
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
