import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { assertBrowserSafeKey, supabaseKey, supabaseUrl } from "./config";

export function createClient(): SupabaseClient {
  assertBrowserSafeKey();
  return createBrowserClient(supabaseUrl()!, supabaseKey()!);
}
