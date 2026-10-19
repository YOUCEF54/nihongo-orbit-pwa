/* Throwaway-user lifecycle for e2e specs: admin create → password grant →
   browser cookie; delete on teardown. */
import type { BrowserContext } from "@playwright/test";
import {
  SUPABASE_PUBLISHABLE_KEY,
  SUPABASE_REF,
  SUPABASE_SECRET_KEY,
  SUPABASE_URL,
} from "./env";

export interface TestSession {
  userId: string;
  email: string;
  password: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  user: Record<string, unknown>;
}

export function adminHeaders(): Record<string, string> {
  return {
    apikey: SUPABASE_SECRET_KEY,
    Authorization: `Bearer ${SUPABASE_SECRET_KEY}`,
    "Content-Type": "application/json",
  };
}

export async function createTestUser(prefix: string): Promise<TestSession> {
  const email = `${prefix}-${Date.now()}@example.com`;
  const password = "e2e-Passw0rd!23";

  const created = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: "POST",
    headers: adminHeaders(),
    body: JSON.stringify({ email, password, email_confirm: true }),
  });
  if (!created.ok) throw new Error(`create user ${created.status} ${await created.text()}`);
  const userId = ((await created.json()) as { id: string }).id;

  const signIn = (await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  }).then((r) => r.json())) as {
    access_token: string;
    refresh_token: string;
    expires_at: number;
    user: Record<string, unknown>;
  };
  if (!signIn.access_token) throw new Error("password grant failed");

  return {
    userId,
    email,
    password,
    accessToken: signIn.access_token,
    refreshToken: signIn.refresh_token,
    expiresAt: signIn.expires_at,
    user: signIn.user,
  };
}

export async function deleteTestUser(userId: string): Promise<void> {
  try {
    await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
      method: "DELETE",
      headers: adminHeaders(),
    });
  } catch {
    // teardown is best-effort
  }
}

export async function authenticateContext(
  context: BrowserContext,
  session: TestSession,
): Promise<void> {
  await context.addCookies([
    {
      name: `sb-${SUPABASE_REF}-auth-token`,
      domain: "localhost",
      path: "/",
      value: JSON.stringify({
        access_token: session.accessToken,
        refresh_token: session.refreshToken,
        expires_at: session.expiresAt,
        token_type: "bearer",
        user: session.user,
      }),
    },
  ]);
}
