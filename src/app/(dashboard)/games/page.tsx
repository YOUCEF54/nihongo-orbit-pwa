import type { Metadata } from "next";
import { redirect } from "next/navigation";
import AppShell from "@/components/AppShell";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import { IconOrbit, IconSpark, IconWave } from "@/components/icons";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "أركيد الألعاب | تعلّم اليابانية",
  description: "ألعاب حرة — المعداد المداري وتوحيد الجذور وطبل المورا الإيقاعي.",
};

const GAMES = [
  {
    id: "astral-abacus",
    titleAr: "المعداد المداري",
    descAr: "دوّر حلقات السداسيات ورتّب عملات الجذور لتُركّب الكانجي من جذوره.",
    href: "/games/astral-abacus",
    icon: IconOrbit,
  },
  {
    id: "radical-confluence",
    titleAr: "توحيد الجذور",
    descAr: "اغمر مصفوفة الجذور ١٠×١٠ بجذرٍ واحد قبل نفاد دورات التزامن الـ٢٢.",
    href: "/games/radical-confluence",
    icon: IconSpark,
  },
  {
    id: "mora-taiko",
    titleAr: "طبل المورا",
    descAr: "اضرب المركز للنغمة العالية والحافة للمنخفضة على إيقاع المورا.",
    href: "/games/mora-taiko",
    icon: IconWave,
  },
];

export default async function GamesIndexPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <AppShell userEmail={user.email}>
      <div className="mx-auto w-full max-w-5xl px-6 pb-14">
        <DashboardHeader
          titleAr="أركيد الألعاب"
          descAr="ألعاب حرة متاحة من اليوم الأول — كل حلٍّ يمنح يشمًا دون استهلاك إضافي للطاقة."
          crumbs={[
            { href: "/", ar: "الرئيسية" },
            { href: "/games", ar: "الأركيد" },
          ]}
        />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {GAMES.map((game) => (
            <a
              key={game.id}
              href={game.href}
              className="panel group transition hover:border-cyan/50 hover:shadow-[var(--glow-cyan)]"
            >
              <div className="panel-body">
                <game.icon className="h-6 w-6 text-cyan" />
                <h2 className="lang-ar mt-1 text-xl font-extrabold text-cream">
                  {game.titleAr}
                </h2>
                <p className="lang-ar mt-3 text-xs leading-relaxed text-muted">
                  {game.descAr}
                </p>
                <span className="chip is-cyan mt-4">
                  <span className="lang-ar">العب</span>
                </span>
              </div>
            </a>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
