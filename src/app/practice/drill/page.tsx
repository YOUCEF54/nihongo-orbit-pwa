import type { Metadata } from "next";
import { redirect } from "next/navigation";
import AppShell from "@/components/AppShell";
import DojoContent from "@/components/dojo-content";
import { createClient } from "@/lib/supabase/server";
import { loadMasteryServer } from "@/lib/mastery-server";
import { loadResonanceServer } from "@/lib/resonance-server";
import { VOCAB_SEED } from "@/data/vocab.seed";
import { KANJI_SEED } from "@/data/kanji.seed";

export const metadata: Metadata = {
  title: "غرفة التدريبات | تعلّم اليابانية",
  description:
    "تدريبات القطاع النشط: سكتات الكانجي، قطار الجمل، المراجعة المتباعدة، صدى المعاني، التركيب والإيقاع.",
};

export default async function DrillPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const initialMastery = await loadMasteryServer(user.id);
  const initialWallet = await loadResonanceServer(user.id);

  return (
    <AppShell userEmail={user.email} userId={user.id} initialWallet={initialWallet}>
      <DojoContent
        userId={user.id}
        initialMastery={initialMastery}
        vocab={VOCAB_SEED}
        kanji={KANJI_SEED}
      />
    </AppShell>
  );
}
