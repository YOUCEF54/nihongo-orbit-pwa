# Visual asset plan

Working spec for every bitmap / icon asset the app consumes. Status legend:
**✅ wired** (code is ready, art is in place) · **🟡 placeholder** (code is ready, art is
a stand-in — replace the file, keep the name) · **⬜ waiting on art** (slot exists, no file yet).

---

## 1. How to ship an asset

| Kind | Where it goes | Then |
| --- | --- | --- |
| Sector key-art | `public/sectors/<sectorId>.webp` | `npm run gen:sectors` |
| Word-of-the-day photo | `public/wotd/<wordId>.webp` | `npm run gen:wotd` |
| Offline KanjiVG strokes | `public/kanjivg/<5-hex>.svg` | `npm run gen:kanjivg` |
| Brand / PWA icons | `public/brand/…` (fixed names) | nothing — referenced directly |
| Inline icon | `src/components/icons.tsx` | add a `IconX` export |

**Always commit the file *and* the regenerated manifest.** The three
`gen:*` scripts also run automatically before `npm run dev` / `npm run build`
(`predev` / `prebuild` in `package.json`).

> ⚠️ The admin uploaders (`/admin` → word art & sector art) write with `fs` into
> `public/`. That only works where the filesystem is writable (local dev /
> self-hosted). On Vercel it fails — production art must be committed to the repo.
> Treat `/admin` as a convenience for cropping, then commit what it writes.

## 2. Ground rules

1. **Icons are inline SVG using `currentColor`.** They inherit the app theme
   (`tactical` / `hybrid` / `minimal`) *and* the per-sector accent via `color`.
   A raster or hard-coded-colour icon cannot do that.
   Contract (`src/components/icons.tsx:5-14`): `viewBox="0 0 24 24"`,
   `fill="none"`, `stroke="currentColor"`, `strokeWidth={1.8}`,
   `strokeLinecap/Join="round"`, `aria-hidden`.
2. **Smallest render is 12px** (chips use `h-3 w-3`). Prefer bold silhouettes,
   avoid detail below a 2px stroke at 24px.
3. **Dark UI only**, RTL Arabic. No text baked into art, no left-to-right
   directional metaphors.
4. **Raster art is a background wash, not a hero** (see §5) — low contrast, no faces
   at the edges, nothing important near the top.
5. **Palette** (`src/app/globals.css:39-96`):
   `void #0b0d12` · `abyss #12161f` · `raised #1a2130` · `line rgba(255,255,255,.10)`
   · `cream #f4f6fc` · `muted #9da7c0` · `faint #7e88a3` · `cyan/frequency #00f0ff`
   · `crimson/danger #ff0055` · `hazard/warn #ffd600` · `amethyst #a855f7`
   · `amber #f3d184` · `hit #34d399`.

---

## 3. Brand & PWA — 🟡 placeholder in repo

`src/app/manifest.ts` and `src/app/layout.tsx:60` now reference square icons
(the old build pointed the manifest at the 3:2 `Logo.png` and declared it 512×512,
which distorted installed-PWA icons).

| File | Size | Notes |
| --- | --- | --- |
| `public/brand/icon-192.png` | 192×192 | `purpose: "any"` |
| `public/brand/icon-512.png` | 512×512 | `purpose: "any"` |
| `public/brand/icon-maskable-512.png` | 512×512 | `purpose: "maskable"`; mark inside the centre ~66% so the OS mask can crop freely |
| `public/brand/apple-touch-icon-180.png` | 180×180 | opaque background (iOS ignores alpha) |

Current files are generated placeholders: a centre-letterboxed `Logo.png`
(1536×1024, transparent, dark-red mark) composited on `#0b0d12`.
**Replace the four files, keep the names** — no code change needed.

The auth proxy (`src/proxy.ts:30`) now lets `manifest.webmanifest` through
anonymously — without it the manifest redirects to `/login` and the app is not
installable from a cold visit. Keep it in the matcher exclusion list.

Still to decide (legacy marks that do not match each other):

| File | Current | Action |
| --- | --- | --- |
| `src/app/icon.svg` | gold rounded square, `#e8b923` | real favicon mark, or delete |
| `src/app/favicon.ico` | 256×256 | regenerate from the final mark |
| `public/Logo.png` | 1536×1024, 3:2, transparent | in-app lockup (`src/components/Logo.tsx:12`, used in the header/login) — the only brand asset the app renders as `<Image>` |

---

## 4. Currency & gauges — 🟡 glyphs wired, art optional

Two stores: **Jade** (`starlight.ts`, soft) and the **Resonance Terminal** wallet
(`resonance.ts`: Crystals / Passes / Shards). Everything renders today with
code-drawn glyphs.

