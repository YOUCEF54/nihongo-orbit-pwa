"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { IconCrystal, IconJade, IconTicket } from "@/components/icons";
import { useDialogFocus } from "./use-dialog-focus";

export interface RewardPayout {
  label: string;
  value: number;
  icon: React.ElementType;
  color: string;
}

/** Standard arcade solve payout: flat Jade in house amber. */
export function jadePayout(amount: number): RewardPayout {
  return {
    label: "يشم",
    value: amount,
    icon: IconJade,
    color: "var(--color-amber)",
  };
}

/** Resonance Crystals (hard currency) payout. */
export function crystalPayout(amount: number): RewardPayout {
  return {
    label: "بلورات المدار",
    value: amount,
    icon: IconCrystal,
    color: "var(--color-amethyst)",
  };
}

/** Standard Signal Tickets (pull passes) payout. */
export function passPayout(amount: number): RewardPayout {
  return {
    label: "تذاكر الإشارة",
    value: amount,
    icon: IconTicket,
    color: "var(--color-cyan)",
  };
}

interface RewardModalProps {
  open: boolean;
  onClose: () => void;
  glyph?: string;
  glyphAr?: string;
  payouts: RewardPayout[];
  /** Heading override (defaults to the arcade solve copy). */
  titleAr?: string;
  /** Optional note rendered below the payout rows. */
  note?: ReactNode;
}

export default function RewardModal({
  open,
  onClose,
  glyph,
  glyphAr,
  payouts,
  titleAr = "مكافأة الحل",
  note,
}: RewardModalProps) {
  const escapeRef = useRef<() => void>(() => {});
  const dialogRef = useDialogFocus<HTMLDivElement>(open);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    escapeRef.current = onClose;
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!open) return null;

  return (
    <div className="reward-backdrop" onClick={onClose}>
      <AnimatePresence>
        <motion.div
          ref={dialogRef}
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
          aria-labelledby="reward-title"
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.85, opacity: 0 }}
          transition={{ type: "spring", damping: 20, stiffness: 300 }}
          className="max-w-sm w-full rounded-2xl border border-line bg-abyss p-6 text-center backdrop-blur-sm shadow-[0_24px_48px_rgba(0,0,0,0.6)] outline-none"
          onClick={(e) => e.stopPropagation()}
        >
          {glyph && (
            <div className="mx-auto mb-4">
              <span className="font-jp text-6xl font-bold text-cream" dir="ltr">
                {glyph}
              </span>
              {glyphAr && <p className="lang-ar mt-1 text-sm text-muted">{glyphAr}</p>}
            </div>
          )}

          <h2 id="reward-title" className="lang-ar mt-1 text-xl font-bold text-cream">
            {titleAr}
          </h2>

          <div className="mt-5 space-y-3">
            {payouts.map((payout) => (
              <div
                key={payout.label}
                className="flex items-center justify-between px-3 py-2.5 rounded-xl border border-line bg-void/50"
              >
                <div className="flex items-center gap-2.5">
                  <payout.icon
                    className="h-4 w-4"
                    style={{ color: payout.color }}
                  />
                  <span className="lang-ar text-sm font-medium text-cream">
                    {payout.label}
                  </span>
                </div>
                <span className="telemetry text-frequency" dir="ltr">
                  +{payout.value}
                </span>
              </div>
            ))}
          </div>

          {note && <div className="mt-4">{note}</div>}

          <button
            type="button"
            onClick={onClose}
            className="mt-6 btn-mini w-full"
          >
            <span className="lang-ar">متابعة</span>
          </button>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
