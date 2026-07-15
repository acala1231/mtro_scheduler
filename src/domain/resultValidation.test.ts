import { describe, expect, it } from "vitest";
import { validateCarResultRow, validateServiceResultRow } from "./resultValidation";

const names = ["홍길동", "김철수"];

describe("resultValidation", () => {
  it("명단에 없는 이름과 같은 일정의 중복 배정을 거부한다", () => {
    expect(validateServiceResultRow({ displayDate: "7/1", roles: { 정: "홍길동", 부: "홍길동", 향: "외부인" } }, names)).toHaveLength(2);
  });

  it("빈 값과 X, 차량 관리장님은 허용한다", () => {
    expect(validateServiceResultRow({ displayDate: "7/1", roles: { 정: "", 부: "X" } }, names)).toEqual([]);
    expect(validateCarResultRow({ displayDate: "7/1", name: "관리장님" }, names)).toEqual([]);
  });
});
