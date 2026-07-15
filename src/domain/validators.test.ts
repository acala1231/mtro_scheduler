import { describe, expect, it } from "vitest";
import { validateMembers, validateVotes } from "./validators";
import { createDefaultSettings } from "./scheduleSettings";
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
  it("이름 기반 모델에서는 세례명이 달라도 같은 이름을 차단한다", () => {
    expect(validateMembers([member("홍길동", "베드로"), member("홍길동", "바오로")])).toEqual([
      expect.objectContaining({ severity: "error", code: "member.duplicate-name" }),
    ]);
  });

  it("같은 이름과 세례명 쌍도 중복으로 보고한다", () => {
    expect(validateMembers([member("홍길동", "베드로"), member("홍길동", "베드로")])).toEqual([
      expect.objectContaining({ severity: "error", code: "member.duplicate-name", target: { type: "member", id: "홍길동" } }),
    ]);
  });
});

describe("validateVotes", () => {
  it("설정에 연결되지 않은 투표는 생성 차단 오류다", () => {
    const issues = validateVotes(createDefaultSettings("2026-07"), [member("홍길동")], { month: "2026-07", rawText: "", serviceVotes: [{ scheduleKey: "removed", name: "홍길동" }], carVotes: [] });
    expect(issues).toEqual(expect.arrayContaining([expect.objectContaining({ severity: "error", code: "vote.unknown-schedule" })]));
  });
});
