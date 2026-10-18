import type { IrabEntry } from "@/data/grammar.seed";

interface IrabReferenceProps {
  entries: IrabEntry[];
}

export default function IrabReference({ entries }: IrabReferenceProps) {
  return (
    <div className="screen-scroll space-y-2.5 pe-1">
      {entries.map((entry) => (
        <div
          key={entry.id}
          className="grid grid-cols-[48px_minmax(0,1fr)] items-center gap-x-4 gap-y-1.5 rounded-lg border border-frequency/25 bg-abyss/40 p-3 md:grid-cols-[56px_minmax(200px,1fr)_minmax(0,2fr)]"
        >
          <div className="flex flex-col items-center gap-1">
            <span className="font-jp text-2xl leading-none text-amber">{entry.particle}</span>
            <span className="telemetry text-[10px] text-cyan" dir="ltr">
              {entry.romaji}
            </span>
          </div>

          <div className="min-w-0 self-center">
            <span className="lang-ar block text-sm font-semibold text-cream">{entry.roleAr}</span>
            <span className="lang-ar mt-0.5 block text-xs leading-relaxed text-muted">
              {entry.functionAr}
            </span>
          </div>

          <div className="col-span-2 min-w-0 md:col-span-1">
            <div className="chamfer-border foil-overlay border border-line bg-void/60 px-3 py-2">
              <p className="font-jp text-lg leading-relaxed text-frequency" dir="ltr">
                {entry.exampleJp}
              </p>
              <p className="telemetry mt-0.5 text-xs text-cyan/70" dir="ltr">
                {entry.exampleRomaji}
              </p>
              <p className="lang-ar mt-1 text-xs text-muted">{entry.exampleAr}</p>
            </div>
            {entry.noteAr && (
              <p className="lang-ar mt-1.5 text-[11px] leading-relaxed text-faint">
                {entry.noteAr}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}