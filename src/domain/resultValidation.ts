import type { CarResultRow, ScheduleResultRow } from "./scheduleTypes";

const EMPTY_ASSIGNMENTS = new Set(["", "X"]);

export function validateServiceResultRow(row: ScheduleResultRow, memberNames: string[]): string[] {
  const allowed = new Set(memberNames);
  const assigned = Object.values(row.roles).map((name) => name?.trim() ?? "").filter((name) => !EMPTY_ASSIGNMENTS.has(name));
  const errors = assigned.filter((name) => !allowed.has(name)).map((name) => `명단에 없는 이름입니다: ${name}`);
  const duplicate = assigned.find((name, index) => assigned.indexOf(name) !== index);
  if (duplicate) errors.push(`한 일정의 여러 역할에 같은 사람을 배정할 수 없습니다: ${duplicate}`);
  return [...new Set(errors)];
}

export function validateCarResultRow(row: CarResultRow, memberNames: string[]): string[] {
  const name = row.name.trim();
  return EMPTY_ASSIGNMENTS.has(name) || name === "관리장님" || memberNames.includes(name) ? [] : [`명단에 없는 이름입니다: ${name}`];
}
