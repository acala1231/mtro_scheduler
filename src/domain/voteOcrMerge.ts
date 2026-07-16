import type { VoteCountInfo, VoteEntry } from "./scheduleTypes";
import type { OcrResolvedVoteEntry } from "./voteAliasRebalance";
import type { ParseVoteResult } from "./voteParser";

export type VoteOcrAttempt = {
  label: string;
  rawText: string;
  sanitizedRawText: string;
  parsed: ParseVoteResult;
  score: number;
  resolvedVotes?: {
    serviceVotes: OcrResolvedVoteEntry[];
    carVotes: OcrResolvedVoteEntry[];
  };
};

function uniqueVoteEntries(entries: VoteEntry[]): VoteEntry[] {
  const seen = new Set<string>();
  return entries.filter((entry) => {
    const dedupeKey = `${entry.scheduleKey}:${entry.name}`;
    if (seen.has(dedupeKey)) return false;
    seen.add(dedupeKey);
    return true;
  });
}

function entriesByKind(parsed: ParseVoteResult, kind: VoteCountInfo["kind"]): VoteEntry[] {
  return kind === "service" ? parsed.serviceVotes : parsed.carVotes;
}

function resolvedEntriesByKind(attempt: VoteOcrAttempt, kind: VoteCountInfo["kind"]): OcrResolvedVoteEntry[] {
  const resolved = kind === "service" ? attempt.resolvedVotes?.serviceVotes : attempt.resolvedVotes?.carVotes;
  return resolved ?? entriesByKind(attempt.parsed, kind).map((entry) => ({ entry, matchedByAlias: false }));
}

function weakestMatchRank(entries: OcrResolvedVoteEntry[]): number {
  const ranks = { exact: 4, nickname: 3, alias: 2, fuzzy: 1 };
  return entries.reduce((weakest, entry) => {
    const kind = entry.matchKind ?? (entry.matchedByAlias ? "alias" : "exact");
    return Math.min(weakest, ranks[kind]);
  }, Number.POSITIVE_INFINITY);
}

function selectDetectedMonths(attempts: VoteOcrAttempt[]): string[] {
  const candidates = new Map<string, { votes: number; bestScore: number }>();
  attempts.forEach((attempt) => {
    new Set(attempt.parsed.detectedMonths).forEach((month) => {
      const current = candidates.get(month) ?? { votes: 0, bestScore: Number.NEGATIVE_INFINITY };
      candidates.set(month, { votes: current.votes + 1, bestScore: Math.max(current.bestScore, attempt.score) });
    });
  });

  const selected = [...candidates.entries()].sort(
    ([monthA, a], [monthB, b]) => b.votes - a.votes || b.bestScore - a.bestScore || monthA.localeCompare(monthB),
  )[0];
  return selected ? [selected[0]] : [];
}

function mergeKind(
  attempts: VoteOcrAttempt[],
  kind: VoteCountInfo["kind"],
  detectedMonths: string[],
): { entries: VoteEntry[]; resolvedEntries: OcrResolvedVoteEntry[]; counts: VoteCountInfo[] } {
  const scheduleKeys = new Set<string>();
  attempts.forEach((attempt) => resolvedEntriesByKind(attempt, kind).forEach(({ entry }) => scheduleKeys.add(entry.scheduleKey)));
  attempts.forEach((attempt) => attempt.parsed.voteCounts.filter((count) => count.kind === kind).forEach((count) => scheduleKeys.add(count.scheduleKey)));
  if (detectedMonths.length > 0) {
    scheduleKeys.forEach((scheduleKey) => {
      if (!detectedMonths.includes(scheduleKey.slice(0, 7))) scheduleKeys.delete(scheduleKey);
    });
  }
  const selectedCounts: VoteCountInfo[] = [];

  const selectedResolvedEntries =
    [...scheduleKeys].flatMap((scheduleKey) => {
      const candidates = attempts.map((attempt) => {
        const entries = resolvedEntriesByKind(attempt, kind).filter(({ entry }) => entry.scheduleKey === scheduleKey);
        const count = attempt.parsed.voteCounts.find((item) => item.kind === kind && item.scheduleKey === scheduleKey);
        return {
          entries,
          count,
          distance: count ? Math.abs(entries.length - count.expectedCount) : Number.POSITIVE_INFINITY,
          overflow: count && entries.length > count.expectedCount ? 1 : 0,
          matchRank: kind === "car" ? weakestMatchRank(entries) : 0,
          score: attempt.score,
        };
      });
      const countedCandidates = candidates.filter((candidate) => candidate.count);
      if (countedCandidates.length === 0) {
        return attempts.flatMap((attempt) => resolvedEntriesByKind(attempt, kind).filter(({ entry }) => entry.scheduleKey === scheduleKey));
      }

      const selected = countedCandidates.sort(
        (a, b) => a.distance - b.distance || a.overflow - b.overflow || b.matchRank - a.matchRank || b.score - a.score,
      )[0];
      if (selected.count) selectedCounts.push(selected.count);
      return selected.entries;
    });
  const seen = new Set<string>();
  const resolvedEntries = selectedResolvedEntries.filter(({ entry }) => {
    const key = `${entry.scheduleKey}:${entry.name}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return { entries: uniqueVoteEntries(resolvedEntries.map(({ entry }) => entry)), resolvedEntries, counts: selectedCounts };
}

export function mergeVoteOcrAttempts(attempts: VoteOcrAttempt[], scoreVoteParse: (parsed: ParseVoteResult) => number): VoteOcrAttempt {
  const bestAttempt = attempts.reduce((best, attempt) => (attempt.score > best.score ? attempt : best), attempts[0]);
  const detectedMonths = selectDetectedMonths(attempts);
  const service = mergeKind(attempts, "service", detectedMonths);
  const car = mergeKind(attempts, "car", detectedMonths);
  const voteCounts = [...service.counts, ...car.counts];
  const parsed: ParseVoteResult = {
    serviceVotes: service.entries,
    carVotes: car.entries,
    voteCounts,
    detectedMonths,
    unparsedLines: [...new Set(attempts.flatMap((attempt) => attempt.parsed.unparsedLines))],
  };

  return {
    label: "PSM 병합",
    rawText: attempts.map((attempt) => `[${attempt.label}]\n${attempt.rawText}`).join("\n\n"),
    sanitizedRawText: bestAttempt?.sanitizedRawText ?? "",
    parsed,
    score: scoreVoteParse(parsed),
    resolvedVotes: {
      serviceVotes: service.resolvedEntries,
      carVotes: car.resolvedEntries,
    },
  };
}
