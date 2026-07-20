import { beforeEach, describe, expect, it, vi } from "vitest";
import { loadStoredMembers, parseMembersCsvFile, removeStoredMembers } from "./memberRepository";

describe("parseMembersCsvFile", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", { getItem: vi.fn(), setItem: vi.fn(), removeItem: vi.fn() });
  });
  it("2MB 이하 CSV 파일은 읽는다", async () => {
    const file = new File(["이름,세례명\n홍길동,베드로\n"], "members.csv", { type: "text/csv" });
    await expect(parseMembersCsvFile(file)).resolves.toMatchObject({ members: [expect.objectContaining({ name: "홍길동" })] });
  });

  it("별칭을 trim해 보존한다", async () => {
    const file = new File(["이름,세례명,별칭\n윤마루,알파,  H  \n"], "members.csv", { type: "text/csv" });
    await expect(parseMembersCsvFile(file)).resolves.toMatchObject({ members: [expect.objectContaining({ alias: "H" })] });
  });

  it("저장 전 축일을 정규화한다", async () => {
    const file = new File(["이름,세례명,축일\n홍길동,베드로,9/5\n"], "members.csv", { type: "text/csv" });
    await expect(parseMembersCsvFile(file)).resolves.toMatchObject({ members: [expect.objectContaining({ feastDay: "09/05" })] });
  });

  it("2MB를 넘는 CSV 파일은 읽기 전에 거부한다", async () => {
    const file = new File([new Uint8Array(2 * 1024 * 1024 + 1)], "members.csv", { type: "text/csv" });
    await expect(parseMembersCsvFile(file)).rejects.toThrow("명단 파일은 최대 2MB");
  });

  it("기존 저장 명단에 빈 축일을 보완하고 v2로 마이그레이션한다", () => {
    vi.mocked(localStorage.getItem).mockReturnValue(JSON.stringify({
      version: "browser-csv", updatedAt: "", members: [{ name: "홍길동", baptismalName: "베드로", roles: {}, counts: {} }],
    }));
    expect(loadStoredMembers()?.members[0].feastDay).toBe("");
    expect(JSON.parse(vi.mocked(localStorage.setItem).mock.calls[0][1]).version).toBe("browser-v2");
  });

  it("저장된 축일 타입이 손상되면 제거하고 안전하게 폴백한다", () => {
    vi.mocked(localStorage.getItem).mockReturnValue(JSON.stringify({
      version: "browser-v2", members: [{ name: "홍길동", feastDay: 629, roles: {}, counts: {} }],
    }));
    expect(loadStoredMembers()).toBeNull();
    expect(localStorage.removeItem).toHaveBeenCalledWith("schedule.membersFile");
  });

  it.each([
    { name: "홍길동", roles: { 정: "false" }, counts: {} },
    { name: "홍길동", roles: {}, counts: { 전체: "1" } },
    { name: ["홍길동"], roles: {}, counts: {} },
    { name: "홍길동", roles: [], counts: {} },
    { id: 1, name: "홍길동", roles: {}, counts: {} },
    { name: " ", roles: {}, counts: {} },
    { name: "홍길동", roles: {}, counts: { 전체: -1 } },
    { name: "홍길동", roles: {}, counts: { 전체: 1.5 } },
  ])("잘못된 저장 필드 타입은 강제 변환하지 않고 안전하게 폴백한다", (member) => {
    vi.mocked(localStorage.getItem).mockReturnValue(JSON.stringify({ version: "browser-v2", members: [member] }));
    expect(loadStoredMembers()).toBeNull();
    expect(localStorage.removeItem).toHaveBeenCalledWith("schedule.membersFile");
  });

  it("중복된 저장 식별자나 이름은 안전하게 폴백한다", () => {
    const member = { id: "same", name: "홍길동", roles: {}, counts: {} };
    vi.mocked(localStorage.getItem).mockReturnValue(JSON.stringify({ version: "browser-v2", members: [member, { ...member, name: "김철수" }] }));
    expect(loadStoredMembers()).toBeNull();

    vi.mocked(localStorage.getItem).mockReturnValue(JSON.stringify({ version: "browser-v2", members: [member, { ...member, id: "other" }] }));
    expect(loadStoredMembers()).toBeNull();
  });

  it("명단 삭제의 저장소 성공 여부를 반환한다", () => {
    expect(removeStoredMembers()).toBe(true);
    vi.mocked(localStorage.removeItem).mockImplementation(() => { throw new Error("blocked"); });
    expect(removeStoredMembers()).toBe(false);
  });
});
