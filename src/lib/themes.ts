import { THEME_DEFAULT_ID, THEME_NAMES } from "./theme-config.ts";

export const THEME_STORAGE_KEY = "learnjp:theme";

/** Fixed set of theme ids. Names + default come from theme-config.ts. */
export const THEME_IDS = ["tactical", "hybrid", "minimal"] as const;

export type ThemeId = (typeof THEME_IDS)[number];

const SWATCHES: Record<ThemeId, string> = {
  tactical: "#00f0ff",
  hybrid: "#f3d184",
  minimal: "#0ea5e9",
};

export const THEMES: { id: ThemeId; ar: string; swatch: string }[] = THEME_IDS.map(
  (id) => ({ id, ar: THEME_NAMES[id] || id, swatch: SWATCHES[id] }),
);

export const DEFAULT_THEME: ThemeId = (THEME_IDS as readonly string[]).includes(
  THEME_DEFAULT_ID,
)
  ? (THEME_DEFAULT_ID as ThemeId)
  : "tactical";

export function isThemeId(value: string | null | undefined): value is ThemeId {
  return THEME_IDS.some((id) => id === value);
}

export function resolveTheme(value: string | null | undefined): ThemeId {
  return isThemeId(value) ? value : DEFAULT_THEME;
}

export function themeMeta(theme: ThemeId) {
  return THEMES.find((t) => t.id === theme) ?? THEMES[0];
}
