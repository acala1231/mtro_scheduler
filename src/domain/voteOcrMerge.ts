import type { VoteCountInfo, VoteEntry } from "./scheduleTypes";
import type { ParseVoteResult } from "./voteParser";

export type VoteOcrAttempt = {
  label: string;
  rawText: string;
  sanitizedRawText: string;
  parsed: ParseVoteResult;
  score: number;
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

function uniqueVoteCounts(counts: VoteCountInfo[]): VoteCountInfo[] {
  const seen = new Set<string>();
  return counts.filter((count) => {
    const key = `${count.kind}:${count.scheduleKey}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function entriesByKind(parsed: ParseVoteResult, kind: VoteCountInfo["kind"]): VoteEntry[] {
  return kind === "service" ? parsed.serviceVotes : parsed.carVotes;
}

function mergeEntriesByVoteCount(attempts: VoteOcrAttempt[], kind: VoteCountInfo["kind"], counts: VoteCountInfo[]): VoteEntry[] {
  const scheduleKeys = new Set<string>();
  attempts.forEach((attempt) => entriesByKind(attempt.parsed, kind).forEach((entry) => scheduleKeys.add(entry.scheduleKey)));
  counts.filter((count) => count.kind === kind).forEach((count) => scheduleKeys.add(count.scheduleKey));

  return uniqueVoteEntries(
    [...scheduleKeys].flatMap((scheduleKey) => {
      const expectedCount = counts.find((count) => count.kind === kind && count.scheduleKey === scheduleKey)?.expectedCount;
      if (expectedCount === undefined) {
        return attempts.flatMap((attempt) => entriesByKind(attempt.parsed, kind).filter((entry) => entry.scheduleKey === scheduleKey));
      }

      const rankedAttempts = attempts
        .map((attempt) => {
          const entries = entriesByKind(attempt.parsed, kind).filter((entry) => entry.scheduleKey === scheduleKey);
          return {
            entries,
            overflow: entries.length > expectedCount ? 1 : 0,
            distance: Math.abs(entries.length - expectedCount),
            score: attempt.score,
          };
        })
        .sort((a, b) => a.distance - b.distance || a.overflow - b.overflow || b.score - a.score);

      return rankedAttempts[0]?.entries ?? [];
    }),
  );
}

export function mergeVoteOcrAttempts(attempts: VoteOcrAttempt[], scoreVoteParse: (parsed: ParseVoteResult) => number): VoteOcrAttempt {
  const bestAttempt = attempts.reduce((best, attempt) => (attempt.score > best.score ? attempt : best), attempts[0]);
  const voteCounts = uniqueVoteCounts(attempts.flatMap((attempt) => attempt.parsed.voteCounts));
  const parsed: ParseVoteResult = {
    serviceVotes: mergeEntriesByVoteCount(attempts, "service", voteCounts),
    carVotes: mergeEntriesByVoteCount(attempts, "car", voteCounts),
    voteCounts,
    detectedMonths: [...new Set(attempts.flatMap((attempt) => attempt.parsed.detectedMonths))],
    unparsedLines: [...new Set(attempts.flatMap((attempt) => attempt.parsed.unparsedLines))],
  };

  return {
    label: "PSM 병합",
    rawText: attempts.map((attempt) => `[${attempt.label}]\n${attempt.rawText}`).join("\n\n"),
    sanitizedRawText: bestAttempt?.sanitizedRawText ?? "",
    parsed,
    score: scoreVoteParse(parsed),
  };
}
