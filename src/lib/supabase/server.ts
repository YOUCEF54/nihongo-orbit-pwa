import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { assertBrowserSafeKey, supabaseKey, supabaseUrl } from "./config";

export async function createClient(): Promise<SupabaseClient> {
  assertBrowserSafeKey();
  const cookieStore = await cookies();

  return createServerClient(
    supabaseUrl()!,
    supabaseKey()!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Server Components cannot mutate cookies; the proxy refreshes sessions.
          }
        },
      },
    },
  );
}
