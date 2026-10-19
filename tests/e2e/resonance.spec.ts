/* Resonance terminal against the server-backed wallet (Phase E):
   hydration, pulls through resonance_apply_pull, pity invariants,
   equip/consume/redeem through RPCs. Pull outcomes are random
   (server-side secure RNG), so assertions are DB invariants. */
import { expect, test } from "@playwright/test";
import { authenticateContext, createTestUser, deleteTestUser, type TestSession } from "./helpers/auth";
import {
  expectedShardsFromPulls,
  grantOwned,
  readOwned,
  readPity,
  readPulls,
  readWallet,
  seedWallet,
} from "./helpers/data";

const SEED_WALLET = { crystals: 25, passes: 25, shards: 150, pass_progress: 4 };
const SEED_OWNED = {
  "theme-tactical": 1,
  "title-explorer": 1,
  "title-letter-lord": 1,
  "consumable-energy": 2,
};

test.describe("resonance terminal (server-backed)", () => {
  let session: TestSession;
  // The stale mirror must be visibly replaced by the server wallet.
  const staleMirror = {
    version: 1,
    crystals: 999,
    passes: 999,
    shards: 999,
    passProgress: 9,
    equippedTitle: "",
    pity: {},
    owned: {},
    history: [],
    updatedAt: 0,
  };

  test.beforeAll(async () => {
    session = await createTestUser("e2e-resonance");
    await seedWallet(session.userId, SEED_WALLET);
    await grantOwned(session.userId, SEED_OWNED);
  });

  test.afterAll(async () => {
    await deleteTestUser(session.userId);
  });

  test("wallet economics, pulls, pity, equip, exchange", async ({ browser }, testInfo) => {
    const walletKey = `learnjp:resonance:${session.userId}`;
    const pageErrors: string[] = [];

    const context = await browser.newContext({ viewport: { width: 1366, height: 950 } });
    await authenticateContext(context, session);
    await context.addInitScript(
      ({ key, value }) => {
        try {
          localStorage.setItem(key, JSON.stringify(value));
        } catch {
          // storage unavailable — hydration still runs
        }
      },
      { key: walletKey, value: staleMirror },
    );
    const app = await context.newPage();
    app.on("pageerror", (error) => pageErrors.push(String(error)));

    const readMirror = () =>
      app.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? "null"), walletKey);

    const hydratedClick = async (testId: string) => {
      await app.waitForFunction(
        (id) => {
          const button = document.querySelector(`[data-testid="${id}"]`) as HTMLButtonElement | null;
          return Boolean(
            button && !button.disabled && Object.keys(button).some((k) => k.startsWith("__reactProps")),
          );
        },
        testId,
        { timeout: 20_000 },
      );
      // React replays pre-hydration clicks late in dev — settle first.
      await app.waitForTimeout(2500);
      await app.getByTestId(testId).click();
    };

    const closeReveal = async () => {
      await app.getByRole("button", { name: "تم" }).click();
      await app.locator(".reward-backdrop").waitFor({ state: "detached", timeout: 10_000 });
    };

    await test.step("hydrates the mirror from the server wallet", async () => {
      await app.goto("/resonance");
      await app.waitForLoadState("networkidle");
      await app.getByTestId("pull-1").waitFor({ state: "visible" });
      await expect(app.getByText("المحطة غير متصلة")).toHaveCount(0);

      await expect.poll(async () => (await readMirror())?.passes).toBe(SEED_WALLET.passes);
      const mirror = await readMirror();
      expect(mirror.crystals).toBe(SEED_WALLET.crystals);
      expect(mirror.shards).toBe(SEED_WALLET.shards);
      expect(mirror.passProgress).toBe(SEED_WALLET.pass_progress);

      const dockHrefs = await app.$$eval("a[href]", (links) =>
        links.map((link) => link.getAttribute("href")),
      );
      for (const href of ["/", "/practice", "/resonance", "/games"]) {
        expect(dockHrefs).toContain(href);
      }
      await expect(app.getByText("بلورات المدار").first()).toBeVisible();
      await expect(app.getByText("شظايا الرنين").first()).toBeVisible();
      await app.screenshot({ path: testInfo.outputPath("resonance-hydrated.png"), fullPage: true });
    });

    await test.step("single pull spends one pass and advances pity", async () => {
      await hydratedClick("pull-1");
      await app.getByText("نتائج الرنين").waitFor({ timeout: 20_000 });
      await closeReveal();

      const wallet = await readWallet(session.userId);
      expect(wallet.passes).toBe(SEED_WALLET.passes - 1);

      const pulls = await readPulls(session.userId);
      expect(pulls.length).toBe(1);
      const pity = await readPity(session.userId);
      expect(pity.count).toBe(pulls[0].rarity === 5 ? 0 : 1);

      const mirror = await readMirror();
      expect(mirror.passes).toBe(wallet.passes);
      expect(mirror.shards).toBe(wallet.shards);
    });

    await test.step("10-pull spends ten passes and floors at one 4★+", async () => {
      await hydratedClick("pull-10");
      await app.getByText("نتائج الرنين").waitFor({ timeout: 20_000 });
      const starRows = await app
        .locator(".telemetry")
        .evaluateAll((els) => els.filter((el) => (el.textContent ?? "").includes("★")).length);
      expect(starRows).toBeGreaterThanOrEqual(10);
      await closeReveal();

      const wallet = await readWallet(session.userId);
      expect(wallet.passes).toBe(SEED_WALLET.passes - 11);

      const pulls = await readPulls(session.userId);
      expect(pulls.length).toBe(11);
      const batch = pulls.slice(0, 10);
      expect(batch.some((pull) => pull.rarity >= 4)).toBe(true);

      // Pity must equal the number of pulls since the last 5★.
      let sinceFiveStar = 0;
      for (const pull of pulls) {
        if (pull.rarity === 5) break;
        sinceFiveStar += 1;
      }
      expect((await readPity(session.userId)).count).toBe(sinceFiveStar);

      // The server recomputed dup/dust payouts — the balance must match.
      expect(wallet.shards).toBe(expectedShardsFromPulls(SEED_WALLET.shards, pulls));
    });

    await test.step("equips an owned title into the HUD pill", async () => {
      await app.getByRole("button", { name: "تعيين" }).first().click();
      await app.getByText("تم تعيين اللقب.").waitFor();

      // Which 4★+ title was equiped depends on the random pulls — only the
      // DB↔pill agreement is deterministic.
      const codes: Record<string, string> = {
        "title-letter-lord": "HRF",
        "title-signal-ace": "SIG",
        "title-orbit-master": "ORB",
      };
      const wallet = await readWallet(session.userId);
      expect(codes[wallet.equipped_title], `equipped ${wallet.equipped_title}`).toBeDefined();
      await expect(app.getByTestId("operator-title")).toHaveText(codes[wallet.equipped_title]);
    });

    await test.step("consumes an owned consumable", async () => {
      const before = await readOwned(session.userId);
      await app.getByRole("button", { name: "استخدام" }).first().click();
      await app.getByText("تم استخدام الشحنة.").waitFor();

      const after = await readOwned(session.userId);
      let decremented = 0;
      for (const [itemId, count] of Object.entries(after)) {
        const delta = (before[itemId] ?? 0) - count;
        if (delta === 1) decremented += 1;
        else expect(delta).toBe(0);
      }
      expect(decremented).toBe(1);
    });

    await test.step("redeems the pass exchange offer", async () => {
      const before = await readWallet(session.userId);
      expect(before.shards).toBeGreaterThanOrEqual(40);

      await app.getByRole("button", { name: "استبدال" }).first().click();
      await app.getByText("تم الاستبدال بنجاح.").waitFor();

      await expect
        .poll(async () => (await readWallet(session.userId)).passes)
        .toBe(before.passes + 1);
      const after = await readWallet(session.userId);
      expect(after.shards).toBe(before.shards - 40);
    });

    expect(pageErrors).toEqual([]);
    await context.close();
  });
});
