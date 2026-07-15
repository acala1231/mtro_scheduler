const DEFAULT_MAX_PIXELS = 12_000_000;
const PROCESSING_TARGET_PIXELS = 6_000_000;
const OCR_TARGET_WIDTH = 1800;
const MAX_UPSCALE = 2;

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

export function createOcrPixelVariant(data: Uint8ClampedArray, kind: "binary" | "grayscale"): Uint8ClampedArray {
  const gray = luminance(data);
  const mean = gray.reduce((sum, value) => sum + value, 0) / Math.max(1, gray.length);
  const darkBackground = mean < 128;
  const normalized = gray;
  if (darkBackground) {
    normalized.forEach((value, index) => {
      normalized[index] = 255 - value;
    });
  }
  if (kind === "binary") {
    const threshold = otsuThreshold(normalized);
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
