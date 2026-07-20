import { describe, expect, it } from "vitest";
import { createDefaultSettings } from "./scheduleSettings";
import { applyVoteOcrImport } from "./voteOcrImport";

describe("OCR 투표결과 원자 교체", () => {
  it("처리 중 최신 상태에 추가된 사용자 일정은 보존하고 이전 OCR 일정만 교체한다", () => {
    const settings = createDefaultSettings("2026-07");
    const manual = { ...settings.serviceSchedules[0], key: "manual", displayDate: "7월 30일", date: "2026-07-30", source: undefined };
    const previousOcr = { ...settings.serviceSchedules[0], key: "old-ocr", source: "ocr" as const };
    const current = { settings: { ...settings, serviceSchedules: [...settings.serviceSchedules, manual, previousOcr] }, votes: { month: "2026-07", rawText: "이전", serviceVotes: [], carVotes: [] } };
    const next = applyVoteOcrImport(current, { month: "2026-07", rawText: "신규", serviceVotes: [], carVotes: [], voteCounts: [] });
    expect(next.settings.serviceSchedules).toContainEqual(manual);
    expect(next.settings.serviceSchedules).not.toContainEqual(previousOcr);
    expect(next.votes.rawText).toBe("신규");
  });

  it("가져오기 월과 현재 데이터 월이 다르면 적용하지 않는다", () => {
    const settings = createDefaultSettings("2026-07");
    expect(() => applyVoteOcrImport({ settings, votes: { month: "2026-07", rawText: "", serviceVotes: [], carVotes: [] } }, { month: "2026-08", rawText: "", serviceVotes: [], carVotes: [], voteCounts: [] })).toThrow("기준월");
  });
});
