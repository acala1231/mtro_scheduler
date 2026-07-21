export type ImportStatus =
  | { state: "idle" }
  | { state: "processing"; fileName: string }
  | { state: "success"; fileName: string; message: string }
  | { state: "error"; fileName: string; message: string };

export type ImportStatusAction =
  | { type: "reset" }
  | { type: "start"; fileName: string }
  | { type: "success"; fileName: string; message: string }
  | { type: "error"; fileName: string; message: string };

export function staleImportMessage(subject: "파일" | "이미지"): string {
  const objectParticle = subject === "이미지" ? "를" : "을";
  return `처리 중 기준월, 일정, 명단 또는 투표결과가 변경되었습니다. ${subject}${objectParticle} 다시 선택해 주세요.`;
}

export function importStatusReducer(_state: ImportStatus, action: ImportStatusAction): ImportStatus {
  if (action.type === "reset") return { state: "idle" };
  if (action.type === "start") return { state: "processing", fileName: action.fileName };
  return { state: action.type, fileName: action.fileName, message: action.message };
}
