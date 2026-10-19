/* Icon rewiring: the games lobby, the drill and the hub render distinct
   stroked icons on their rewired routes. */
import { expect, test } from "@playwright/test";
import { authenticateContext, createTestUser, deleteTestUser, type TestSession } from "./helpers/auth";

test.describe("icon rewiring", () => {
  let session: TestSession;

  test.beforeAll(async () => {
    session = await createTestUser("e2e-icons");
  });

  test.afterAll(async () => {
    await deleteTestUser(session.userId);
  });

  test("rewired routes render distinct stroked icons", async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 1366, height: 950 } });
    await authenticateContext(context, session);
    const page = await context.newPage();
    const pageErrors: string[] = [];
    page.on("pageerror", (error) => pageErrors.push(String(error)));

    const signatures = async () => {
      await page.waitForLoadState("networkidle");
      return page.$$eval('svg[viewBox="0 0 24 24"][stroke="currentColor"]', (svgs) =>
        svgs.map((svg) => {
          const first = svg.querySelector("path, circle, ellipse, rect, line, polyline, polygon");
          const shape = first
            ? first.getAttribute("d") ??
              `${first.tagName}:${first.getAttribute("cx") ?? ""},${first.getAttribute("cy") ?? ""}`
            : "EMPTY";
          return `${svg.getAttribute("class")}|${shape.slice(0, 60)}`;
        }),
      );
    };

    await page.goto("/games");
    await expect(page).toHaveURL(/\/games/);
    const games = await signatures();
    expect(games.length).toBeGreaterThanOrEqual(3);
    const uniqueShapes = new Set(games.map((signature) => signature.split("|")[1]));
    expect(uniqueShapes.size).toBeGreaterThanOrEqual(3);

    await page.goto("/practice/drill");
    await page.waitForTimeout(600);
    const drill = await signatures();
    expect(drill.length).toBeGreaterThanOrEqual(2);

    await page.goto("/practice");
    await page.waitForTimeout(600);
    const hub = await signatures();
    expect(hub.length).toBeGreaterThanOrEqual(4);

    expect(pageErrors).toEqual([]);
    await context.close();
  });
});
