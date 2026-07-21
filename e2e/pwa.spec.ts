import { expect, test } from "@playwright/test";

test("한 번 로드한 앱 셸을 오프라인에서 다시 연다", async ({ context, page }) => {
  await page.goto("/mtro_scheduler/#/");
  await expect(page.getByRole("heading", { level: 1, name: "복사단 일정표" })).toBeVisible();

  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await expect.poll(
    () => page.evaluate(() => Boolean(navigator.serviceWorker.controller)),
    { timeout: 10_000 },
  ).toBe(true);

  const cachedPaths = await page.evaluate(async () => {
    const cacheNames = await caches.keys();
    const requests = await Promise.all(cacheNames.map(async (cacheName) => {
      const cache = await caches.open(cacheName);
      return cache.keys();
    }));
    return requests.flat().map((request) => new URL(request.url).pathname);
  });
  expect(cachedPaths).toContain("/mtro_scheduler/index.html");
  expect(cachedPaths.some((path) => /^\/mtro_scheduler\/assets\/index-.*\.js$/.test(path))).toBe(true);
  expect(cachedPaths.some((path) => /^\/mtro_scheduler\/assets\/index-.*\.css$/.test(path))).toBe(true);

  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole("heading", { level: 1, name: "복사단 일정표" })).toBeVisible();
});
