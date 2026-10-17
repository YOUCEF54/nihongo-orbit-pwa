export interface DashboardCrumb {
  href: string;
  ar: string;
}

/** Shared breadcrumb + title block for dashboard pages (home hero stays bespoke).
    Parent controls the container width; this renders only the header. */
export default function DashboardHeader({
  titleAr,
  descAr,
  crumbs = [],
}: {
  titleAr: string;
  descAr?: string;
  crumbs?: DashboardCrumb[];
}) {
  return (
    <div className="mb-6">
      {crumbs.length > 0 && (
        <nav className="mb-3 flex items-center gap-2 text-xs" dir="rtl" aria-label="التنقل">
          {crumbs.map((crumb, index) => (
            <span key={crumb.href} className="flex items-center gap-2">
              {index > 0 && (
                <span className="telemetry text-faint" dir="ltr">
                  /
                </span>
              )}
              {index < crumbs.length - 1 ? (
                <a href={crumb.href} className="lang-ar text-faint transition hover:text-cyan">
                  {crumb.ar}
                </a>
              ) : (
                <span className="lang-ar font-bold text-cyan">{crumb.ar}</span>
              )}
            </span>
          ))}
        </nav>
      )}
      <h1 className="lang-ar font-display text-2xl font-bold text-cream">{titleAr}</h1>
      {descAr ? <p className="lang-ar mt-1 text-sm text-muted">{descAr}</p> : null}
    </div>
  );
}
