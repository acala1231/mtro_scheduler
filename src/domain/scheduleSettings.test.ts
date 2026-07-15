import { describe, expect, it } from "vitest";
import { createDefaultSettings, createServiceSchedule, ensureDefaultScheduleData, makeUniqueScheduleTime, migrateVotesForSettingsChange } from "./scheduleSettings";
import type { ServiceSchedule } from "./scheduleTypes";

describe("createDefaultSettings", () => {
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
