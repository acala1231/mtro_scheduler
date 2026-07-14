import { describe, expect, it } from "vitest";
import { resolveMemberNameFromText, resolveMemberNamesFromText } from "./memberMatcher";
import type { Member } from "./scheduleTypes";

const members: Member[] = [
  {
    name: "김창규",
    baptismalName: "안젤로",
    roles: { 정: true, 부: true, 향: true, 향합: true },
    counts: { 전체: 0, 정: 0, 부: 0, 향: 0, 향합: 0, 초1: 0, 초2: 0, 십자가: 0, 차량: 0 },
  },
  {
    name: "김남호",
    baptismalName: "안젤로",
    roles: { 정: true, 부: true, 향: true, 향합: true },
    counts: { 전체: 0, 정: 0, 부: 0, 향: 0, 향합: 0, 초1: 0, 초2: 0, 십자가: 0, 차량: 0 },
  },
  {
    name: "황민수",
    baptismalName: "요한 23세",
    roles: { 정: true, 부: true, 향: true, 향합: true },
    counts: { 전체: 0, 정: 0, 부: 0, 향: 0, 향합: 0, 초1: 0, 초2: 0, 십자가: 0, 차량: 0 },
  },
  {
    name: "조대현",
    baptismalName: "이시돌",
    roles: { 정: true, 부: true, 향: true, 향합: true },
    counts: { 전체: 0, 정: 0, 부: 0, 향: 0, 향합: 0, 초1: 0, 초2: 0, 십자가: 0, 차량: 0 },
  },
  {
    name: "권현우",
    baptismalName: "프란치스코",
    roles: { 정: true, 부: true, 향: true, 향합: true },
    counts: { 전체: 0, 정: 0, 부: 0, 향: 0, 향합: 0, 초1: 0, 초2: 0, 십자가: 0, 차량: 0 },
  },
  {
    name: "문석완",
    baptismalName: "야고보",
    roles: { 정: true, 부: true, 향: true, 향합: true },
    counts: { 전체: 0, 정: 0, 부: 0, 향: 0, 향합: 0, 초1: 0, 초2: 0, 십자가: 0, 차량: 0 },
  },
];

describe("resolveMemberNameFromText", () => {
  it("matches names embedded in noisy OCR text", () => {
    expect(resolveMemberNameFromText(members, "반디 oases 0 김창규 안젤로")).toBe("김창규");
  });

  it("uses baptismal names with real names for similar OCR text", () => {
    expect(resolveMemberNameFromText(members, "김남호 인젤로")).toBe("김남호");
  });

  it("does not match ambiguous baptismal names alone", () => {
    expect(resolveMemberNameFromText(members, "안젤로")).toBeUndefined();
  });

  it("filters out unknown names", () => {
    expect(resolveMemberNameFromText(members, "없는사람")).toBeUndefined();
  });

  it("extracts multiple exact member names from one noisy OCR segment", () => {
    expect(resolveMemberNamesFromText(members, "Sie 중3동성당 조대현... @권현우")).toEqual(["조대현", "권현우"]);
  });

  it("handles short or confused OCR name fragments", () => {
    expect(resolveMemberNamesFromText(members, "대현")).toEqual(["조대현"]);
    expect(resolveMemberNamesFromText(members, "권헌우")).toEqual(["권현우"]);
    expect(resolveMemberNamesFromText(members, "확민수")).toEqual(["황민수"]);
    expect(resolveMemberNamesFromText(members, "무석완")).toEqual(["문석완"]);
  });

  it("does not use two-letter suffixes inside longer unrelated tokens", () => {
    expect(resolveMemberNamesFromText(members, "김현우")).toEqual([]);
  });
});
