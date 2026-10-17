"use client";

import { useState } from "react";

export type GrammarTag =
  | "subject"
  | "object"
  | "verb"
  | "particle"
  | "adverb"
  | "modifier";

export interface GrammarToken {
  surface: string;
  reading?: string;
  tag: GrammarTag;
  gloss?: string;
  note?: string;
}

interface GrammarParserProps {
  tokens: GrammarToken[];
  className?: string;
}

const TAG_META: Record<GrammarTag, { ar: string; cls: string; dot: string }> = {
  subject: { ar: "فاعل", cls: "text-cyan border-cyan/50 bg-cyan/10", dot: "bg-cyan" },
  object: { ar: "مفعول به", cls: "text-amethyst border-amethyst/50 bg-amethyst/10", dot: "bg-amethyst" },
  verb: { ar: "فعل", cls: "text-crimson border-crimson/50 bg-crimson/10", dot: "bg-crimson" },
  particle: { ar: "أداة", cls: "text-hazard border-hazard/50 bg-hazard/10", dot: "bg-hazard" },
  adverb: { ar: "حال", cls: "text-cream border-line bg-void/60", dot: "bg-cream" },
  modifier: { ar: "صِفة", cls: "text-muted border-line bg-void/60", dot: "bg-muted" },
};

export default function GrammarParser({ tokens, className }: GrammarParserProps) {
  const [selected, setSelected] = useState<number | null>(null);
  const active = selected === null ? null : tokens[selected];

  return (
    <div className={["glass-panel rounded-2xl p-5", className].filter(Boolean).join(" ")}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <span className="panel-title lang-ar text-sm">تحليل الجملة</span>
        <div className="flex flex-wrap items-center gap-3" dir="rtl">
          {(Object.keys(TAG_META) as GrammarTag[]).map((tag) => (
            <span key={tag} className="flex items-center gap-1.5">
              <span className={`inline-block h-2 w-2 rounded-full ${TAG_META[tag].dot}`} />
              <span className="lang-ar text-[11px] text-muted">{TAG_META[tag].ar}</span>
            </span>
          ))}
        </div>
      </div>

      <div
        dir="ltr"
        className="flex flex-wrap items-end gap-2 rounded-xl border border-line bg-void/40 p-4"
      >
        {tokens.map((token, index) => (
          <button
            key={`${token.surface}-${index}`}
            type="button"
            onClick={() => setSelected((prev) => (prev === index ? null : index))}
            className={[
              "flex flex-col items-center gap-1 rounded-lg border px-3 py-2 transition",
              TAG_META[token.tag].cls,
              selected === index ? "ring-2 ring-cyan/60" : "hover:-translate-y-0.5",
            ].join(" ")}
          >
            <ruby className="ruby-jp font-jp text-2xl leading-none">
              {token.surface}
              {token.reading && <rt>{token.reading}</rt>}
            </ruby>
            <span className="text-[10px] uppercase tracking-wide opacity-70">
              {TAG_META[token.tag].ar}
            </span>
          </button>
        ))}
      </div>

      <div
        dir="rtl"
        lang="ar"
        className="lang-ar mt-4 min-h-[64px] rounded-xl border border-line bg-abyss/70 p-3 text-sm"
      >
        {active ? (
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="font-jp text-lg text-cream" dir="ltr">
                {active.surface}
              </span>
              <span className="chip is-cyan">
                <span>{TAG_META[active.tag].ar}</span>
              </span>
            </div>
            {active.gloss && <p className="text-cyan">{active.gloss}</p>}
            {active.note && <p className="text-muted">{active.note}</p>}
          </div>
        ) : (
          <p className="text-faint">اضغط على أي كلمة لعرض إعرابها وشرحها.</p>
        )}
      </div>
    </div>
  );
}
