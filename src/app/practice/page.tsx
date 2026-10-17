import type { Metadata } from "next";
import { redirect } from "next/navigation";
import AppShell from "@/components/AppShell";
import DojoContent from "@/components/dojo-content";
import { createClient } from "@/lib/supabase/server";
import { loadMasteryServer } from "@/lib/mastery-server";
import { VOCAB_SEED } from "@/data/vocab.seed";
import { KANJI_SEED } from "@/data/kanji.seed";

export const metadata: Metadata = {
  title: "الدوجو | تعلّم اليابانية",
  description:
    "حلبة التدريب: خريطة القطاعات والألعاب المصغّرة لصدى المعاني وترتيب سكتات الكانجي مع مراجعة متباعدة FSRS.",
};

export default async function PracticePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const initialMastery = await loadMasteryServer(user.id);

  return (
    <AppShell userEmail={user.email}>
      <DojoContent
        userId={user.id}
        initialMastery={initialMastery}
        vocab={VOCAB_SEED}
        kanji={KANJI_SEED}
      />
    </AppShell>
  );
}