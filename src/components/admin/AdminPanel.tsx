"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ReadingStack } from "@/components/ui";
import ImageCropDialog from "@/components/admin/ImageCropDialog";
import SectorSkinPreview from "@/components/admin/SectorSkinPreview";

interface AdminTheme {
  id: string;
  ar: string;
  swatch: string;
}

interface AdminWord {
  id: string;
  japaneseText: string;
  furigana: string;
  romaji: string;
  meaning: string;
  sector: string;
  art: string | null;
}

interface AdminSector {
  id: string;
  order: number;
  titleAr: string;
  taglineAr: string;
  themeAr: string;
  accent: string;
  emblem: string;
}

interface Props {
  themes: AdminTheme[];
  defaultId: string;
  names: Record<string, string>;
  words: AdminWord[];
  images: Record<string, string>;
  /** Word shown on the home dashboard today — pinned first + highlighted. */
  todayId: string;
  sectors: AdminSector[];
  sectorArt: Record<string, string>;
}

type CropTarget = { kind: "word" | "sector"; id: string; file: File; url: string };

const ERROR_AR: Record<string, string> = {
  forbidden: "غير مصرّح بالوصول",
  readonly: "تعذّر الكتابة على نظام الملفات — شغّل التطبيق محليًا ثم ارفع التغييرات.",
  bad_size: "حجم الصورة كبير جدًا (الحد ٢ ميغابايت).",
  not_webp: "تعذّر تحويل الصورة إلى صيغة الويب.",
  unknown_word: "كلمة غير معروفة.",
  unknown_sector: "قطاع غير معروف.",
  missing_file: "لم يتم اختيار صورة.",
  bad_request: "طلب غير صالح.",
};

function message(code: string): string {
  return ERROR_AR[code] ?? "حدث خطأ غير متوقّع.";
}

