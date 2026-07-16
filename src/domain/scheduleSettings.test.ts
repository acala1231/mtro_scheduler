import { describe, expect, it } from "vitest";
import { addVoteSchedulesToSettings, createDefaultSettings, createServiceSchedule, ensureDefaultScheduleData, makeUniqueScheduleTime, migrateVotesForSettingsChange } from "./scheduleSettings";
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

    expect(next.serviceSchedules).toEqual([expect.objectContaining({ key: "2026-07-12 10:30", date: "2026-07-12", time: "10:30" })]);
    expect(next.carSchedules).toEqual([expect.objectContaining({ key: "2026-07-12 09:20", date: "2026-07-12", time: "09:20" })]);
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
