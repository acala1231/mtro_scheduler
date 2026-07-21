import { useEffect, useReducer, useRef } from "react";
import { readVoteCsvFile } from "../../data/voteCsvRepository";
import { importVoteCsv } from "../../domain/voteCsvImport";
import type { Member, ScheduleSettings, VoteData } from "../../domain/scheduleTypes";
import { importRevision } from "../../domain/importRevision";
import { importStatusReducer, staleImportMessage } from "./importStatus";

export function useVoteCsvImport({ month, settings, members, votes, updateSettingsAndVotes }: {
  month: string;
  settings: ScheduleSettings;
  members: Member[];
  votes: VoteData;
  updateSettingsAndVotes: (updater: (current: { settings: ScheduleSettings; votes: VoteData }) => { settings: ScheduleSettings; votes: VoteData }) => void;
}) {
  const [status, dispatch] = useReducer(importStatusReducer, { state: "idle" });
  const requestIdRef = useRef(0);
  const latestMonthRef = useRef(month);
  const latestMembersRef = useRef(members);
  latestMonthRef.current = month;
  latestMembersRef.current = members;

  useEffect(() => {
    requestIdRef.current += 1;
    dispatch({ type: "reset" });
  }, [month]);
  useEffect(() => () => { requestIdRef.current += 1; }, []);

  async function selectVoteCsv(file: File | undefined) {
    const requestId = ++requestIdRef.current;
    if (!file) { dispatch({ type: "reset" }); return; }
    const fileName = file.name;
    const requestRevision = importRevision(month, settings, members, votes);
    dispatch({ type: "start", fileName });
    try {
      const text = await readVoteCsvFile(file);
      if (requestId !== requestIdRef.current) return;
      let counts = { service: 0, car: 0 };
      let stale = false;
      updateSettingsAndVotes(({ settings: latestSettings, votes }) => {
        if (latestMonthRef.current !== month || importRevision(month, latestSettings, latestMembersRef.current, votes) !== requestRevision) { stale = true; return { settings: latestSettings, votes }; }
        const imported = importVoteCsv(text, month, latestSettings, members);
        counts = { service: imported.votes.serviceVotes.length, car: imported.votes.carVotes.length };
        return imported;
      });
      if (stale) throw new Error(staleImportMessage("파일"));
      dispatch({ type: "success", fileName, message: `복사일정 ${counts.service}건, 차량봉사 ${counts.car}건을 가져왔습니다.` });
    } catch (error) {
      if (requestId !== requestIdRef.current) return;
      dispatch({ type: "error", fileName, message: `${error instanceof Error ? error.message : "투표결과 CSV를 가져오지 못했습니다."} 기존 투표결과는 유지됩니다.` });
    }
  }

  function clearVoteCsv() {
    requestIdRef.current += 1;
    dispatch({ type: "reset" });
  }

  return { voteCsvName: status.state === "idle" ? "" : status.fileName, voteCsvError: status.state === "error" ? status.message : "", voteCsvSuccess: status.state === "success" ? status.message : "", isVoteCsvImporting: status.state === "processing", selectVoteCsv, clearVoteCsv };
}
