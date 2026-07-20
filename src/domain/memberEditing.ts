import { normalizeFeastDay } from "./feastDay";
import { BASE_ROLES, COUNT_ROLES, type Member } from "./scheduleTypes";

function normalizedCounts(counts?: Partial<Member["counts"]>): Member["counts"] {
  return Object.fromEntries(COUNT_ROLES.map((role) => {
    const value = counts?.[role];
    return [role, Math.max(0, typeof value === "number" && Number.isFinite(value) ? Math.floor(value) : 0)];
  })) as Member["counts"];
}

function normalizedRoles(roles?: Partial<Member["roles"]>): Member["roles"] {
  return Object.fromEntries(BASE_ROLES.map((role) => [role, roles?.[role] === true])) as Member["roles"];
}

function validate(member: Member, members: Member[], current?: Member) {
  if (!member.name) throw new Error("이름을 입력해 주세요.");
  if (members.some((candidate) => candidate !== current && candidate.name.trim() === member.name)) {
    throw new Error(`중복된 명단입니다: ${member.name}`);
  }
  return member;
}

export function createMember(patch: Partial<Member>, members: Member[] = []): Member {
  return validate({
    id: patch.id?.trim() || crypto.randomUUID(),
    name: typeof patch.name === "string" ? patch.name.trim() : "",
    baptismalName: typeof patch.baptismalName === "string" ? patch.baptismalName.trim() : "",
    feastDay: normalizeFeastDay(patch.feastDay),
    alias: typeof patch.alias === "string" ? patch.alias.trim() : "",
    roles: normalizedRoles(patch.roles),
    counts: normalizedCounts(patch.counts),
  }, members);
}

export function updateMember(current: Member, patch: Partial<Member>, members: Member[] = []): Member {
  const next = createMember({
    ...current,
    ...patch,
    id: current.id,
    roles: patch.roles ? { ...current.roles, ...patch.roles } : current.roles,
    counts: patch.counts ? { ...current.counts, ...patch.counts } : current.counts,
  });
  return validate(next, members, current);
}
