import { useEffect, useRef, useState } from "react";
import type { SVGStrokeGroup } from "@/data/kanji.seed";
import { resolveStrokes } from "@/lib/kanjivg";

export interface StrokeSource {
  id: string;
  character: string;
  strokes?: SVGStrokeGroup[];
}

export type StrokeSlot =
  | { status: "ready"; strokes: SVGStrokeGroup[] }
  | { status: "loading" }
  | { status: "unavailable" };

function embeddedD(node: StrokeSource): string[] {
  return node.strokes?.map((stroke) => stroke.d) ?? [];
}

function initialSlot(node: StrokeSource): StrokeSlot {
  if (embeddedD(node).length > 0) {
    return { status: "ready", strokes: node.strokes ?? [] };
  }
  return { status: "loading" };
}

/**
 * Resolves KanjiVG stroke data per seeded node — embedded strokes win,
 * then local cache, then CDN fetch. Deterministic initial state keeps
 * server/client rendering identical (no hydration mismatch).
 */
export function useKanjivgStrokes(nodes: StrokeSource[]) {
  const [slots, setSlots] = useState<Record<string, StrokeSlot>>(() => {
    const initial: Record<string, StrokeSlot> = {};
    for (const node of nodes) initial[node.id] = initialSlot(node);
    return initial;
  });
  const requested = useRef<Set<string>>(new Set());

  const loadNode = async (node: StrokeSource) => {
    if (requested.current.has(node.id)) return;
    requested.current.add(node.id);
    try {
      const paths = await resolveStrokes(node.character, embeddedD(node));
      setSlots((prev) => ({
        ...prev,
        [node.id]: {
          status: "ready",
          strokes: paths.map((d) => ({ d })),
        },
      }));
    } catch {
      setSlots((prev) => ({
        ...prev,
        [node.id]: { status: "unavailable" },
      }));
    }
  };

  useEffect(() => {
    for (const node of nodes) {
      if (embeddedD(node).length === 0) {
        void queueMicrotask(() => void loadNode(node));
      }
    }
  }, [nodes]);

  const retry = (id: string) => {
    const node = nodes.find((entry) => entry.id === id);
    if (!node) return;
    requested.current.delete(id);
    setSlots((prev) => ({ ...prev, [id]: { status: "loading" } }));
    void loadNode(node);
  };

  return { slots, retry };
}