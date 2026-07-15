import { describe, expect, it } from "vitest";
import { calculateOcrDimensions, createOcrPixelVariant, otsuThreshold } from "./ocrImageProcessing";

describe("calculateOcrDimensions", () => {
  it("긴 1080px 폭 이미지를 6MP 처리 목표 안에서만 확대한다", () => {
    const result = calculateOcrDimensions(1080, 4435);
    expect(result.width).toBeGreaterThan(1080);
    expect(result.width).toBeLessThan(1800);
    expect(result.width * result.height).toBeLessThanOrEqual(6_000_000);
  });

  it("큰 이미지는 12MP를 넘지 않도록 축소한다", () => {
    const result = calculateOcrDimensions(4000, 5000);
    expect(result.width * result.height).toBeLessThanOrEqual(6_000_000);
    expect(result.width).toBeLessThan(4000);
  });
});

describe("OCR 픽셀 전처리", () => {
  it("Otsu 임계값으로 어두운 군집과 밝은 군집을 분리한다", () => {
    expect(otsuThreshold(new Uint8ClampedArray([10, 20, 220, 240]))).toBeGreaterThanOrEqual(20);
    expect(otsuThreshold(new Uint8ClampedArray([10, 20, 220, 240]))).toBeLessThan(220);
  });

  it("검은 배경의 흰 글자를 흰 배경의 검은 글자로 반전하고 강화 grayscale도 만든다", () => {
    const rgba = new Uint8ClampedArray([
      0, 0, 0, 255,
      255, 255, 255, 255,
    ]);
    const binary = createOcrPixelVariant(rgba, "binary");
    const grayscale = createOcrPixelVariant(rgba, "grayscale");
    expect([...binary]).toEqual([255, 255, 255, 255, 0, 0, 0, 255]);
    expect(grayscale[0]).toBeGreaterThan(grayscale[4]);
    expect(grayscale[3]).toBe(255);
  });
});
