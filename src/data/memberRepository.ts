import { BASE_ROLES, COUNT_ROLES, type CountRole, type Member, type MembersFile } from "../domain/scheduleTypes";
import { membersFromCsv } from "./memberCsv";
import { normalizeFeastDay } from "../domain/feastDay";

const MEMBERS_STORAGE_KEY = "schedule.membersFile";
const MAX_MEMBERS_CSV_FILE_BYTES = 2 * 1024 * 1024;

function emptyCounts(): Member["counts"] {
  return Object.fromEntries(COUNT_ROLES.map((role) => [role, 0])) as Member["counts"];
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function optionalString(value: unknown, field: string): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string") throw new Error(`저장된 ${field} 형식이 올바르지 않습니다.`);
  return value;
}

function normalizeMember(raw: Partial<Member>, options: { preserveCounts: boolean }): Member {
  if (!isObject(raw)) throw new Error("저장된 명단 형식이 올바르지 않습니다.");
  if (typeof raw.name !== "string") throw new Error("저장된 이름 형식이 올바르지 않습니다.");
  if (raw.id !== undefined && typeof raw.id !== "string") throw new Error("저장된 식별자 형식이 올바르지 않습니다.");
  if (raw.roles !== undefined && !isObject(raw.roles)) throw new Error("저장된 역할 형식이 올바르지 않습니다.");
  if (raw.counts !== undefined && !isObject(raw.counts)) throw new Error("저장된 횟수 형식이 올바르지 않습니다.");
  for (const role of BASE_ROLES) if (raw.roles?.[role] !== undefined && typeof raw.roles[role] !== "boolean") throw new Error("저장된 역할 형식이 올바르지 않습니다.");
  for (const role of COUNT_ROLES) if (raw.counts?.[role] !== undefined && (typeof raw.counts[role] !== "number" || !Number.isSafeInteger(raw.counts[role]) || raw.counts[role] < 0)) throw new Error("저장된 횟수 형식이 올바르지 않습니다.");
  if (raw.feastDay !== undefined && typeof raw.feastDay !== "string") throw new Error("저장된 축일 형식이 올바르지 않습니다.");
  const counts = options.preserveCounts
    ? (Object.fromEntries(COUNT_ROLES.map((role) => [role, raw.counts?.[role as CountRole] ?? 0])) as Member["counts"])
    : emptyCounts();
  const roles = Object.fromEntries(BASE_ROLES.map((role) => [role, raw.roles?.[role] === true])) as Member["roles"];
  return {
    id: typeof raw.id === "string" && raw.id.trim() ? raw.id.trim() : crypto.randomUUID(),
    name: raw.name.trim(),
    baptismalName: optionalString(raw.baptismalName, "세례명")?.trim() ?? "",
    feastDay: normalizeFeastDay(raw.feastDay),
    alias: optionalString(raw.alias, "별칭")?.trim() ?? "",
    roles,
    counts,
  };
}

function normalizeMembersFile(data: Partial<MembersFile> | Partial<Member>[], options: { preserveCounts: boolean }): MembersFile {
  if (!Array.isArray(data) && !isObject(data)) throw new Error("저장된 명단 파일 형식이 올바르지 않습니다.");
  if (!Array.isArray(data) && data.members !== undefined && !Array.isArray(data.members)) throw new Error("저장된 명단 배열 형식이 올바르지 않습니다.");
  if (!Array.isArray(data) && data.version !== undefined && typeof data.version !== "string") throw new Error("저장된 버전 형식이 올바르지 않습니다.");
  const rawMembers = Array.isArray(data) ? data : data.members || [];
  const members = rawMembers.map((member) => normalizeMember(member, options));

  if (members.length === 0 || members.some(({ name }) => !name)) {
    throw new Error("명단에 사용할 이름이 없습니다.");
  }
  if (new Set(members.map(({ id }) => id)).size !== members.length) {
    throw new Error("저장된 명단 식별자가 중복되었습니다.");
  }
  if (new Set(members.map(({ name }) => name)).size !== members.length) {
    throw new Error("저장된 명단 이름이 중복되었습니다.");
  }

  return {
    version: "browser-v2",
    updatedAt: Array.isArray(data) ? "" : optionalString(data.updatedAt, "수정일") ?? "",
    members,
  };
}

export function loadStoredMembers(): MembersFile | null {
  try {
    const raw = localStorage.getItem(MEMBERS_STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<MembersFile>;
    const normalized = normalizeMembersFile(parsed, { preserveCounts: true });
    if (parsed.version !== "browser-v2" || parsed.members?.some((member) => !member.id || member.feastDay === undefined)) saveStoredMembers(normalized);
    return normalized;
  } catch {
    try {
      localStorage.removeItem(MEMBERS_STORAGE_KEY);
    } catch {
      // Ignore storage failures so the scheduler can still render.
    }
    return null;
  }
}

export function saveStoredMembers(file: MembersFile): boolean {
  try {
    localStorage.setItem(MEMBERS_STORAGE_KEY, JSON.stringify(normalizeMembersFile(file, { preserveCounts: true })));
    return true;
  } catch {
    return false;
  }
}

export function removeStoredMembers(): boolean {
  try {
    localStorage.removeItem(MEMBERS_STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}

export async function parseMembersCsvFile(file: File): Promise<MembersFile> {
  if (file.size > MAX_MEMBERS_CSV_FILE_BYTES) {
    throw new Error("명단 파일은 최대 2MB까지 등록할 수 있습니다.");
  }
  const members = membersFromCsv(await file.text());
  return normalizeMembersFile(members, { preserveCounts: false });
}
