import { useMemo, useRef, useState } from "react";
import dayjs, { type Dayjs } from "dayjs";
import { useLocation, useNavigate } from "react-router-dom";
import { saveLastMonth } from "../../data/localScheduleStore";
import type { MemberSortKey } from "../../domain/memberSorting";
import type { AppStep } from "../../domain/scheduleTypes";
import { validateMembers, validateSettings, validateVotes } from "../../domain/validators";
import { navigationForStepSelection, pathForStep, stepFromPath } from "../appRouting";
import { firstDateOfMonth, issueCounts, monthFromDayjs } from "../appUtils";
import { useBackButtonClose } from "./useBackButtonClose";
import { useMembers } from "./useMembers";
import { useScheduleResult } from "./useScheduleResult";
import { useScheduleSnapshot } from "./useScheduleSnapshot";
import { useVotesScreenModel } from "./useVotesScreenModel";

export function useAppModel() {
  const location = useLocation();
  const navigate = useNavigate();
  const step = stepFromPath(location.pathname) ?? "home";
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [monthAnchor, setMonthAnchor] = useState<HTMLElement | null>(null);
  const [memberQuery, setMemberQuery] = useState("");
  const [memberSortKey, setMemberSortKey] = useState<MemberSortKey>("feastDay");
  const [schedulePreviewOpen, setSchedulePreviewOpen] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);
  const snapshot = useScheduleSnapshot();
  const { month, settings, votes, result } = snapshot;

  const menuBackButtonClose = useBackButtonClose(Boolean(menuAnchor), () => setMenuAnchor(null));
  useBackButtonClose(Boolean(monthAnchor), () => setMonthAnchor(null));
  useBackButtonClose(schedulePreviewOpen, () => setSchedulePreviewOpen(false));

  const memberModel = useMembers({
    result,
    onMembersChanged: snapshot.invalidateResult,
  });
  const { sourceMembers, members } = memberModel;
  const allIssues = useMemo(() => [
    ...validateMembers(members),
    ...validateSettings(settings),
    ...validateVotes(settings, members, votes),
    ...(result?.issues ?? []),
  ], [result?.issues, settings, votes, members]);
  const counts = issueCounts(allIssues);
  const canGenerate = members.length > 0 && counts.errors === 0;
  const resultModel = useScheduleResult({
    month,
    settings,
    votes,
    result,
    sourceMembers,
    canGenerate,
    previewRef,
    updateSettings: snapshot.updateSettings,
    updateVotes: snapshot.updateVotes,
    updateSettingsAndVotes: snapshot.updateSettingsAndVotes,
    updateResult: snapshot.updateResult,
    setSavedState: snapshot.setSavedState,
  });
  const votesScreenModel = useVotesScreenModel({
    month,
    settings,
    members,
    votes,
    updateSettingsAndVotes: snapshot.updateSettingsAndVotes,
    resetVotes: resultModel.resetVotes,
    replaceVoteSchedule: resultModel.replaceVoteSchedule,
  });

  function goToStep(next: AppStep) {
    const navigation = navigationForStepSelection(next, step, Boolean(menuAnchor));
    if (navigation === "none") return;
    if (navigation === "close-popup") {
      setMenuAnchor(null);
      return;
    }
    menuBackButtonClose.closeWithoutHistoryBack();
    navigate(pathForStep(next), { replace: navigation === "replace-popup" });
  }

  function selectMonth(value: Dayjs | null) {
    const nextMonth = monthFromDayjs(value);
    saveLastMonth(nextMonth);
    snapshot.setMonth(nextMonth);
    setMonthAnchor(null);
  }

  return {
    step,
    menuAnchor,
    setMenuAnchor,
    monthAnchor,
    setMonthAnchor,
    memberQuery,
    setMemberQuery,
    memberSortKey,
    setMemberSortKey,
    schedulePreviewOpen,
    setSchedulePreviewOpen,
    previewRef,
    selectedMonth: dayjs(firstDateOfMonth(month)),
    allIssues,
    counts,
    canGenerate,
    goToStep,
    selectMonth,
    ...snapshot,
    ...memberModel,
    ...resultModel,
    visibleMembers: memberModel.visibleMembers(memberQuery, memberSortKey),
    votesScreenModel,
  };
}

export type AppModel = ReturnType<typeof useAppModel>;
