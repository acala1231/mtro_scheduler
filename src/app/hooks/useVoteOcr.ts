import { useEffect, useReducer, useRef, useState } from "react";
import type { PSM as PsmValue, Worker } from "tesseract.js";
import { resolveMemberMatchesFromText } from "../../domain/memberMatcher";
import type { Member, ScheduleSettings, VoteData, VoteEntry } from "../../domain/scheduleTypes";
import { rebalanceAliasVotes, type OcrResolvedVoteEntry } from "../../domain/voteAliasRebalance";
import { mergeVoteOcrAttempts, type VoteOcrAttempt } from "../../domain/voteOcrMerge";
import { mergeScheduleOcrText } from "../../domain/ocrImageProcessing";
import { removeOcrSchedules } from "../../domain/scheduleSettings";
import { applyVoteOcrImport } from "../../domain/voteOcrImport";
import { importRevision } from "../../domain/importRevision";
import { parseVoteText } from "../../domain/voteParser";
import { monthTitle, prepareImageForOcr, sanitizeVoteOcrText, scoreVoteParse, type PreparedOcrVariant } from "../appUtils";
import { importStatusReducer } from "./importStatus";

function resolveVoteEntryMembers(entries: VoteEntry[], members: Member[]): OcrResolvedVoteEntry[] {
  return entries.flatMap<OcrResolvedVoteEntry>((entry) => {
    if (entry.name === "관리장님") return [{ entry, matchedByAlias: false, matchKind: "exact" }];
    return resolveMemberMatchesFromText(members, entry.name).map((match) => ({
      entry: { ...entry, name: match.name },
      matchedByAlias: match.matchedByAlias,
      matchKind: match.matchKind,
    }));
  });
}

function uniqueVotesByScheduleAndName(entries: OcrResolvedVoteEntry[]): OcrResolvedVoteEntry[] {
  const seen = new Set<string>();
  return entries.filter(({ entry }) => {
    const dedupeKey = `${entry.scheduleKey}:${entry.name}`;
    if (seen.has(dedupeKey)) return false;
    seen.add(dedupeKey);
    return true;
  });
}

