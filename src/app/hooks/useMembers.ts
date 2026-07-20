import { useEffect, useState } from "react";
import { loadStoredMembers, parseMembersCsvFile, removeStoredMembers, saveStoredMembers } from "../../data/memberRepository";
import { BASE_ROLES, COUNT_ROLES, type GenerateScheduleResult, type Member, type MembersFile } from "../../domain/scheduleTypes";
import { compareMembersByFeastDay, normalizeFeastDay } from "../../domain/feastDay";

export type VisibleMember = {
  key: string;
  index: number;
  member: Member;
};

const MEMBERS_SAVE_ERROR = "명단을 저장하지 못했습니다. 저장 공간과 브라우저 설정을 확인해 주세요.";

function memberKey(member: Member, index: number) {
  return member.id ?? `${index}:${member.name}:${member.baptismalName ?? ""}`;
}

function duplicateMemberKey(member: Pick<Member, "name" | "baptismalName">) {
  return member.name.trim();
}

function emptyMemberCounts(): Member["counts"] {
  return Object.fromEntries(COUNT_ROLES.map((role) => [role, 0])) as Member["counts"];
}

function completeMember(patch: Partial<Member>): Member {
  return {
    id: crypto.randomUUID(),
    name: String(patch.name ?? "").trim(),
    baptismalName: String(patch.baptismalName ?? "").trim(),
    feastDay: normalizeFeastDay(patch.feastDay),
    alias: String(patch.alias ?? "").trim(),
    roles: Object.fromEntries(BASE_ROLES.map((role) => [role, Boolean(patch.roles?.[role])])) as Member["roles"],
    counts: patch.counts ?? emptyMemberCounts(),
  };
}

function mergeMember(currentMember: Member, patch: Partial<Member>): Member {
  return {
    ...currentMember,
    ...patch,
    name: patch.name === undefined ? currentMember.name : String(patch.name).trim(),
    baptismalName: patch.baptismalName === undefined ? currentMember.baptismalName : String(patch.baptismalName).trim(),
    feastDay: patch.feastDay === undefined ? currentMember.feastDay : normalizeFeastDay(patch.feastDay),
    alias: patch.alias === undefined ? currentMember.alias : String(patch.alias).trim(),
    roles: patch.roles ? { ...currentMember.roles, ...patch.roles } : currentMember.roles,
    counts: patch.counts ? { ...currentMember.counts, ...patch.counts } : currentMember.counts,
  };
}

