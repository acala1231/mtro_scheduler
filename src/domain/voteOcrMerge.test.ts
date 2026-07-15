import { describe, expect, it } from "vitest";
import { mergeVoteOcrAttempts, type VoteOcrAttempt } from "./voteOcrMerge";
import { rebalanceAliasVotes } from "./voteAliasRebalance";

function attempt(label: string, expectedCount: number, entryCount: number, score: number): VoteOcrAttempt {
  const scheduleKey = "2026-07-05 11:00";
  return {
    label,
    rawText: label,
    sanitizedRawText: label,
    score,
    parsed: {
      serviceVotes: Array.from({ length: entryCount }, (_, index) => ({ scheduleKey, displayText: "7/5", name: `${label}${index}`, source: "ocr" })),
      carVotes: [],
      voteCounts: [{ scheduleKey, displayText: "7/5", kind: "service", expectedCount }],
      detectedMonths: ["2026-07"],
      unparsedLines: [],
    },
  };
}

describe("mergeVoteOcrAttempts", () => {
  it("각 시도의 자체 표시 인원수로 후보를 평가하고 채택된 count를 유지한다", () => {
    const binary = attempt("binary", 8, 6, 100);
    const grayscale = attempt("grayscale", 3, 3, 80);
    const result = mergeVoteOcrAttempts([binary, grayscale], () => 0);

    expect(result.parsed.serviceVotes.map((entry) => entry.name)).toEqual(["grayscale0", "grayscale1", "grayscale2"]);
    expect(result.parsed.voteCounts[0]?.expectedCount).toBe(3);
  });

  it("서로 다른 시도에서 선택된 count와 별칭 메타데이터를 병합 후 재배치할 수 있게 보존한다", () => {
    const serviceKey = "2026-07-12 11:00";
    const carKey = "2026-07-12 09:40";
    const serviceEntries = ["회원1", "회원2", "회원3"].map((name) => ({
      scheduleKey: serviceKey,
      displayText: "7/12 11:00",
      name,
      source: "ocr" as const,
    }));
    const carEntries = ["차량회원", "별칭회원"].map((name) => ({
      scheduleKey: carKey,
      displayText: "7/12 09:40",
      name,
      source: "ocr" as const,
    }));
    const serviceAttempt: VoteOcrAttempt = {
      label: "service",
      rawText: "",
      sanitizedRawText: "",
      score: 10,
      parsed: {
        serviceVotes: serviceEntries,
        carVotes: [],
        voteCounts: [{ scheduleKey: serviceKey, displayText: "7/12 11:00", kind: "service", expectedCount: 4 }],
        detectedMonths: ["2026-07"],
        unparsedLines: [],
      },
      resolvedVotes: {
        serviceVotes: serviceEntries.map((entry) => ({ entry, matchedByAlias: false })),
        carVotes: [],
      },
    };
    const carAttempt: VoteOcrAttempt = {
      label: "car",
      rawText: "",
      sanitizedRawText: "",
      score: 10,
      parsed: {
        serviceVotes: [],
        carVotes: carEntries,
        voteCounts: [{ scheduleKey: carKey, displayText: "7/12 09:40", kind: "car", expectedCount: 1 }],
        detectedMonths: ["2026-07"],
        unparsedLines: [],
      },
      resolvedVotes: {
        serviceVotes: [],
        carVotes: carEntries.map((entry) => ({ entry, matchedByAlias: entry.name === "별칭회원" })),
      },
    };

    const merged = mergeVoteOcrAttempts([serviceAttempt, carAttempt], () => 0);
    const rebalanced = rebalanceAliasVotes({
      serviceVotes: merged.resolvedVotes?.serviceVotes ?? [],
      carVotes: merged.resolvedVotes?.carVotes ?? [],
      voteCounts: merged.parsed.voteCounts,
    });

    expect(rebalanced.serviceVotes.map(({ entry }) => entry.name)).toEqual(["회원1", "회원2", "회원3", "별칭회원"]);
    expect(rebalanced.carVotes.map(({ entry }) => entry.name)).toEqual(["차량회원"]);
  });
});
