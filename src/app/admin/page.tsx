import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import AppShell from "@/components/AppShell";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import AdminPanel from "@/components/admin/AdminPanel";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin";
import { DEFAULT_THEME, THEMES } from "@/lib/themes";
import { THEME_NAMES } from "@/lib/theme-config";
import { SECTORS } from "@/lib/curriculum";
import { SECTOR_SKINS } from "@/lib/sector-skins";
import { allDailyWords, dailyWordIndex, wordAt } from "@/lib/word-of-the-day";
import { scanWotdImages } from "@/lib/wotd-images";
import { scanSectorArt } from "@/lib/sector-art";

export const metadata: Metadata = {
  title: "لوحة التحكم | تعلّم اليابانية",
  robots: { index: false, follow: false },
};

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");
  if (!isAdmin(user.email)) notFound();

  const images = await scanWotdImages();
  const sectorArt = await scanSectorArt();
  const sectors = SECTORS.map((sector) => ({
    id: sector.id,
    order: sector.order,
    titleAr: sector.titleAr,
    taglineAr: sector.taglineAr,
    themeAr: sector.themeAr,
    accent: SECTOR_SKINS[sector.id].accent,
    emblem: SECTOR_SKINS[sector.id].emblem,
  }));
  const todayId = wordAt(dailyWordIndex()).id;
  const words = allDailyWords().map((word) => ({
    id: word.id,
    japaneseText: word.japaneseText,
    furigana: word.furigana,
    romaji: word.romaji,
    meaning: word.arabicTranslation,
    sector: word.sectorLabelAr,
    art: word.art,
  }));

  return (
    <AppShell userEmail={user.email} userId={user.id}>
      <div className="mx-auto w-full max-w-5xl px-4 pb-16 sm:px-6">
        <DashboardHeader
          titleAr="لوحة التحكم"
          descAr="اضبط السمة الافتراضية وأسماء السمات، وأدر صور كلمة اليوم وخلفيات القطاعات — تُحفظ الصور في مجلد المشروع."
          crumbs={[
            { href: "/", ar: "الرئيسية" },
            { href: "/admin", ar: "لوحة التحكم" },
          ]}
        />
        <AdminPanel
          themes={THEMES.map((theme) => ({
            id: theme.id,
            ar: theme.ar,
            swatch: theme.swatch,
          }))}
          defaultId={DEFAULT_THEME}
          names={THEME_NAMES}
          words={words}
          images={images}
          todayId={todayId}
          sectors={sectors}
          sectorArt={sectorArt}
        />
      </div>
    </AppShell>
  );
}
