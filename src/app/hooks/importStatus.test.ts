import { describe, expect, it } from "vitest";
import { importStatusReducer, staleImportMessage } from "./importStatus";

describe("가져오기 상태", () => {
  it("처리·성공·실패를 배타적인 상태로 관리한다", () => {
    expect(importStatusReducer({ state: "idle" }, { type: "start", fileName: "a.csv" })).toEqual({ state: "processing", fileName: "a.csv" });
    expect(importStatusReducer({ state: "processing", fileName: "a.csv" }, { type: "success", fileName: "a.csv", message: "완료" })).toEqual({ state: "success", fileName: "a.csv", message: "완료" });
    expect(importStatusReducer({ state: "processing", fileName: "a.csv" }, { type: "error", fileName: "a.csv", message: "실패" })).toEqual({ state: "error", fileName: "a.csv", message: "실패" });
  });

  it.each(["파일", "이미지"] as const)("%s 처리 중 투표 변경 가능성을 안내한다", (subject) => {
    expect(staleImportMessage(subject)).toContain("투표결과");
    expect(staleImportMessage(subject)).toContain(`${subject}${subject === "이미지" ? "를" : "을"} 다시 선택`);
  });
});
