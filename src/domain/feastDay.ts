import type { Member } from "./scheduleTypes";

export function normalizeFeastDay(value: unknown): string {
  const text = String(value ?? "").trim();
  if (!text) return "";
  const match = /^(\d{1,2})\/(\d{1,2})$/.exec(text);
  if (!match) throw new Error("축일은 MM/dd 형식으로 입력해 주세요.");
  const month = Number(match[1]);
  const day = Number(match[2]);
  const daysInMonth = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (month < 1 || month > 12 || day < 1 || day > daysInMonth[month - 1]) throw new Error("축일은 실제 날짜를 MM/dd 형식으로 입력해 주세요.");
  return `${String(month).padStart(2, "0")}/${String(day).padStart(2, "0")}`;
}

export function compareMembersByFeastDay(left: Member, right: Member): number {
  return (left.feastDay || "99/99").localeCompare(right.feastDay || "99/99") || left.name.localeCompare(right.name, "ko");
}
