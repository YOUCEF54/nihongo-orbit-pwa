import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  assertBrowserSafeKey,
  isSupabaseConfigured,
  supabaseKey,
  supabaseUrl,
} from "./config";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  assertBrowserSafeKey();

  if (!isSupabaseConfigured()) {
    return { user: null, response };
  }

  const supabase = createServerClient(
    supabaseUrl()!,
    supabaseKey()!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { session },
  } = await supabase.auth.getSession();

  return { user: session?.user ?? null, response };
}
