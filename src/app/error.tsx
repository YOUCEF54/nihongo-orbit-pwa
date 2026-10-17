"use client";

/** Route error boundary — friendly retry instead of a blank crash. */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center gap-4 px-6 text-center" dir="rtl">
      <div className="glass-panel w-full rounded-2xl p-8">
        <h1 className="lang-ar mt-2 text-xl font-extrabold text-cream">
          حدث خطأ غير متوقع
        </h1>
        <p className="lang-ar mt-2 text-sm leading-relaxed text-muted">
          لا تقلق — تقدمك محفوظ. حاول مجددًا.
        </p>
        {error.digest ? (
          <p className="telemetry mt-3 text-faint" dir="ltr">
            {error.digest}
          </p>
        ) : null}
        <button type="button" onClick={reset} className="btn-cyan mt-5 w-full">
          <span className="lang-ar">حاول مجددًا</span>
        </button>
      </div>
    </div>
  );
}