| Concept | Term | Current glyph | Renders at | Consumed by |
| --- | --- | --- | --- | --- |
| Jade | اليشم | `IconJade` (`icons.tsx:127`) | 14–24px | `RewardModal.tsx`, `StarlightPanel.tsx` |
| Resonance Crystals | بلورات المدار | `IconCrystal` | 14–20px | terminal chips, `RewardModal` `crystalPayout` |
| Standard Passes | تذاكر الإشارة | `IconTicket` | 14–20px | terminal chips, `RewardModal` `passPayout` |
| Resonance Shards | شظايا الرنين | `IconShard` | 12–20px | terminal chips/history, exchange rows |
| Energy | طاقة الصفاء الذهني | `IconWave` | 16px | `EnergyPanel.tsx:57` |
| Momentum | الزخم (×0.50–×2.50) | `IconSpark` | 16px | `StarlightPanel.tsx` |
| Streak tally | سلسلة النشاط | `IconBolt` | 14–16px | `StreakPanel.tsx:39`, dashboard chips |
| Recovery Cache | مخزون التعافي | `IconShield` | 16px | `StarlightPanel.tsx` |
| Campaign complete | اكتملت الحملة | `IconTrophy` | 12–14px | `SectorNode.tsx:123`, `SectorDossier.tsx:70` |

Notes:

- **`IconJade` and `IconOrbit` are currently the same 4-point star** — the currency
  and the arcade section share a mark. Jade should read as a cut stone/gem.
- `IconCrystal` (girdle-cut gem) is built from the Lucide "gem" geometry — if Jade
  gets a real cut-stone mark, keep the two shapes distinct.
- A *filled* Jade/Energy variant would help active states (`.meter-fill`,
  active chips). Optional.
- Labels stay Arabic text — only the glyph is the asset.

---

## 5. Sector identity

### 5a. Emblems — ✅ wired as kanji glyphs

`src/lib/sector-skins.ts:23-30` is the single source of truth. Emblems render
inside `.sector-emblem` (14% accent fill, 45% accent border) at 20px
(`home-dashboard.tsx:224`) up to 44px (`SectorDossier.tsx:60`).

| Sector | Accent | Emblem | Theme |
| --- | --- | --- | --- |
| 0 ساحل الكانا | `#00f0ff` | 水 | shore |
| 1 سهول الجمل | `#5eead4` | 文 | sentences |
| 2 مدى الأفعال | `#f3d184` | 動 | verbs |
| 3 سديم المركّبات | `#a855f7` | 雲 | compounds |
| 4 حزام النغمة | `#ff5c8a` | 音 | sound |
| 5 عمق الكلاسيكيات | `#818cf8` | 古 | classics |

Optional upgrade: replace each kanji with a custom monochrome sigil (SVG,
512×512 export, must read at 20px). That changes `emblem: string` → an asset
reference plus the render sites. Only worth it if the kanji feel too generic.

### 5b. Key-art — ✅ 6 files present

`public/sectors/sector-0…5.webp`, **1280×720 webp, ≤2 MB** (the crop dialog
defaults: 16:9, 1280px wide — `src/components/admin/ImageCropDialog.tsx:28-32`).

Rendering: `cover`, `opacity: 0.42`, masked **visible at the bottom → transparent
toward the top** (`.sector-art--fade`, `globals.css:901`). So: keep it low-contrast
(it sits behind glass panels and body text), no text, detail weighted to the
bottom third, and keep the top clean.

---

## 6. Word-of-the-day photos — ⬜ 3 of 40

`public/wotd/<wordId>.webp` · **1280×720 webp, ≤2 MB** · ids `v0-001`…`v0-010`,
`v1-001`…`v1-030`.

Shipped: `v0-001`, `v1-008`, `v1-009`.
The other 35 fall back to **emoji** (`src/lib/word-of-the-day.ts:31-66`) and then
to a decorative glyph.

Displayed in a **360×220** hero (`WordOfTheDay.tsx:146`), `object-cover`, with a
black→transparent gradient over the bottom ~30% plus the glyph/reading stack
underneath. Compose with the subject in the **upper 60–70%**.

---

## 7. Activity & navigation icons — ✅ wired

Nine distinct sigils replaced the old collisions (writing/grammar/taiko all shared
marks; two listening modes shared `wave`).

| Key | Icon | Used by |
| --- | --- | --- |
| `brush` | writing brush | dojo: strokes |
| `shuffle` | crossing arrows | dojo: قطار الجمل |
| `cards` | card stack | dojo: المراجعة الإيقاعية + terminal المراجعة اليومية |
| `ear` | ear | dojo: صدى المعاني + sector unlock chip |
| `grid` | 3×3 grid | dojo: سلسلة سكتات الكانجي + terminal قاعة الكتابة |
| `headphones` | headphones | dojo: سباق السرعة الصوتي |
| `blocks` | block into slots | dojo: تركيب الجملة |
| `particles` | orbiting nucleus | dojo: مرجع الإعراب |
| `drum` | taiko drum + bachi | dojo: طبل المورا |
| `hexRing` | hexagon + hub | arcade: المعداد المداري |
| `flood` | 2×2 grid, one filled | arcade: توحيد الجذور |
| `crystal` | cut gem | dock: الرنين + terminal محطة الرنين |
| `ticket` / `shard` | torn ticket / glass chips | currency chips (resonance terminal) |
| `home` / `dojo` / `orbit` | existing | dock: الرئيسية / الدوجو / الأركيد |

