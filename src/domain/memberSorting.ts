import type { Member } from "./scheduleTypes";

export type MemberSortKey = "name" | "baptismalName" | "feastDay" | "assignmentCount" | "assignmentCountDesc";

type IndexedMember = {
  member: Member;
  index: number;
};

function compareText(left: string | undefined, right: string | undefined, blankLast = false): number {
  const leftValue = left?.trim() ?? "";
  const rightValue = right?.trim() ?? "";
  if (blankLast && !leftValue !== !rightValue) return leftValue ? -1 : 1;
  return leftValue.localeCompare(rightValue, "ko");
}

function compareBySortKey(left: Member, right: Member, sortKey: MemberSortKey): number {
  switch (sortKey) {
    case "name":
      return compareText(left.name, right.name);
    case "baptismalName":
      return compareText(left.baptismalName, right.baptismalName, true);
    case "feastDay":
      return compareText(left.feastDay, right.feastDay, true);
    case "assignmentCount":
      return left.counts["전체"] - right.counts["전체"];
    case "assignmentCountDesc":
      return right.counts["전체"] - left.counts["전체"];
  }
}

export function sortVisibleMembers<T extends IndexedMember>(members: T[], sortKey: MemberSortKey): T[] {
  return [...members].sort((left, right) =>
    compareBySortKey(left.member, right.member, sortKey)
      || compareText(left.member.name, right.member.name)
      || left.index - right.index,
  );
}
