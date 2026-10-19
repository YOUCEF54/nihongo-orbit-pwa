import type { Metadata } from "next";
import { redirect } from "next/navigation";
import AppShell from "@/components/AppShell";
import { ArcadeScreen } from "@/components/games";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "المعداد المداري | تعلّم اليابانية",
  description: "دوّر حلقات السداسيات ورتّب عملات الجذور لتُركّب الكانجي من جذوره.",
};

export default async function AstralAbacusPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <AppShell userEmail={user.email} userId={user.id}>
      <div className="screen-shell mx-auto w-full max-w-3xl px-4 sm:px-6">
        <nav className="mb-2 flex items-center gap-2 text-xs" dir="rtl" aria-label="التنقل">
          <a href="/games" className="lang-ar text-faint transition hover:text-cyan">
            الأركيد
          </a>
          <span className="telemetry text-faint" dir="ltr">
            /
          </span>
          <span className="lang-ar font-bold text-cyan">المعداد المداري</span>
        </nav>
        <div className="screen-body game-canvas">
          <ArcadeScreen game="abacus" userId={user.id} />
        </div>
      </div>
    </AppShell>
  );
}
