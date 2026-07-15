import { describe, expect, it } from "vitest";
import type { VoteCountInfo, VoteEntry } from "./scheduleTypes";
import { rebalanceAliasVotes, type OcrResolvedVoteEntry } from "./voteAliasRebalance";

const matched = (scheduleKey: string, name: string, matchedByAlias = false): OcrResolvedVoteEntry => ({
  entry: { scheduleKey, displayText: scheduleKey, name, source: "ocr" },
  matchedByAlias,
});

const count = (scheduleKey: string, kind: VoteCountInfo["kind"], expectedCount: number): VoteCountInfo => ({
  scheduleKey,
  displayText: scheduleKey,
  kind,
  expectedCount,
});

describe("rebalanceAliasVotes", () => {
  it("복사 인원이 하나 부족하고 차량 일반회원이 하나 초과한 날짜의 별칭 항목을 복사로 이동한다", () => {
    const serviceKey = "2026-07-12 11:00";
    const carKey = "2026-07-12 09:40";
    const result = rebalanceAliasVotes({
      serviceVotes: [matched(serviceKey, "회원1"), matched(serviceKey, "회원2"), matched(serviceKey, "회원3")],
      carVotes: [matched(carKey, "차량회원"), matched(carKey, "별칭회원", true)],
      voteCounts: [count(serviceKey, "service", 4), count(carKey, "car", 1)],
    });

    expect(result.serviceVotes.map(({ entry }) => entry.name)).toEqual(["회원1", "회원2", "회원3", "별칭회원"]);
    expect(result.carVotes.map(({ entry }) => entry.name)).toEqual(["차량회원"]);
    expect(result.serviceVotes[3]?.entry).toMatchObject({ scheduleKey: serviceKey, displayText: serviceKey });
  });

  it("관리장님은 차량 인원에서 제외하고 expected 0을 초과한 별칭 항목만 복사로 이동한다", () => {
    const serviceKey = "2026-07-26 11:00";
    const carKey = "2026-07-26 09:40";
    const result = rebalanceAliasVotes({
      serviceVotes: [matched(serviceKey, "회원1"), matched(serviceKey, "회원2"), matched(serviceKey, "회원3")],
      carVotes: [matched(carKey, "관리장님"), matched(carKey, "별칭회원", true)],
      voteCounts: [count(serviceKey, "service", 4), count(carKey, "car", 0)],
    });

    expect(result.serviceVotes.map(({ entry }) => entry.name)).toContain("별칭회원");
    expect(result.carVotes.map(({ entry }) => entry.name)).toEqual(["관리장님"]);
  });

  it("표시 인원과 일치하는 정상 별칭 차량 투표는 유지한다", () => {
    const serviceKey = "2026-07-12 11:00";
    const carKey = "2026-07-12 09:40";
    const result = rebalanceAliasVotes({
      serviceVotes: [matched(serviceKey, "회원1")],
      carVotes: [matched(carKey, "별칭회원", true)],
      voteCounts: [count(serviceKey, "service", 1), count(carKey, "car", 1)],
    });

    expect(result.carVotes.map(({ entry }) => entry.name)).toEqual(["별칭회원"]);
  });

  it("실제 이름으로 매칭된 차량 투표와 count 정보가 없는 항목은 이동하지 않는다", () => {
    const serviceKey = "2026-07-12 11:00";
    const carKey = "2026-07-12 09:40";
    const actualNameResult = rebalanceAliasVotes({
      serviceVotes: [matched(serviceKey, "회원1")],
      carVotes: [matched(carKey, "실명회원")],
      voteCounts: [count(serviceKey, "service", 2), count(carKey, "car", 0)],
    });
    const noCountsResult = rebalanceAliasVotes({
      serviceVotes: [matched(serviceKey, "회원1")],
      carVotes: [matched(carKey, "별칭회원", true)],
      voteCounts: [],
    });

    expect(actualNameResult.carVotes).toHaveLength(1);
    expect(noCountsResult.carVotes).toHaveLength(1);
  });

  it("같은 별칭 회원이 복사에 이미 있으면 차량 오배치만 제거하고 복사 중복은 만들지 않는다", () => {
    const serviceKey = "2026-07-12 11:00";
    const carKey = "2026-07-12 09:40";
    const result = rebalanceAliasVotes({
      serviceVotes: [matched(serviceKey, "별칭회원"), matched(serviceKey, "회원2")],
      carVotes: [matched(carKey, "별칭회원", true), matched(carKey, "별칭회원", true)],
      voteCounts: [count(serviceKey, "service", 3), count(carKey, "car", 0)],
    });

    expect(result.serviceVotes.filter(({ entry }) => entry.name === "별칭회원")).toHaveLength(1);
    expect(result.carVotes.filter(({ entry }) => entry.name === "별칭회원")).toHaveLength(0);
  });
});
