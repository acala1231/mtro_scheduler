import { describe, expect, it } from "vitest";
import { addVoteSchedulesToSettings, createCarSchedule, createDefaultSettings, createServiceSchedule, ensureDefaultScheduleData, makeUniqueScheduleTime, migrateVotesForSettingsChange, refreshCarSchedule, refreshServiceSchedule, removeOcrSchedules, resetOcrVoteSection } from "./scheduleSettings";
import type { ServiceSchedule } from "./scheduleTypes";

describe("createDefaultSettings", () => {
  it("이미지 투표에서 찾은 미등록 일정을 일반/차량 일정에 추가한다", () => {
    const settings = {
      ...createDefaultSettings("2026-07"),
      serviceSchedules: [],
      carSchedules: [],
    };

    const next = addVoteSchedulesToSettings(
      settings,
      [{ scheduleKey: "2026-07-12 10:30", displayText: "7/12 (일) 10:30", name: "홍길동", source: "ocr" }],
      [{ scheduleKey: "2026-07-12 09:20", displayText: "7/12 (일) 09:20", name: "김철수", source: "ocr" }],
    );

    expect(next.serviceSchedules).toEqual([expect.objectContaining({ key: "2026-07-12 10:30", date: "2026-07-12", time: "10:30", source: "ocr" })]);
    expect(next.carSchedules).toEqual([expect.objectContaining({ key: "2026-07-12 09:20", date: "2026-07-12", time: "09:20", source: "ocr" })]);
  });
  it("새 이미지 선택 전 OCR 자동 추가 일정만 제거한다", () => {
    const manual = createServiceSchedule("2026-07-03", "18:00");
    const ocr = { ...createServiceSchedule("2026-07-12", "10:30"), source: "ocr" as const };
    const settings = { ...createDefaultSettings("2026-07"), serviceSchedules: [manual, ocr] };

    const next = removeOcrSchedules(settings, "all");

    expect(next.serviceSchedules).toEqual([manual]);
    expect(next.carSchedules).toHaveLength(settings.carSchedules.length);
  });

  it("OCR 자동 추가 일정을 편집하면 영구 일정으로 전환한다", () => {
    const ocr = { ...createServiceSchedule("2026-07-12", "10:30"), source: "ocr" as const };

    expect(refreshServiceSchedule({ ...ocr, time: "11:00" })).not.toHaveProperty("source");
  });

  it("OCR 자동 추가 차량 일정을 편집하면 영구 일정으로 전환한다", () => {
    const ocr = { ...createCarSchedule("2026-07-12", "09:40"), source: "ocr" as const };

    expect(refreshCarSchedule({ ...ocr, time: "10:00" })).not.toHaveProperty("source");
  });

  it("새 이미지 일정 병합 시 이전 OCR 일정의 다른 시간을 되살리지 않는다", () => {
    const previousOcr = { ...createServiceSchedule("2026-07-12", "10:30"), source: "ocr" as const };
    const settings = { ...createDefaultSettings("2026-07"), serviceSchedules: [previousOcr], carSchedules: [] };

    const next = addVoteSchedulesToSettings(
      removeOcrSchedules(settings, "all"),
      [{ scheduleKey: "2026-07-12 11:30", displayText: "7/12 (일) 11:30", name: "홍길동", source: "ocr" }],
      [],
    );

    expect(next.serviceSchedules.map(({ key }) => key)).toEqual(["2026-07-12 11:30"]);
  });
  it("복사 투표 초기화는 복사 OCR 일정과 투표만 제거한다", () => {
    const permanentService = createServiceSchedule("2026-07-05", "11:00");
    const ocrService = { ...createServiceSchedule("2026-07-12", "11:30"), source: "ocr" as const };
    const permanentCar = createCarSchedule("2026-07-05", "09:40");
    const ocrCar = { ...createCarSchedule("2026-07-12", "10:00"), source: "ocr" as const };
    const settings = {
      ...createDefaultSettings("2026-07"),
      serviceSchedules: [permanentService, ocrService],
      carSchedules: [permanentCar, ocrCar],
    };
    const votes = {
      month: "2026-07", rawText: "OCR", serviceVotes: [{ scheduleKey: ocrService.key, name: "홍길동" }],
      carVotes: [{ scheduleKey: ocrCar.key, name: "김철수" }],
    };

    const next = resetOcrVoteSection(settings, votes, "service");

    expect(next.settings.serviceSchedules).toEqual([permanentService]);
    expect(next.settings.carSchedules).toEqual([permanentCar, ocrCar]);
    expect(next.votes.serviceVotes).toEqual([]);
    expect(next.votes.carVotes).toEqual(votes.carVotes);
  });

  it("차량 투표 초기화는 차량 OCR 일정만 제거하고 편집해 영구 전환된 일정은 유지한다", () => {
    const promoted = createCarSchedule("2026-07-12", "10:00");
    const ocrCar = { ...createCarSchedule("2026-07-19", "10:00"), source: "ocr" as const };
    const settings = { ...createDefaultSettings("2026-07"), carSchedules: [promoted, ocrCar] };
    const votes = { month: "2026-07", rawText: "OCR", serviceVotes: [{ scheduleKey: "service", name: "홍길동" }], carVotes: [{ scheduleKey: ocrCar.key, name: "김철수" }] };

    const next = resetOcrVoteSection(settings, votes, "car");

    expect(next.settings.carSchedules).toEqual([promoted]);
    expect(next.votes.carVotes).toEqual([]);
    expect(next.votes.serviceVotes).toEqual(votes.serviceVotes);
  });

  it("이미 등록된 투표 일정은 중복 추가하지 않는다", () => {
    const settings = createDefaultSettings("2026-07");
    const schedule = settings.serviceSchedules[0];

    const next = addVoteSchedulesToSettings(settings, [{ scheduleKey: schedule.key, name: "홍길동" }], []);

    expect(next.serviceSchedules).toHaveLength(settings.serviceSchedules.length);
  });

  it("OCR 도중 추가된 기존 일정은 보존하고 투표자가 없는 이미지 일정도 병합한다", () => {
    const editedSchedule = createServiceSchedule("2026-07-03", "18:00");
    const settings = { ...createDefaultSettings("2026-07"), serviceSchedules: [editedSchedule], carSchedules: [] };

    const next = addVoteSchedulesToSettings(settings, [], [], [
      { scheduleKey: "2026-07-12 11:00", displayText: "7/12 (일) 11:00", kind: "service", expectedCount: 0 },
    ]);

    expect(next.serviceSchedules.map(({ key }) => key)).toEqual([editedSchedule.key, "2026-07-12 11:00"]);
  });
  it("일정 key가 바뀌면 같은 위치의 투표를 새 key로 이관한다", () => {
    const previous = createDefaultSettings("2026-07");
    const next = { ...previous, serviceSchedules: previous.serviceSchedules.map((item, index) => index === 0 ? createServiceSchedule(item.date, "10:30") : item) };
    const votes = { month: "2026-07", rawText: "", serviceVotes: [{ scheduleKey: previous.serviceSchedules[0].key, name: "홍길동" }], carVotes: [] };
    expect(migrateVotesForSettingsChange(previous, next, votes).serviceVotes[0]).toMatchObject({ scheduleKey: next.serviceSchedules[0].key, displayText: next.serviceSchedules[0].displayDate });
  });
  it("변경 후 정렬 순서가 달라져도 명시한 key로 투표를 이관한다", () => {
    const previous = createDefaultSettings("2026-07");
    const oldSchedule = previous.serviceSchedules[2];
    const changed = createServiceSchedule("2026-07-01", "10:30");
    const next = { ...previous, serviceSchedules: [changed, ...previous.serviceSchedules.filter((item) => item.key !== oldSchedule.key)] };
    const votes = { month: "2026-07", rawText: "", serviceVotes: [{ scheduleKey: oldSchedule.key, name: "홍길동" }], carVotes: [] };
    expect(migrateVotesForSettingsChange(previous, next, votes, { service: new Map([[oldSchedule.key, changed.key]]) }).serviceVotes[0].scheduleKey).toBe(changed.key);
  });
  it("creates default Sunday service and car schedules for the month", () => {
    const settings = createDefaultSettings("2026-07");

    expect(settings.serviceSchedules.map((schedule) => schedule.date)).toEqual([
      "2026-07-05",
      "2026-07-12",
      "2026-07-19",
      "2026-07-26",
    ]);
    expect(settings.serviceSchedules.every((schedule) => schedule.time === "11:00")).toBe(true);
    expect(settings.serviceSchedules.every((schedule) => schedule.baseRoles.length === 4)).toBe(true);
    expect(settings.serviceSchedules.every((schedule) => schedule.subRoles.length === 0)).toBe(true);

    expect(settings.carSchedules.map((schedule) => schedule.date)).toEqual([
      "2026-07-05",
      "2026-07-12",
      "2026-07-19",
      "2026-07-26",
    ]);
    expect(settings.carSchedules.every((schedule) => schedule.time === "09:40")).toBe(true);
  });

  it("fills missing base schedules without replacing existing values", () => {
    const settings = ensureDefaultScheduleData({
      month: "2026-07",
      titleColor: "#000000",
      headerColor: "#ffffff",
      serviceSchedules: [],
      carSchedules: [
        {
          key: "2026-07-01 08:00",
          date: "2026-07-01",
          time: "08:00",
          displayDate: "7/1 (수) 08:00",
        },
      ],
    });

    expect(settings.serviceSchedules).toHaveLength(4);
    expect(settings.carSchedules).toHaveLength(1);
    expect(settings.carSchedules[0].time).toBe("08:00");
  });

  it("removes duplicated schedule keys when loading settings", () => {
    const duplicateSchedule: ServiceSchedule = {
      key: "2026-07-01 11:00",
      date: "2026-07-01",
      time: "11:00",
      displayDate: "7/1 (수) 11:00",
      baseRoles: ["정", "부", "향", "향합"],
      subRoles: [],
    };
    const settings = ensureDefaultScheduleData({
      month: "2026-07",
      titleColor: "#000000",
      headerColor: "#ffffff",
      serviceSchedules: [duplicateSchedule, { ...duplicateSchedule }],
      carSchedules: [],
    });

    expect(settings.serviceSchedules).toHaveLength(1);
  });

  it("finds the next available time for a schedule key", () => {
    expect(makeUniqueScheduleTime("2026-07-01", "11:00", ["2026-07-01 11:00"])).toBe("11:30");
  });
});