export function useVoteOcr({
  month,
  settings,
  members,
  updateSettingsAndVotes,
}: {
  month: string;
  settings: ScheduleSettings;
  members: Member[];
  updateSettingsAndVotes: (
    updater: (current: { settings: ScheduleSettings; votes: VoteData }) => { settings: ScheduleSettings; votes: VoteData },
  ) => void;
}) {
  const [status, dispatch] = useReducer(importStatusReducer, { state: "idle" });
  const [voteImagePreviewUrl, setVoteImagePreviewUrl] = useState("");
  const [voteImageDialogOpen, setVoteImageDialogOpen] = useState(false);
  const [voteImageZoom, setVoteImageZoom] = useState(1);
  const [voteConversionProgress, setVoteConversionProgress] = useState(0);
  const requestIdRef = useRef(0);
  const latestMonthRef = useRef(month);
  const latestMembersRef = useRef(members);
  latestMonthRef.current = month;
  latestMembersRef.current = members;

  useEffect(() => {
    requestIdRef.current += 1;
    dispatch({ type: "reset" });
    setVoteImagePreviewUrl("");
    setVoteImageDialogOpen(false);
    setVoteImageZoom(1);
    setVoteConversionProgress(0);
  }, [month]);

  useEffect(() => {
    return () => {
      if (voteImagePreviewUrl) URL.revokeObjectURL(voteImagePreviewUrl);
    };
  }, [voteImagePreviewUrl]);

  useEffect(() => () => {
    requestIdRef.current += 1;
  }, []);

  function parseVoteAttempt(label: string, rawText: string, parseSettings: ScheduleSettings): VoteOcrAttempt {
    const sanitizedRawText = sanitizeVoteOcrText(rawText);
    const fallbackYear = Number(month.slice(0, 4));
    const parsed = parseVoteText(sanitizedRawText, parseSettings.serviceSchedules, parseSettings.carSchedules, fallbackYear);
    const resolvedVotes = {
      serviceVotes: uniqueVotesByScheduleAndName(resolveVoteEntryMembers(parsed.serviceVotes, members)),
      carVotes: uniqueVotesByScheduleAndName(resolveVoteEntryMembers(parsed.carVotes, members)),
    };
    const filteredParsed = {
      serviceVotes: resolvedVotes.serviceVotes.map(({ entry }) => entry),
      carVotes: resolvedVotes.carVotes.map(({ entry }) => entry),
      voteCounts: parsed.voteCounts,
      detectedMonths: parsed.detectedMonths,
      unparsedLines: parsed.unparsedLines,
    };

    return {
      label,
      rawText,
      sanitizedRawText,
      parsed: filteredParsed,
      score: scoreVoteParse(filteredParsed),
      resolvedVotes,
    };
  }

  function applyVoteOcrAttempt(bestAttempt: VoteOcrAttempt, requestRevision: string, fileName: string) {
    const mismatchedMonths = bestAttempt.parsed.detectedMonths.filter((detectedMonth) => detectedMonth !== month);
    const hasMonthMismatch = mismatchedMonths.length > 0;
    const resolvedVotes = bestAttempt.resolvedVotes ?? {
      serviceVotes: bestAttempt.parsed.serviceVotes.map((entry) => ({ entry, matchedByAlias: false })),
      carVotes: bestAttempt.parsed.carVotes.map((entry) => ({ entry, matchedByAlias: false })),
    };
    const rebalanced = rebalanceAliasVotes({ ...resolvedVotes, voteCounts: bestAttempt.parsed.voteCounts });
    const serviceVotes = hasMonthMismatch ? [] : rebalanced.serviceVotes.map(({ entry }) => entry);
    const carVotes = hasMonthMismatch ? [] : rebalanced.carVotes.map(({ entry }) => entry);
    if (hasMonthMismatch) {
      dispatch({ type: "error", fileName, message: `기준월과 투표결과 이미지의 월이 다릅니다. 기준월: ${monthTitle(month)}, 이미지: ${mismatchedMonths.map(monthTitle).join(", ")}. 기존 투표결과는 유지됩니다.` });
      return;
    }
    let stale = false;
    updateSettingsAndVotes((current) => {
      if (latestMonthRef.current !== month || importRevision(month, current.settings, latestMembersRef.current) !== requestRevision) { stale = true; return current; }
      return applyVoteOcrImport(current, {
        month, rawText: bestAttempt.sanitizedRawText, serviceVotes, carVotes, voteCounts: bestAttempt.parsed.voteCounts,
      });
    });
    if (stale) {
      dispatch({ type: "error", fileName, message: "처리 중 기준월, 일정 또는 명단이 변경되었습니다. 이미지를 다시 선택해 주세요. 기존 투표결과는 유지됩니다." });
      return;
    }
    dispatch({ type: "success", fileName, message: `복사일정 ${serviceVotes.length}건, 차량봉사 ${carVotes.length}건을 가져왔습니다.` });
  }

  async function recognizeVoteImage(
    worker: Worker,
    variant: PreparedOcrVariant,
    mode: { label: string; psm: PsmValue; parseSettings: ScheduleSettings; isCancelled: () => boolean; onProgress: (progress: number) => void },
  ): Promise<VoteOcrAttempt> {
    await worker.setParameters({
      tessedit_pageseg_mode: mode.psm,
      preserve_interword_spaces: "1",
      tessedit_char_whitelist: "",
    });
    const lines: string[] = [];
    for (let index = 0; index < variant.rows.length; index += 1) {
      if (mode.isCancelled()) throw new Error("ocr-cancelled");
      const result = await worker.recognize(variant.rows[index]);
      const generalText = result.data.text.trim();
      let finalText = generalText;
      if (/\d.*[/:]|[/:].*\d/.test(generalText)) {
        await worker.setParameters({
          tessedit_pageseg_mode: mode.psm,
          tessedit_char_whitelist: "0123456789./:-() ",
        });
        const scheduleResult = await worker.recognize(variant.rows[index]);
        finalText = mergeScheduleOcrText(generalText, scheduleResult.data.text.trim());
        await worker.setParameters({ tessedit_char_whitelist: "" });
      }
      if (finalText) lines.push(finalText);
      mode.onProgress((index + 1) / variant.rows.length);
    }
    return parseVoteAttempt(mode.label, lines.join("\n"), mode.parseSettings);
  }

  async function convertVoteImage(file: File) {
    const requestId = ++requestIdRef.current;
    dispatch({ type: "start", fileName: file.name });
    const requestSettings = removeOcrSchedules(settings, "all");
    const requestRevision = importRevision(month, settings, members);
    setVoteConversionProgress(5);

    try {
      if (file.size > 15 * 1024 * 1024) throw new Error("image-too-large");
      const preparedImages = await prepareImageForOcr(file);
      if (requestId !== requestIdRef.current) return;
      setVoteConversionProgress(10);
      const { createWorker, PSM } = await import("tesseract.js");
      const ocrProgress: Record<string, number> = Object.fromEntries(preparedImages.map(({ kind }) => [kind, 0]));
      const updateCombinedProgress = (label: string, progress: number) => {
        ocrProgress[label] = Math.max(ocrProgress[label] ?? 0, progress);
        const averageOcrProgress = Object.values(ocrProgress).reduce((sum, value) => sum + value, 0) / preparedImages.length;
        if (requestId === requestIdRef.current) setVoteConversionProgress(Math.min(95, Math.round(10 + averageOcrProgress * 85)));
      };
      const worker = await createWorker("kor+eng", undefined, {
        langPath: `${import.meta.env.BASE_URL}tessdata`,
        gzip: false,
      });
      try {
        const attempts: VoteOcrAttempt[] = [];
        for (const variant of preparedImages) {
          const label = `${variant.kind} 행 PSM 7`;
          attempts.push(await recognizeVoteImage(worker, variant, {
            label,
            psm: PSM.SINGLE_LINE,
            parseSettings: requestSettings,
            isCancelled: () => requestId !== requestIdRef.current,
            onProgress: (progress) => updateCombinedProgress(variant.kind, progress),
          }));
        }
        const bestAttempt = mergeVoteOcrAttempts(attempts, scoreVoteParse);
        if (requestId !== requestIdRef.current) return;
        applyVoteOcrAttempt(bestAttempt, requestRevision, file.name);
        if (requestId !== requestIdRef.current) return;
        setVoteConversionProgress(100);
      } finally {
        await worker.terminate();
      }
    } catch (error) {
      if (requestId !== requestIdRef.current) return;
      setVoteConversionProgress(0);
      dispatch({ type: "error", fileName: file.name, message: (error instanceof Error && error.message === "image-too-large" ? "이미지는 15MB 이하만 선택할 수 있습니다." : "투표결과 입력에 실패했습니다. 이미지를 다시 선택해 주세요.") + " 기존 투표결과는 유지됩니다." });
    }
  }

  function selectVoteImage(file: File | undefined) {
    if (!file) dispatch({ type: "reset" });
    setVoteImagePreviewUrl(file ? URL.createObjectURL(file) : "");
    setVoteImageDialogOpen(false);
    setVoteImageZoom(1);
    setVoteConversionProgress(0);
    if (file) void convertVoteImage(file);
  }

  function clearVoteImage() {
    requestIdRef.current += 1;
    dispatch({ type: "reset" });
    setVoteImagePreviewUrl("");
    setVoteImageDialogOpen(false);
    setVoteImageZoom(1);
    setVoteConversionProgress(0);
  }

  return {
    voteImageName: status.state === "idle" ? "" : status.fileName,
    voteImagePreviewUrl,
    voteImageDialogOpen,
    voteImageZoom,
    voteConversionError: status.state === "error" ? status.message : "",
    voteConversionSuccess: status.state === "success" ? status.message : "",
    voteConversionProgress,
    isVoteConverting: status.state === "processing",
    selectVoteImage,
    clearVoteImage,
    setVoteImageDialogOpen,
    setVoteImageZoom,
  };
}
