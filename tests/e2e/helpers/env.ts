/* Shared env access for e2e specs. Prefers process.env; falls back to
   .env.local so local runs need no extra setup. Never log the values. */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function readEnvFile(): Record<string, string> {
  try {
    const txt = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
    const out: Record<string, string> = {};
    for (const line of txt.split(/\r?\n/)) {
      if (!line || line.trim().startsWith("#")) continue;
      const i = line.indexOf("=");
      if (i < 0) continue;
      out[line.slice(0, i).trim()] = line
        .slice(i + 1)
        .trim()
        .replace(/^["']|["']$/g, "");
    }
    return out;
  } catch {
    return {};
  }
}

const fileEnv = readEnvFile();

function pick(key: string): string {
  const value = process.env[key] ?? fileEnv[key];
  if (!value) throw new Error(`e2e env is missing ${key}`);
  return value;
}

export const SUPABASE_URL = pick("NEXT_PUBLIC_SUPABASE_URL");
export const SUPABASE_PUBLISHABLE_KEY = pick("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
export const SUPABASE_SECRET_KEY = pick("SB_SECRET_KEY");
export const SUPABASE_REF = new URL(SUPABASE_URL).hostname.split(".")[0];
