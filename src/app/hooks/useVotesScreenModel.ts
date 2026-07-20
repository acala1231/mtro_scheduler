import type { Member, ScheduleSettings, VoteData, ServiceSchedule, CarSchedule } from "../../domain/scheduleTypes";
import { useVoteCsvImport } from "./useVoteCsvImport";
import { useVoteOcr } from "./useVoteOcr";

export function useVotesScreenModel(input: {
  month: string;
  settings: ScheduleSettings;
  members: Member[];
  votes: VoteData;
  updateSettingsAndVotes: (updater: (current: { settings: ScheduleSettings; votes: VoteData }) => { settings: ScheduleSettings; votes: VoteData }) => void;
  resetVotes: (kind: "service" | "car") => void;
  replaceVoteSchedule: (kind: "service" | "car", schedule: ServiceSchedule | CarSchedule, names: string[]) => void;
}) {
  const ocr = useVoteOcr(input);
  const csv = useVoteCsvImport(input);
  return { settings: input.settings, members: input.members, votes: input.votes, resetVotes: input.resetVotes, replaceVoteSchedule: input.replaceVoteSchedule, ...ocr, ...csv };
}

export type VotesScreenModel = ReturnType<typeof useVotesScreenModel>;
