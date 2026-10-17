/**
 * A Japanese reading rendered in hiragana with its romaji directly beneath it.
 * Used everywhere a reading is shown so the romanisation is always paired with
 * the kana it belongs to.
 */
interface ReadingStackProps {
  reading: string;
  romaji?: string | null;
  className?: string;
  readingClassName?: string;
  romajiClassName?: string;
  romajiTestId?: string;
}

export default function ReadingStack({
  reading,
  romaji,
  className,
  readingClassName = "font-jp text-cyan/80",
  romajiClassName = "telemetry text-xs text-muted",
  romajiTestId,
}: ReadingStackProps) {
  return (
    <span
      dir="ltr"
      className={["inline-flex flex-col items-center leading-tight", className]
        .filter(Boolean)
        .join(" ")}
    >
      <span className={readingClassName}>{reading}</span>
      {romaji ? (
        <span data-testid={romajiTestId} className={romajiClassName}>
          {romaji}
        </span>
      ) : null}
    </span>
  );
}
