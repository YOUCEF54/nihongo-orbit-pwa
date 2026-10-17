import type { Metadata } from "next";
import { redirect } from "next/navigation";
import AppShell from "@/components/AppShell";
import { ArcadeScreen } from "@/components/games";
import { createClient } from "@/lib/supabase/server";
import { loadMasteryServer } from "@/lib/mastery-server";
import { VOCAB_SEED } from "@/data/vocab.seed";
import { seenVocab } from "@/lib/game-access";

export const metadata: Metadata = {
  title: "طبل المورا | تعلّم اليابانية",
  description: "اضرب المركز للنغمة العالية والحافة للمنخفضة على إيقاع المورا.",
};

export default async function MoraTaikoPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const mastery = await loadMasteryServer(user.id);
  const pool = seenVocab(VOCAB_SEED, mastery);

  return (
    <AppShell userEmail={user.email}>
      <div className="screen-shell mx-auto w-full max-w-3xl px-4 sm:px-6">
        <nav className="mb-2 flex items-center gap-2 text-xs" dir="rtl" aria-label="التنقل">
          <a href="/games" className="lang-ar text-faint transition hover:text-cyan">
            الأركيد
          </a>
          <span className="telemetry text-faint" dir="ltr">
            /
          </span>
          <span className="lang-ar font-bold text-cyan">طبل المورا</span>
        </nav>
        <div className="screen-body game-canvas">
          <ArcadeScreen game="taiko" userId={user.id} pool={pool} />
        </div>
      </div>
    </AppShell>
  );
}
