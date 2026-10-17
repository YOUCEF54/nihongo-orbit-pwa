import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin";
import { VOCAB_SEED } from "@/data/vocab.seed";
import { removeWotdImage, writeWotdImage, writeWotdManifest } from "@/lib/wotd-images";

const WORD_IDS = new Set(VOCAB_SEED.map((item) => item.id));
const MAX_BYTES = 2 * 1024 * 1024;

async function isOperator(): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return !!user && isAdmin(user.email);
}

export async function POST(request: Request) {
  if (!(await isOperator())) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const form = await request.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const wordId = String(form.get("wordId") ?? "");
  const file = form.get("file");

  if (!WORD_IDS.has(wordId)) {
    return NextResponse.json({ error: "unknown_word" }, { status: 400 });
  }
  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: "missing_file" }, { status: 400 });
  }
  if (file.size === 0 || file.size > MAX_BYTES) {
    return NextResponse.json({ error: "bad_size" }, { status: 400 });
  }
  if (file.type && file.type !== "image/webp") {
    return NextResponse.json({ error: "not_webp" }, { status: 415 });
  }

  const data = Buffer.from(await file.arrayBuffer());

  try {
    const url = await writeWotdImage(wordId, data);
    const images = await writeWotdManifest();
    return NextResponse.json({ ok: true, url, images });
  } catch {
    return NextResponse.json({ error: "readonly" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  if (!(await isOperator())) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const wordId = new URL(request.url).searchParams.get("wordId") ?? "";
  if (!WORD_IDS.has(wordId)) {
    return NextResponse.json({ error: "unknown_word" }, { status: 400 });
  }

  try {
    await removeWotdImage(wordId);
    const images = await writeWotdManifest();
    return NextResponse.json({ ok: true, images });
  } catch {
    return NextResponse.json({ error: "readonly" }, { status: 500 });
  }
}
