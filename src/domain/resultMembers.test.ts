import { describe, expect, it } from "vitest";
import { recalculateResultMembers } from "./resultMembers";
import type { GenerateScheduleResult, Member } from "./scheduleTypes";

const members: Member[] = [
  {
    name: "홍길동",
    roles: { 정: true, 부: true, 향: true, 향합: true },
    counts: { 전체: 0, 정: 0, 부: 0, 향: 0, 향합: 0, 초1: 0, 초2: 0, 십자가: 0, 차량: 0 },
  },
  {
    name: "김철수",
    roles: { 정: true, 부: true, 향: true, 향합: true },
    counts: { 전체: 3, 정: 1, 부: 0, 향: 0, 향합: 0, 초1: 0, 초2: 0, 십자가: 0, 차량: 0 },
  },
];

const baseResult: GenerateScheduleResult = {
  serviceRows: [
    {
      displayDate: "7/19 (일) 11:00",
      roles: { 정: "홍길동", 부: "", 향: "", 향합: "" },
    },
  ],
  carRows: [{ displayDate: "7/19 (일) 09:40", name: "" }],
  updatedMembers: members,
  issues: [],
  generatedAt: "2026-07-15T00:00:00.000Z",
};

describe("recalculateResultMembers", () => {
  it("recalculates member counts from manually edited service results", () => {
    const updatedMembers = recalculateResultMembers({
      sourceMembers: members,
      serviceSchedules: [
        {
          key: "2026-07-19 11:00",
          date: "2026-07-19",
          time: "11:00",
          displayDate: "7/19 (일) 11:00",
          baseRoles: ["정", "부", "향", "향합"],
          subRoles: [],
        },
      ],
      carSchedules: [],
      result: {
        ...baseResult,
        serviceRows: [{ displayDate: "7/19 (일) 11:00", roles: { 정: "김철수", 부: "", 향: "", 향합: "" } }],
      },
    });

    expect(updatedMembers.find((member) => member.name === "홍길동")?.counts["전체"]).toBe(0);
    expect(updatedMembers.find((member) => member.name === "홍길동")?.counts["정"]).toBe(0);
    expect(updatedMembers.find((member) => member.name === "김철수")?.counts["전체"]).toBe(4);
    expect(updatedMembers.find((member) => member.name === "김철수")?.counts["정"]).toBe(2);
  });

  it("counts car service edits and does not add duplicate total count for same-day service role", () => {
    const updatedMembers = recalculateResultMembers({
      sourceMembers: members,
      serviceSchedules: [
        {
          key: "2026-07-19 11:00",
          date: "2026-07-19",
          time: "11:00",
          displayDate: "7/19 (일) 11:00",
          baseRoles: ["정"],
          subRoles: [],
        },
      ],
      carSchedules: [
        {
          key: "2026-07-19 09:40",
          date: "2026-07-19",
          time: "09:40",
          displayDate: "7/19 (일) 09:40",
        },
      ],
      result: {
        ...baseResult,
        serviceRows: [{ displayDate: "7/19 (일) 11:00", roles: { 정: "홍길동" } }],
        carRows: [{ displayDate: "7/19 (일) 09:40", name: "홍길동" }],
      },
    });

    const member = updatedMembers.find((item) => item.name === "홍길동");
    expect(member?.counts["전체"]).toBe(1);
    expect(member?.counts["정"]).toBe(1);
    expect(member?.counts["차량"]).toBe(1);
  });
});
