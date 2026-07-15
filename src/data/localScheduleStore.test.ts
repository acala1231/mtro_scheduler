import { beforeEach, describe, expect, it, vi } from "vitest";
import { loadSnapshot, saveSnapshot } from "./localScheduleStore";

describe("localScheduleStore", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", { getItem: vi.fn(), setItem: vi.fn(), removeItem: vi.fn() });
  });

  it("저장소 읽기가 실패해도 빈 v2 스냅샷을 반환한다", () => {
    vi.mocked(localStorage.getItem).mockImplementation(() => { throw new Error("blocked"); });
    expect(loadSnapshot("2026-07")).toMatchObject({ version: 2, month: "2026-07" });
  });

  it("손상되거나 다른 월의 데이터는 사용하지 않는다", () => {
    vi.mocked(localStorage.getItem).mockReturnValue(JSON.stringify({ version: 1, month: "2025-01", updatedAt: 3 }));
    expect(loadSnapshot("2026-07")).toMatchObject({ version: 2, month: "2026-07" });
  });

  it("v1 스냅샷을 v2로 읽는다", () => {
    vi.mocked(localStorage.getItem).mockReturnValue(JSON.stringify({ version: 1, month: "2026-07", updatedAt: "now" }));
    expect(loadSnapshot("2026-07")).toMatchObject({ version: 2, month: "2026-07", updatedAt: "now" });
  });

  it("배열 내부 일정 구조가 손상되면 안전한 빈 스냅샷으로 폴백한다", () => {
    vi.mocked(localStorage.getItem).mockReturnValue(JSON.stringify({
      version: 2, month: "2026-07", updatedAt: "now",
      settings: { month: "2026-07", serviceSchedules: [null], carSchedules: [], titleColor: "#000", headerColor: "#fff" },
    }));
    expect(loadSnapshot("2026-07").settings).toBeUndefined();
  });

  it("투표 내부 구조가 손상되면 안전한 빈 스냅샷으로 폴백한다", () => {
    vi.mocked(localStorage.getItem).mockReturnValue(JSON.stringify({ version: 2, month: "2026-07", updatedAt: "now", votes: { month: "2026-07", serviceVotes: [{}], carVotes: [] } }));
    expect(loadSnapshot("2026-07").votes).toBeUndefined();
  });

  it("결과의 검증 이슈 요소가 손상되면 안전한 빈 스냅샷으로 폴백한다", () => {
    vi.mocked(localStorage.getItem).mockReturnValue(JSON.stringify({
      version: 2, month: "2026-07", updatedAt: "now",
      result: { generatedAt: "now", serviceRows: [], carRows: [], updatedMembers: [], issues: [null] },
    }));
    expect(loadSnapshot("2026-07").result).toBeUndefined();
  });

  it("결과 행의 선택 필드 타입이 손상되면 안전한 빈 스냅샷으로 폴백한다", () => {
    vi.mocked(localStorage.getItem).mockReturnValue(JSON.stringify({
      version: 2, month: "2026-07", updatedAt: "now",
      result: { generatedAt: "now", serviceRows: [{ displayDate: "7/1", roles: {}, note: 3 }], carRows: [], updatedMembers: [], issues: [] },
    }));
    expect(loadSnapshot("2026-07").result).toBeUndefined();
  });

  it("결과 명단의 선택적 별칭 문자열을 허용한다", () => {
    vi.mocked(localStorage.getItem).mockReturnValue(JSON.stringify({
      version: 2, month: "2026-07", updatedAt: "now",
      result: {
        generatedAt: "now", serviceRows: [], carRows: [], issues: [],
        updatedMembers: [{ name: "홍성은", baptismalName: "사무엘", alias: "H", roles: { 정: true }, counts: { 전체: 0 } }],
      },
    }));
    expect(loadSnapshot("2026-07").result?.updatedMembers[0].alias).toBe("H");
  });

  it("쓰기 실패를 throw하지 않고 false로 알린다", () => {
    vi.mocked(localStorage.setItem).mockImplementation(() => { throw new Error("quota"); });
    expect(saveSnapshot({ version: 2, month: "2026-07", updatedAt: "now" })).toBe(false);
  });
});
