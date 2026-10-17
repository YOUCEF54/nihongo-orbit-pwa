import { NextResponse } from "next/server";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin";
import { THEME_IDS } from "@/lib/themes";

const CONFIG_PATH = path.join(process.cwd(), "src", "lib", "theme-config.ts");

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isAdmin(user.email)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  let payload: { default?: unknown; names?: unknown };
  try {
    payload = (await request.json()) as typeof payload;
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const requestedDefault = typeof payload.default === "string" ? payload.default : "";
  const defaultId = (THEME_IDS as readonly string[]).includes(requestedDefault)
    ? requestedDefault
    : "tactical";

  const rawNames =
    payload.names && typeof payload.names === "object"
      ? (payload.names as Record<string, unknown>)
      : {};
  const names = THEME_IDS.map((id) => {
    const value = rawNames[id];
    const label = typeof value === "string" ? value.trim().slice(0, 40) : "";
    return `  ${JSON.stringify(id)}: ${JSON.stringify(label || id)},`;
  }).join("\n");

  const source = `/* ============================================================
   Editable site theme configuration.
   Managed through the admin panel (/admin). Safe to edit by hand.
   ============================================================ */

/** Theme applied when a visitor has no saved preference. */
export const THEME_DEFAULT_ID = ${JSON.stringify(defaultId)};

/** Arabic display name for each theme id. */
export const THEME_NAMES: Record<string, string> = {
${names}
};
`;

  try {
    await writeFile(CONFIG_PATH, source, "utf8");
  } catch {
    return NextResponse.json({ error: "readonly" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, default: defaultId });
}
