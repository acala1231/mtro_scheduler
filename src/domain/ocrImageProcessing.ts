const DEFAULT_MAX_PIXELS = 12_000_000;
const PROCESSING_TARGET_PIXELS = 6_000_000;
const OCR_TARGET_WIDTH = 1800;
const MAX_UPSCALE = 2;
const OCR_ROW_MIN_SCALE = 3;
const OCR_ROW_MAX_SCALE = 4;

export type OcrBinaryVariant = "binary-soft" | "binary" | "binary-strong";
export type OcrPixelVariant = OcrBinaryVariant | "grayscale";
export type OcrTextRow = { top: number; bottom: number };

export function calculateOcrDimensions(width: number, height: number, maxPixels = DEFAULT_MAX_PIXELS): { width: number; height: number } {
  const pixelBudgetScale = Math.sqrt(Math.min(maxPixels, PROCESSING_TARGET_PIXELS) / (width * height));
  const textScale = width < OCR_TARGET_WIDTH ? OCR_TARGET_WIDTH / width : 1;
  const scale = Math.min(MAX_UPSCALE, textScale, pixelBudgetScale);
  const targetWidth = Math.max(1, Math.floor(width * scale));
  const targetHeight = Math.max(1, Math.floor(height * scale));
  return { width: targetWidth, height: targetHeight };
}

function luminance(data: Uint8ClampedArray): Uint8ClampedArray {
  const values = new Uint8ClampedArray(data.length / 4);
  for (let source = 0, target = 0; source < data.length; source += 4, target += 1) {
    values[target] = Math.round(data[source] * 0.299 + data[source + 1] * 0.587 + data[source + 2] * 0.114);
  }
  return values;
}

export function otsuThreshold(values: Uint8ClampedArray): number {
  const histogram = new Uint32Array(256);
  let totalSum = 0;
  values.forEach((value) => {
    histogram[value] += 1;
    totalSum += value;
  });

  let backgroundCount = 0;
  let backgroundSum = 0;
  let bestVariance = -1;
  let bestThreshold = 127;
  for (let threshold = 0; threshold < 255; threshold += 1) {
    backgroundCount += histogram[threshold];
    if (backgroundCount === 0) continue;
    const foregroundCount = values.length - backgroundCount;
    if (foregroundCount === 0) break;
    backgroundSum += threshold * histogram[threshold];
    const backgroundMean = backgroundSum / backgroundCount;
    const foregroundMean = (totalSum - backgroundSum) / foregroundCount;
    const variance = backgroundCount * foregroundCount * (backgroundMean - foregroundMean) ** 2;
    if (variance > bestVariance) {
      bestVariance = variance;
      bestThreshold = threshold;
    }
  }
  return bestThreshold;
}

function rgbaFromGray(values: Uint8ClampedArray): Uint8ClampedArray {
  const result = new Uint8ClampedArray(values.length * 4);
  values.forEach((value, index) => {
    const offset = index * 4;
    result[offset] = value;
    result[offset + 1] = value;
    result[offset + 2] = value;
    result[offset + 3] = 255;
  });
  return result;
}

export function createOcrPixelVariant(data: Uint8ClampedArray, kind: OcrPixelVariant): Uint8ClampedArray {
  const gray = luminance(data);
  const mean = gray.reduce((sum, value) => sum + value, 0) / Math.max(1, gray.length);
  const darkBackground = mean < 128;
  const normalized = gray;
  if (darkBackground) {
    normalized.forEach((value, index) => {
      normalized[index] = 255 - value;
    });
  }
  if (kind !== "grayscale") {
    const thresholdOffset = kind === "binary-soft" ? -20 : kind === "binary-strong" ? 20 : 0;
    const threshold = Math.max(0, Math.min(255, otsuThreshold(normalized) + thresholdOffset));
    normalized.forEach((value, index) => {
      normalized[index] = value <= threshold ? 0 : 255;
    });
  } else {
    normalized.forEach((value, index) => {
      normalized[index] = Math.max(0, Math.min(255, Math.round((value - 128) * 1.45 + 128)));
    });
  }
  return rgbaFromGray(normalized);
}

export function calculateOcrRowScale(textHeight: number): number {
  if (!Number.isFinite(textHeight) || textHeight <= 0) return OCR_ROW_MAX_SCALE;
  return Math.max(OCR_ROW_MIN_SCALE, Math.min(OCR_ROW_MAX_SCALE, Math.ceil(30 / textHeight)));
}

export function detectOcrTextRows(values: Uint8ClampedArray, width: number, height: number): OcrTextRow[] {
  if (width <= 0 || height <= 0 || values.length < width * height) return [];

  const normalized = new Uint8ClampedArray(values);
  const mean = normalized.reduce((sum, value) => sum + value, 0) / normalized.length;
  if (mean < 128) {
    normalized.forEach((value, index) => {
      normalized[index] = 255 - value;
    });
  }
  const threshold = Math.min(210, otsuThreshold(normalized) + 30);
  const minimumInkPixels = Math.max(2, Math.floor(width * 0.01));
  const occupied = Array.from({ length: height }, (_, y) => {
    let inkPixels = 0;
    for (let x = 0; x < width; x += 1) {
      if (normalized[y * width + x] <= threshold) inkPixels += 1;
    }
    return inkPixels >= minimumInkPixels;
  });

  const ranges: OcrTextRow[] = [];
  let start = -1;
  occupied.forEach((hasInk, y) => {
    if (hasInk && start < 0) start = y;
    if (!hasInk && start >= 0) {
      ranges.push({ top: start, bottom: y });
      start = -1;
    }
  });
  if (start >= 0) ranges.push({ top: start, bottom: height });

  const merged: OcrTextRow[] = [];
  ranges.forEach((range) => {
    const previous = merged.at(-1);
    if (previous && range.top - previous.bottom <= 2) previous.bottom = range.bottom;
    else merged.push({ ...range });
  });

  return merged
    .filter((range) => range.bottom - range.top >= 2)
    .map((range) => ({ top: Math.max(0, range.top - 2), bottom: Math.min(height, range.bottom + 2) }));
}

const ocrDatePattern = /\d{1,2}\s*[./-]\s*\d{1,2}/;
const ocrTimePattern = /\d{1,2}\s*:\s*\d{2}/;
const confusedOcrTimePattern = /[0-9OoIl]{1,2}\s*:\s*[0-9OoIl]{2}/;

export function mergeScheduleOcrText(generalText: string, scheduleText: string): string {
  const date = scheduleText.match(ocrDatePattern)?.[0].replace(/\s/g, "");
  const time = scheduleText.match(ocrTimePattern)?.[0].replace(/\s/g, "");
  if (!date || !time) return generalText;

  const mergedDate = ocrDatePattern.test(generalText) ? generalText.replace(ocrDatePattern, date) : `${date} ${generalText}`;
  return confusedOcrTimePattern.test(mergedDate) ? mergedDate.replace(confusedOcrTimePattern, time) : `${mergedDate} ${time}`;
}
