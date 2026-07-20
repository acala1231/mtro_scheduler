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

export function importStatusReducer(_state: ImportStatus, action: ImportStatusAction): ImportStatus {
  if (action.type === "reset") return { state: "idle" };
  if (action.type === "start") return { state: "processing", fileName: action.fileName };
  return { state: action.type, fileName: action.fileName, message: action.message };
}
