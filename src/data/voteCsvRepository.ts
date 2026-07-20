import { importVoteCsv } from "../domain/voteCsvImport";
import type { Member, ScheduleSettings, VoteData } from "../domain/scheduleTypes";

const MAX_VOTE_CSV_FILE_BYTES = 1024 * 1024;

export const SAMPLE_VOTE_CSV = `구분,날짜,시간,이름
복사일정,2026-07-05,09:00,홍길동
차량봉사,2026-07-05,09:00,홍길동
`;

export async function readVoteCsvFile(file: File): Promise<string> {
  if (file.size > MAX_VOTE_CSV_FILE_BYTES) throw new Error("투표결과 CSV 파일은 최대 1MB까지 등록할 수 있습니다.");
  try {
    return await file.text();
  } catch {
    throw new Error("투표결과 CSV 파일을 읽을 수 없습니다.");
  }
}

export async function parseVoteCsvFile(file: File, month: string, settings: ScheduleSettings, members: Member[]): Promise<{ settings: ScheduleSettings; votes: VoteData }> {
  const text = await readVoteCsvFile(file);
  return importVoteCsv(text, month, settings, members);
}
