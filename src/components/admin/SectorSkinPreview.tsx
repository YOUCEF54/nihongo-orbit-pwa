"use client";

import type { CSSProperties } from "react";

/** Live preview of a sector's skin (accent + emblem + key-art) for the admin panel. */
export default function SectorSkinPreview({
  titleAr,
  taglineAr,
  themeAr,
  accent,
  emblem,
  art,
}: {
  titleAr: string;
  taglineAr: string;
  themeAr: string;
  accent: string;
  emblem: string;
  art: string | null;
}) {
  const style: Record<string, string> = { "--sector-accent": accent };
  if (art) style["--sector-art"] = `url("${art}")`;

  return (
    <div
      data-testid="sector-skin-preview"
      className="sector-scope relative flex min-h-[5.5rem] items-center overflow-hidden rounded-xl border sector-border bg-abyss/50 p-3"
      style={style as CSSProperties}
    >
      {art ? <span aria-hidden="true" className="sector-art sector-art--fade" /> : null}
      <div className="relative flex items-center gap-3">
        <span
          aria-hidden="true"
          className="sector-emblem h-11 w-11 flex-none rounded-xl font-jp text-xl font-bold"
        >
          {emblem}
        </span>
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="lang-ar truncate text-sm font-bold text-cream">{titleAr}</span>
          <span className="lang-ar truncate text-[11px] sector-text">{themeAr}</span>
          <span className="lang-ar truncate text-[11px] text-muted">{taglineAr}</span>
        </div>
      </div>
    </div>
  );
}
