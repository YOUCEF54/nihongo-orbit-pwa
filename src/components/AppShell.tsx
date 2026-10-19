"use client";

import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { isAdmin } from "@/lib/admin";
import { DOCK_ROUTES, TERMINAL_ROUTES, handleLabelFor, type ShellIcon } from "@/lib/shell";
import { useJapaneseVoice } from "@/lib/use-japanese-voice";
import { useResonance } from "@/lib/use-resonance";
import { equippedTitleDef, ownedThemes } from "@/lib/inventory";
import {
  hasAdoptedTheme,
  hydrateResonance,
  markThemeAdopted,
  snapshotResonance,
  type ResonanceState,
} from "@/lib/resonance";
import { adoptThemeAction } from "@/lib/resonance-actions";
import { mirrorOutcome } from "@/lib/resonance-client";
import { useTheme } from "./ThemeProvider";
import ThemeToggle from "./ThemeToggle";
import VoicePanel from "./VoicePanel";
import { useDialogFocus } from "./ui/use-dialog-focus";
import {
  IconBlocks,
  IconBolt,
  IconBrush,
  IconCards,
  IconCrystal,
  IconDojo,
  IconDrum,
  IconEar,
  IconGear,
  IconGrid,
  IconHeadphones,
  IconHome,
  IconOrbit,
  IconParticles,
  IconPhone,
  IconShuffle,
  IconUser,
  IconVolume,
} from "./icons";

const VOICE_BANNER_KEY = "learnjp:voice-banner-dismissed";
const voiceBannerListeners = new Set<() => void>();

function subscribeVoiceBanner(listener: () => void) {
  voiceBannerListeners.add(listener);
  return () => {
    voiceBannerListeners.delete(listener);
  };
}

function readVoiceBannerDismissed() {
  try {
    return window.localStorage.getItem(VOICE_BANNER_KEY) === "1";
  } catch {
    return false;
  }
}

function dismissVoiceBanner() {
  try {
    window.localStorage.setItem(VOICE_BANNER_KEY, "1");
  } catch {
    // storage unavailable — banner stays hidden for this session
  }
  voiceBannerListeners.forEach((listener) => listener());
}

function DockIcon({ icon, className = "" }: { icon: ShellIcon; className?: string }) {
  switch (icon) {
    case "home":
      return <IconHome className={className} />;
    case "dojo":
      return <IconDojo className={className} />;
    case "orbit":
      return <IconOrbit className={className} />;
    case "brush":
      return <IconBrush className={className} />;
    case "shuffle":
      return <IconShuffle className={className} />;
    case "cards":
      return <IconCards className={className} />;
    case "ear":
      return <IconEar className={className} />;
    case "grid":
      return <IconGrid className={className} />;
    case "headphones":
      return <IconHeadphones className={className} />;
    case "blocks":
      return <IconBlocks className={className} />;
    case "particles":
      return <IconParticles className={className} />;
    case "drum":
      return <IconDrum className={className} />;
    case "crystal":
      return <IconCrystal className={className} />;
  }
}

