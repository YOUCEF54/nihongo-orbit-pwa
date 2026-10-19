/* Regenerate the bundled KanjiVG manifest from public/kanjivg.
   Usage: npm run gen:kanjivg */
import { writeKanjivgManifest } from "../src/lib/kanjivg-local.ts";

const map = await writeKanjivgManifest();
const count = Object.keys(map).length;
console.log(
  `kanjivg bundle: ${count}${count ? " -> src/lib/kanjivg-local-manifest.ts" : ""}`,
);
