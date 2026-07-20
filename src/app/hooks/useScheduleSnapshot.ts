import { useEffect, useRef, useState } from "react";
import { loadLastMonth, loadSnapshot, mergeSnapshot } from "../../data/localScheduleStore";
import { createDefaultSettings, dedupeSchedulesByKey, ensureDefaultScheduleData, migrateVotesForSettingsChange } from "../../domain/scheduleSettings";
import type { GenerateScheduleResult, ScheduleSettings, VoteData } from "../../domain/scheduleTypes";
import { currentMonth, sortSettingsSchedules } from "../appUtils";

export function useScheduleSnapshot() {
  const initialMonth = loadLastMonth(currentMonth());
  const [month, setMonth] = useState(initialMonth);
  const [settings, setSettings] = useState<ScheduleSettings>(() => createDefaultSettings(initialMonth));
  const [votes, setVotes] = useState<VoteData>(() => ({ month: initialMonth, rawText: "", serviceVotes: [], carVotes: [] }));
  const [result, setResult] = useState<GenerateScheduleResult | undefined>();
  const [savedState, setSavedState] = useState("저장됨");
  const settingsRef = useRef(settings);
  const votesRef = useRef(votes);

  useEffect(() => {
    const snapshot = loadSnapshot(month);
    const nextSettings = sortSettingsSchedules(ensureDefaultScheduleData(snapshot.settings ?? createDefaultSettings(month)));
    const nextVotes = snapshot.votes ?? { month, rawText: "", serviceVotes: [], carVotes: [] };
    votesRef.current = nextVotes;
    settingsRef.current = nextSettings;
    setVotes(nextVotes);
    setResult(snapshot.result);
    setSettings(nextSettings);
    if (!snapshot.settings || snapshot.settings.serviceSchedules.length === 0 || snapshot.settings.carSchedules.length === 0) {
      mergeSnapshot(month, { settings: nextSettings });
    }
  }, [month]);

  function persist(patch: { settings?: ScheduleSettings; votes?: VoteData; result?: GenerateScheduleResult | undefined }) {
    setSavedState("저장 중");
    const saved = mergeSnapshot(month, patch).saved;
    window.setTimeout(() => setSavedState(saved ? "저장됨" : "저장 실패"), 150);
  }

  function updateSettings(next: ScheduleSettings, replacements?: { service?: Map<string, string>; car?: Map<string, string> }) {
    const sortedSettings = sortSettingsSchedules({
      ...next,
      serviceSchedules: dedupeSchedulesByKey(next.serviceSchedules),
      carSchedules: dedupeSchedulesByKey(next.carSchedules),
    });
    setSettings(sortedSettings);
    const migratedVotes = migrateVotesForSettingsChange(settingsRef.current, sortedSettings, votesRef.current, replacements);
    settingsRef.current = sortedSettings;
    votesRef.current = migratedVotes;
    setVotes(migratedVotes);
    setResult(undefined);
    persist({ settings: sortedSettings, votes: migratedVotes, result: undefined });
  }

  function updateVotes(next: VoteData) {
    votesRef.current = next;
    setVotes(next);
    setResult(undefined);
    persist({ votes: next, result: undefined });
  }

  function updateSettingsAndVotes(
    updater: (current: { settings: ScheduleSettings; votes: VoteData }) => { settings: ScheduleSettings; votes: VoteData },
  ) {
    const current = { settings: settingsRef.current, votes: votesRef.current };
    const next = updater(current);
    if (next.settings === current.settings && next.votes === current.votes) return;
    const sortedSettings = sortSettingsSchedules({
      ...next.settings,
      serviceSchedules: dedupeSchedulesByKey(next.settings.serviceSchedules),
      carSchedules: dedupeSchedulesByKey(next.settings.carSchedules),
    });
    settingsRef.current = sortedSettings;
    votesRef.current = next.votes;
    setSettings(sortedSettings);
    setVotes(next.votes);
    setResult(undefined);
    persist({ settings: sortedSettings, votes: next.votes, result: undefined });
  }

  function updateResult(next: GenerateScheduleResult) {
    setResult(next);
    persist({ result: next });
  }

  function invalidateResult() {
    setResult(undefined);
    persist({ result: undefined });
  }

  return {
    month,
    setMonth,
    settings,
    votes,
    result,
    savedState,
    setSavedState,
    updateSettings,
    updateVotes,
    updateSettingsAndVotes,
    updateResult,
    invalidateResult,
  };
}
