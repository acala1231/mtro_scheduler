import { describe, expect, it } from "vitest";
import { resolveMemberMatchesFromText, resolveMemberMatchFromText, resolveMemberNameFromText, resolveMemberNamesFromText } from "./memberMatcher";
import type { Member } from "./scheduleTypes";

const members: Member[] = [
  {
    name: "가나다",
    baptismalName: "알파",
    roles: { 정: true, 부: true, 향: true, 향합: true },
    counts: { 전체: 0, 정: 0, 부: 0, 향: 0, 향합: 0, 초1: 0, 초2: 0, 십자가: 0, 차량: 0 },
  },
  {
    name: "라마바",
    baptismalName: "알파",
    roles: { 정: true, 부: true, 향: true, 향합: true },
    counts: { 전체: 0, 정: 0, 부: 0, 향: 0, 향합: 0, 초1: 0, 초2: 0, 십자가: 0, 차량: 0 },
  },
  {
    name: "황가온",
    baptismalName: "베타",
    roles: { 정: true, 부: true, 향: true, 향합: true },
    counts: { 전체: 0, 정: 0, 부: 0, 향: 0, 향합: 0, 초1: 0, 초2: 0, 십자가: 0, 차량: 0 },
  },
  {
    name: "최대현",
    baptismalName: "감마",
    roles: { 정: true, 부: true, 향: true, 향합: true },
    counts: { 전체: 0, 정: 0, 부: 0, 향: 0, 향합: 0, 초1: 0, 초2: 0, 십자가: 0, 차량: 0 },
  },
  {
    name: "권다현",
    baptismalName: "델타",
    roles: { 정: true, 부: true, 향: true, 향합: true },
    counts: { 전체: 0, 정: 0, 부: 0, 향: 0, 향합: 0, 초1: 0, 초2: 0, 십자가: 0, 차량: 0 },
  },
  {
    name: "문라온",
    baptismalName: "엡실론",
    roles: { 정: true, 부: true, 향: true, 향합: true },
    counts: { 전체: 0, 정: 0, 부: 0, 향: 0, 향합: 0, 초1: 0, 초2: 0, 십자가: 0, 차량: 0 },
  },
  {
    name: "윤마루",
    baptismalName: "제타",
    alias: "H",
    roles: { 정: true, 부: true, 향: true, 향합: true },
    counts: { 전체: 0, 정: 0, 부: 0, 향: 0, 향합: 0, 초1: 0, 초2: 0, 십자가: 0, 차량: 0 },
  },
];

