import { addVoteSchedulesToSettings, removeOcrSchedules } from "./scheduleSettings";
import type { ScheduleSettings, VoteCountInfo, VoteData, VoteEntry } from "./scheduleTypes";

export function applyVoteOcrImport(
  current: { settings: ScheduleSettings; votes: VoteData },
  imported: { month: string; rawText: string; serviceVotes: VoteEntry[]; carVotes: VoteEntry[]; voteCounts: VoteCountInfo[] },
) {
  if (current.settings.month !== imported.month || current.votes.month !== imported.month) {
    throw new Error("기준월이 변경되어 가져오기 결과를 적용할 수 없습니다.");
  }
  const importedEntries = [...imported.serviceVotes, ...imported.carVotes];
  if (importedEntries.some((entry) => !entry.scheduleKey.startsWith(`${imported.month}-`))) {
    throw new Error("가져오기 결과에 기준월과 다른 일정이 있습니다.");
  }
  const settingsWithoutPreviousImport = removeOcrSchedules(current.settings, "all");
  return {
    settings: addVoteSchedulesToSettings(settingsWithoutPreviousImport, imported.serviceVotes, imported.carVotes, imported.voteCounts),
    votes: { ...current.votes, month: imported.month, rawText: imported.rawText, serviceVotes: imported.serviceVotes, carVotes: imported.carVotes },
  };
}
