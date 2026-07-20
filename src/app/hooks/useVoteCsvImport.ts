import { useEffect, useRef, useState } from "react";
import { readVoteCsvFile } from "../../data/voteCsvRepository";
import { importVoteCsv } from "../../domain/voteCsvImport";
import type { Member, ScheduleSettings, VoteData } from "../../domain/scheduleTypes";

export function useVoteCsvImport({ month, members, updateSettingsAndVotes }: {
  month: string;
  members: Member[];
  updateSettingsAndVotes: (updater: (current: { settings: ScheduleSettings; votes: VoteData }) => { settings: ScheduleSettings; votes: VoteData }) => void;
}) {
  const [voteCsvName, setVoteCsvName] = useState("");
  const [voteCsvError, setVoteCsvError] = useState("");
  const [isVoteCsvImporting, setIsVoteCsvImporting] = useState(false);
  const requestIdRef = useRef(0);

  useEffect(() => {
    requestIdRef.current += 1;
    setIsVoteCsvImporting(false);
  }, [month]);
  useEffect(() => () => { requestIdRef.current += 1; }, []);

  async function selectVoteCsv(file: File | undefined) {
    const requestId = ++requestIdRef.current;
    setVoteCsvName(file?.name ?? "");
    setVoteCsvError("");
    if (!file) return;
    setIsVoteCsvImporting(true);
    try {
      const text = await readVoteCsvFile(file);
      if (requestId !== requestIdRef.current) return;
      updateSettingsAndVotes(({ settings: latestSettings }) => importVoteCsv(text, month, latestSettings, members));
    } catch (error) {
      if (requestId !== requestIdRef.current) return;
      setVoteCsvError(error instanceof Error ? error.message : "투표결과 CSV를 가져오지 못했습니다.");
    } finally {
      if (requestId === requestIdRef.current) setIsVoteCsvImporting(false);
    }
  }

  function clearVoteCsv() {
    requestIdRef.current += 1;
    setVoteCsvName("");
    setVoteCsvError("");
    setIsVoteCsvImporting(false);
  }

  return { voteCsvName, voteCsvError, isVoteCsvImporting, selectVoteCsv, clearVoteCsv };
}
