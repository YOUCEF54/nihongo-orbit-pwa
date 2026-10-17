"use client";

import { themeMeta, THEMES } from "@/lib/themes";
import { useTheme } from "./ThemeProvider";

const THEME_CODES: Record<string, string> = {
  tactical: "TAC",
  hybrid: "HBR",
  minimal: "MIN",
};

export default function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { theme, setTheme } = useTheme();
  const currentIndex = Math.max(
    0,
    THEMES.findIndex((t) => t.id === theme),
  );
  const next = THEMES[(currentIndex + 1) % THEMES.length];
  const current = themeMeta(theme);

  return (
    <button
      type="button"
      onClick={() => setTheme(next.id)}
      aria-label={`تبديل السمة إلى ${next.ar}`}
      title={`انقر للتبديل إلى سمة ${next.ar}`}
      className={
        compact
          ? "flex items-center gap-2 rounded-full border border-line bg-void/70 px-3 py-2 transition hover:border-cyan/50"
          : "flex items-center gap-2 rounded-full border border-line bg-void/70 px-3 py-2 transition hover:border-cyan/50"
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
    </button>
  );
}