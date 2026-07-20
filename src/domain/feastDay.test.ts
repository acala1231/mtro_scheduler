import { describe, expect, it } from "vitest";
import { compareMembersByFeastDay, normalizeFeastDay } from "./feastDay";
import type { Member } from "./scheduleTypes";

const member = (name: string, feastDay = "") => ({ name, feastDay } as Member);

describe("feastDay", () => {
  it("공란과 윤년 2월 29일을 허용하고 표시 형식으로 정규화한다", () => {
    expect(normalizeFeastDay(" ")).toBe("");
    expect(normalizeFeastDay("2/29")).toBe("02/29");
    expect(() => normalizeFeastDay("04/31")).toThrow("MM/dd");
  });

  it("축일, 이름 순으로 정렬하고 공란은 마지막에 둔다", () => {
    const members = [member("나", ""), member("다", "06/29"), member("가", "06/29"), member("라", "01/01")];
    expect([...members].sort(compareMembersByFeastDay).map((item) => item.name)).toEqual(["라", "가", "다", "나"]);
  });
});
