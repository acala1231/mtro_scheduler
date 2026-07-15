import type { VoteCountInfo, VoteEntry } from "./scheduleTypes";

export type OcrResolvedVoteEntry = {
  entry: VoteEntry;
  matchedByAlias: boolean;
};

function scheduleDate(scheduleKey: string): string {
  return scheduleKey.slice(0, 10);
}

function expectedCount(counts: VoteCountInfo[], scheduleKey: string, kind: VoteCountInfo["kind"]): number | undefined {
  return counts.find((count) => count.kind === kind && count.scheduleKey === scheduleKey)?.expectedCount;
}

export function rebalanceAliasVotes({
  serviceVotes,
  carVotes,
  voteCounts,
}: {
  serviceVotes: OcrResolvedVoteEntry[];
  carVotes: OcrResolvedVoteEntry[];
  voteCounts: VoteCountInfo[];
}): { serviceVotes: OcrResolvedVoteEntry[]; carVotes: OcrResolvedVoteEntry[] } {
  const nextService = [...serviceVotes];
  const nextCar = [...carVotes];

  for (let carIndex = nextCar.length - 1; carIndex >= 0; carIndex -= 1) {
    const candidate = nextCar[carIndex];
    if (!candidate.matchedByAlias || candidate.entry.name === "관리장님") continue;

    const carExpected = expectedCount(voteCounts, candidate.entry.scheduleKey, "car");
    if (carExpected === undefined) continue;
    const carGeneralCount = nextCar.filter(
      ({ entry }) => entry.scheduleKey === candidate.entry.scheduleKey && entry.name !== "관리장님",
    ).length;
    if (carGeneralCount <= carExpected) continue;

    const date = scheduleDate(candidate.entry.scheduleKey);
    const deficientServices = voteCounts.filter((count) => {
      if (count.kind !== "service" || scheduleDate(count.scheduleKey) !== date) return false;
      const actualCount = nextService.filter(({ entry }) => entry.scheduleKey === count.scheduleKey).length;
      return actualCount < count.expectedCount;
    });
    if (deficientServices.length !== 1) continue;

    const serviceCount = deficientServices[0];
    nextCar.splice(carIndex, 1);
    const alreadyInService = nextService.some(
      ({ entry }) => entry.scheduleKey === serviceCount.scheduleKey && entry.name === candidate.entry.name,
    );
    if (!alreadyInService) {
      nextService.push({
        ...candidate,
        entry: {
          ...candidate.entry,
          scheduleKey: serviceCount.scheduleKey,
          displayText: serviceCount.displayText,
        },
      });
    }
  }

  return { serviceVotes: nextService, carVotes: nextCar };
}
