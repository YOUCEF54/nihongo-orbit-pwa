import type { ReactNode } from "react";

/** Shared empty/loading-fallback surface. Matches the legacy hand-rolled
    `glass-panel rounded-2xl p-8 text-center` blocks byte-for-byte, so
    swapping them in changes no pixels. */
export default function EmptyState({
  descAr,
  titleAr,
  action,
  className = "",
}: {
  descAr: string;
  titleAr?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={["glass-panel rounded-2xl p-8 text-center", className]
        .filter(Boolean)
        .join(" ")}
    >
      {titleAr ? (
        <p className="lang-ar mb-1 font-bold text-cream">{titleAr}</p>
      ) : null}
      <p className="lang-ar text-sm text-muted">{descAr}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
