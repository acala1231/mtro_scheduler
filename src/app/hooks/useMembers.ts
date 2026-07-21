import { useEffect, useState } from "react";
import { loadStoredMembers, parseMembersCsvFile, removeStoredMembers, saveStoredMembers } from "../../data/memberRepository";
import { type GenerateScheduleResult, type Member, type MembersFile } from "../../domain/scheduleTypes";
import { createMember, updateMember as normalizeMemberUpdate } from "../../domain/memberEditing";
import { sortVisibleMembers, type MemberSortKey } from "../../domain/memberSorting";

export type VisibleMember = {
  key: string;
  index: number;
  member: Member;
};

const MEMBERS_SAVE_ERROR = "명단을 저장하지 못했습니다. 저장 공간과 브라우저 설정을 확인해 주세요.";

function memberKey(member: Member, index: number) {
  return member.id ?? `${index}:${member.name}:${member.baptismalName ?? ""}`;
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
  const [memberSuccess, setMemberSuccess] = useState("");

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
    setMemberError("");
    setMemberSuccess("");

    try {
      const nextMembersFile = await parseMembersCsvFile(file);
      if (!saveStoredMembers(nextMembersFile)) throw new Error(MEMBERS_SAVE_ERROR);
      setSourceMembersFile(nextMembersFile);
      setMembersFile(nextMembersFile);
      setMemberError("");
      setMemberSuccess(`명단 ${nextMembersFile.members.length}명을 등록했습니다.`);
      onMembersChanged();
    } catch (error) {
      setMemberSuccess("");
      setMemberError(`${error instanceof Error ? error.message : "명단 파일을 읽지 못했습니다."} 기존 명단은 유지됩니다.`);
    }
  }

  function clearMembers() {
    if (!removeStoredMembers()) {
      setMemberError("명단을 삭제하지 못했습니다. 브라우저 설정을 확인해 주세요.");
      setMemberSuccess("");
      return;
    }
    setSourceMembersFile(null);
    setMembersFile(null);
    setMemberError("등록된 명단이 없습니다. 명단을 등록해 주세요.");
    setMemberSuccess("");
    onMembersChanged();
  }

  function updateMember(index: number, patch: Partial<Member>): boolean {
    if (!sourceMembersFile) return false;

    const currentMember = sourceMembersFile.members[index];
    if (!currentMember) return false;

    let nextMember: Member;
    try {
      nextMember = normalizeMemberUpdate(currentMember, patch, sourceMembersFile.members);
    } catch (error) {
      setMemberError(error instanceof Error ? error.message : "명단을 수정하지 못했습니다.");
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
    setMemberSuccess("");
    onMembersChanged();
    return true;
  }

  function addMember(patch: Partial<Member>): boolean {
    let nextMember: Member;
    try {
      nextMember = createMember(patch, sourceMembersFile?.members ?? []);
    } catch (error) {
      setMemberError(error instanceof Error ? error.message : "명단을 추가하지 못했습니다.");
      return false;
    }
    const currentMembers = sourceMembersFile?.members ?? [];

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
    setMemberSuccess("");
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
    setMemberError("");
    setMemberSuccess("");
    onMembersChanged();
  }

  function visibleMembers(memberQuery: string, sortKey: MemberSortKey): VisibleMember[] {
    const query = memberQuery.trim();
    const filteredMembers = (membersFile?.members ?? [])
      .map((member, index) => ({ key: memberKey(member, index), index, member }))
      .filter(({ member }) => [member.name, member.baptismalName, member.feastDay, member.alias].some((value) => value?.includes(query)));
    return sortVisibleMembers(filteredMembers, sortKey);
  }

  return {
    sourceMembers: sourceMembersFile?.members ?? membersFile?.members ?? [],
    members: membersFile?.members ?? [],
    membersFile,
    memberError,
    memberSuccess,
    importMembers,
    clearMembers,
    addMember,
    updateMember,
    deleteMember,
    visibleMembers,
  };
}
