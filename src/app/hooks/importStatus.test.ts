import { describe, expect, it } from "vitest";
import { importStatusReducer } from "./importStatus";

describe("가져오기 상태", () => {
  it("처리·성공·실패를 배타적인 상태로 관리한다", () => {
    expect(importStatusReducer({ state: "idle" }, { type: "start", fileName: "a.csv" })).toEqual({ state: "processing", fileName: "a.csv" });
    expect(importStatusReducer({ state: "processing", fileName: "a.csv" }, { type: "success", fileName: "a.csv", message: "완료" })).toEqual({ state: "success", fileName: "a.csv", message: "완료" });
    expect(importStatusReducer({ state: "processing", fileName: "a.csv" }, { type: "error", fileName: "a.csv", message: "실패" })).toEqual({ state: "error", fileName: "a.csv", message: "실패" });
  });
});
