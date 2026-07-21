// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from "vitest";
import { navigationForStepSelection, normalizeInitialHash, pathForStep, stepFromPath } from "./appRouting";

describe("앱 화면 경로", () => {
  it.each([
    ["home", "/"],
    ["members", "/members"],
    ["settings", "/settings"],
    ["votes", "/votes"],
    ["generate", "/generate"],
  ] as const)("%s 화면과 %s 경로를 양방향으로 연결한다", (step, path) => {
    expect(pathForStep(step)).toBe(path);
    expect(stepFromPath(path)).toBe(step);
  });

  it("하단에서 현재 화면을 다시 선택하면 history를 추가하지 않는다", () => {
    expect(navigationForStepSelection("settings", "settings", false)).toBe("none");
  });

  it("메뉴에서 현재 화면을 다시 선택하면 이동하지 않고 팝업 history만 일반 close한다", () => {
    expect(navigationForStepSelection("settings", "settings", true)).toBe("close-popup");
  });

  it("다른 화면 선택은 메뉴 여부에 따라 push 또는 popup entry replace를 사용한다", () => {
    expect(navigationForStepSelection("votes", "settings", false)).toBe("push");
    expect(navigationForStepSelection("votes", "settings", true)).toBe("replace-popup");
  });
});

describe("normalizeInitialHash", () => {
  beforeEach(() => {
    window.history.replaceState({ router: "kept" }, "", "/mtro_scheduler/?source=bookmark#/settings");
  });

  it.each([
    ["#home", "#/"],
    ["#members", "#/members"],
    ["#settings", "#/settings"],
    ["#votes", "#/votes"],
    ["#generate", "#/generate"],
  ])("레거시 %s 북마크를 canonical %s 주소로 교체한다", (legacyHash, canonicalHash) => {
    window.history.replaceState({ router: "kept" }, "", `/mtro_scheduler/?source=bookmark${legacyHash}`);

    normalizeInitialHash();

    expect(window.location.pathname).toBe("/mtro_scheduler/");
    expect(window.location.search).toBe("?source=bookmark");
    expect(window.location.hash).toBe(canonicalHash);
    expect(window.history.state).toEqual({ router: "kept" });
  });

  it.each(["#unknown", "#/unknown", "#settings/extra", ""])(
    "알 수 없는 hash %s를 홈 canonical 주소로 교체한다",
    (hash) => {
      window.history.replaceState({ router: "kept" }, "", `/mtro_scheduler/?source=bookmark${hash}`);

      normalizeInitialHash();

      expect(window.location.href).toBe("http://localhost:3000/mtro_scheduler/?source=bookmark#/");
      expect(window.history.state).toEqual({ router: "kept" });
    },
  );

  it.each(["#/", "#/members", "#/settings", "#/votes", "#/generate"])(
    "이미 canonical인 %s는 주소를 유지한다",
    (hash) => {
      window.history.replaceState({ router: "kept" }, "", `/mtro_scheduler/?source=bookmark${hash}`);

      normalizeInitialHash();

      expect(window.location.hash).toBe(hash);
      expect(window.history.state).toEqual({ router: "kept" });
    },
  );
});
