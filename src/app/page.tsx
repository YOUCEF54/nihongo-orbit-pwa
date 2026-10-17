import type { Metadata } from "next";
import { redirect } from "next/navigation";
import AppShell from "@/components/AppShell";
import HomeDashboard from "./home-dashboard";
import { createClient } from "@/lib/supabase/server";
import { loadMasteryServer } from "@/lib/mastery-server";

export const metadata: Metadata = {
  title: "الرئيسية | تعلّم اليابانية",
  description:
    "مركز القيادة اليومي: طاقة الصفاء الذهني، السلاسل اليومية، وتقدُّمك الحقيقي في مراجعة FSRS.",
};

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const initialMastery = await loadMasteryServer(user.id);

  return (
    <AppShell userEmail={user.email}>
      <HomeDashboard
        userId={user.id}
        userEmail={user.email ?? ""}
        initialMastery={initialMastery}
      />
    </AppShell>
  );
}