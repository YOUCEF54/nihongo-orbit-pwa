import type { Metadata } from "next";
import { redirect } from "next/navigation";
import AppShell from "@/components/AppShell";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import ResonanceTerminal from "@/components/resonance/ResonanceTerminal";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "محطة الرنين | تعلّم اليابانية",
  description: "اسحب من بوابة الإشارة، اجمع السمات والألقاب، وبدّل الشظايا.",
};

export default async function ResonancePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <AppShell userEmail={user.email} userId={user.id}>
      <div className="mx-auto w-full max-w-5xl px-6 pb-14">
        <DashboardHeader
          titleAr="محطة الرنين"
          descAr="التذاكر تكسبها من المراجعة والحملات — اسحب، اجمع، وبدّل."
          crumbs={[
            { href: "/", ar: "الرئيسية" },
            { href: "/resonance", ar: "الرنين" },
          ]}
        />
        <ResonanceTerminal userId={user.id} />
      </div>
    </AppShell>
  );
}