describe("resolveMemberNameFromText", () => {
  it("matches names embedded in noisy OCR text", () => {
    expect(resolveMemberNameFromText(members, "반디 oases 0 가나다 알파")).toBe("가나다");
  });

  it("uses baptismal names with member names for similar OCR text", () => {
    expect(resolveMemberNameFromText(members, "라마바 알바")).toBe("라마바");
  });

  it("does not match ambiguous baptismal names alone", () => {
    expect(resolveMemberNameFromText(members, "알파")).toBeUndefined();
  });

  it("filters out unknown names", () => {
    expect(resolveMemberNameFromText(members, "없는사람")).toBeUndefined();
  });

  it("extracts multiple exact member names from one noisy OCR segment", () => {
    expect(resolveMemberNamesFromText(members, "Sie 예시문구 최대현... @권다현")).toEqual(["최대현", "권다현"]);
  });

  it("handles short or confused OCR name fragments", () => {
    expect(resolveMemberNamesFromText(members, "대현")).toEqual(["최대현"]);
    expect(resolveMemberNamesFromText(members, "권다헌")).toEqual(["권다현"]);
    expect(resolveMemberNamesFromText(members, "확가온")).toEqual(["황가온"]);
    expect(resolveMemberNamesFromText(members, "무라온")).toEqual(["문라온"]);
  });

  it("does not use two-letter suffixes inside longer unrelated tokens", () => {
    expect(resolveMemberNamesFromText(members, "김대현")).toEqual([]);
  });

  it("이름의 고유한 두 글자 뒤에 호칭이 붙은 카카오 닉네임을 매칭한다", () => {
    expect(resolveMemberNamesFromText(members, "대현이형")).toEqual(["최대현"]);
    expect(resolveMemberNamesFromText(members, "대현형님")).toEqual(["최대현"]);
    expect(resolveMemberMatchFromText(members, "대현이형")).toEqual({
      name: "최대현",
      matchedByAlias: false,
      matchKind: "nickname",
    });
  });

  it("명단의 유일한 별칭을 대소문자와 공백을 정규화해 이름으로 매핑한다", () => {
    expect(resolveMemberNameFromText(members, "H")).toBe("윤마루");
    expect(resolveMemberNameFromText(members, "  h  ")).toBe("윤마루");
    expect(resolveMemberNamesFromText(members, " H ")).toEqual(["윤마루"]);
    expect(resolveMemberMatchFromText(members, " H ")).toEqual({ name: "윤마루", matchedByAlias: true, matchKind: "alias" });
    expect(resolveMemberMatchFromText(members, "윤마루")).toEqual({ name: "윤마루", matchedByAlias: false, matchKind: "exact" });
  });

  it("별칭이 없으면 매핑하지 않는다", () => {
    const membersWithoutAlias = members.map((member) => ({ ...member, alias: undefined }));

    expect(resolveMemberNameFromText(membersWithoutAlias, "H")).toBeUndefined();
    expect(resolveMemberNamesFromText(membersWithoutAlias, "h")).toEqual([]);
  });

  it("중복 별칭은 어느 명단에도 매핑하지 않는다", () => {
    const membersWithDuplicateAlias = members.map((member, index) => index < 2 ? { ...member, alias: "H" } : member);

    expect(resolveMemberNameFromText(membersWithDuplicateAlias, "H")).toBeUndefined();
  });

  it("독립된 별칭이 아닌 다른 문자열의 일부는 별칭으로 처리하지 않는다", () => {
    expect(resolveMemberNameFromText(members, "Hector")).toBeUndefined();
    expect(resolveMemberNameFromText(members, "형님 H")).toBeUndefined();
    expect(resolveMemberNameFromText(members, "HH")).toBeUndefined();
  });

  it("별칭이 다른 회원의 기존 세례명 매칭을 가로채지 않는다", () => {
    const membersWithConflictingAlias = members.map((member) =>
      member.name === "가나다" ? { ...member, alias: "감마" } : member,
    );

    expect(resolveMemberNameFromText(membersWithConflictingAlias, "감마")).toBe("최대현");
  });

  it("별칭이 다른 회원의 실제 이름과 충돌하면 실제 이름을 우선한다", () => {
    const membersWithConflictingAlias = members.map((member) =>
      member.name === "윤마루" ? { ...member, alias: "권다현" } : member,
    );

    expect(resolveMemberNameFromText(membersWithConflictingAlias, "권다현")).toBe("권다현");
    expect(resolveMemberMatchesFromText(membersWithConflictingAlias, "권다현")).toEqual([
      { name: "권다현", matchedByAlias: false, matchKind: "exact" },
    ]);
  });

  it("별칭이 다른 회원의 고유 세례명과 충돌하면 세례명 회원만 반환한다", () => {
    const membersWithConflictingAlias = members.map((member) =>
      member.name === "윤마루" ? { ...member, alias: "감마" } : member,
    );

    expect(resolveMemberMatchesFromText(membersWithConflictingAlias, "감마")).toEqual([
      { name: "최대현", matchedByAlias: false, matchKind: "fuzzy" },
    ]);
  });

  it("한 OCR 문자열의 회원 이름과 독립 별칭을 위치 순서대로 함께 추출한다", () => {
    expect(resolveMemberMatchesFromText(members, "문라온 엡실... H")).toEqual([
      { name: "문라온", matchedByAlias: false, matchKind: "exact" },
      { name: "윤마루", matchedByAlias: true, matchKind: "alias" },
    ]);
    expect(resolveMemberMatchesFromText(members, "감마 안내문 H")).toEqual([
      { name: "최대현", matchedByAlias: false, matchKind: "fuzzy" },
      { name: "윤마루", matchedByAlias: true, matchKind: "alias" },
    ]);
  });
});