export default function AppShell({
  children,
  userEmail,
  userId,
  initialWallet,
}: {
  children: ReactNode;
  userEmail?: string;
  userId?: string;
  /** Server wallet (Phase E). Null when the server tables are unavailable. */
  initialWallet?: ResonanceState | null;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [terminalOpen, setTerminalOpen] = useState(false);
  const [terminalView, setTerminalView] = useState<"menu" | "voice">("menu");
  const terminalRef = useDialogFocus<HTMLDivElement>(terminalOpen);
  const [dockPinned, setDockPinned] = useState(false);
  const [dockHovered, setDockHovered] = useState(false);
  const dockOpen = dockPinned || dockHovered;
  const handle = handleLabelFor(userEmail);
  const voiceStatus = useJapaneseVoice();
  const wallet = useResonance(userId);
  const { theme, setTheme } = useTheme();
  const owned = ownedThemes(wallet);
  const titleCode = equippedTitleDef(wallet)?.code ?? "OPR";
  const voiceBannerDismissed = useSyncExternalStore(
    subscribeVoiceBanner,
    readVoiceBannerDismissed,
    () => true,
  );
  const showVoiceBanner = voiceStatus.state === "missing" && !voiceBannerDismissed;

  // Wallet sync, starter-theme grace, and ownership gating — one effect so
  // the order is explicit: hydrate → adopt → (only then) fall back.
  useEffect(() => {
    if (!userId) return;
    if (initialWallet) hydrateResonance(userId, initialWallet);

    const base = initialWallet ?? snapshotResonance(userId);
    const ownedIds = ownedThemes(base);
    if (ownedIds.length === 0) return;
    if (ownedIds.includes(theme)) return;

    if (!hasAdoptedTheme(userId, theme)) {
      markThemeAdopted(userId, theme);
      const fallback = ownedIds[0];
      void adoptThemeAction(theme)
        .then((outcome) => {
          if (!mirrorOutcome(userId, outcome).ok) setTheme(fallback);
        })
        .catch(() => {
          setTheme(fallback);
        });
      return;
    }

    setTheme(ownedIds[0]);
  }, [userId, initialWallet, theme, setTheme]);

  const openTerminal = (view: "menu" | "voice") => {
    setTerminalView(view);
    setTerminalOpen(true);
    if (view === "voice") dismissVoiceBanner();
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setTerminalOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <div className="min-h-dvh">
      <a href="#main-content" className="skip-link lang-ar">
        تخطَّ إلى المحتوى
      </a>
      {/* Tier 1 — Top HUD */}
      <header className="sticky top-0 z-40 border-b border-line bg-void/80 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3 px-4 py-2.5 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="relative">
              <span className="grid h-10 w-10 place-items-center rounded-full border border-cyan/40 bg-abyss">
                <IconUser className="h-5 w-5 text-cyan" />
              </span>
              <span
                data-testid="operator-title"
                title={equippedTitleDef(wallet)?.nameAr}
                className="absolute -bottom-1 -end-1 rounded-md border border-cyan/40 bg-void px-1 font-mono text-[9px] font-bold text-cyan"
              >
                {titleCode}
              </span>
            </div>
            <div className="hidden sm:block">
              <p className="text-sm font-extrabold text-cream" dir="ltr">
                {handle}
              </p>
              <p className="lang-ar text-faint">المدار · السطح نشط</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle owned={owned} />
            <button
              type="button"
              onClick={() => openTerminal("menu")}
              aria-haspopup="dialog"
              aria-expanded={terminalOpen}
              className="btn-telemetry px-3"
              aria-label="فتح مركز المدار"
            >
              <IconPhone className="h-4 w-4" />
              <span className="lang-ar hidden sm:inline">القائمة</span>
            </button>
          </div>
        </div>
      </header>

      {showVoiceBanner && (
        <div data-testid="voice-banner" className="border-b border-hazard/30 bg-hazard/10">
          <div className="mx-auto flex w-full max-w-5xl items-center gap-2.5 px-4 py-2 lg:px-8">
            <IconVolume className="h-4 w-4 flex-none text-hazard" />
            <p className="lang-ar flex-1 text-xs leading-relaxed text-cream">
              التسجيلات تعمل — أضف صوتاً يابانياً من نظامك لسماع النصوص غير المسجلة.
            </p>
            <button
              type="button"
              data-testid="voice-banner-open"
              onClick={() => openTerminal("voice")}
              className="btn-mini"
            >
              <span className="lang-ar">إعداد الصوت</span>
            </button>
            <button
              type="button"
              data-testid="voice-banner-dismiss"
              aria-label="إغلاق التنبيه"
              onClick={dismissVoiceBanner}
              className="btn-ghost px-2 py-1"
            >
              <span aria-hidden="true">✕</span>
            </button>
          </div>
        </div>
      )}

      <main id="main-content" tabIndex={-1} className="pb-[calc(4.375rem+env(safe-area-inset-bottom))] pt-6">{children}</main>

      {/* Tier 2 — Floating Capsule Dock (compact icon rail; expands on hover/focus/toggle) */}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <nav
          dir="rtl"
          onMouseEnter={() => setDockHovered(true)}
          onMouseLeave={() => setDockHovered(false)}
          onFocus={() => setDockHovered(true)}
          onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node)) {
              setDockHovered(false);
            }
          }}
          className="pointer-events-auto flex items-center gap-0.5 rounded-full border border-cyan/40 bg-abyss/85 px-1.5 py-1.5 shadow-[0_10px_40px_rgba(0,0,0,0.5)] backdrop-blur-xl transition-[padding] duration-200"
        >
          {DOCK_ROUTES.map((route) => {
            const active =
              pathname === route.href || pathname.startsWith(`${route.href}/`);
            return (
              <a
                key={route.id}
                href={route.href}
                aria-current={active ? "page" : undefined}
                aria-label={route.ar}
                className={`flex items-center gap-2 rounded-full py-2 transition-all duration-200 ${
                  dockOpen ? "px-3.5" : "px-3"
                } ${
                  active
                    ? "bg-cyan/12 text-cyan"
                    : "text-muted hover:bg-white/5 hover:text-cream"
                }`}
              >
                <DockIcon icon={route.icon} className="h-5 w-5 shrink-0" />
                <span
                  className={`lang-ar overflow-hidden whitespace-nowrap text-[11px] font-bold transition-all duration-200 ${
                    dockOpen ? "max-w-[72px] opacity-100" : "max-w-0 opacity-0"
                  }`}
                >
                  {route.ar}
                </span>
              </a>
            );
          })}
          <button
            type="button"
            data-testid="dock-toggle"
            aria-expanded={dockOpen}
            aria-label={dockPinned ? "طيّ القائمة" : "توسيع القائمة"}
            onClick={() => setDockPinned((value) => !value)}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-faint transition hover:text-cyan"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
              className={`h-4 w-4 transition-transform duration-200 ${dockOpen ? "rotate-180" : ""}`}
            >
              <path
                d="M6 9l6 6 6-6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </nav>
      </div>

      {/* Tier 3 — Orbit Terminal overlay (real shortlinks into the dojo) */}
      {terminalOpen && (
        <div
          ref={terminalRef}
          tabIndex={-1}
          className="fixed inset-0 z-50 flex items-end justify-center outline-none sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-label="مركز المدار"
        >
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setTerminalOpen(false)}
          />
          <div className="glass-panel relative z-10 m-4 max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-2xl p-5">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {terminalView === "voice" && (
                  <button
                    type="button"
                    aria-label="رجوع"
                    onClick={() => setTerminalView("menu")}
                    className="btn-ghost px-3 py-1"
                  >
                    <span aria-hidden="true">→</span>
                  </button>
                )}
                <span className="panel-title lang-ar">
                  {terminalView === "voice" ? "إعداد الصوت" : "مركز المدار"}
                </span>
              </div>
              <button
                type="button"
                aria-label="إغلاق"
                onClick={() => setTerminalOpen(false)}
                className="btn-ghost px-3 py-1"
              >
                <span className="size-4 mb-1" aria-hidden="true">
                  ✕
                </span>
              </button>
            </div>
            {terminalView === "voice" ? (
              <VoicePanel />
            ) : (
              <>
                <div dir="rtl" className="grid grid-cols-2 gap-3">
                  {TERMINAL_ROUTES.map((route) => (
                    <a
                      key={route.id}
                      href={route.href}
                      onClick={() => setTerminalOpen(false)}
                      className="flex items-center gap-3 rounded-xl border border-line bg-void/50 px-4 py-3 text-start transition hover:border-cyan/40 hover:bg-cyan/5"
                    >
                      <DockIcon icon={route.icon} className="h-5 w-5 flex-none text-cyan" />
                      <span className="lang-ar block text-sm font-bold text-cream">
                        {route.ar}
                      </span>
                    </a>
                  ))}
                </div>
                <button
                  type="button"
                  data-testid="terminal-voice"
                  onClick={() => openTerminal("voice")}
                  className="mt-3 flex w-full items-center gap-3 rounded-xl border border-line bg-void/50 px-4 py-3 text-start transition hover:border-cyan/40 hover:bg-cyan/5"
                >
                  <IconGear className="h-5 w-5 flex-none text-cyan" />
                  <span>
                    <span className="lang-ar block text-sm font-bold text-cream">إعداد الصوت</span>
                    <span className="lang-ar block text-faint">تسجيلات مدمجة + صوت النظام</span>
                  </span>
                </button>
                {isAdmin(userEmail) && (
                  <a
                    href="/admin"
                    data-testid="terminal-admin"
                    onClick={() => setTerminalOpen(false)}
                    className="mt-3 flex w-full items-center gap-3 rounded-xl border border-amber/40 bg-amber/5 px-4 py-3 text-start transition hover:border-amber/60 hover:bg-amber/10"
                  >
                    <IconGear className="h-5 w-5 flex-none text-amber" />
                    <span>
                      <span className="lang-ar block text-sm font-bold text-cream">
                        لوحة التحكم
                      </span>
                      <span className="lang-ar block text-faint">السمات وصور كلمة اليوم</span>
                    </span>
                  </a>
                )}
                <button type="button" onClick={handleLogout} className="btn-danger mt-3 w-full">
                  <IconBolt className="h-4 w-4" />
                  <span className="lang-ar">تسجيل الخروج</span>
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}