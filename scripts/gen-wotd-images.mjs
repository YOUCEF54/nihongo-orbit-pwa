/* Regenerate the word-of-the-day image manifest from public/wotd.
   Usage: npm run gen:wotd */
import { writeWotdManifest } from "../src/lib/wotd-images.ts";

const map = await writeWotdManifest();
const count = Object.keys(map).length;
console.log(`wotd images: ${count}${count ? " -> src/lib/wotd-image-manifest.ts" : ""}`);
