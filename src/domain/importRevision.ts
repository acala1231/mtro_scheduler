import type { Member, ScheduleSettings, VoteData } from "./scheduleTypes";

export function importRevision(month: string, settings: ScheduleSettings, members: Member[], votes: VoteData): string {
  return JSON.stringify({ month, settings, members: members.map(({ id, name, baptismalName, feastDay, alias, roles }) => ({ id, name, baptismalName, feastDay, alias, roles })), votes });
}