Registry: `DOJO_STEPS[].icon` (`src/lib/dojo-steps.ts`), `ShellIcon` +
`TERMINAL_ROUTES` (`src/lib/shell.ts`), rendered by `ActivityBrief.tsx:18` and
`AppShell.tsx:54`. Arcade lobby cards: `src/app/(dashboard)/games/page.tsx:13-35`.

**Asset gap:** these are code-drawn. If you want hand-drawn sets, replace the SVG
bodies in `src/components/icons.tsx` one by one — the keys and wiring stay put.

---

## 8. Game-specific art — ⬜ waiting on art

| Asset | Spec | Status |
| --- | --- | --- |
| Arcade lobby cards (3) | 16:9, 1280×720 webp | the `/games` cards are text + icon only — biggest "feels finished" win per asset |
| Taiko drum face, centre + rim states | 2 × 512×512 transparent | currently CSS circles; hit flash uses `--color-hit #34d399` |
| Abacus coin + block tile | 2 × 256×256 | the 19-hex board holds radical "coins"; the block is a system tile |
| Radical tiles (5) | 256×256 each | 氵`#8cd6f5` 火`#f77563` 木`#7ce3b6` 囗`#f5d67a` 日`#cc92f5` (`src/lib/radical-flood.ts:20-26`) |
| Sector completion crest (6) | 512×512 | `RewardModal` `glyph` slot renders at 60px and is unused on the completion path |
| Resonance banner key-art (1) | 16:9, 1280×720 webp | `/resonance` banner head is text-only — same treatment as arcade lobby cards |
| Pull-reveal card back | 512×512 transparent | reveal cards currently use flat `border-line` tiles |

---

## 9. Identity, ranks & celebrations — ⬜ waiting on art

- **Operator badge** — `AppShell.tsx:129-136` shows a generic user glyph with a
  hard-coded `OPR` pill. A frame + 4–6 rank insignia would fit the fiction.
- **Arcade medals** (bronze/silver/gold) — no visual today.
- **Streak milestones** (7 / 30 / 100 / 365) — *feature work*: no achievements
  system exists yet, so this needs code before art.
- **Empty states** (`EmptyState.tsx`, `error.tsx`) — text-only today.

---

## 10. Offline data assets

### 10a. KanjiVG strokes — ✅ local-first wired, bundle empty

`src/lib/kanjivg.ts` resolves per character: **bundled copy →
localStorage cache → CDN** (`raw.githubusercontent.com`).

Drop `public/kanjivg/<5-hex>.svg` (e.g. `05c71.svg` for 山 —
`"山".codePointAt(0).toString(16).padStart(5,"0")`), run `npm run gen:kanjivg`,
commit. Source: <https://kanjivg.tagaini.net>, **CC-BY-SA 3.0** (attribution
already lives in the file header — keep it).

Highest value: the **31 kanji in the decks** (25 in sector 1, 6 in sector 2).
Without the bundle, the first view of a kanji while offline shows no strokes.

### 10b. Known gap — `hanzi-writer`

`src/components/ui/KanjiCanvas.tsx:113` instantiates `hanzi-writer` for the
tracing quiz without a `charDataLoader`, so it fetches its own stroke data from
its default CDN. That is a second, independent stroke source (and it is Chinese
glyph data, not KanjiVG). Fixing it means wiring a custom loader onto the local
bundle — worth doing once the KanjiVG bundle exists.

---

## 11. Not needed (already covered — don't produce these)

| Thing | Why not |
| --- | --- |
| Web fonts | self-hosted at build time via `next/font` (`layout.tsx:22-58`) |
| Vocabulary / sentence audio | generated by `scripts/gen-audio.mjs`; 40 vocab + 25 phrase + 5 sentence MP3s |
| Taiko SFX | synthesised with WebAudio (`src/lib/taiko-audio.ts`) |
| Grid / gradient / chamfer textures | CSS (`--chamfer-shape`, `.texture-layer`, `.foil-*`) |
| Progress rings, meters | drawn as SVG/CSS (`SectorNode.tsx:22`) |
| Per-word emoji "art" | falls back automatically (`word-of-the-day.ts:31`) |

---

## 12. Suggested order

1. **Brand icons** (§3) — replace 4 placeholder files; also pick one mark and
   retire `icon.svg` / `favicon.ico` inconsistency.
2. **Currency set** (§4) — highest touch frequency; fixes the Jade/Orbit star clash.
3. **Arcade lobby cards** (§8) — 3 images, biggest visual upgrade per asset.
4. **Word-of-the-day photos** (§6) — highest learning value; do batches of 10.
5. **KanjiVG bundle** (§10a) — unlocks true offline stroke practice.
6. **Remaining icons, drum/drum-face art, celebration crests** (§7–§9).
