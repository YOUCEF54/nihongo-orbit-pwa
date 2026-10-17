import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import AppShell from "@/components/AppShell";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import AdminPanel from "@/components/admin/AdminPanel";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin";
import { DEFAULT_THEME, THEMES } from "@/lib/themes";
import { THEME_NAMES } from "@/lib/theme-config";
import { allDailyWords, dailyWordIndex, wordAt } from "@/lib/word-of-the-day";
import { scanWotdImages } from "@/lib/wotd-images";

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
    <AppShell userEmail={user.email}>
      <div className="mx-auto w-full max-w-5xl px-4 pb-16 sm:px-6">
        <DashboardHeader
          titleAr="لوحة التحكم"
          descAr="اضبط السمة الافتراضية وأسماء السمات، وأدر صور كلمة اليوم — تُحفظ الصور في مجلد المشروع."
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
        />
      </div>
    </AppShell>
  );
}
