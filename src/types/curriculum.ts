import type { JLPTLevel } from "./learning";

export type SectorId = "sector-0" | "sector-1" | "sector-2" | "sector-3" | "sector-4" | "sector-5";

export type SectorAccent = "cyan" | "frequency" | "gold" | "amethyst" | "void";

export interface Sector {
  id: SectorId;
  order: number;
  jlpt: JLPTLevel | "Pre-N5";
  titleAr: string;
  taglineAr: string;
  targetKanji: number;
  targetVocab: number;
  focusAr: string;
  themeAr: string;
  accent: SectorAccent;
}