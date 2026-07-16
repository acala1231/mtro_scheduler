import { describe, expect, it } from "vitest";
import { parseMembersCsvFile } from "./memberRepository";

describe("parseMembersCsvFile", () => {
  it("2MB 이하 CSV 파일은 읽는다", async () => {
    const file = new File(["이름,세례명\n홍길동,베드로\n"], "members.csv", { type: "text/csv" });
    await expect(parseMembersCsvFile(file)).resolves.toMatchObject({ members: [expect.objectContaining({ name: "홍길동" })] });
  });

  it("별칭을 trim해 보존한다", async () => {
    const file = new File(["이름,세례명,별칭\n윤마루,알파,  H  \n"], "members.csv", { type: "text/csv" });
    await expect(parseMembersCsvFile(file)).resolves.toMatchObject({ members: [expect.objectContaining({ alias: "H" })] });
  });

  it("2MB를 넘는 CSV 파일은 읽기 전에 거부한다", async () => {
    const file = new File([new Uint8Array(2 * 1024 * 1024 + 1)], "members.csv", { type: "text/csv" });
    await expect(parseMembersCsvFile(file)).rejects.toThrow("명단 파일은 최대 2MB");
  });
});
