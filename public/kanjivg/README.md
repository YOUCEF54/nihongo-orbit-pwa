KanjiVG stroke files for fully-offline stroke practice.
Name each file after the 5-digit hex codepoint of the kanji, e.g. `05c71.svg` for 山
(`"山".codePointAt(0).toString(16).padStart(5, "0")`). Source: https://kanjivg.tagaini.net
(KanjiVG © Ulrich Apel, CC-BY-SA 3.0 — keep the attribution in `src/lib/kanjivg.ts`).
Run `npm run gen:kanjivg` to refresh the manifest after adding files, then commit both.
