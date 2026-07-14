import { describe, expect, it } from "vitest";
import { membersFromCsv, membersToCsv } from "./memberCsv";
import type { Member } from "../domain/scheduleTypes";

describe("memberCsv", () => {
  it("parses Korean member CSV headers", () => {
    expect(membersFromCsv("이름,세례명,정,부,향,향합\n홍길동,베드로,true,false,예,\n")).toEqual([
      {
        name: "홍길동",
        baptismalName: "베드로",
        roles: {
          정: true,
          부: false,
          향: true,
          향합: false,
        },
      },
    ]);
  });

  it("serializes members with Korean headers", () => {
    const members: Member[] = [
      {
        name: "홍길동",
        baptismalName: "베드로",
        roles: { 정: true, 부: false, 향: true, 향합: false },
        counts: { 전체: 0, 정: 0, 부: 0, 향: 0, 향합: 0, 초1: 0, 초2: 0, 십자가: 0, 차량: 0 },
      },
    ];

    expect(membersToCsv(members)).toBe("이름,세례명,정,부,향,향합\n홍길동,베드로,true,false,true,false\n");
  });
});
