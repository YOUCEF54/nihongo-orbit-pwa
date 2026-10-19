import type { Metadata } from "next";
import { redirect } from "next/navigation";
import AppShell from "@/components/AppShell";
import { ArcadeScreen } from "@/components/games";
import { createClient } from "@/lib/supabase/server";
import { loadResonanceServer } from "@/lib/resonance-server";

export const metadata: Metadata = {
  title: "توحيد الجذور | تعلّم اليابانية",
  description: "اغمر مصفوفة الجذور ١٠×١٠ بجذرٍ واحد قبل نفاد دورات التزامن.",
};

export default async function RadicalConfluencePage({
  searchParams,
}: {
  searchParams: Promise<{ seed?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const params = await searchParams;
  const parsed = params.seed === undefined ? undefined : Number.parseInt(params.seed, 10);
  const seed = parsed !== undefined && Number.isFinite(parsed) ? parsed : undefined;
  const initialWallet = await loadResonanceServer(user.id);

  return (
    <AppShell userEmail={user.email} userId={user.id} initialWallet={initialWallet}>
      <div className="screen-shell mx-auto w-full max-w-3xl px-4 sm:px-6">
        <nav className="mb-2 flex items-center gap-2 text-xs" dir="rtl" aria-label="التنقل">
          <a href="/games" className="lang-ar text-faint transition hover:text-cyan">
            الأركيد
          </a>
          <span className="telemetry text-faint" dir="ltr">
            /
          </span>
          <span className="lang-ar font-bold text-cyan">توحيد الجذور</span>
        </nav>
        <div className="screen-body game-canvas">
          <ArcadeScreen game="flood" userId={user.id} seed={seed} />
        </div>
      </div>
    </AppShell>
  );
}
