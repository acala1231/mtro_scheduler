import type { RefObject } from "react";
import { generateSchedule } from "../../domain/assignmentEngine";
import { recalculateResultMembers } from "../../domain/resultMembers";
import { validateCarResultRow, validateServiceResultRow } from "../../domain/resultValidation";
import {
  createCarSchedule,
  createDefaultSettings,
  createServiceSchedule,
  makeUniqueScheduleTime,
  refreshCarSchedule,
  refreshServiceSchedule,
  resetOcrVoteSection,
} from "../../domain/scheduleSettings";
import type {
  CarResultRow,
  CarSchedule,
  GenerateScheduleResult,
  Member,
  ScheduleResultRow,
  ScheduleSettings,
  ServiceSchedule,
  VoteData,
} from "../../domain/scheduleTypes";
import { exportScheduleImage } from "../../export/exportScheduleImage";
import { firstDateOfMonth, sortByKey } from "../appUtils";

export function useScheduleResult({
  month,
  settings,
  votes,
  result,
  sourceMembers,
  canGenerate,
  previewRef,
  updateSettings,
  updateVotes,
  updateSettingsAndVotes,
  updateResult,
  setSavedState,
}: {
  month: string;
  settings: ScheduleSettings;
  votes: VoteData;
  result: GenerateScheduleResult | undefined;
  sourceMembers: Member[];
  canGenerate: boolean;
  previewRef: RefObject<HTMLDivElement | null>;
  updateSettings: (settings: ScheduleSettings, replacements?: { service?: Map<string, string>; car?: Map<string, string> }) => void;
  updateVotes: (votes: VoteData) => void;
  updateSettingsAndVotes: (
    updater: (current: { settings: ScheduleSettings; votes: VoteData }) => { settings: ScheduleSettings; votes: VoteData },
  ) => void;
  updateResult: (result: GenerateScheduleResult) => void;
  setSavedState: (state: string) => void;
}) {
  const memberNames = sourceMembers.map((member) => member.name);

  function saveEditedResult(nextResult: GenerateScheduleResult) {
    updateResult({
      ...nextResult,
      updatedMembers: recalculateResultMembers({
        sourceMembers,
        serviceSchedules: settings.serviceSchedules,
        carSchedules: settings.carSchedules,
        result: nextResult,
      }),
    });
  }

  function addServiceSchedule() {
    const date = firstDateOfMonth(month);
    const time = makeUniqueScheduleTime(date, "11:00", settings.serviceSchedules.map((schedule) => schedule.key));
    const schedule = createServiceSchedule(date, time);
    updateSettings({ ...settings, serviceSchedules: sortByKey([...settings.serviceSchedules, schedule]) });
    return schedule;
  }

  function addCarSchedule() {
    const date = firstDateOfMonth(month);
    const time = makeUniqueScheduleTime(date, "09:40", settings.carSchedules.map((schedule) => schedule.key));
    const schedule = createCarSchedule(date, time);
    updateSettings({ ...settings, carSchedules: sortByKey([...settings.carSchedules, schedule]) });
    return schedule;
  }

  function resetServiceSchedules() {
    updateSettings({ ...settings, serviceSchedules: createDefaultSettings(month).serviceSchedules });
  }

  function resetCarSchedules() {
    updateSettings({ ...settings, carSchedules: createDefaultSettings(month).carSchedules });
  }

  function resetScheduleColors() {
    const defaults = createDefaultSettings(month);
    updateSettings({ ...settings, titleColor: defaults.titleColor, headerColor: defaults.headerColor });
  }

  function updateServiceSchedule(index: number, patch: Partial<ServiceSchedule>) {
    const oldKey = settings.serviceSchedules[index]?.key;
    const serviceSchedules = settings.serviceSchedules.map((schedule, i) =>
      i === index ? refreshServiceSchedule({ ...schedule, ...patch }) : schedule,
    );
    const newKey = serviceSchedules[index]?.key;
    updateSettings({ ...settings, serviceSchedules: sortByKey(serviceSchedules) }, oldKey && newKey ? { service: new Map([[oldKey, newKey]]) } : undefined);
  }

  function updateCarSchedule(index: number, patch: Partial<CarSchedule>) {
    const oldKey = settings.carSchedules[index]?.key;
    const carSchedules = settings.carSchedules.map((schedule, i) => (i === index ? refreshCarSchedule({ ...schedule, ...patch }) : schedule));
    const newKey = carSchedules[index]?.key;
    updateSettings({ ...settings, carSchedules: sortByKey(carSchedules) }, oldKey && newKey ? { car: new Map([[oldKey, newKey]]) } : undefined);
  }

  function resetVotes(kind: "service" | "car") {
    updateSettingsAndVotes(({ settings: latestSettings, votes: latestVotes }) =>
      resetOcrVoteSection(latestSettings, latestVotes, kind),
    );
  }

  function replaceVoteSchedule(kind: "service" | "car", schedule: ServiceSchedule | CarSchedule, names: string[]) {
    const key = kind === "service" ? "serviceVotes" : "carVotes";
    const otherEntries = votes[key].filter((entry) => entry.scheduleKey !== schedule.key);
    const nextEntries = names.map((name) => ({
      scheduleKey: schedule.key,
      displayText: schedule.displayDate,
      name,
      source: "manual" as const,
    }));
    updateVotes({ ...votes, [key]: [...otherEntries, ...nextEntries] });
  }

  function updateServiceResult(rowIndex: number, row: ScheduleResultRow) {
    if (!result) return;
    if (validateServiceResultRow(row, memberNames).length > 0) return;
    const nextResult = {
      ...result,
      serviceRows: result.serviceRows.map((currentRow, index) => (index === rowIndex ? row : currentRow)),
    };

    saveEditedResult(nextResult);
  }

  function updateCarResult(rowIndex: number, row: CarResultRow) {
    if (!result) return;
    if (validateCarResultRow(row, memberNames).length > 0) return;
    const nextResult = {
      ...result,
      carRows: result.carRows.map((currentRow, index) => (index === rowIndex ? row : currentRow)),
    };

    saveEditedResult(nextResult);
  }

  function runGenerate() {
    if (!canGenerate) return;
    const next = generateSchedule({
      members: sourceMembers,
      serviceSchedules: settings.serviceSchedules,
      carSchedules: settings.carSchedules,
      serviceVotes: votes.serviceVotes,
      carVotes: votes.carVotes,
    });
    updateResult(next);
  }

  async function downloadImage() {
    if (!previewRef.current) return;
    setSavedState("이미지 생성 중");
    try {
      await exportScheduleImage(previewRef.current, month);
      setSavedState("저장됨");
    } catch {
      setSavedState("이미지 실패");
    }
  }

  return {
    addServiceSchedule,
    addCarSchedule,
    resetServiceSchedules,
    resetCarSchedules,
    resetScheduleColors,
    updateServiceSchedule,
    updateCarSchedule,
    resetVotes,
    replaceVoteSchedule,
    updateServiceResult,
    updateCarResult,
    runGenerate,
    downloadImage,
  };
}
