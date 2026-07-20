import { describe, expect, it } from "vitest";
import { createMember, updateMember } from "./memberEditing";

const existing = createMember({ name: " 홍길동 ", baptismalName: " 베드로 ", feastDay: "9/5", roles: { 정: true } as never });

describe("명단 편집 규칙", () => {
  it("추가와 수정 모두 문자열·축일·역할·횟수를 정규화한다", () => {
    expect(existing).toMatchObject({ name: "홍길동", baptismalName: "베드로", feastDay: "09/05", roles: { 정: true, 부: false } });
    expect(updateMember(existing, { alias: " 길동 ", counts: { 전체: -2 } as never })).toMatchObject({ alias: "길동", counts: { 전체: 0 } });
  });

  it("이름 공란과 중복 이름을 추가·수정에서 동일하게 거부한다", () => {
    expect(() => createMember({ name: " " })).toThrow("이름을 입력");
    expect(() => createMember({ name: "홍길동" }, [existing])).toThrow("중복된 명단");
    expect(() => updateMember(existing, { name: " " })).toThrow("이름을 입력");
    expect(() => updateMember(existing, { name: "김철수" }, [{ ...existing, id: "other", name: "김철수" }])).toThrow("중복된 명단");
  });
});
