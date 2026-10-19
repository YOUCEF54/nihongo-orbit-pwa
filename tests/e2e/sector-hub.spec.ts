/* Sector hub: journey map, dossier, drill routing, active campaign, and the
   one-time completion payout — now asserted against resonance_sector_awards. */
import { expect, test } from "@playwright/test";
import { authenticateContext, createTestUser, deleteTestUser, type TestSession } from "./helpers/auth";
import { readSectorAwards, readWallet, seedMastery, type MasteryRow } from "./helpers/data";

function reviewedWord(id: string): MasteryRow {
  return {
    card_id: id,
    card_type: "vocab",
    stability: 4,
    difficulty: 5,
    elapsed_days: 1,
    scheduled_days: 4,
    reps: 2,
    lapses: 0,
    state: "Review",
    last_review: new Date(Date.now() - 86_400_000).toISOString(),
  };
}

test.describe("sector hub", () => {
  let session: TestSession;

  test.beforeAll(async () => {
    session = await createTestUser("e2e-hub");
    // 8 of 10 sector-0 words reviewed → one grade crosses the 80% goal.
    const rows: MasteryRow[] = [];
    for (let n = 2; n <= 9; n += 1) rows.push(reviewedWord(`v0-00${n}`));
    await seedMastery(session.userId, rows);
  });

  test.afterAll(async () => {
    await deleteTestUser(session.userId);
  });

  test("journey map, dossier, drill routing, completion reward", async ({ browser }, testInfo) => {
    const context = await browser.newContext({ viewport: { width: 1366, height: 950 } });
    await authenticateContext(context, session);
    const page = await context.newPage();
    const pageErrors: string[] = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));

    await test.step("hub renders journey and dossier", async () => {
      await page.goto("/practice", { waitUntil: "networkidle", timeout: 90_000 });
      await expect(page.getByTestId("sector-hub")).toHaveCount(1);
      expect(await page.getByTestId("sector-node").count()).toBeGreaterThanOrEqual(3);
      await expect(page.getByTestId("sector-dossier")).toHaveCount(1);
      await page.screenshot({ path: testInfo.outputPath("hub-desktop.png"), fullPage: true });
    });

    await test.step("selecting a sector activates it", async () => {
      const sector1 = page.locator('[data-testid="sector-node"][data-sector-id="sector-1"]');
      await sector1.click();
      await expect(page.getByTestId("sector-dossier")).toHaveAttribute("data-sector-id", "sector-1");
      await expect(sector1).toHaveAttribute("data-state", "active");
    });

    await test.step("dossier CTA deep-links into the review drill", async () => {
      await page.locator('[data-testid="sector-dossier"] a[href="/practice/drill#review"]').first().click();
      await page.waitForURL("**/practice/drill#review", { timeout: 30_000 });
      await expect(page.locator('[data-testid="dojo-step"][data-step-id="review"]')).toHaveAttribute(
        "data-active",
        "true",
      );
      await expect(page.getByTestId("sector-switcher")).toHaveCount(1);
    });

    await test.step("legacy /practice#matrix redirects to the drill", async () => {
      await page.goto("/practice#matrix", { waitUntil: "networkidle", timeout: 90_000 });
      await expect.poll(() => page.url().endsWith("/practice/drill#matrix")).toBe(true);
    });

    await test.step("default drill visit opens the review step", async () => {
      await page.goto("/practice/drill", { waitUntil: "networkidle", timeout: 90_000 });
      await expect(page.locator('[data-testid="dojo-step"][data-active="true"]')).toHaveAttribute(
        "data-step-id",
        "review",
      );
    });

    await test.step("crossing the 80% goal fires the completion payout", async () => {
      await page.locator('[data-testid="sector-switch"]', { hasText: "ساحل الكانا" }).click();
      const reviewStep = page.locator('[data-testid="dojo-step"][data-step-id="review"]');
      await reviewStep.getByTestId("dojo-play").click();
      await page.waitForTimeout(800);
      await reviewStep.locator("button", { hasText: "سهل" }).first().click();

      await expect(page.locator("#reward-title")).toContainText("اكتملت الحملة", { timeout: 15_000 });
      await page.screenshot({ path: testInfo.outputPath("sector-reward.png"), fullPage: true });

      const doneFlag = await page.evaluate(() => {
        const key = Object.keys(localStorage).find((k) => k.startsWith("learnjp:sector-complete:"));
        return key ? localStorage.getItem(key) : null;
      });
      expect(doneFlag ?? "").toContain("sector-0");

      // Server award: idempotent row + crystal/pass payout via RPC.
      await expect.poll(() => readSectorAwards(session.userId)).toContain("sector-0");
      await expect
        .poll(async () => {
          try {
            const wallet = await readWallet(session.userId);
            return { crystals: wallet.crystals, passes: wallet.passes };
          } catch {
            return null;
          }
        })
        .toEqual({ crystals: 25, passes: 3 });
    });

    await test.step("mobile hub renders the journey", async () => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto("/practice", { waitUntil: "networkidle", timeout: 90_000 });
      expect(await page.getByTestId("sector-node").count()).toBeGreaterThanOrEqual(3);
      await page.screenshot({ path: testInfo.outputPath("hub-mobile.png"), fullPage: true });
    });

    expect(pageErrors).toEqual([]);
    await context.close();
  });
});
