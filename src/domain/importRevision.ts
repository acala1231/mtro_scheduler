import type { Member, ScheduleSettings } from "./scheduleTypes";

export function importRevision(month: string, settings: ScheduleSettings, members: Member[]): string {
  return JSON.stringify({ month, settings, members: members.map(({ id, name, baptismalName, feastDay, alias, roles }) => ({ id, name, baptismalName, feastDay, alias, roles })) });
}
