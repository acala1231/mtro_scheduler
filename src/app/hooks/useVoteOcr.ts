import { useEffect, useRef, useState } from "react";
import type { PSM as PsmValue } from "tesseract.js";
import { resolveMemberNamesFromText } from "../../domain/memberMatcher";
import type { Member, ScheduleSettings, VoteData, VoteEntry } from "../../domain/scheduleTypes";
import { mergeVoteOcrAttempts, type VoteOcrAttempt } from "../../domain/voteOcrMerge";
import { parseVoteText } from "../../domain/voteParser";
import { monthTitle, prepareImageForOcr, sanitizeVoteOcrText, scoreVoteParse } from "../appUtils";

function resolveVoteEntryMembers(entries: VoteEntry[], members: Member[]): VoteEntry[] {
  return entries.flatMap((entry) => {
    if (entry.name === "관리장님") return [entry];
    return resolveMemberNamesFromText(members, entry.name).map((memberName) => ({ ...entry, name: memberName }));
  });
}

function uniqueVotesByScheduleAndName(entries: VoteEntry[]): VoteEntry[] {
  const seen = new Set<string>();
  return entries.filter((entry) => {
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
  votes,
  updateVotes,
}: {
  month: string;
  settings: ScheduleSettings;
  members: Member[];
  votes: VoteData;
  updateVotes: (votes: VoteData) => void;
}) {
  const [voteImageName, setVoteImageName] = useState("");
  const [voteImagePreviewUrl, setVoteImagePreviewUrl] = useState("");
  const [voteImageDialogOpen, setVoteImageDialogOpen] = useState(false);
  const [voteImageZoom, setVoteImageZoom] = useState(1);
  const [voteConversionError, setVoteConversionError] = useState("");
  const [voteConversionProgress, setVoteConversionProgress] = useState(0);
  const [isVoteConverting, setIsVoteConverting] = useState(false);
  const requestIdRef = useRef(0);

  useEffect(() => {
    requestIdRef.current += 1;
    setIsVoteConverting(false);
  }, [month]);

  useEffect(() => {
    return () => {
      if (voteImagePreviewUrl) URL.revokeObjectURL(voteImagePreviewUrl);
    };
  }, [voteImagePreviewUrl]);

  useEffect(() => () => {
    requestIdRef.current += 1;
  }, []);

  function parseVoteAttempt(label: string, rawText: string): VoteOcrAttempt {
    const sanitizedRawText = sanitizeVoteOcrText(rawText);
    const fallbackYear = Number(month.slice(0, 4));
    const parsed = parseVoteText(sanitizedRawText, settings.serviceSchedules, settings.carSchedules, fallbackYear);
    const filteredParsed = {
      serviceVotes: uniqueVotesByScheduleAndName(resolveVoteEntryMembers(parsed.serviceVotes, members)),
      carVotes: uniqueVotesByScheduleAndName(resolveVoteEntryMembers(parsed.carVotes, members)),
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
    };
  }

  function applyVoteOcrAttempt(bestAttempt: VoteOcrAttempt) {
    const mismatchedMonths = bestAttempt.parsed.detectedMonths.filter((detectedMonth) => detectedMonth !== month);
    const hasMonthMismatch = mismatchedMonths.length > 0;
    const next = {
      ...votes,
      month,
      rawText: bestAttempt.sanitizedRawText,
      serviceVotes: hasMonthMismatch ? [] : bestAttempt.parsed.serviceVotes,
      carVotes: hasMonthMismatch ? [] : bestAttempt.parsed.carVotes,
    };
    setVoteConversionError(
      hasMonthMismatch
        ? `기준월과 투표결과 이미지의 월이 다릅니다. 기준월: ${monthTitle(month)}, 이미지: ${mismatchedMonths.map(monthTitle).join(", ")}`
        : "",
    );
    updateVotes(next);
  }

  async function recognizeVoteImage(
    image: Blob,
    mode: { label: string; psm: PsmValue },
    onProgress: (progress: number) => void,
  ): Promise<VoteOcrAttempt> {
    const { createWorker } = await import("tesseract.js");
    const worker = await createWorker("kor+eng", undefined, {
      logger: (message) => {
        if (message.status === "recognizing text") {
          onProgress(message.progress);
        }
      },
    });

    try {
      await worker.setParameters({
        tessedit_pageseg_mode: mode.psm,
        preserve_interword_spaces: "1",
      });
      const result = await worker.recognize(image);
      return parseVoteAttempt(mode.label, result.data.text.trim());
    } finally {
      await worker.terminate();
    }
  }

  async function convertVoteImage(file: File) {
    const requestId = ++requestIdRef.current;
    setIsVoteConverting(true);
    updateVotes({ month, rawText: "", serviceVotes: [], carVotes: [] });
    setVoteConversionProgress(5);
    setVoteConversionError("");

    try {
      if (file.size > 15 * 1024 * 1024) throw new Error("image-too-large");
      const preparedImage = await prepareImageForOcr(file);
      if (requestId !== requestIdRef.current) return;
      setVoteConversionProgress(10);
      const { PSM } = await import("tesseract.js");
      const ocrProgress: Record<string, number> = { "PSM 6": 0, "PSM 11": 0 };
      const updateCombinedProgress = (label: string, progress: number) => {
        ocrProgress[label] = Math.max(ocrProgress[label] ?? 0, progress);
        const averageOcrProgress = (ocrProgress["PSM 6"] + ocrProgress["PSM 11"]) / 2;
        if (requestId === requestIdRef.current) setVoteConversionProgress(Math.min(95, Math.round(10 + averageOcrProgress * 85)));
      };
      const attempts = [];
      attempts.push(await recognizeVoteImage(preparedImage, { label: "PSM 6", psm: PSM.SINGLE_BLOCK }, (progress) => updateCombinedProgress("PSM 6", progress)));
      if (requestId !== requestIdRef.current) return;
      attempts.push(await recognizeVoteImage(preparedImage, { label: "PSM 11", psm: PSM.SPARSE_TEXT }, (progress) => updateCombinedProgress("PSM 11", progress)));
      if (requestId !== requestIdRef.current) return;
      const bestAttempt = mergeVoteOcrAttempts(attempts, scoreVoteParse);
      applyVoteOcrAttempt(bestAttempt);
      setVoteConversionProgress(100);
    } catch (error) {
      if (requestId !== requestIdRef.current) return;
      setVoteConversionProgress(0);
      setVoteConversionError(error instanceof Error && error.message === "image-too-large" ? "이미지는 15MB 이하만 선택할 수 있습니다." : "투표결과 입력에 실패했습니다. 이미지를 다시 선택해 주세요.");
    } finally {
      if (requestId === requestIdRef.current) setIsVoteConverting(false);
    }
  }

  function selectVoteImage(file: File | undefined) {
    setVoteImageName(file?.name ?? "");
    setVoteImagePreviewUrl(file ? URL.createObjectURL(file) : "");
    setVoteImageDialogOpen(false);
    setVoteImageZoom(1);
    setVoteConversionError("");
    setVoteConversionProgress(0);
    if (file) void convertVoteImage(file);
  }

  function clearVoteImage() {
    requestIdRef.current += 1;
    setVoteImageName("");
    setVoteImagePreviewUrl("");
    setVoteImageDialogOpen(false);
    setVoteImageZoom(1);
    setVoteConversionError("");
    setVoteConversionProgress(0);
    setIsVoteConverting(false);
  }

  return {
    voteImageName,
    voteImagePreviewUrl,
    voteImageDialogOpen,
    voteImageZoom,
    voteConversionError,
    voteConversionProgress,
    isVoteConverting,
    selectVoteImage,
    clearVoteImage,
    setVoteImageDialogOpen,
    setVoteImageZoom,
  };
}
