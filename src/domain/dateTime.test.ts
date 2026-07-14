import { describe, expect, it } from "vitest";
import { formatDateKey, formatTimeText, makeScheduleKey } from "./dateTime";
import type { ServiceSchedule } from "./scheduleTypes";

describe("dateTime", () => {
  it("normalizes time text", () => {
    expect(formatTimeText("9:05")).toBe("09:05");
    expect(formatTimeText("0930")).toBe("09:30");
    expect(formatTimeText(0.5)).toBe("12:00");
  });

  it("creates schedule keys", () => {
    expect(makeScheduleKey("2026-07-19", "9:05")).toBe("2026-07-19 09:05");
  });

  it("matches display text to setting key", () => {
    const schedules: ServiceSchedule[] = [
      {
        key: "2026-07-19 10:30",
        date: "2026-07-19",
        time: "10:30",
        displayDate: "7/19 (일) 10:30",
        baseRoles: ["정"],
        subRoles: [],
      },
    ];

    expect(formatDateKey("7/19 10:30", schedules, 2026)).toBe("2026-07-19 10:30");
    expect(formatDateKey("7/19 (일) 10:30", schedules, 2026)).toBe("2026-07-19 10:30");
  });
});