export function useMembers({
  result,
  onMembersChanged,
}: {
  result?: GenerateScheduleResult;
  onMembersChanged: () => void;
}) {
  const [sourceMembersFile, setSourceMembersFile] = useState<MembersFile | null>(null);
  const [membersFile, setMembersFile] = useState<MembersFile | null>(null);
  const [memberError, setMemberError] = useState("");

  useEffect(() => {
    const storedMembers = loadStoredMembers();

    if (!storedMembers) {
      setMemberError("등록된 명단이 없습니다. 명단을 등록해 주세요.");
      return;
    }

    setSourceMembersFile(storedMembers);
    setMemberError("");
  }, []);

  useEffect(() => {
    if (!sourceMembersFile) return;

    setMembersFile({
      ...sourceMembersFile,
      members: result?.updatedMembers ?? sourceMembersFile.members,
    });
  }, [sourceMembersFile, result]);

  async function importMembers(file: File | undefined) {
    if (!file) return;

    try {
      const nextMembersFile = await parseMembersCsvFile(file);
      if (!saveStoredMembers(nextMembersFile)) throw new Error(MEMBERS_SAVE_ERROR);
      setSourceMembersFile(nextMembersFile);
      setMembersFile(nextMembersFile);
      setMemberError("");
      onMembersChanged();
    } catch (error) {
      setMemberError(error instanceof Error ? error.message : "명단 파일을 읽지 못했습니다.");
    }
  }

  function clearMembers() {
    removeStoredMembers();
    setSourceMembersFile(null);
    setMembersFile(null);
    setMemberError("등록된 명단이 없습니다. 명단을 등록해 주세요.");
    onMembersChanged();
  }

  function updateMember(index: number, patch: Partial<Member>): boolean {
    if (!sourceMembersFile) return false;

    const currentMember = sourceMembersFile.members[index];
    if (!currentMember) return false;

    let nextMember: Member;
    try {
      nextMember = mergeMember(currentMember, patch);
    } catch {
      setMemberError("축일은 실제 날짜를 MM/dd 형식으로 입력해 주세요.");
      return false;
    }
    const nextDuplicateKey = duplicateMemberKey(nextMember);
    const duplicatedMember = sourceMembersFile.members.some(
      (member, memberIndex) => memberIndex !== index && duplicateMemberKey(member) === nextDuplicateKey,
    );

    if (duplicatedMember) {
      setMemberError(`중복된 명단입니다: ${nextMember.name.trim()} ${nextMember.baptismalName?.trim() ?? ""}`.trim());
      return false;
    }

    const nextMembersFile = {
      ...sourceMembersFile,
      members: sourceMembersFile.members.map((member, memberIndex) => (memberIndex === index ? nextMember : member)),
    };

    if (!saveStoredMembers(nextMembersFile)) {
      setMemberError(MEMBERS_SAVE_ERROR);
      return false;
    }
    setSourceMembersFile(nextMembersFile);
    setMembersFile(nextMembersFile);
    setMemberError("");
    onMembersChanged();
    return true;
  }

  function addMember(patch: Partial<Member>): boolean {
    let nextMember: Member;
    try {
      nextMember = completeMember(patch);
    } catch {
      setMemberError("축일은 실제 날짜를 MM/dd 형식으로 입력해 주세요.");
      return false;
    }

    if (!nextMember.name) {
      setMemberError("이름을 입력해 주세요.");
      return false;
    }

    const currentMembers = sourceMembersFile?.members ?? [];
    const duplicatedMember = currentMembers.some((member) => duplicateMemberKey(member) === duplicateMemberKey(nextMember));

    if (duplicatedMember) {
      setMemberError(`중복된 명단입니다: ${nextMember.name} ${nextMember.baptismalName ?? ""}`.trim());
      return false;
    }

    const nextMembersFile: MembersFile = {
      version: sourceMembersFile?.version ?? "browser-manual",
      updatedAt: new Date().toISOString(),
      members: [...currentMembers, nextMember],
    };

    if (!saveStoredMembers(nextMembersFile)) {
      setMemberError(MEMBERS_SAVE_ERROR);
      return false;
    }
    setSourceMembersFile(nextMembersFile);
    setMembersFile(nextMembersFile);
    setMemberError("");
    onMembersChanged();
    return true;
  }

  function deleteMember(index: number) {
    if (!sourceMembersFile) return;

    const members = sourceMembersFile.members.filter((_, memberIndex) => memberIndex !== index);
    if (members.length === 0) {
      clearMembers();
      return;
    }

    const nextMembersFile = {
      ...sourceMembersFile,
      members,
    };

    if (!saveStoredMembers(nextMembersFile)) {
      setMemberError(MEMBERS_SAVE_ERROR);
      return;
    }
    setSourceMembersFile(nextMembersFile);
    setMembersFile(nextMembersFile);
    onMembersChanged();
  }

  function visibleMembers(memberQuery: string): VisibleMember[] {
    const query = memberQuery.trim();
    return (membersFile?.members ?? [])
      .map((member, index) => ({ key: memberKey(member, index), index, member }))
      .filter(({ member }) => [member.name, member.baptismalName, member.feastDay, member.alias].some((value) => value?.includes(query)))
      .sort((left, right) => compareMembersByFeastDay(left.member, right.member));
  }

  return {
    sourceMembers: sourceMembersFile?.members ?? membersFile?.members ?? [],
    members: membersFile?.members ?? [],
    membersFile,
    memberError,
    importMembers,
    clearMembers,
    addMember,
    updateMember,
    deleteMember,
    visibleMembers,
  };
}
