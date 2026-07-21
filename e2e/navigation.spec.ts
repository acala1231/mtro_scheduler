import { expect, test } from "@playwright/test";

test("legacy settings hash를 정규 경로로 교정한다", async ({ page }) => {
  await page.goto("/mtro_scheduler/#settings");

  await expect(page).toHaveURL(/#\/settings$/);
  await expect(page.getByRole("heading", { level: 1, name: "일정편집" })).toBeVisible();
});

test("알 수 없는 hash를 홈으로 교정한다", async ({ page }) => {
  await page.goto("/mtro_scheduler/#unknown");

  await expect(page).toHaveURL(/#\/$/);
  await expect(page.getByRole("heading", { level: 1, name: "복사단 일정표" })).toBeVisible();
});

test("단계 이동을 브라우저 뒤로가기와 앞으로가기로 따라간다", async ({ page }) => {
  await page.goto("/mtro_scheduler/#/");
  await page.getByRole("button", { name: "일정편집", exact: true }).click();
  await page.getByRole("button", { name: "투표결과", exact: true }).click();
  await expect(page).toHaveURL(/#\/votes$/);

  await page.goBack();
  await expect(page).toHaveURL(/#\/settings$/);
  await page.goBack();
  await expect(page).toHaveURL(/#\/$/);
  await page.goForward();
  await expect(page).toHaveURL(/#\/settings$/);
  await page.goForward();
  await expect(page).toHaveURL(/#\/votes$/);
});

test("현재 단계를 다시 선택해도 중복 방문 기록을 만들지 않는다", async ({ page }) => {
  await page.goto("/mtro_scheduler/#/");
  await page.getByRole("button", { name: "일정편집", exact: true }).click();
  await page.getByRole("button", { name: "일정편집", exact: true }).click();

  await page.goBack();
  await expect(page).toHaveURL(/#\/$/);
});

test("상단 이전 버튼은 실제 이전 화면으로 이동한다", async ({ page }) => {
  await page.goto("/mtro_scheduler/#/");
  await page.getByRole("button", { name: "일정편집", exact: true }).click();

  await page.getByRole("button", { name: "이전 화면으로 돌아가기" }).click();
  await expect(page).toHaveURL(/#\/$/);
});

test("메뉴가 열린 상태의 뒤로가기는 URL을 유지하고 메뉴만 닫는다", async ({ page }) => {
  await page.goto("/mtro_scheduler/#/settings");
  await page.getByRole("button", { name: "화면 메뉴 열기" }).click();
  await expect(page.getByRole("menu")).toBeVisible();

  await page.goBack();
  await expect(page.getByRole("menu")).toBeHidden();
  await expect(page).toHaveURL(/#\/settings$/);
});

test("메뉴에서 다른 화면으로 이동해도 유령 방문 기록을 남기지 않는다", async ({ page }) => {
  await page.goto("/mtro_scheduler/#/");
  await page.getByRole("button", { name: "일정편집", exact: true }).click();
  await page.getByRole("button", { name: "화면 메뉴 열기" }).click();
  await page.getByRole("menuitem", { name: "투표결과" }).click();
  await expect(page).toHaveURL(/#\/votes$/);

  await page.goBack();
  await expect(page).toHaveURL(/#\/settings$/);
  await page.goBack();
  await expect(page).toHaveURL(/#\/$/);
});

test("최초 진입은 포커스를 빼앗지 않고 화면 이동 때 제목에 포커스한다", async ({ page }) => {
  await page.goto("/mtro_scheduler/#/");
  const homeHeading = page.getByRole("heading", { level: 1, name: "복사단 일정표" });
  await expect(homeHeading).not.toBeFocused();

  await page.getByRole("button", { name: "일정편집", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1, name: "일정편집" })).toBeFocused();

  await page.goBack();
  await expect(homeHeading).toBeFocused();
});
