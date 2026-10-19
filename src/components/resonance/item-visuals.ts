import type { ElementType } from "react";
import type { ItemDef, ItemIconKey, Rarity } from "@/lib/items";
import {
  IconGear,
  IconShard,
  IconShield,
  IconSpark,
  IconTrophy,
  IconWave,
} from "@/components/icons";

export const ITEM_ICON: Record<ItemIconKey, ElementType> = {
  theme: IconGear,
  spark: IconSpark,
  shield: IconShield,
  energy: IconWave,
  cache: IconShield,
  dust: IconShard,
  title: IconTrophy,
};

export const RARITY_COLOR: Record<Rarity, string> = {
  3: "var(--color-muted)",
  4: "var(--color-amethyst)",
  5: "var(--color-amber)",
};

export const RARITY_STARS: Record<Rarity, string> = {
  3: "★★★",
  4: "★★★★",
  5: "★★★★★",
};

export const KIND_LABEL_AR: Record<ItemDef["kind"], string> = {
  theme: "سمة",
  style: "نمط بطاقة",
  title: "لقب",
  consumable: "شحنة",
};

export function itemIcon(item: ItemDef): ElementType {
  return ITEM_ICON[item.icon] ?? IconSpark;
}
