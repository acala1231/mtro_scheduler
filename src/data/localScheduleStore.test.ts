import { beforeEach, describe, expect, it, vi } from "vitest";
import { loadSnapshot, saveSnapshot } from "./localScheduleStore";

describe("localScheduleStore", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", { getItem: vi.fn(), setItem: vi.fn(), removeItem: vi.fn() });
  });

  it("저장소 읽기가 실패해도 빈 v3 스냅샷을 반환한다", () => {
    vi.mocked(localStorage.getItem).mockImplementation(() => { throw new Error("blocked"); });
    expect(loadSnapshot("2026-07")).toMatchObject({ version: 3, month: "2026-07" });
  });

  it("손상되거나 다른 월의 데이터는 사용하지 않는다", () => {
    vi.mocked(localStorage.getItem).mockReturnValue(JSON.stringify({ version: 1, month: "2025-01", updatedAt: 3 }));
    expect(loadSnapshot("2026-07")).toMatchObject({ version: 3, month: "2026-07" });
  });

  it("v1 스냅샷을 일정 출처 없는 v3로 읽어 기존 일정을 보존한다", () => {
    vi.mocked(localStorage.getItem).mockReturnValue(JSON.stringify({ version: 1, month: "2026-07", updatedAt: "now" }));
    expect(loadSnapshot("2026-07")).toMatchObject({ version: 3, month: "2026-07", updatedAt: "now" });
  });

  it("v3 일정의 OCR 출처를 검증해 읽는다", () => {
    vi.mocked(localStorage.getItem).mockReturnValue(JSON.stringify({
      version: 3, month: "2026-07", updatedAt: "now",
      settings: {
        month: "2026-07", titleColor: "#000", headerColor: "#fff", carSchedules: [],
        serviceSchedules: [{ key: "2026-07-12 11:00", date: "2026-07-12", time: "11:00", displayDate: "7/12 (일) 11:00", baseRoles: [], subRoles: [], source: "ocr" }],
      },
    }));
    expect(loadSnapshot("2026-07").settings?.serviceSchedules[0].source).toBe("ocr");
  });

  it("v2의 출처 없는 기존 일정을 v3에서도 보존한다", () => {
    vi.mocked(localStorage.getItem).mockReturnValue(JSON.stringify({
      version: 2, month: "2026-07", updatedAt: "now",
      settings: {
        month: "2026-07", titleColor: "#000", headerColor: "#fff", carSchedules: [],
        serviceSchedules: [{ key: "2026-07-12 11:00", date: "2026-07-12", time: "11:00", displayDate: "7/12 (일) 11:00", baseRoles: [], subRoles: [] }],
      },
    }));
    expect(loadSnapshot("2026-07").settings?.serviceSchedules[0]).toMatchObject({
      key: "2026-07-12 11:00",
    });
    expect(loadSnapshot("2026-07").settings?.serviceSchedules[0]).not.toHaveProperty("source");
  });

  it("v2 일정에 저장된 OCR 출처를 제거해 영구 일정으로 보존한다", () => {
    vi.mocked(localStorage.getItem).mockReturnValue(JSON.stringify({
      version: 2, month: "2026-07", updatedAt: "now",
      settings: {
        month: "2026-07", titleColor: "#000", headerColor: "#fff", carSchedules: [],
        serviceSchedules: [{ key: "2026-07-12 11:00", date: "2026-07-12", time: "11:00", displayDate: "7/12 (일) 11:00", baseRoles: [], subRoles: [], source: "ocr" }],
      },
    }));
    expect(loadSnapshot("2026-07").settings?.serviceSchedules[0]).not.toHaveProperty("source");
  });

  it("v3의 알 수 없는 일정 출처만 제거하고 나머지 스냅샷을 보존한다", () => {
    vi.mocked(localStorage.getItem).mockReturnValue(JSON.stringify({
      version: 3, month: "2026-07", updatedAt: "now",
      settings: {
        month: "2026-07", titleColor: "#000", headerColor: "#fff", carSchedules: [],
        serviceSchedules: [{ key: "2026-07-12 11:00", date: "2026-07-12", time: "11:00", displayDate: "7/12", baseRoles: [], subRoles: [], source: "external" }],
      },
      votes: { month: "2026-07", rawText: "원문", serviceVotes: [], carVotes: [] },
      result: { generatedAt: "now", serviceRows: [], carRows: [], updatedMembers: [], issues: [] },
    }));
    const snapshot = loadSnapshot("2026-07");
    expect(snapshot.settings?.serviceSchedules[0]).not.toHaveProperty("source");
    expect(snapshot.votes?.rawText).toBe("원문");
    expect(snapshot.result?.generatedAt).toBe("now");
  });

  it("스냅샷을 v3로 저장한다", () => {
    expect(saveSnapshot({ version: 2, month: "2026-07", updatedAt: "old" })).toBe(true);
    const saved = JSON.parse(vi.mocked(localStorage.setItem).mock.calls[0][1]);
    expect(saved).toMatchObject({ version: 3, month: "2026-07" });
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
        updatedMembers: [{ name: "윤마루", baptismalName: "알파", alias: "H", roles: { 정: true }, counts: { 전체: 0 } }],
      },
    }));
    expect(loadSnapshot("2026-07").result?.updatedMembers[0].alias).toBe("H");
  });

  it("결과 명단의 선택적 축일 문자열만 허용한다", () => {
    vi.mocked(localStorage.getItem).mockReturnValue(JSON.stringify({
      version: 3, month: "2026-07", updatedAt: "now",
      result: { generatedAt: "now", serviceRows: [], carRows: [], issues: [], updatedMembers: [{ name: "홍길동", feastDay: "06/29", roles: {}, counts: {} }] },
    }));
    expect(loadSnapshot("2026-07").result?.updatedMembers[0].feastDay).toBe("06/29");
    vi.mocked(localStorage.getItem).mockReturnValue(JSON.stringify({
      version: 3, month: "2026-07", updatedAt: "now",
      result: { generatedAt: "now", serviceRows: [], carRows: [], issues: [], updatedMembers: [{ name: "홍길동", feastDay: 629, roles: {}, counts: {} }] },
    }));
    expect(loadSnapshot("2026-07").result).toBeUndefined();
    vi.mocked(localStorage.getItem).mockReturnValue(JSON.stringify({
      version: 3, month: "2026-07", updatedAt: "now",
      result: { generatedAt: "now", serviceRows: [], carRows: [], issues: [], updatedMembers: [{ name: "홍길동", feastDay: "02/30", roles: {}, counts: {} }] },
    }));
    expect(loadSnapshot("2026-07").result).toBeUndefined();
  });

  it("쓰기 실패를 throw하지 않고 false로 알린다", () => {
    vi.mocked(localStorage.setItem).mockImplementation(() => { throw new Error("quota"); });
    expect(saveSnapshot({ version: 2, month: "2026-07", updatedAt: "now" })).toBe(false);
  });
});
