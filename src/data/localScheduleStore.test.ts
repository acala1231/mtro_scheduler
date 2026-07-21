import { beforeEach, describe, expect, it, vi } from "vitest";
import { loadSnapshot, mergeSnapshot, saveSnapshot } from "./localScheduleStore";
import { removeOcrSchedules } from "../domain/scheduleSettings";

const validRoles = { 정: true, 부: false, 향: false, 향합: false };
const validCounts = { 전체: 0, 정: 0, 부: 0, 향: 0, 향합: 0, 초1: 0, 초2: 0, 십자가: 0, 차량: 0 };
const validSettings = { month: "2026-07", titleColor: "#000", headerColor: "#fff", serviceSchedules: [], carSchedules: [] };
const validVotes = { month: "2026-07", rawText: "", serviceVotes: [], carVotes: [] };

describe("localScheduleStore", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", { getItem: vi.fn(), setItem: vi.fn(), removeItem: vi.fn() });
  });

  it("저장소 읽기가 실패해도 빈 v3 스냅샷을 반환한다", () => {
    vi.mocked(localStorage.getItem).mockImplementation(() => { throw new Error("blocked"); });
    expect(loadSnapshot("2026-07")).toMatchObject({ version: 3, month: "2026-07" });
  });

  it("손상되거나 다른 월의 데이터는 사용하지 않는다", () => {
    vi.mocked(localStorage.getItem).mockReturnValue(JSON.stringify({
      version: 1, month: "2025-01", updatedAt: 3,
      votes: { month: "2026-07", rawText: "보존하면 안 됨", serviceVotes: [], carVotes: [] },
    }));
    const snapshot = loadSnapshot("2026-07");
    expect(snapshot).toMatchObject({ version: 3, month: "2026-07" });
    expect(snapshot.votes).toBeUndefined();
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

  it("v3의 알 수 없는 일정 출처가 있으면 안전한 빈 스냅샷으로 폴백한다", () => {
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
    expect(snapshot.settings).toBeUndefined();
    expect(snapshot.votes?.rawText).toBe("원문");
    expect(snapshot.result).toBeUndefined();
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
    vi.mocked(localStorage.getItem).mockReturnValue(JSON.stringify({
      version: 2, month: "2026-07", updatedAt: "now",
      settings: { month: "2026-07", titleColor: "#000", headerColor: "#fff", serviceSchedules: [], carSchedules: [] },
      votes: { month: "2026-07", serviceVotes: [{}], carVotes: [] },
      result: { generatedAt: "now", serviceRows: [], carRows: [], updatedMembers: [], issues: [] },
    }));
    const snapshot = loadSnapshot("2026-07");
    expect(snapshot.votes).toBeUndefined();
    expect(snapshot.settings?.titleColor).toBe("#000");
    expect(snapshot.result).toBeUndefined();
  });

  it.each([1, 2, 3] as const)("v%s 투표의 선택 필드 누락을 호환한다", (version) => {
    vi.mocked(localStorage.getItem).mockReturnValue(JSON.stringify({
      version, month: "2026-07", updatedAt: "now",
      votes: { month: "2026-07", rawText: "", serviceVotes: [{ scheduleKey: "key", name: "홍길동" }], carVotes: [] },
    }));
    expect(loadSnapshot("2026-07").votes?.serviceVotes[0]).toEqual({ scheduleKey: "key", name: "홍길동" });
  });

  it.each([
    { displayText: 12 },
    { source: "external" },
  ])("투표의 손상된 선택 필드 $displayText$source를 거부한다", (patch) => {
    vi.mocked(localStorage.getItem).mockReturnValue(JSON.stringify({
      version: 3, month: "2026-07", updatedAt: "now",
      votes: { month: "2026-07", rawText: "", serviceVotes: [{ scheduleKey: "key", name: "홍길동", ...patch }], carVotes: [] },
    }));
    expect(loadSnapshot("2026-07").votes).toBeUndefined();
  });

  it.each(["ocr", "manual", "import"] as const)("투표의 %s 출처를 허용한다", (source) => {
    vi.mocked(localStorage.getItem).mockReturnValue(JSON.stringify({
      version: 3, month: "2026-07", updatedAt: "now",
      votes: { month: "2026-07", rawText: "", serviceVotes: [{ scheduleKey: "key", displayText: "7/1", name: "홍길동", source }], carVotes: [] },
    }));
    expect(loadSnapshot("2026-07").votes?.serviceVotes[0].source).toBe(source);
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
      settings: validSettings, votes: validVotes,
      result: {
        generatedAt: "now", serviceRows: [], carRows: [], issues: [],
        updatedMembers: [{ name: "윤마루", baptismalName: "알파", alias: "H", roles: validRoles, counts: validCounts }],
      },
    }));
    expect(loadSnapshot("2026-07").result?.updatedMembers[0].alias).toBe("H");
  });

  it("결과 명단의 선택적 축일 문자열만 허용한다", () => {
    vi.mocked(localStorage.getItem).mockReturnValue(JSON.stringify({
      version: 3, month: "2026-07", updatedAt: "now",
      settings: validSettings, votes: validVotes,
      result: { generatedAt: "now", serviceRows: [], carRows: [], issues: [], updatedMembers: [{ name: "홍길동", feastDay: "06/29", roles: validRoles, counts: validCounts }] },
    }));
    expect(loadSnapshot("2026-07").result?.updatedMembers[0].feastDay).toBe("06/29");
    vi.mocked(localStorage.getItem).mockReturnValue(JSON.stringify({
      version: 3, month: "2026-07", updatedAt: "now",
      settings: validSettings, votes: validVotes,
      result: { generatedAt: "now", serviceRows: [], carRows: [], issues: [], updatedMembers: [{ name: "홍길동", feastDay: 629, roles: {}, counts: {} }] },
    }));
    expect(loadSnapshot("2026-07").result).toBeUndefined();
    vi.mocked(localStorage.getItem).mockReturnValue(JSON.stringify({
      version: 3, month: "2026-07", updatedAt: "now",
      settings: validSettings, votes: validVotes,
      result: { generatedAt: "now", serviceRows: [], carRows: [], issues: [], updatedMembers: [{ name: "홍길동", feastDay: "02/30", roles: {}, counts: {} }] },
    }));
    expect(loadSnapshot("2026-07").result).toBeUndefined();
  });

  it.each(["2026-00", "2026-13"])("실제로 존재하지 않는 월 %s은 저장소 키로 사용하지 않는다", (month) => {
    expect(saveSnapshot({ version: 3, month, updatedAt: "now" })).toBe(false);
  });

  it("일정 역할 enum이 손상되면 안전한 빈 스냅샷으로 폴백한다", () => {
    vi.mocked(localStorage.getItem).mockReturnValue(JSON.stringify({
      version: 3, month: "2026-07", updatedAt: "now",
      settings: { month: "2026-07", titleColor: "#000", headerColor: "#fff", carSchedules: [], serviceSchedules: [
        { key: "key", date: "2026-07-01", time: "11:00", displayDate: "7/1", baseRoles: ["미지원"], subRoles: [] },
      ] },
    }));
    expect(loadSnapshot("2026-07").settings).toBeUndefined();
  });

  it("결과 명단의 필수 역할·횟수 키 누락이나 유효하지 않은 횟수를 거부한다", () => {
    const member = {
      name: "홍길동",
      roles: { 정: true, 부: false, 향: false, 향합: false },
      counts: { 전체: 0, 정: 0, 부: 0, 향: 0, 향합: 0, 초1: 0, 초2: 0, 십자가: 0, 차량: -1 },
    };
    vi.mocked(localStorage.getItem).mockReturnValue(JSON.stringify({
      version: 3, month: "2026-07", updatedAt: "now",
      result: { generatedAt: "now", serviceRows: [], carRows: [], updatedMembers: [member], issues: [] },
    }));
    expect(loadSnapshot("2026-07").result).toBeUndefined();
    member.counts.차량 = 1.5;
    vi.mocked(localStorage.getItem).mockReturnValue(JSON.stringify({
      version: 3, month: "2026-07", updatedAt: "now",
      result: { generatedAt: "now", serviceRows: [], carRows: [], updatedMembers: [member], issues: [] },
    }));
    expect(loadSnapshot("2026-07").result).toBeUndefined();
    const { 향합: _omitted, ...missingRole } = member.roles;
    void _omitted;
    member.counts.차량 = 0;
    vi.mocked(localStorage.getItem).mockReturnValue(JSON.stringify({
      version: 3, month: "2026-07", updatedAt: "now",
      result: { generatedAt: "now", serviceRows: [], carRows: [], updatedMembers: [{ ...member, roles: missingRole }], issues: [] },
    }));
    expect(loadSnapshot("2026-07").result).toBeUndefined();
  });

  it("손상된 결과만 제외하고 정상 설정과 투표를 보존한다", () => {
    vi.mocked(localStorage.getItem).mockReturnValue(JSON.stringify({
      version: 3, month: "2026-07", updatedAt: "now",
      settings: { month: "2026-07", titleColor: "#123", headerColor: "#fff", serviceSchedules: [], carSchedules: [] },
      votes: { month: "2026-07", rawText: "보존", serviceVotes: [], carVotes: [] },
      result: { generatedAt: "now", serviceRows: [], carRows: [], updatedMembers: [{ name: "홍길동", roles: validRoles, counts: { ...validCounts, 차량: -1 } }], issues: [] },
    }));
    const snapshot = loadSnapshot("2026-07");
    expect(snapshot.result).toBeUndefined();
    expect(snapshot.settings?.titleColor).toBe("#123");
    expect(snapshot.votes?.rawText).toBe("보존");
  });

  it("손상된 설정을 기본 설정으로 병합할 때 정상 투표는 보존하고 의존 결과는 제거한다", () => {
    vi.mocked(localStorage.getItem).mockReturnValue(JSON.stringify({
      version: 3, month: "2026-07", updatedAt: "now",
      settings: { month: "2026-07", titleColor: "#000", headerColor: "#fff", serviceSchedules: [{ source: "external" }], carSchedules: [] },
      votes: { month: "2026-07", rawText: "보존", serviceVotes: [], carVotes: [] },
      result: { generatedAt: "now", serviceRows: [], carRows: [], updatedMembers: [], issues: [] },
    }));
    const defaultSettings = { month: "2026-07", titleColor: "#123", headerColor: "#fff", serviceSchedules: [], carSchedules: [] };
    expect(mergeSnapshot("2026-07", { settings: defaultSettings })).toMatchObject({
      settings: defaultSettings,
      votes: { rawText: "보존" },
      result: undefined,
      saved: true,
    });
    const saved = JSON.parse(vi.mocked(localStorage.setItem).mock.calls[0][1]);
    expect(saved.votes.rawText).toBe("보존");
    expect(saved.result).toBeUndefined();
  });

  it("손상된 투표를 빈 투표로 병합할 때 정상 설정은 보존하고 의존 결과는 제거한다", () => {
    vi.mocked(localStorage.getItem).mockReturnValue(JSON.stringify({
      version: 3, month: "2026-07", updatedAt: "now", settings: validSettings,
      votes: { month: "2026-07", rawText: "", serviceVotes: [{ scheduleKey: "key", name: "홍길동", source: "external" }], carVotes: [] },
      result: { generatedAt: "now", serviceRows: [], carRows: [], updatedMembers: [], issues: [] },
    }));
    const nextVotes = { ...validVotes };
    expect(mergeSnapshot("2026-07", { votes: nextVotes })).toMatchObject({
      settings: validSettings,
      votes: nextVotes,
      result: undefined,
      saved: true,
    });
    const saved = JSON.parse(vi.mocked(localStorage.setItem).mock.calls[0][1]);
    expect(saved.result).toBeUndefined();
  });

  it("v3 CSV import 일정 출처를 복구해 이후 초기화에서 제거할 수 있다", () => {
    vi.mocked(localStorage.getItem).mockReturnValue(JSON.stringify({
      version: 3, month: "2026-07", updatedAt: "now",
      settings: { ...validSettings, serviceSchedules: [
        { key: "2026-07-01 11:00", date: "2026-07-01", time: "11:00", displayDate: "7/1", baseRoles: [], subRoles: [], source: "import" },
      ] },
    }));
    const settings = loadSnapshot("2026-07").settings;
    expect(settings?.serviceSchedules[0].source).toBe("import");
    expect(settings && removeOcrSchedules(settings, "all").serviceSchedules).toEqual([]);
  });

  it("결과 행의 알 수 없는 역할을 거부한다", () => {
    vi.mocked(localStorage.getItem).mockReturnValue(JSON.stringify({
      version: 3, month: "2026-07", updatedAt: "now",
      result: { generatedAt: "now", serviceRows: [{ displayDate: "7/1", roles: { 미지원: "홍길동" } }], carRows: [], updatedMembers: [], issues: [] },
    }));
    expect(loadSnapshot("2026-07").result).toBeUndefined();
  });

  it("쓰기 실패를 throw하지 않고 false로 알린다", () => {
    vi.mocked(localStorage.setItem).mockImplementation(() => { throw new Error("quota"); });
    expect(saveSnapshot({ version: 2, month: "2026-07", updatedAt: "now" })).toBe(false);
  });
});
