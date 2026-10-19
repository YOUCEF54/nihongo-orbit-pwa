"use client";

import { themeMeta, THEMES, type ThemeId } from "@/lib/themes";
import { useTheme } from "./ThemeProvider";

const THEME_CODES: Record<string, string> = {
  tactical: "TAC",
  hybrid: "HBR",
  minimal: "MIN",
};

export default function ThemeToggle({
  compact = false,
  owned,
}: {
  compact?: boolean;
  /** When provided, cycling is restricted to the owned themes. */
  owned?: ThemeId[];
}) {
  const { theme, setTheme } = useTheme();
  const pool = owned && owned.length > 0 ? THEMES.filter((t) => owned.includes(t.id)) : THEMES;
  const currentIndex = Math.max(
    0,
    pool.findIndex((t) => t.id === theme),
  );
  const next = pool[(currentIndex + 1) % pool.length] ?? pool[0] ?? THEMES[0];
  const current = themeMeta(theme);
  const locked = THEMES.length - pool.length;
  const cyclable = pool.length > 1;

  return (
    <button
      type="button"
      onClick={() => cyclable && setTheme(next.id)}
      aria-label={cyclable ? `تبديل السمة إلى ${next.ar}` : "سمات إضافية تُفتح من محطة الرنين"}
      title={
        cyclable
          ? `انقر للتبديل إلى سمة ${next.ar}`
          : "افتح سمات إضافية من محطة الرنين"
      }
      disabled={!cyclable}
      data-testid="theme-toggle"
      className={
        compact
          ? "flex items-center gap-2 rounded-full border border-line bg-void/70 px-3 py-2 transition hover:border-cyan/50"
          : "flex items-center gap-2 rounded-full border border-line bg-void/70 px-3 py-2 transition hover:border-cyan/50 disabled:cursor-not-allowed disabled:opacity-70"
      }
    >
      <span
        className="h-2.5 w-2.5 rounded-full shadow-[0_0_8px_currentColor]"
        style={{ backgroundColor: current.swatch, color: current.swatch }}
      />
      {!compact && (
        <span className="lang-ar text-xs font-bold text-muted">
          {current.ar}
        </span>
      )}
      <span className="telemetry text-faint">{THEME_CODES[current.id] ?? "TAC"}</span>
      {!compact && locked > 0 && (
        <span className="telemetry text-faint" dir="ltr" title="سمات مقفلة">
          +{locked}
        </span>
      )}
    </button>
  );
}
