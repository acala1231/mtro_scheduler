import { describe, expect, it, vi } from "vitest";
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { isPromptSnoozed, PwaInstallPrompt, snoozePromptForToday } from "./PwaInstallPrompt";

describe("PWA 설치 알림 저장소", () => {
  it("저장소 읽기가 차단되어도 알림 표시 판단을 중단하지 않는다", () => {
    const storage = { getItem: vi.fn(() => { throw new Error("blocked"); }) };
    expect(isPromptSnoozed(storage)).toBe(false);
  });

  it("저장소 쓰기가 차단되어도 닫기 동작을 중단하지 않는다", () => {
    const storage = { setItem: vi.fn(() => { throw new Error("blocked"); }) };
    expect(() => snoozePromptForToday(storage)).not.toThrow();
  });

  it("localStorage 속성 접근 자체가 차단되어도 컴포넌트 effect가 중단되지 않는다", async () => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
    const descriptor = Object.getOwnPropertyDescriptor(window, "localStorage");
    Object.defineProperty(window, "localStorage", { configurable: true, get: () => { throw new DOMException("blocked", "SecurityError"); } });
    const container = document.createElement("div");
    const root = createRoot(container);
    try {
      expect(isPromptSnoozed()).toBe(false);
      expect(() => snoozePromptForToday()).not.toThrow();
      await expect(act(async () => root.render(createElement(PwaInstallPrompt)))).resolves.toBeUndefined();
    } finally {
      await act(async () => root.unmount());
      if (descriptor) Object.defineProperty(window, "localStorage", descriptor);
      else Reflect.deleteProperty(window, "localStorage");
    }
  });
});
