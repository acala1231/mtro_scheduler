import { describe, expect, it } from "vitest";
import { createDefaultSettings } from "./scheduleSettings";
import { importVoteCsv } from "./voteCsvImport";
import type { Member } from "./scheduleTypes";

const members = ["홍길동", "김철수"].map((name) => ({ name })) as Member[];
const header = "구분,날짜,시간,이름\n";

describe("투표결과 CSV 가져오기", () => {
  it("BOM, CRLF, quoted field와 두 구분이 섞인 4열 세로형을 가져온다", () => {
    const csv = '\uFEFF구분,날짜,시간,이름\r\n복사일정,2026-07-05,09:00,"홍길동"\r\n차량봉사,2026-07-05,09:00,"김철수"\r\n';
    const result = importVoteCsv(csv, "2026-07", createDefaultSettings("2026-07"), members);

    expect(result.votes.serviceVotes).toEqual([{ scheduleKey: "2026-07-05 09:00", displayText: "7/5 (일) 09:00", name: "홍길동", source: "import" }]);
    expect(result.votes.carVotes[0]).toMatchObject({ scheduleKey: "2026-07-05 09:00", name: "김철수", source: "import" });
    expect(result.settings.serviceSchedules).toContainEqual(expect.objectContaining({ key: "2026-07-05 09:00", source: "import" }));
  });

  it("차량봉사의 관리장님은 명단에 없어도 허용한다", () => {
    const result = importVoteCsv(`${header}차량봉사,2026-07-05,09:00,관리장님`, "2026-07", createDefaultSettings("2026-07"), members);
    expect(result.votes.carVotes[0].name).toBe("관리장님");
  });

  it("복사일정의 관리장님은 명단에 없으면 거부한다", () => {
    expect(() => importVoteCsv(`${header}복사일정,2026-07-05,09:00,관리장님`, "2026-07", createDefaultSettings("2026-07"), members)).toThrow("명단에 없는");
  });

  it("성공 시 이전 OCR/CSV 임시 일정은 제거하고 사용자가 만든 일정은 유지한다", () => {
    const settings = createDefaultSettings("2026-07");
    settings.serviceSchedules = [
      { ...settings.serviceSchedules[0], key: "2026-07-01 09:00", date: "2026-07-01", time: "09:00", source: "ocr" },
      { ...settings.serviceSchedules[0], key: "2026-07-02 09:00", date: "2026-07-02", time: "09:00", source: "import" },
      { ...settings.serviceSchedules[0], key: "2026-07-03 09:00", date: "2026-07-03", time: "09:00", source: undefined },
    ];

    const result = importVoteCsv(`${header}복사일정,2026-07-05,09:00,홍길동`, "2026-07", settings, members);

    expect(result.settings.serviceSchedules.map(({ key }) => key)).toEqual(["2026-07-03 09:00", "2026-07-05 09:00"]);
    expect(settings.serviceSchedules.map(({ key }) => key)).toEqual(["2026-07-01 09:00", "2026-07-02 09:00", "2026-07-03 09:00"]);
  });

  it("검증 실패 시 입력 설정을 변경하지 않는다", () => {
    const settings = createDefaultSettings("2026-07");
    const before = structuredClone(settings);
    expect(() => importVoteCsv(`${header}복사일정,2026-08-05,09:00,홍길동`, "2026-07", settings, members)).toThrow("기준월");
    expect(settings).toEqual(before);
  });

  it.each([
    ["구분 누락", ",2026-07-05,09:00,홍길동", "구분"],
    ["구분 오타", "성가봉사,2026-07-05,09:00,홍길동", "구분"],
    ["날짜 누락", "복사일정,,09:00,홍길동", "모두 입력"],
    ["시간 누락", "복사일정,2026-07-05,,홍길동", "모두 입력"],
    ["이름 누락", "복사일정,2026-07-05,09:00,", "모두 입력"],
    ["다른 기준월", "복사일정,2026-08-05,09:00,홍길동", "기준월"],
    ["명단에 없음", "복사일정,2026-07-05,09:00,없는사람", "명단에 없는"],
    ["잘못된 날짜", "복사일정,2026-02-30,09:00,홍길동", "날짜"],
    ["잘못된 시간", "복사일정,2026-07-05,25:00,홍길동", "시간"],
  ])("%s은 전체 가져오기를 거부한다", (_label, row, message) => {
    expect(() => importVoteCsv(`${header}${row}`, "2026-07", createDefaultSettings("2026-07"), members)).toThrow(message);
  });

  it("같은 구분, 일정, 이름의 중복 투표를 거부한다", () => {
    const row = "복사일정,2026-07-05,09:00,홍길동";
    expect(() => importVoteCsv(`${header}${row}\n${row}`, "2026-07", createDefaultSettings("2026-07"), members)).toThrow("중복 투표");
  });

  it("구분이 다르면 같은 일정과 이름을 허용한다", () => {
    const result = importVoteCsv(`${header}복사일정,2026-07-05,09:00,홍길동\n차량봉사,2026-07-05,09:00,홍길동`, "2026-07", createDefaultSettings("2026-07"), members);
    expect(result.votes.serviceVotes).toHaveLength(1);
    expect(result.votes.carVotes).toHaveLength(1);
  });

  it("새 헤더만 허용하고 기존 6열 헤더와 닫히지 않은 따옴표를 거부한다", () => {
    expect(() => importVoteCsv("복사일정,,,차량봉사,,\n날짜,시간,이름,날짜,시간,이름", "2026-07", createDefaultSettings("2026-07"), members)).toThrow("헤더");
    expect(() => importVoteCsv("구분,날짜,시간,이름,추가", "2026-07", createDefaultSettings("2026-07"), members)).toThrow("헤더");
    expect(() => importVoteCsv(`${header}\"복사일정,2026-07-05,09:00,홍길동`, "2026-07", createDefaultSettings("2026-07"), members)).toThrow("따옴표");
  });

  it("내용 행은 빈 값이더라도 4열을 초과하면 거부한다", () => {
    expect(() => importVoteCsv(`${header}복사일정,2026-07-05,09:00,홍길동,`, "2026-07", createDefaultSettings("2026-07"), members)).toThrow("4열");
  });

  it("빈 줄 뒤의 오류는 실제 파일 행 번호로 안내한다", () => {
    expect(() => importVoteCsv(`${header}\n복사일정,2026-08-05,09:00,홍길동`, "2026-07", createDefaultSettings("2026-07"), members)).toThrow("3행");
  });

  it("따옴표 필드의 줄바꿈 뒤 오류도 실제 파일 행 번호로 안내한다", () => {
    expect(() => importVoteCsv(`${header}복사일정,2026-07-05,09:00,"홍\n길동"\n복사일정,2026-08-05,09:00,홍길동`, "2026-07", createDefaultSettings("2026-07"), [{ ...members[0], name: "홍\n길동" }, members[1]])).toThrow("4행");
  });

  it("빈 결과를 거부한다", () => {
    expect(() => importVoteCsv(header, "2026-07", createDefaultSettings("2026-07"), members)).toThrow("가져올 투표결과가 없습니다");
  });

  it("행과 셀 크기 제한을 적용한다", () => {
    expect(() => importVoteCsv(header + `복사일정,2026-07-05,09:00,${"가".repeat(201)}`, "2026-07", createDefaultSettings("2026-07"), members)).toThrow("셀은 최대");
    expect(() => importVoteCsv(header + Array.from({ length: 1_000 }, () => "x").join("\n"), "2026-07", createDefaultSettings("2026-07"), members)).toThrow("최대 1000행");
  });
});
