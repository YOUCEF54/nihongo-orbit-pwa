/* Sector skins: each sector keeps its fixed accent hue + kanji emblem across
   the hub, the dossier and the drill header. */
import { expect, test } from "@playwright/test";
import { authenticateContext, createTestUser, deleteTestUser, type TestSession } from "./helpers/auth";

const EXPECT: Record<string, { accent: string; emblem: string; theme: string }> = {
  "sector-0": { accent: "#00f0ff", emblem: "水", theme: "رصيف الانطلاق" },
  "sector-1": { accent: "#5eead4", emblem: "文", theme: "زجاج الصقيع" },
  "sector-2": { accent: "#f3d184", emblem: "動", theme: "المرتفعات" },
  "sector-3": { accent: "#a855f7", emblem: "雲", theme: "سديم بنفسجي" },
  "sector-4": { accent: "#ff5c8a", emblem: "音", theme: "واجهة التردد" },
  "sector-5": { accent: "#818cf8", emblem: "古", theme: "سبج العدم" },
};

test.describe("sector skins", () => {
  let session: TestSession;

  test.beforeAll(async () => {
    session = await createTestUser("e2e-skins");
  });

  test.afterAll(async () => {
    await deleteTestUser(session.userId);
  });

  test("fixed accents and emblems across hub, dossier and drill", async ({ browser }, testInfo) => {
    const context = await browser.newContext({ viewport: { width: 1366, height: 950 } });
    await authenticateContext(context, session);
    const page = await context.newPage();
    const pageErrors: string[] = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));

    await test.step("hub nodes carry their own accent, emblem and label", async () => {
      await page.goto("/practice", { waitUntil: "networkidle", timeout: 90_000 });
      await expect(page.getByTestId("sector-node").first()).toBeVisible();

      const nodes = await page.$$eval('[data-testid="sector-node"]', (elements) =>
        elements.map((element) => {
          const style = getComputedStyle(element);
          const emblem = element.querySelector(".sector-emblem");
          return {
            id: element.getAttribute("data-sector-id") ?? "",
            accent: style.getPropertyValue("--sector-accent").trim().toLowerCase(),
            emblem: (emblem?.textContent ?? "").trim(),
            text: element.textContent ?? "",
          };
        }),
      );
      expect(nodes.length).toBe(6);

      const accents = new Set<string>();
      for (const node of nodes) {
        const expected = EXPECT[node.id];
        expect(expected, `known sector ${node.id}`).toBeDefined();
        expect(node.accent, `${node.id} accent`).toBe(expected.accent);
        expect(node.emblem, `${node.id} emblem`).toBe(expected.emblem);
        expect(node.text, `${node.id} label`).toContain(expected.theme);
        accents.add(node.accent);
      }
      expect(accents.size).toBe(6);
      await page.screenshot({ path: testInfo.outputPath("skins-hub.png"), fullPage: true });
    });

    await test.step("dossier adopts the selected skin", async () => {
      await page.locator('[data-testid="sector-node"][data-sector-id="sector-1"]').click();
      const dossier = page.locator('[data-testid="sector-dossier"]');
      await expect(dossier).toHaveAttribute("data-sector-id", "sector-1");

      const accent = await dossier.evaluate((el) =>
        getComputedStyle(el).getPropertyValue("--sector-accent").trim().toLowerCase(),
      );
      expect(accent).toBe(EXPECT["sector-1"].accent);
      await expect(dossier.locator(".sector-emblem").first()).toHaveText(EXPECT["sector-1"].emblem);
      await expect(dossier.locator(".lang-ar", { hasText: "زجاج الصقيع" })).not.toHaveCount(0);
      await page.screenshot({ path: testInfo.outputPath("skins-dossier.png"), fullPage: true });
    });

    await test.step("drill header adopts an active sector skin", async () => {
      await page.goto("/practice/drill", { waitUntil: "networkidle", timeout: 90_000 });
      const header = page.locator("header:has(.sector-emblem)").first();
      await expect(header).toBeVisible();
      const accent = await header.evaluate((el) =>
        getComputedStyle(el).getPropertyValue("--sector-accent").trim().toLowerCase(),
      );
      const entry = Object.entries(EXPECT).find(([, value]) => value.accent === accent);
      expect(entry, `header accent maps to a sector (${accent})`).toBeDefined();
      if (entry) {
        await expect(header.locator(".sector-emblem").first()).toHaveText(entry[1].emblem);
      }
    });

    await test.step("mobile hub stays themed", async () => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto("/practice", { waitUntil: "networkidle", timeout: 90_000 });
      await expect(page.getByTestId("sector-node")).toHaveCount(6);
      await page.screenshot({ path: testInfo.outputPath("skins-hub-mobile.png"), fullPage: true });
    });

    expect(pageErrors).toEqual([]);
    await context.close();
  });
});
