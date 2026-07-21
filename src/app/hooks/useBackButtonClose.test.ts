import { describe, expect, it } from "vitest";
import { createPopupHistoryState, isPopupHistoryState } from "./useBackButtonClose";

describe("팝업 history state", () => {
  it("기존 router state를 보존하고 앱 namespace 아래에 팝업 정보를 추가한다", () => {
    const routerState = { usr: { from: "settings" }, key: "abc", idx: 2 };

    const state = createPopupHistoryState(routerState, "popup-1");

    expect(state).toEqual({
      usr: { from: "settings" },
      key: "abc",
      idx: 2,
      mtroScheduler: { kind: "popup", popupId: "popup-1" },
    });
    expect(routerState).not.toHaveProperty("mtroScheduler");
  });

  it("앱 namespace와 kind가 모두 일치하는 state만 팝업 entry로 판별한다", () => {
    expect(isPopupHistoryState({ mtroScheduler: { kind: "popup", popupId: "popup-1" } }, "popup-1")).toBe(true);
    expect(isPopupHistoryState({ popupId: "popup-1" }, "popup-1")).toBe(false);
    expect(isPopupHistoryState({ mtroScheduler: { kind: "route", popupId: "popup-1" } }, "popup-1")).toBe(false);
    expect(isPopupHistoryState({ mtroScheduler: { kind: "popup", popupId: "other" } }, "popup-1")).toBe(false);
  });
});
