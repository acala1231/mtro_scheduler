import { describe, expect, it } from "vitest";
import type { Member } from "./scheduleTypes";
import { sortVisibleMembers, type MemberSortKey } from "./memberSorting";

const roles = { 정: true, 부: true, 향: true, 향합: true };

function member(name: string, baptismalName = "", feastDay = "", totalCount = 0): Member {
  return {
    name,
    baptismalName,
    feastDay,
    roles,
    counts: { 전체: totalCount, 정: 0, 부: 0, 향: 0, 향합: 0, 초1: 0, 초2: 0, 십자가: 0, 차량: 0 },
  };
}

function sortedNames(sortKey: MemberSortKey, members: Member[]) {
  return sortVisibleMembers(
    members.map((item, index) => ({ key: String(index), member: item, index })),
    sortKey,
  ).map(({ member: item }) => item.name);
}

describe("memberSorting", () => {
  it.each([
    ["name", [member("하늘"), member("가람"), member("나래")], ["가람", "나래", "하늘"]],
    ["baptismalName", [member("다", ""), member("나", "베드로"), member("가", "베드로"), member("라", "가브리엘")], ["라", "가", "나", "다"]],
    ["feastDay", [member("다", "", ""), member("나", "", "06/29"), member("가", "", "06/29"), member("라", "", "01/01")], ["라", "가", "나", "다"]],
    ["assignmentCount", [member("다", "", "", 2), member("나", "", "", 1), member("가", "", "", 1)], ["가", "나", "다"]],
  ] satisfies Array<[MemberSortKey, Member[], string[]]>)('%s 기준 오름차순이며 동률은 이름순, 공란은 마지막이다', (sortKey, members, expected) => {
    expect(sortedNames(sortKey, members)).toEqual(expected);
  });

  it("배정 많은순은 전체 배정 수 내림차순이며 동률은 이름순과 원본 인덱스 순이다", () => {
    const firstSameName = member("동명", "", "", 3);
    const secondSameName = member("동명", "", "", 3);
    const sorted = sortVisibleMembers([
      { key: "few", member: member("가람", "", "", 1), index: 0 },
      { key: "second", member: secondSameName, index: 8 },
      { key: "other-name", member: member("나래", "", "", 3), index: 5 },
      { key: "first", member: firstSameName, index: 3 },
    ], "assignmentCountDesc");

    expect(sorted.map(({ key }) => key)).toEqual(["other-name", "first", "second", "few"]);
  });

  it("선택 기준과 이름이 같으면 원본 인덱스 순서를 유지한다", () => {
    const first = member("동명", "베드로");
    const second = member("동명", "베드로");
    const sorted = sortVisibleMembers([
      { key: "second", member: second, index: 8 },
      { key: "first", member: first, index: 3 },
    ], "baptismalName");

    expect(sorted.map(({ key }) => key)).toEqual(["first", "second"]);
    expect(sorted.map(({ index }) => index)).toEqual([3, 8]);
  });
});
