import test from "node:test";
import assert from "node:assert/strict";
import { DOCK_ROUTES, TERMINAL_ROUTES, handleLabelFor } from "./shell.ts";

test("dock routes are unique, rooted, and use known icons", () => {
  const ids = DOCK_ROUTES.map((route) => route.id);
  assert.equal(new Set(ids).size, ids.length, "duplicate dock ids");
  for (const route of DOCK_ROUTES) {
    assert.ok(route.href.startsWith("/"), `${route.id} href must be rooted`);
    assert.ok(!route.href.includes("#"), `${route.id} dock hrefs must be plain paths`);
    assert.ok(route.ar.length > 0, `${route.id} needs an Arabic label`);
  }
});

test("terminal routes are unique and target real anchors or pages", () => {
  const ids = TERMINAL_ROUTES.map((route) => route.id);
  assert.equal(new Set(ids).size, ids.length, "duplicate terminal ids");
  for (const route of TERMINAL_ROUTES) {
    assert.ok(
      route.href.startsWith("/practice#") || route.href === "/games",
      `${route.id} unexpected href ${route.href}`,
    );
  }
});

test("arcade entries point at the canonical /games routes", () => {
  const dockGames = DOCK_ROUTES.find((route) => route.id === "games");
  assert.ok(dockGames, "dock needs a games entry");
  assert.equal(dockGames!.href, "/games");
  const terminalGames = TERMINAL_ROUTES.find((route) => route.id === "games");
  assert.ok(terminalGames, "terminal needs a games entry");
  assert.equal(terminalGames!.href, "/games");
});

test("orphan dojo sections have terminal shortlinks", () => {
  const hrefs = TERMINAL_ROUTES.map((route) => route.href);
  for (const anchor of ["#review", "#pitch", "#matrix", "#listen", "#taiko", "#assemble", "#grammar"]) {
    assert.ok(
      hrefs.includes(`/practice${anchor}`),
      `missing terminal shortlink for ${anchor}`,
    );
  }
});

test("handleLabelFor falls back gracefully", () => {
  assert.equal(handleLabelFor(undefined), "مستكشف");
  assert.equal(handleLabelFor(""), "مستكشف");
  assert.equal(handleLabelFor("rider@orbit.test"), "rider");
});
