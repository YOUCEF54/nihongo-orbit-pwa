import type { Metadata, Viewport } from "next";
import Script from "next/script";
import {
  Cairo,
  JetBrains_Mono,
  Noto_Sans_JP,
} from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { DEFAULT_THEME, THEME_IDS, THEME_STORAGE_KEY } from "@/lib/themes";

const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem(${JSON.stringify(
  THEME_STORAGE_KEY,
)});var ok=${JSON.stringify(THEME_IDS)};if(ok.indexOf(t)<0){t=${JSON.stringify(
  DEFAULT_THEME,
)};}document.documentElement.dataset.theme=t;}catch(e){document.documentElement.dataset.theme=${JSON.stringify(
  DEFAULT_THEME,
)};}})();`;

/** Arabic headings — Cairo */
const cairo = Cairo({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "700", "800"],
  variable: "--font-cairo",
  display: "swap",
});

/** Arabic body copy — Cairo doubles as body (Plex removed: unused). */

/** Kanji display — Noto Sans JP (latin subset for mixed romaji; kanji/ kana
    intentionally render in system CJK fonts via the --font-jp stack to avoid
    shipping multi-megabyte Japanese webfonts). */
const notoJp = Noto_Sans_JP({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-notojp",
  display: "swap",
});

/** Furigana / Japanese subtext — BIZ UDPGothic (self-hosted subset). */
const bizUdpGothic = localFont({
  src: [
    { path: "../fonts/BIZUDPGothic-Regular.woff2", weight: "400", style: "normal" },
    { path: "../fonts/BIZUDPGothic-Bold.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-bizud",
  display: "swap",
  fallback: ["Noto Sans JP", "Hiragino Kaku Gothic ProN", "Yu Gothic", "sans-serif"],
});

/** Telemetry / stats — JetBrains Mono */
const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "700", "800"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const metadata: Metadata = {
  title: "تعلّم اليابانية | @learnjapanese.words",
  description:
    "مرافقك اليومي لتعلّم اليابانية بالعربية: مراجعة FSRS، صدى المعاني، سلسلة سكتات الكانجي، وطاقة الصفاء وسلاسل المراجعة.",
};

export const viewport: Viewport = {
  themeColor: "#0B0D12",
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="ar"
      dir="rtl"
      suppressHydrationWarning
      className={`${cairo.variable} ${notoJp.variable} ${bizUdpGothic.variable} ${jetbrains.variable}`}
    >
      <body className="min-h-dvh font-sans antialiased">
        <Script
          id="theme-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }}
        />
        <ThemeProvider>
          {/* Tactical grid — fixed layer above body bg, below all content */}
          <div className="texture-layer" aria-hidden="true" />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
