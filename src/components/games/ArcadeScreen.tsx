"use client";

import { StageViewport, useStage } from "@/components/ui";
import type { SeedVocabularyItem } from "@/lib/data";
import AstralAbacus from "./AstralAbacus";
import RadicalConfluence from "./RadicalConfluence";
import MoraTaiko from "./MoraTaiko";

/** Client shell for an arcade puzzle: owns the fullscreen stage state so the
    puzzle can be expanded to the whole viewport from its own header. */
export default function ArcadeScreen({
  game,
  userId,
  seed,
  pool = [],
}: {
  game: "abacus" | "flood" | "taiko";
  userId: string;
  seed?: number;
  pool?: SeedVocabularyItem[];
}) {
  const stage = useStage();

  return (
    <StageViewport expanded={stage.expanded} onCollapse={stage.collapse}>
      {game === "abacus" ? (
        <AstralAbacus
          userId={userId}
          isExpanded={stage.expanded}
          onToggleExpand={stage.toggle}
        />
      ) : game === "taiko" ? (
        <MoraTaiko pool={pool} userId={userId} seed={seed} />
      ) : (
        <RadicalConfluence
          userId={userId}
          seed={seed}
          isExpanded={stage.expanded}
          onToggleExpand={stage.toggle}
        />
      )}
    </StageViewport>
  );
}