export default function AdminPanel({
  themes,
  defaultId,
  names,
  words,
  images,
  todayId,
  sectors,
  sectorArt,
}: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<"themes" | "words" | "sectors">("themes");

  const [defaultTheme, setDefaultTheme] = useState(defaultId);
  const [nameState, setNameState] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const theme of themes) initial[theme.id] = names[theme.id] ?? theme.ar;
    return initial;
  });
  const [themeStatus, setThemeStatus] = useState<"idle" | "saving" | "saved" | "error">(
    "idle",
  );
  const [themeError, setThemeError] = useState<string | null>(null);

  const [imageMap, setImageMap] = useState<Record<string, string>>(images);
  const [stamp, setStamp] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [wordError, setWordError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [crop, setCrop] = useState<CropTarget | null>(null);

  const [sectorImages, setSectorImages] = useState<Record<string, string>>(sectorArt);
  const [sectorBusy, setSectorBusy] = useState<string | null>(null);
  const [sectorError, setSectorError] = useState<string | null>(null);

  const openCrop = (kind: CropTarget["kind"], id: string, file: File) => {
    const url = URL.createObjectURL(file);
    setCrop((prev) => {
      if (prev) URL.revokeObjectURL(prev.url);
      return { kind, id, file, url };
    });
  };

  const closeCrop = () => {
    setCrop((prev) => {
      if (prev) URL.revokeObjectURL(prev.url);
      return null;
    });
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? words.filter((word) =>
          [word.id, word.japaneseText, word.romaji, word.meaning].some((field) =>
            field.toLowerCase().includes(q),
          ),
        )
      : words.slice();
    const index = list.findIndex((word) => word.id === todayId);
    if (index > 0) {
      const [today] = list.splice(index, 1);
      list.unshift(today);
    }
    return list;
  }, [words, query, todayId]);

  const saveThemes = async () => {
    setThemeStatus("saving");
    setThemeError(null);
    try {
      const res = await fetch("/api/admin/theme", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ default: defaultTheme, names: nameState }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(body.error ?? "bad_request");
      setThemeStatus("saved");
      router.refresh();
    } catch (error) {
      setThemeStatus("error");
      setThemeError(message(error instanceof Error ? error.message : ""));
    }
  };

  const uploadBlob = async (id: string, blob: Blob) => {
    setBusy(id);
    setWordError(null);
    try {
      const form = new FormData();
      form.append("wordId", id);
      form.append("file", blob, `${id}.webp`);
      const res = await fetch("/api/admin/wotd-image", { method: "POST", body: form });
      const body = (await res.json().catch(() => ({}))) as {
        error?: string;
        images?: Record<string, string>;
      };
      if (!res.ok) throw new Error(body.error ?? "bad_request");
      setImageMap(body.images ?? imageMap);
      setStamp((prev) => ({ ...prev, [id]: Date.now() }));
    } catch (error) {
      setWordError(message(error instanceof Error ? error.message : ""));
    } finally {
      setBusy(null);
    }
  };

  const confirmCrop = (blob: Blob) => {
    const target = crop;
    closeCrop();
    if (!target) return;
    if (target.kind === "sector") void uploadSector(target.id, blob);
    else void uploadBlob(target.id, blob);
  };

  const remove = async (id: string) => {
    setBusy(id);
    setWordError(null);
    try {
      const res = await fetch(
        `/api/admin/wotd-image?wordId=${encodeURIComponent(id)}`,
        { method: "DELETE" },
      );
      const body = (await res.json().catch(() => ({}))) as {
        error?: string;
        images?: Record<string, string>;
      };
      if (!res.ok) throw new Error(body.error ?? "bad_request");
      setImageMap(body.images ?? imageMap);
    } catch (error) {
      setWordError(message(error instanceof Error ? error.message : ""));
    } finally {
      setBusy(null);
    }
  };

  const uploadSector = async (id: string, blob: Blob) => {
    setSectorBusy(id);
    setSectorError(null);
    try {
      const form = new FormData();
      form.append("sectorId", id);
      form.append("file", blob, `${id}.webp`);
      const res = await fetch("/api/admin/sector-art", { method: "POST", body: form });
      const body = (await res.json().catch(() => ({}))) as {
        error?: string;
        images?: Record<string, string>;
      };
      if (!res.ok) throw new Error(body.error ?? "bad_request");
      setSectorImages(body.images ?? sectorImages);
      setStamp((prev) => ({ ...prev, [id]: Date.now() }));
    } catch (error) {
      setSectorError(message(error instanceof Error ? error.message : ""));
    } finally {
      setSectorBusy(null);
    }
  };

  const removeSector = async (id: string) => {
    setSectorBusy(id);
    setSectorError(null);
    try {
      const res = await fetch(
        `/api/admin/sector-art?sectorId=${encodeURIComponent(id)}`,
        { method: "DELETE" },
      );
      const body = (await res.json().catch(() => ({}))) as {
        error?: string;
        images?: Record<string, string>;
      };
      if (!res.ok) throw new Error(body.error ?? "bad_request");
      setSectorImages(body.images ?? sectorImages);
    } catch (error) {
      setSectorError(message(error instanceof Error ? error.message : ""));
    } finally {
      setSectorBusy(null);
    }
  };

  const covered = words.filter((word) => imageMap[word.id]).length;
  const coveredSectors = sectors.filter((sector) => sectorImages[sector.id]).length;

  return (
    <div>
      <div className="mb-5 flex gap-2" dir="rtl" role="tablist" aria-label="أقسام اللوحة">
        <button
          type="button"
          role="tab"
          data-testid="admin-tab-themes"
          aria-selected={tab === "themes"}
          onClick={() => setTab("themes")}
          className={`rounded-full border px-4 py-2 text-sm font-bold transition ${
            tab === "themes"
              ? "border-cyan/50 bg-cyan/10 text-cyan"
              : "border-line text-muted hover:text-cream"
          }`}
        >
          السمات
        </button>
        <button
          type="button"
          role="tab"
          data-testid="admin-tab-words"
          aria-selected={tab === "words"}
          onClick={() => setTab("words")}
          className={`rounded-full border px-4 py-2 text-sm font-bold transition ${
            tab === "words"
              ? "border-cyan/50 bg-cyan/10 text-cyan"
              : "border-line text-muted hover:text-cream"
          }`}
        >
          صور كلمة اليوم
        </button>
        <button
          type="button"
          role="tab"
          data-testid="admin-tab-sectors"
          aria-selected={tab === "sectors"}
          onClick={() => setTab("sectors")}
          className={`rounded-full border px-4 py-2 text-sm font-bold transition ${
            tab === "sectors"
              ? "border-cyan/50 bg-cyan/10 text-cyan"
              : "border-line text-muted hover:text-cream"
          }`}
        >
          قطاعات
        </button>
      </div>

      {tab === "themes" ? (
        <section data-testid="admin-themes" className="panel">
          <div className="panel-body space-y-4">
            <p className="lang-ar text-sm text-muted">
              اختر السمة الافتراضية وحرّر اسم كل سمة كما يظهر في الزر العلوي.
            </p>

            <div className="space-y-3">
              {themes.map((theme) => (
                <div
                  key={theme.id}
                  className="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-void/40 p-3"
                >
                  <label className="flex flex-none items-center gap-2">
                    <input
                      type="radio"
                      name="theme-default"
                      data-testid={`admin-theme-default-${theme.id}`}
                      checked={defaultTheme === theme.id}
                      onChange={() => {
                        setDefaultTheme(theme.id);
                        setThemeStatus("idle");
                      }}
                      className="accent-cyan"
                    />
                    <span
                      className="h-3 w-3 rounded-full shadow-[0_0_8px_currentColor]"
                      style={{ backgroundColor: theme.swatch, color: theme.swatch }}
                    />
                  </label>
                  <span className="telemetry w-14 text-xs text-faint" dir="ltr">
                    {theme.id}
                  </span>
                  <input
                    type="text"
                    data-testid={`admin-theme-name-${theme.id}`}
                    value={nameState[theme.id] ?? ""}
                    onChange={(event) => {
                      setNameState((prev) => ({ ...prev, [theme.id]: event.target.value }));
                      setThemeStatus("idle");
                    }}
                    maxLength={40}
                    className="lang-ar min-w-0 flex-1 rounded-lg border border-line bg-abyss/60 px-3 py-2 text-sm text-cream outline-none focus:border-cyan/60"
                  />
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                data-testid="admin-theme-save"
                onClick={saveThemes}
                disabled={themeStatus === "saving"}
                className="btn-cyan disabled:opacity-50"
              >
                <span className="lang-ar">حفظ الإعدادات</span>
              </button>
              <span data-testid="admin-theme-status" className="lang-ar text-xs">
                {themeStatus === "saved" && <span className="text-success">تم الحفظ ✓</span>}
                {themeStatus === "saving" && <span className="text-muted">جارٍ الحفظ…</span>}
                {themeStatus === "error" && (
                  <span className="text-danger">{themeError}</span>
                )}
              </span>
            </div>
          </div>
        </section>
      ) : tab === "words" ? (
        <section data-testid="admin-words">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <input
              type="search"
              data-testid="admin-words-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="ابحث بالكلمة أو المعنى أو المعرّف…"
              className="lang-ar w-full max-w-xs rounded-lg border border-line bg-abyss/60 px-3 py-2 text-sm text-cream outline-none focus:border-cyan/60"
            />
            <span className="telemetry text-xs text-faint" dir="ltr">
              {covered}/{words.length} IMG
            </span>
          </div>

          {wordError ? (
            <p data-testid="admin-words-error" className="lang-ar mb-3 text-sm text-danger">
              {wordError}
            </p>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((word) => {
              const url = imageMap[word.id];
              const isBusy = busy === word.id;
              const isToday = word.id === todayId;
              return (
                <div
                  key={word.id}
                  data-testid={`wotd-card-${word.id}`}
                  data-today={isToday ? "true" : "false"}
                  className={`panel overflow-hidden ${
                    isToday ? "border-amber/60 ring-2 ring-amber/50" : ""
                  }`}
                >
                  <div className="relative flex h-36 items-center justify-center overflow-hidden bg-gradient-to-br from-cyan/10 to-transparent">
                    {isToday ? (
                      <span
                        data-testid="wotd-today-badge"
                        className="lang-ar absolute start-3 top-3 z-10 rounded-full border border-amber/60 bg-void/70 px-2.5 py-1 text-[10px] font-bold text-amber backdrop-blur-md"
                      >
                        كلمة اليوم
                      </span>
                    ) : null}
                    {url ? (
                      <Image
                        key={`${word.id}-${stamp[word.id] ?? 0}`}
                        src={`${url}?v=${stamp[word.id] ?? 0}`}
                        alt={word.meaning}
                        width={320}
                        height={208}
                        unoptimized
                        data-testid={`wotd-preview-${word.id}`}
                        className="h-36 w-full object-cover"
                      />
                    ) : word.art ? (
                      <span
                        data-testid={`wotd-preview-${word.id}`}
                        role="img"
                        aria-label={word.meaning}
                        className="text-5xl"
                      >
                        {word.art}
                      </span>
                    ) : (
                      <span
                        data-testid={`wotd-preview-${word.id}`}
                        className="font-jp text-5xl text-cyan/40"
                      >
                        {word.japaneseText}
                      </span>
                    )}
                  </div>

                  <div className="panel-body space-y-2">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="font-jp text-xl font-bold text-cream" dir="ltr">
                        {word.japaneseText}
                      </span>
                      <span className="telemetry text-[10px] text-faint" dir="ltr">
                        {word.id}
                      </span>
                    </div>
                    <p className="lang-ar text-sm font-bold text-cream">{word.meaning}</p>
                    <div className="flex items-center justify-between gap-2">
                      <ReadingStack
                        reading={word.furigana}
                        romaji={word.romaji}
                        readingClassName="font-jp text-[11px] text-cyan/80"
                        romajiClassName="telemetry text-[10px] text-faint"
                      />
                      <span className="lang-ar text-[11px] text-muted">{word.sector}</span>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <label
                        data-testid={`wotd-upload-${word.id}`}
                        className={`btn-cyan cursor-pointer text-xs ${
                          isBusy ? "pointer-events-none opacity-50" : ""
                        }`}
                      >
                        <span className="lang-ar">
                          {isBusy ? "جارٍ الرفع…" : url ? "تغيير الصورة" : "رفع صورة"}
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(event) => {
                            const file = event.target.files?.[0];
                            event.target.value = "";
                            if (file) {
                              openCrop("word", word.id, file);
                            }
                          }}
                        />
                      </label>
                      {url ? (
                        <button
                          type="button"
                          data-testid={`wotd-remove-${word.id}`}
                          onClick={() => void remove(word.id)}
                          disabled={isBusy}
                          className="btn-ghost text-xs disabled:opacity-50"
                        >
                          <span className="lang-ar">إزالة</span>
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ) : (
        <section data-testid="admin-sectors">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <p className="lang-ar max-w-md text-xs leading-relaxed text-muted">
              امنح كل قطاع صورة خلفية خاصة به. اللون والرمز يتبعان هوية القطاع الثابتة، وتظهر الصورة
              كخلفية في بطاقة الحملة وملفها ورأس غرفة التدريبات.
            </p>
            <span className="telemetry text-xs text-faint" dir="ltr">
              {coveredSectors}/{sectors.length} IMG
            </span>
          </div>

          {sectorError ? (
            <p data-testid="admin-sectors-error" className="lang-ar mb-3 text-sm text-danger">
              {sectorError}
            </p>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            {sectors.map((sector) => {
              const url = sectorImages[sector.id];
              const isBusy = sectorBusy === sector.id;
              return (
                <div
                  key={sector.id}
                  data-testid={`sector-art-card-${sector.id}`}
                  className="panel"
                >
                  <div className="panel-body space-y-3">
                    <SectorSkinPreview
                      titleAr={sector.titleAr}
                      taglineAr={sector.taglineAr}
                      themeAr={sector.themeAr}
                      accent={sector.accent}
                      emblem={sector.emblem}
                      art={url ? `${url}?v=${stamp[sector.id] ?? 0}` : null}
                    />
                    <div className="flex items-center gap-2">
                      <label
                        data-testid={`sector-upload-${sector.id}`}
                        className={`btn-cyan cursor-pointer text-xs ${
                          isBusy ? "pointer-events-none opacity-50" : ""
                        }`}
                      >
                        <span className="lang-ar">
                          {isBusy ? "جارٍ الرفع…" : url ? "تغيير الصورة" : "رفع صورة"}
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(event) => {
                            const file = event.target.files?.[0];
                            event.target.value = "";
                            if (file) openCrop("sector", sector.id, file);
                          }}
                        />
                      </label>
                      {url ? (
                        <button
                          type="button"
                          data-testid={`sector-remove-${sector.id}`}
                          onClick={() => void removeSector(sector.id)}
                          disabled={isBusy}
                          className="btn-ghost text-xs disabled:opacity-50"
                        >
                          <span className="lang-ar">إزالة</span>
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {crop ? (
        <ImageCropDialog
          src={crop.url}
          busy={crop.kind === "sector" ? sectorBusy === crop.id : busy === crop.id}
          onCancel={closeCrop}
          onConfirm={confirmCrop}
        />
      ) : null}
    </div>
  );
}
