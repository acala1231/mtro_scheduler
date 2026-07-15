import { describe, expect, it } from "vitest";
import { membersFromCsv, membersToCsv } from "./memberCsv";
import type { Member } from "../domain/scheduleTypes";

describe("memberCsv", () => {
  it("허용된 최대 행 수와 셀 길이 경계는 파싱한다", () => {
    const longName = "가".repeat(500);
    const rows = Array.from({ length: 1_999 }, (_, index) => `${index === 0 ? longName : `이름${index}`},베드로`).join("\n");
    expect(membersFromCsv(`이름,세례명\n${rows}\n`)).toHaveLength(1_999);
  });

  it("최대 행 수를 넘으면 한국어 오류를 반환한다", () => {
    const rows = Array.from({ length: 2_000 }, (_, index) => `이름${index},베드로`).join("\n");
    expect(() => membersFromCsv(`이름,세례명\n${rows}\n`)).toThrow("명단은 최대 2000행");
  });

  it("셀 길이가 500자를 넘으면 한국어 오류를 반환한다", () => {
    expect(() => membersFromCsv(`이름,세례명\n${"가".repeat(501)},베드로\n`)).toThrow("셀은 최대 500자");
  });

  it("수식 문자로 시작하는 500자 셀은 안전 표식 추가 후에도 round-trip 된다", () => {
    const name = `=${"가".repeat(499)}`;
    const members: Member[] = [{
      name,
      baptismalName: "",
      roles: { 정: true, 부: false, 향: false, 향합: false },
      counts: { 전체: 0, 정: 0, 부: 0, 향: 0, 향합: 0, 초1: 0, 초2: 0, 십자가: 0, 차량: 0 },
    }];
    expect(membersFromCsv(membersToCsv(members))[0].name).toBe(name);
  });
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

  it("스프레드시트 수식으로 해석될 수 있는 셀을 중화한다", () => {
    const members: Member[] = [{
      name: "=HYPERLINK(\"https://example.com\")",
      baptismalName: "+cmd",
      roles: { 정: true, 부: false, 향: false, 향합: false },
      counts: { 전체: 0, 정: 0, 부: 0, 향: 0, 향합: 0, 초1: 0, 초2: 0, 십자가: 0, 차량: 0 },
    }];

    expect(membersToCsv(members)).toContain("'\u200B=HYPERLINK");
    expect(membersToCsv(members)).toContain("'\u200B+cmd");
    expect(membersFromCsv(membersToCsv(members))[0]).toMatchObject({ name: members[0].name, baptismalName: members[0].baptismalName });
  });

  it("사용자가 직접 입력한 아포스트로피는 가져올 때 제거하지 않는다", () => {
    expect(membersFromCsv("이름,세례명\n'=원문,'베드로\n")[0]).toMatchObject({ name: "'=원문", baptismalName: "'베드로" });
  });
});
