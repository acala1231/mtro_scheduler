import { describe, expect, it } from "vitest";
import { createDefaultSettings, createServiceSchedule, removeOcrSchedules } from "./scheduleSettings";
import { parseVoteText } from "./voteParser";

describe("parseVoteText", () => {
  it("새 OCR 요청에서 제거한 이전 이미지 일정의 다른 시간으로 key를 되돌리지 않는다", () => {
    const previousOcr = { ...createServiceSchedule("2026-07-12", "10:30"), source: "ocr" as const };
    const settings = removeOcrSchedules({
      ...createDefaultSettings("2026-07"),
      serviceSchedules: [previousOcr],
      carSchedules: [],
    }, "all");

    const result = parseVoteText(
      "7/12 (일) 11:30 : 1명, 홍길동",
      settings.serviceSchedules,
      settings.carSchedules,
      2026,
    );

    expect(result.serviceVotes[0].scheduleKey).toBe("2026-07-12 11:30");
  });
  it("splits OCR-style comma separated Kakao poll text into schedule sections", () => {
    const settings = createDefaultSettings("2025-12");
    const result = parseVoteText(
      "투표현황, 2025년 12월 성인복사단 일정, 12/7 (일) 11:00 : 2명, 김하늘 베타, 박가람 감마23세, 12/14 (일) 11:00 차량봉사 : 1명, 최도윤 델타, 투표한 멤버가 없습니다.",
      settings.serviceSchedules,
      settings.carSchedules,
      2025,
    );

    expect(result.unparsedLines).toEqual([]);
    expect(result.serviceVotes.map((vote) => vote.name)).toEqual(["김하늘 베타", "박가람 감마 세"]);
    expect(result.carVotes.map((vote) => vote.name)).toEqual(["최도윤 델타"]);
    expect(result.carVotes[0].scheduleKey).toBe("2025-12-14 09:40");
    expect(result.carVotes[0].displayText).toBe("12/14 (일) 09:40");
  });

  it("keeps only Korean and English letters in names", () => {
    const settings = createDefaultSettings("2025-12");
    const result = parseVoteText(
      "12/7 (일) 11:00 : 2명, [2] 권다현 엡실론……, Bp John23",
      settings.serviceSchedules,
      settings.carSchedules,
      2025,
    );

    expect(result.serviceVotes.map((vote) => vote.name)).toEqual(["권다현 엡실론", "Bp John"]);
  });

  it("puts date vehicle-service time lines into car votes", () => {
    const settings = createDefaultSettings("2025-12");
    const result = parseVoteText(
      "12/7 (일) 11:00 : 1명, 김하늘 베타, 12/14 (일) 차량봉사 11:00 : 1명, 최도윤 델타",
      settings.serviceSchedules,
      settings.carSchedules,
      2025,
    );

    expect(result.serviceVotes.map((vote) => vote.name)).toEqual(["김하늘 베타"]);
    expect(result.carVotes.map((vote) => vote.name)).toEqual(["최도윤 델타"]);
    expect(result.carVotes[0].scheduleKey).toBe("2025-12-14 09:40");
    expect(result.carVotes[0].displayText).toBe("12/14 (일) 09:40");
  });

  it("records expected vote counts and manager fallback car votes", () => {
    const settings = createDefaultSettings("2026-03");
    const result = parseVoteText(
      "3/8 (일) 11:00: 5H\n권헌우\n3/29 (일) 차량봉사 관리장님 : 0명\n투표한 멤버가 없습니다.",
      settings.serviceSchedules,
      settings.carSchedules,
      2026,
    );

    expect(result.voteCounts).toEqual([
      { scheduleKey: "2026-03-08 11:00", displayText: "3/8 (일) 11:00", kind: "service", expectedCount: 5 },
      { scheduleKey: "2026-03-29 09:40", displayText: "3/29 (일) 09:40", kind: "car", expectedCount: 0 },
    ]);
    expect(result.carVotes).toEqual([
      { scheduleKey: "2026-03-29 09:40", displayText: "3/29 (일) 09:40", name: "관리장님", source: "ocr" },
    ]);
  });

  it("adds manager car votes whenever manager text appears", () => {
    const settings = createDefaultSettings("2026-03");
    const result = parseVoteText(
      "3/29 (일) 차량봉사 관리장님 : 1명",
      settings.serviceSchedules,
      settings.carSchedules,
      2026,
    );

    expect(result.carVotes).toEqual([
      { scheduleKey: "2026-03-29 09:40", displayText: "3/29 (일) 09:40", name: "관리장님", source: "ocr" },
    ]);
  });

  it("joins OCR-split times before parsing schedule lines", () => {
    const settings = createDefaultSettings("2026-03");
    const result = parseVoteText(
      "3/8 (일) 11:\n00 : 1명\n최대현",
      settings.serviceSchedules,
      settings.carSchedules,
      2026,
    );

    expect(result.serviceVotes).toEqual([
      { scheduleKey: "2026-03-08 11:00", displayText: "3/8 (일) 11:00", name: "최대현", source: "ocr" },
    ]);
  });

  it("날짜와 차량 헤더가 줄바꿈으로 분리되고 요일 닫는 괄호만 남아도 결합한다", () => {
    const settings = createDefaultSettings("2026-07");
    const result = parseVoteText(
      "7/12\n) 9:40 차량봉사 : 1명\n면진이형",
      settings.serviceSchedules,
      settings.carSchedules,
      2026,
    );

    expect(result.carVotes).toEqual([
      { scheduleKey: "2026-07-12 09:40", displayText: "7/12 (일) 09:40", name: "면진이형", source: "ocr" },
    ]);
    expect(result.voteCounts).toContainEqual({
      scheduleKey: "2026-07-12 09:40",
      displayText: "7/12 (일) 09:40",
      kind: "car",
      expectedCount: 1,
    });

    const splitWeekdayResult = parseVoteText(
      "7/12 (일\n) 9:40 차량봉사 : 1명\n면진이형",
      settings.serviceSchedules,
      settings.carSchedules,
      2026,
    );

    expect(splitWeekdayResult.carVotes).toEqual(result.carVotes);
  });

  it("normalizes two-digit OCR day overflows like 6/72 to 6/7", () => {
    const settings = createDefaultSettings("2026-06");
    const result = parseVoteText(
      "6/72 11:00 : 1명\n최대현",
      settings.serviceSchedules,
      settings.carSchedules,
      2026,
    );

    expect(result.serviceVotes).toEqual([
      { scheduleKey: "2026-06-07 11:00", displayText: "6/7 (일) 11:00", name: "최대현", source: "ocr" },
    ]);
  });

  it("adds manager car votes from date manager text without vehicle keyword", () => {
    const settings = createDefaultSettings("2026-03");
    const result = parseVoteText(
      "3/29 (일) 관리장님 : 0명",
      settings.serviceSchedules,
      settings.carSchedules,
      2026,
    );

    expect(result.carVotes).toEqual([
      { scheduleKey: "2026-03-29 09:40", displayText: "3/29 (일) 09:40", name: "관리장님", source: "ocr" },
    ]);
  });

  it("관리장님 예상 인원과 관계없이 특수 차량 투표를 유지한다", () => {
    const settings = createDefaultSettings("2026-03");
    const result = parseVoteText("3/29 (일) 관리장님 : 2명", settings.serviceSchedules, settings.carSchedules, 2026);

    expect(result.voteCounts[0]?.expectedCount).toBe(2);
    expect(result.carVotes).toEqual([
      { scheduleKey: "2026-03-29 09:40", displayText: "3/29 (일) 09:40", name: "관리장님", source: "ocr" },
    ]);
  });

  it("splits comma separated manager car lines even when the line has no time", () => {
    const settings = createDefaultSettings("2026-03");
    const result = parseVoteText(
      "3/15 (일) 차량봉사 9:40 : 1명, 이가온 제타, 3/29 (일) 차량봉사 관리장님 : 0명, 투표한 멤버가 없습니다.",
      settings.serviceSchedules,
      settings.carSchedules,
      2026,
    );

    expect(result.carVotes).toEqual([
      { scheduleKey: "2026-03-15 09:40", displayText: "3/15 (일) 09:40", name: "이가온 제타", source: "ocr" },
      { scheduleKey: "2026-03-29 09:40", displayText: "3/29 (일) 09:40", name: "관리장님", source: "ocr" },
    ]);
  });

  it("detects months from parsed schedule lines", () => {
    const settings = createDefaultSettings("2026-03");
    const result = parseVoteText(
      "4/5 (일) 11:00 : 1명\n김하늘 베타\n4/26 (일) 차량봉사 관리장님 : 0명",
      settings.serviceSchedules,
      settings.carSchedules,
      2026,
    );

    expect(result.detectedMonths).toEqual(["2026-04"]);
  });
});
