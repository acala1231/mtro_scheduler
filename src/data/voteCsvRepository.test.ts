import { describe, expect, it } from "vitest";
import { SAMPLE_VOTE_CSV, parseVoteCsvFile } from "./voteCsvRepository";
import { createDefaultSettings } from "../domain/scheduleSettings";
import { importVoteCsv } from "../domain/voteCsvImport";

describe("투표결과 CSV 파일", () => {
  it("샘플 양식은 투표결과 CSV로 정상 파싱된다", () => {
    const result = importVoteCsv(SAMPLE_VOTE_CSV, "2026-07", createDefaultSettings("2026-07"), [{
      name: "홍길동",
      roles: { 정: true, 부: true, 향: true, 향합: true },
      counts: { 전체: 0, 정: 0, 부: 0, 향: 0, 향합: 0, 초1: 0, 초2: 0, 십자가: 0, 차량: 0 },
    }]);

    expect(SAMPLE_VOTE_CSV.endsWith("\n")).toBe(true);
    expect(SAMPLE_VOTE_CSV.startsWith("구분,날짜,시간,이름\n")).toBe(true);
    expect(result.votes.serviceVotes).toHaveLength(1);
    expect(result.votes.carVotes).toHaveLength(1);
  });

  it("1MB 초과 파일은 읽기 전에 거부한다", async () => {
    const file = new File([new Uint8Array(1024 * 1024 + 1)], "votes.csv", { type: "text/csv" });
    await expect(parseVoteCsvFile(file, "2026-07", createDefaultSettings("2026-07"), [])).rejects.toThrow("최대 1MB");
  });

  it("파일 읽기 예외를 사용자 메시지로 변환한다", async () => {
    const file = new File(["x"], "votes.csv", { type: "text/csv" });
    Object.defineProperty(file, "text", { value: () => Promise.reject(new Error("private detail")) });
    await expect(parseVoteCsvFile(file, "2026-07", createDefaultSettings("2026-07"), [])).rejects.toThrow("파일을 읽을 수 없습니다");
  });
});
