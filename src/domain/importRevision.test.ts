import { describe, expect, it } from "vitest";
import { importRevision } from "./importRevision";
import { createDefaultSettings } from "./scheduleSettings";

describe("가져오기 기준 revision", () => {
  it("월·설정·명단 중 하나가 바뀌면 달라진다", () => {
    const settings = createDefaultSettings("2026-07");
    const base = importRevision("2026-07", settings, []);
    expect(importRevision("2026-08", settings, [])).not.toBe(base);
    expect(importRevision("2026-07", { ...settings, titleColor: "#000" }, [])).not.toBe(base);
    expect(importRevision("2026-07", settings, [{ name: "홍길동", roles: { 정: false, 부: false, 향: false, 향합: false }, counts: { 전체: 0, 정: 0, 부: 0, 향: 0, 향합: 0, 초1: 0, 초2: 0, 십자가: 0, 차량: 0 } }])).not.toBe(base);
  });
});
