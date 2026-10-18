/* Regenerate the sector key-art manifest from public/sectors.
   Usage: npm run gen:sectors */
import { writeSectorManifest } from "../src/lib/sector-art.ts";

const map = await writeSectorManifest();
const count = Object.keys(map).length;
console.log(`sector art: ${count}${count ? " -> src/lib/sector-art-manifest.ts" : ""}`);
