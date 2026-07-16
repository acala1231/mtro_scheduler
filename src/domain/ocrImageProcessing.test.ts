import { describe, expect, it } from "vitest";
import {
  calculateOcrDimensions,
  calculateOcrRowScale,
  createOcrPixelVariant,
  detectOcrTextRows,
  mergeScheduleOcrText,
  otsuThreshold,
} from "./ocrImageProcessing";

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

  it("서로 다른 임계값으로 약한/기본/강한 이진화 결과를 만든다", () => {
    const rgba = new Uint8ClampedArray([
      80, 80, 80, 255,
      140, 140, 140, 255,
      220, 220, 220, 255,
    ]);

    const soft = createOcrPixelVariant(rgba, "binary-soft");
    const normal = createOcrPixelVariant(rgba, "binary");
    const strong = createOcrPixelVariant(rgba, "binary-strong");

    expect(soft[4]).toBe(255);
    expect(normal[4]).toBe(0);
    expect(strong[4]).toBe(0);
  });
});

describe("OCR 행 분리", () => {
  it("가로 투영에서 떨어진 두 텍스트 행을 여백과 함께 검출한다", () => {
    const width = 20;
    const height = 18;
    const gray = new Uint8ClampedArray(width * height).fill(255);
    for (const y of [3, 4, 5, 11, 12, 13]) {
      for (let x = 3; x < 17; x += 1) gray[y * width + x] = 0;
    }

    expect(detectOcrTextRows(gray, width, height)).toEqual([
      { top: 1, bottom: 8 },
      { top: 9, bottom: 16 },
    ]);
  });

  it("어두운 화면의 밝은 텍스트도 배경을 행으로 오인하지 않는다", () => {
    const width = 20;
    const height = 10;
    const gray = new Uint8ClampedArray(width * height).fill(20);
    for (let y = 4; y <= 5; y += 1) {
      for (let x = 3; x < 17; x += 1) gray[y * width + x] = 240;
    }

    expect(detectOcrTextRows(gray, width, height)).toEqual([{ top: 2, bottom: 8 }]);
  });

  it("행 높이에 따라 3~4배 확대하고 예상 글자 높이를 30px 이상 확보한다", () => {
    expect(calculateOcrRowScale(8)).toBe(4);
    expect(calculateOcrRowScale(12)).toBe(3);
    expect(calculateOcrRowScale(20)).toBe(3);
  });
});

describe("날짜/시간 전용 OCR 병합", () => {
  it("전용 OCR의 날짜와 시간을 사용하면서 일반 OCR의 한글 이름은 보존한다", () => {
    expect(mergeScheduleOcrText("7/72 (일) O9:4O 최대현", "7/12 09:40")).toBe("7/12 (일) 09:40 최대현");
  });

  it("전용 결과에 날짜와 시간이 모두 없으면 일반 OCR 결과를 유지한다", () => {
    expect(mergeScheduleOcrText("최대현 제타", "09:40")).toBe("최대현 제타");
  });
});
