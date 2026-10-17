export const THEME_STORAGE_KEY = "learnjp:theme";

export const THEMES = [
  { id: "tactical", ar: "التكتيكي", swatch: "#00f0ff" },
  { id: "hybrid", ar: "الهجين", swatch: "#f3d184" },
  { id: "minimal", ar: "الحد الأدنى", swatch: "#0ea5e9" },
] as const;

export type ThemeId = (typeof THEMES)[number]["id"];

export const DEFAULT_THEME: ThemeId = "tactical";

export function isThemeId(value: string | null | undefined): value is ThemeId {
  return THEMES.some((t) => t.id === value);
}

export function resolveTheme(value: string | null | undefined): ThemeId {
  return isThemeId(value) ? value : DEFAULT_THEME;
}

export function themeMeta(theme: ThemeId) {
  return THEMES.find((t) => t.id === theme) ?? THEMES[0];
}