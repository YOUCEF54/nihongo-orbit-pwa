/** Route loading skeleton — shell-shaped shimmer while auth/data resolves. */
export default function Loading() {
  return (
    <div className="min-h-dvh" dir="rtl" aria-busy="true" aria-label="جارٍ التحميل">
      <div className="mx-auto w-full max-w-5xl px-4 pt-6 lg:px-8">
        <div className="glass-panel mb-4 h-14 animate-pulse rounded-2xl" />
        <div className="glass-panel mb-4 h-44 animate-pulse rounded-2xl" />
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="glass-panel h-28 animate-pulse rounded-2xl" />
          <div className="glass-panel h-28 animate-pulse rounded-2xl" />
        </div>
        <p className="lang-ar mt-6 text-center text-sm text-muted">جارٍ التحميل…</p>
      </div>
    </div>
  );
}
