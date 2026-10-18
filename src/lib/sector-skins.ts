/* ============================================================
   Sector identity — one fixed accent + one kanji sigil per sector.

   The accent is intrinsic to the sector (it does NOT follow the
   global app theme), so a given campaign always reads the same
   colour. Background key-art is admin-managed: it lives in
   `public/sectors/` and is exposed by `sector-art-manifest.ts`.

   Usage: spread `sectorStyle(id, art)` onto a wrapper, add the
   `sector-scope` class, then use the `.sector-*` helpers
   (see globals.css) anywhere inside.
   ============================================================ */
import type { CSSProperties } from "react";
import type { SectorId } from "@/types/curriculum";

export interface SectorSkin {
  /** Fixed accent hex — unique per sector. */
  accent: string;
  /** Single kanji sigil rendered in the sector emblem badge. */
  emblem: string;
}

export const SECTOR_SKINS: Record<SectorId, SectorSkin> = {
  "sector-0": { accent: "#00f0ff", emblem: "水" },
  "sector-1": { accent: "#5eead4", emblem: "文" },
  "sector-2": { accent: "#f3d184", emblem: "動" },
  "sector-3": { accent: "#a855f7", emblem: "雲" },
  "sector-4": { accent: "#ff5c8a", emblem: "音" },
  "sector-5": { accent: "#818cf8", emblem: "古" },
};

export function sectorSkin(id: SectorId): SectorSkin {
  return SECTOR_SKINS[id];
}

/** Inline CSS custom properties that scope a sector's accent + key-art. */
export function sectorStyle(id: SectorId, art?: string | null): CSSProperties {
  const accent = SECTOR_SKINS[id].accent;
  const vars: Record<string, string> = {
    "--sector-accent": accent,
    // keeps `.chamfer-border` diagonals on-brand for chamfered sector cards
    "--chamfer-edge": `color-mix(in srgb, ${accent} 42%, transparent)`,
  };
  if (art) vars["--sector-art"] = `url("${art}")`;
  return vars as CSSProperties;
}
