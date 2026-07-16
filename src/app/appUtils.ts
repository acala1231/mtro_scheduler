import dayjs, { type Dayjs } from "dayjs";
import type { ParseVoteResult } from "../domain/voteParser";
import type { ScheduleSettings } from "../domain/scheduleTypes";
import {
  calculateOcrDimensions,
  calculateOcrRowScale,
  createOcrPixelVariant,
  detectOcrTextRows,
  type OcrBinaryVariant,
} from "../domain/ocrImageProcessing";

export function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function firstDateOfMonth(month: string): string {
  return `${month}-01`;
}

export function monthFromDayjs(value: Dayjs | null): string {
  return value ? value.format("YYYY-MM") : currentMonth();
}

export function dateFromDayjs(value: Dayjs | null, fallback: string): string {
  return value ? value.format("YYYY-MM-DD") : fallback;
}

export function timeFromDayjs(value: Dayjs | null, fallback: string): string {
  return value ? value.format("HH:mm") : fallback;
}

export function dayjsFromTime(time: string): Dayjs {
  return dayjs(`2026-01-01T${time || "00:00"}`);
}

export function monthTitle(month: string): string {
  const [year, monthNumber] = month.split("-");
  return `${year}년 ${Number(monthNumber)}월`;
}

export function sortByKey<T extends { key: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.key.localeCompare(b.key));
}

export function sortByDateTime<T extends { date: string; time: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
}

export function sortSettingsSchedules(settings: ScheduleSettings): ScheduleSettings {
  return {
    ...settings,
    serviceSchedules: sortByDateTime(settings.serviceSchedules),
    carSchedules: sortByDateTime(settings.carSchedules),
  };
}

export function issueCounts(issues: Array<{ severity: string }>): { errors: number; warnings: number } {
  return {
    errors: issues.filter((issue) => issue.severity === "error").length,
    warnings: issues.filter((issue) => issue.severity === "warning").length,
  };
}

export type PreparedOcrVariant = { kind: OcrBinaryVariant; rows: Blob[] };

function canvasToPngBlob(canvas: HTMLCanvasElement, fallback: Blob): Promise<Blob> {
  return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob ?? fallback), "image/png"));
}

export async function prepareImageForOcr(file: File): Promise<PreparedOcrVariant[]> {
  const image = await createImageBitmap(file);
  const dimensions = calculateOcrDimensions(image.width, image.height);
  const detectionCanvas = document.createElement("canvas");
  detectionCanvas.width = dimensions.width;
  detectionCanvas.height = dimensions.height;

  try {
    const detectionContext = detectionCanvas.getContext("2d", { willReadFrequently: true });
    if (!detectionContext) return [{ kind: "binary", rows: [file] }];

    detectionContext.fillStyle = "#fff";
    detectionContext.fillRect(0, 0, detectionCanvas.width, detectionCanvas.height);
    detectionContext.drawImage(image, 0, 0, detectionCanvas.width, detectionCanvas.height);
    const detectionPixels = detectionContext.getImageData(0, 0, detectionCanvas.width, detectionCanvas.height).data;
    const gray = new Uint8ClampedArray(detectionCanvas.width * detectionCanvas.height);
    for (let source = 0, target = 0; source < detectionPixels.length; source += 4, target += 1) {
      gray[target] = Math.round(detectionPixels[source] * 0.299 + detectionPixels[source + 1] * 0.587 + detectionPixels[source + 2] * 0.114);
    }
    const detectedRows = detectOcrTextRows(gray, detectionCanvas.width, detectionCanvas.height);
    if (detectedRows.length === 0) return [{ kind: "binary", rows: [file] }];

    const sourceScaleY = image.height / detectionCanvas.height;
    const rowCanvas = document.createElement("canvas");
    const rowContext = rowCanvas.getContext("2d", { willReadFrequently: true });
    if (!rowContext) return [{ kind: "binary", rows: [file] }];
    const variants: PreparedOcrVariant[] = ["binary-soft", "binary", "binary-strong"].map((kind) => ({
      kind: kind as OcrBinaryVariant,
      rows: [],
    }));

    for (const row of detectedRows) {
      const sourceTop = Math.max(0, Math.floor(row.top * sourceScaleY));
      const sourceBottom = Math.min(image.height, Math.ceil(row.bottom * sourceScaleY));
      const sourceHeight = Math.max(1, sourceBottom - sourceTop);
      const estimatedTextHeight = Math.max(1, (row.bottom - row.top - 4) * sourceScaleY);
      const scale = calculateOcrRowScale(estimatedTextHeight);
      rowCanvas.width = Math.max(1, Math.round(image.width * scale));
      rowCanvas.height = Math.max(1, Math.round(sourceHeight * scale));

      for (const variant of variants) {
        rowContext.fillStyle = "#fff";
        rowContext.fillRect(0, 0, rowCanvas.width, rowCanvas.height);
        rowContext.imageSmoothingEnabled = true;
        rowContext.imageSmoothingQuality = "high";
        rowContext.drawImage(image, 0, sourceTop, image.width, sourceHeight, 0, 0, rowCanvas.width, rowCanvas.height);
        const rowPixels = rowContext.getImageData(0, 0, rowCanvas.width, rowCanvas.height);
        rowPixels.data.set(createOcrPixelVariant(rowPixels.data, variant.kind));
        rowContext.putImageData(rowPixels, 0, 0);
        variant.rows.push(await canvasToPngBlob(rowCanvas, file));
      }
    }

    return variants;
  } finally {
    image.close();
  }
}

export function sanitizeVoteOcrText(text: string): string {
  return text
    .replace(/[^\w가-힣\s,./:()년월일-]/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\s*,\s*/g, ", ")
    .replace(/\n\s+/g, "\n")
    .trim();
}

export function scoreVoteParse(parsed: ParseVoteResult): number {
  const entries = [...parsed.serviceVotes, ...parsed.carVotes];
  const uniqueCounts = parsed.voteCounts.filter((count, index, counts) =>
    counts.findIndex((candidate) => candidate.kind === count.kind && candidate.scheduleKey === count.scheduleKey) === index,
  );
  const countScore = uniqueCounts.reduce((score, count) => {
    const kindEntries = count.kind === "service" ? parsed.serviceVotes : parsed.carVotes;
    const actual = kindEntries.filter((entry) => entry.scheduleKey === count.scheduleKey).length;
    const distance = Math.abs(actual - count.expectedCount);
    return score + (distance === 0 ? 30 : 0) - distance * 15 - (actual > count.expectedCount ? 25 : 0);
  }, 0);
  return entries.length * 10 + countScore - parsed.unparsedLines.length * 5;
}
