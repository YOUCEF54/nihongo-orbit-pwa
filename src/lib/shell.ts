export type ShellIcon = "home" | "archive" | "dojo" | "orbit" | "wave" | "spark" | "shield";

export interface ShellRoute {
  id: string;
  ar: string;
  href: string;
  icon: ShellIcon;
}

export const DOCK_ROUTES: ShellRoute[] = [
  { id: "home", ar: "الرئيسية", href: "/", icon: "home" },
  { id: "practice", ar: "الدوجو", href: "/practice", icon: "dojo" },
  { id: "games", ar: "الأركيد", href: "/games", icon: "orbit" },
];

export const TERMINAL_ROUTES: ShellRoute[] = [
  { id: "review", ar: "المراجعة اليومية", href: "/practice#review", icon: "dojo" },
  { id: "pitch", ar: "صدى المعاني", href: "/practice#pitch", icon: "wave" },
  { id: "matrix", ar: "قاعة الكتابة", href: "/practice#matrix", icon: "archive" },
  { id: "listen", ar: "سباق السرعة الصوتي", href: "/practice#listen", icon: "wave" },
  { id: "taiko", ar: "طبل المورا", href: "/practice#taiko", icon: "spark" },
  { id: "assemble", ar: "تركيب الجملة", href: "/practice#assemble", icon: "spark" },
  { id: "grammar", ar: "مرجع الإعراب", href: "/practice#grammar", icon: "shield" },
  { id: "games", ar: "أركيد الألعاب", href: "/games", icon: "orbit" },
];

/** Real display name derived from the account email, or a graceful fallback. */
export function handleLabelFor(email?: string): string {
  if (!email) return "مستكشف";
  const local = email.split("@")[0]?.trim();
  return local && local.length > 0 ? local : "مستكشف";
}