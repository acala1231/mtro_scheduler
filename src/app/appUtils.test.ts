import { describe, expect, it } from "vitest";
import type { ParseVoteResult } from "../domain/voteParser";
import { scoreVoteParse } from "./appUtils";

function parsed(actual: number, expected: number, unparsedLines: string[] = []): ParseVoteResult {
  return {
    serviceVotes: Array.from({ length: actual }, (_, index) => ({ scheduleKey: "2026-07-05 11:00", displayText: "7/5", name: `회원${index}`, source: "ocr" })),
    carVotes: [],
    voteCounts: [{ scheduleKey: "2026-07-05 11:00", displayText: "7/5", kind: "service", expectedCount: expected }],
    detectedMonths: ["2026-07"],
    unparsedLines,
  };
}

describe("scoreVoteParse", () => {
  it("예상 인원수가 정확한 결과를 우선한다", () => {
    expect(scoreVoteParse(parsed(3, 3))).toBeGreaterThan(scoreVoteParse(parsed(2, 3)));
  });

  it("예상 인원을 넘긴 결과와 파싱 실패 줄을 감점한다", () => {
    expect(scoreVoteParse(parsed(4, 3))).toBeLessThan(scoreVoteParse(parsed(2, 3)));
    expect(scoreVoteParse(parsed(3, 3, ["잡음"]))).toBeLessThan(scoreVoteParse(parsed(3, 3)));
  });

  it("같은 일정 key라도 count 종류에 맞는 투표만 계산한다", () => {
    const result = parsed(3, 3);
    result.carVotes = [{ scheduleKey: "2026-07-05 11:00", displayText: "7/5", name: "차량회원", source: "ocr" }];
    expect(scoreVoteParse(result)).toBe(scoreVoteParse(parsed(3, 3)) + 10);
  });

  it("같은 종류와 일정의 중복 인원수는 점수에 한 번만 적용한다", () => {
    const result = parsed(3, 3);
    result.voteCounts.push({ ...result.voteCounts[0] });
    expect(scoreVoteParse(result)).toBe(scoreVoteParse(parsed(3, 3)));
  });
});
