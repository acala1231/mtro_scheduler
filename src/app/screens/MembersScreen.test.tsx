import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { MembersFile } from "../../domain/scheduleTypes";
import { MemberCountStatus, MembersScreen } from "./MembersScreen";

const membersFile: MembersFile = {
  version: "2",
  updatedAt: "2026-07-21T00:00:00.000Z",
  members: [
    {
      name: "가람",
      baptismalName: "베드로",
      feastDay: "06/29",
      roles: { 정: true, 부: true, 향: true, 향합: true },
      counts: { 전체: 2, 정: 0, 부: 0, 향: 0, 향합: 0, 초1: 0, 초2: 0, 십자가: 0, 차량: 0 },
    },
  ],
};

describe("MemberCountStatus", () => {
  it("검색 결과가 바뀌면 보조기기에 정중하게 전체 문구를 알린다", () => {
    const markup = renderToStaticMarkup(
      <MemberCountStatus query="베드로" visibleCount={2} totalCount={4} />,
    );

    expect(markup).toContain('role="status"');
    expect(markup).toContain('aria-live="polite"');
    expect(markup).toContain('aria-atomic="true"');
    expect(markup).toContain("검색 2명 / 전체 4명");
  });

  it("전체 인원은 검색·정렬 행에서만 한 번 표시하고 배정 많은순 옵션을 제공한다", () => {
    const markup = renderToStaticMarkup(
      <MembersScreen
        memberQuery=""
        memberSortKey="assignmentCountDesc"
        membersFile={membersFile}
        visibleMembers={[{ key: "0", member: membersFile.members[0], index: 0 }]}
        memberError=""
        memberSuccess=""
        importMembers={() => undefined}
        clearMembers={() => undefined}
        addMember={() => true}
        updateMember={() => true}
        deleteMember={() => undefined}
        setMemberQuery={() => undefined}
        setMemberSortKey={() => undefined}
      />,
    );

    expect(markup).not.toContain("총 1명");
    expect(markup.match(/전체 1명/g)).toHaveLength(1);
    expect(markup).toContain("배정 많은순");
  });
});
