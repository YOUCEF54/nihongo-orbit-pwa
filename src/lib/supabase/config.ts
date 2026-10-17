export function supabaseUrl(): string | undefined {
  return process.env.NEXT_PUBLIC_SUPABASE_URL;
}

export function supabaseKey(): string | undefined {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseUrl() && supabaseKey());
}

const UNSAFE_KEY_MSG =
  "NEXT_PUBLIC_SUPABASE_* key must be a publishable (anon) key — never a server-only secret. Copy the publishable key from Supabase Settings > API Keys into .env.local, then restart the dev server.";

export function assertBrowserSafeKey(): void {
  const key = supabaseKey() ?? "";

  if (key.startsWith("sb_secret_")) {
    throw new Error(UNSAFE_KEY_MSG);
  }

  if (key.startsWith("eyJ")) {
    try {
      const payload: { role?: string } = JSON.parse(
        atob(key.split(".")[1] ?? ""),
      );
      if (payload.role === "service_role") {
        throw new Error(UNSAFE_KEY_MSG);
      }
    } catch (err) {
      if (err instanceof Error && err.message === UNSAFE_KEY_MSG) throw err;
    }
  }
}
