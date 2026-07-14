import { describe, expect, it } from "vitest";
import { validateMembers } from "./validators";
import type { Member } from "./scheduleTypes";

function member(name: string, baptismalName = ""): Member {
  return {
    name,
    baptismalName,
    roles: { 정: true, 부: true, 향: true, 향합: true },
    counts: { 전체: 0, 정: 0, 부: 0, 향: 0, 향합: 0, 초1: 0, 초2: 0, 십자가: 0, 차량: 0 },
  };
}

describe("validateMembers", () => {
  it("allows same names when baptismal names differ", () => {
    expect(validateMembers([member("홍길동", "베드로"), member("홍길동", "바오로")])).toEqual([]);
  });

  it("reports duplicate name and baptismal name pairs", () => {
    expect(validateMembers([member("홍길동", "베드로"), member("홍길동", "베드로")])).toEqual([
      {
        severity: "error",
        code: "member.duplicate-name",
        message: "명단에 중복 이름/세례명이 있습니다: 홍길동 베드로",
        target: { type: "member", id: "홍길동:베드로" },
      },
    ]);
  });
});
