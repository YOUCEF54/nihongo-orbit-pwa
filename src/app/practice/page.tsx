import type { Metadata } from "next";
import { redirect } from "next/navigation";
import AppShell from "@/components/AppShell";
import SectorHub from "@/components/sector/SectorHub";
import { createClient } from "@/lib/supabase/server";
import { loadMasteryServer } from "@/lib/mastery-server";
import { VOCAB_SEED } from "@/data/vocab.seed";
import { KANJI_SEED } from "@/data/kanji.seed";

export const metadata: Metadata = {
  title: "خريطة القطاعات | تعلّم اليابانية",
  description:
    "خريطة الحملات الميدانية: تقدّم كل قطاع وملف أهدافه، واختيار القطاع النشط الذي تغذّي منه كل التدريبات.",
};

export default async function PracticePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const initialMastery = await loadMasteryServer(user.id);

  return (
    <AppShell userEmail={user.email} userId={user.id}>
      <SectorHub
        userId={user.id}
        initialMastery={initialMastery}
        vocab={VOCAB_SEED}
        kanji={KANJI_SEED}
      />
    </AppShell>
  );
}
