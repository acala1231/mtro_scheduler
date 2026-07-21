import { describe, expect, it } from "vitest";
import { memberCountLabel } from "./memberListPresentation";

describe("memberCountLabel", () => {
  it("검색어가 없으면 전체 인원수를 표시한다", () => {
    expect(memberCountLabel("  ", 4, 4)).toBe("전체 4명");
  });

  it("검색 중이면 검색 결과와 전체 인원수를 함께 표시한다", () => {
    expect(memberCountLabel("베드로", 2, 4)).toBe("검색 2명 / 전체 4명");
    expect(memberCountLabel("없는 사람", 0, 4)).toBe("검색 0명 / 전체 4명");
  });
});
