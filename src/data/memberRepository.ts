import { BASE_ROLES, COUNT_ROLES, type CountRole, type Member, type MembersFile } from "../domain/scheduleTypes";
import { membersFromCsv } from "./memberCsv";

const MEMBERS_STORAGE_KEY = "schedule.membersFile";

function emptyCounts(): Member["counts"] {
  return Object.fromEntries(COUNT_ROLES.map((role) => [role, 0])) as Member["counts"];
}

function normalizeMember(raw: Partial<Member>, options: { preserveCounts: boolean }): Member {
  const counts = options.preserveCounts
    ? (Object.fromEntries(COUNT_ROLES.map((role) => [role, Math.max(0, Number(raw.counts?.[role as CountRole] ?? 0))])) as Member["counts"])
    : emptyCounts();
  const roles = Object.fromEntries(BASE_ROLES.map((role) => [role, Boolean(raw.roles?.[role])])) as Member["roles"];
  return {
    name: String(raw.name ?? "").trim(),
    baptismalName: String(raw.baptismalName ?? "").trim(),
    roles,
    counts,
  };
}

function normalizeMembersFile(data: Partial<MembersFile> | Partial<Member>[], options: { preserveCounts: boolean }): MembersFile {
  const rawMembers = Array.isArray(data) ? data : data.members || [];
  const members = rawMembers.map((member) => normalizeMember(member, options)).filter((member) => member.name);

  if (members.length === 0) {
    throw new Error("명단에 사용할 이름이 없습니다.");
  }

  return {
    version: Array.isArray(data) ? "browser-csv" : String(data.version || "unknown"),
    updatedAt: Array.isArray(data) ? "" : String(data.updatedAt || ""),
    members,
  };
}

export function loadStoredMembers(): MembersFile | null {
  try {
    const raw = localStorage.getItem(MEMBERS_STORAGE_KEY);
    if (!raw) return null;

    return normalizeMembersFile(JSON.parse(raw) as Partial<MembersFile>, { preserveCounts: true });
  } catch {
    try {
      localStorage.removeItem(MEMBERS_STORAGE_KEY);
    } catch {
      // Ignore storage failures so the scheduler can still render.
    }
    return null;
  }
}

export function saveStoredMembers(file: MembersFile): void {
  localStorage.setItem(MEMBERS_STORAGE_KEY, JSON.stringify(normalizeMembersFile(file, { preserveCounts: true })));
}

export function removeStoredMembers(): void {
  try {
    localStorage.removeItem(MEMBERS_STORAGE_KEY);
  } catch {
    // Ignore storage failures so the scheduler can still render.
  }
}

export async function parseMembersCsvFile(file: File): Promise<MembersFile> {
  const members = membersFromCsv(await file.text());
  return normalizeMembersFile(members, { preserveCounts: false });
}
