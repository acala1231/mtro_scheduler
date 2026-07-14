import { describe, expect, it } from "vitest";
import { generateSchedule } from "./assignmentEngine";
import type { Member } from "./scheduleTypes";

const baseMembers: Member[] = [
  {
    name: "홍길동",
    roles: { 정: true, 부: true, 향: false, 향합: false },
    counts: { 전체: 0, 정: 0, 부: 0, 향: 0, 향합: 0, 초1: 0, 초2: 0, 십자가: 0, 차량: 0 },
  },
  {
    name: "김철수",
    roles: { 정: true, 부: true, 향: true, 향합: true },
    counts: { 전체: 1, 정: 1, 부: 0, 향: 0, 향합: 0, 초1: 0, 초2: 0, 십자가: 0, 차량: 0 },
  },
  {
    name: "이영희",
    roles: { 정: false, 부: true, 향: true, 향합: true },
    counts: { 전체: 0, 정: 0, 부: 0, 향: 0, 향합: 0, 초1: 0, 초2: 0, 십자가: 0, 차량: 0 },
  },
];

describe("generateSchedule", () => {
  it("assigns enabled roles from voted members", () => {
    const result = generateSchedule({
      members: baseMembers,
      serviceSchedules: [
        {
          key: "2026-07-19 10:30",
          date: "2026-07-19",
          time: "10:30",
          displayDate: "7/19 (일) 10:30",
          baseRoles: ["정", "부"],
          subRoles: [],
        },
      ],
      carSchedules: [],
      serviceVotes: [
        { scheduleKey: "2026-07-19 10:30", name: "홍길동" },
        { scheduleKey: "2026-07-19 10:30", name: "김철수" },
      ],
      carVotes: [],
    });

    expect(result.serviceRows[0].roles["정"]).toBe("홍길동");
    expect(result.serviceRows[0].roles["부"]).toBe("김철수");
  });

  it("marks missing candidates as X", () => {
    const result = generateSchedule({
      members: baseMembers,
      serviceSchedules: [
        {
          key: "2026-07-19 10:30",
          date: "2026-07-19",
          time: "10:30",
          displayDate: "7/19 (일) 10:30",
          baseRoles: ["향"],
          subRoles: [],
        },
      ],
      carSchedules: [],
      serviceVotes: [{ scheduleKey: "2026-07-19 10:30", name: "홍길동" }],
      carVotes: [],
    });

    expect(result.serviceRows[0].roles["향"]).toBe("X");
    expect(result.issues.some((issue) => issue.code === "assignment.no-role-candidate")).toBe(true);
  });

  it("assigns car service before service roles on the same date", () => {
    const result = generateSchedule({
      members: baseMembers,
      serviceSchedules: [
        {
          key: "2026-07-19 10:30",
          date: "2026-07-19",
          time: "10:30",
          displayDate: "7/19 (일) 10:30",
          baseRoles: ["정"],
          subRoles: [],
        },
      ],
      carSchedules: [
        {
          key: "2026-07-19 10:00",
          date: "2026-07-19",
          time: "10:00",
          displayDate: "7/19 (일) 10:00",
        },
      ],
      serviceVotes: [
        { scheduleKey: "2026-07-19 10:30", name: "홍길동" },
        { scheduleKey: "2026-07-19 10:30", name: "김철수" },
      ],
      carVotes: [{ scheduleKey: "2026-07-19 10:00", name: "홍길동" }],
    });

    expect(result.carRows[0].name).toBe("홍길동");
    expect(result.serviceRows[0].roles["정"]).toBe("홍길동");
  });
});
