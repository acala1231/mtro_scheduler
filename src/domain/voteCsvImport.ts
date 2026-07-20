import { formatKoreanDateTime, makeScheduleKey } from "./dateTime";
import { createCarSchedule, createServiceSchedule, dedupeSchedulesByKey, removeOcrSchedules } from "./scheduleSettings";
import type { Member, ScheduleSettings, VoteData, VoteEntry } from "./scheduleTypes";

const MAX_ROWS = 1_000;
const MAX_CELL_LENGTH = 200;

type ParsedRow = { values: string[]; lineNumber: number };

function parseRows(text: string): ParsedRow[] {
  const input = text.replace(/^\uFEFF/, "");
  const rows: ParsedRow[] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  let lineNumber = 1;
  let rowLineNumber = 1;

  const pushCell = () => {
    row.push(cell.trim());
    cell = "";
  };
  const pushRow = () => {
    if (row.some(Boolean)) rows.push({ values: row, lineNumber: rowLineNumber });
    if (rows.length > MAX_ROWS) throw new Error(`투표결과 CSV는 최대 ${MAX_ROWS}행까지 가져올 수 있습니다.`);
    row = [];
    rowLineNumber = lineNumber + 1;
  };

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    if (quoted) {
      if (char === '"' && input[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        cell += char;
        if (char === "\n" || (char === "\r" && input[index + 1] !== "\n")) lineNumber += 1;
      }
    } else if (char === '"' && cell.length === 0) {
      quoted = true;
    } else if (char === ",") {
      pushCell();
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && input[index + 1] === "\n") index += 1;
      pushCell();
      pushRow();
      lineNumber += 1;
    } else {
      cell += char;
    }
    if (cell.length > MAX_CELL_LENGTH) throw new Error(`투표결과 CSV의 셀은 최대 ${MAX_CELL_LENGTH}자까지 입력할 수 있습니다.`);
  }
  if (quoted) throw new Error("투표결과 CSV에 닫히지 않은 따옴표가 있습니다.");
  pushCell();
  pushRow();
  return rows;
}

function validDate(value: string): boolean {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return false;
  const [year, month, day] = match.slice(1).map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

function validTime(value: string): boolean {
  return /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);
}

export function importVoteCsv(text: string, month: string, settings: ScheduleSettings, members: Member[]): { settings: ScheduleSettings; votes: VoteData } {
  const rows = parseRows(text);
  const [header, ...body] = rows;
  const expectedHeader = ["구분", "날짜", "시간", "이름"];
  if (
    !header
    || header.values.length !== 4
    || expectedHeader.some((value, index) => header.values[index] !== value)
  ) {
    throw new Error("투표결과 CSV 헤더 형식이 올바르지 않습니다.");
  }

  const memberNames = new Set(members.map(({ name }) => name.trim()).filter(Boolean));
  const serviceVotes: VoteEntry[] = [];
  const carVotes: VoteEntry[] = [];
  // OCR/CSV 가져오기로 생성된 일정은 새 결과로 원자적으로 교체한다.
  // 파싱이 끝나기 전에는 반환하지 않으므로 검증 실패 시 기존 설정은 그대로 유지된다.
  const baseSettings = removeOcrSchedules(settings, "all");
  const serviceSchedules = [...baseSettings.serviceSchedules];
  const carSchedules = [...baseSettings.carSchedules];
  const seen = new Set<string>();

  const consume = (values: string[], kind: "service" | "car", rowNumber: number) => {
    if (values.some((value) => !value)) throw new Error(`${rowNumber}행의 날짜, 시간, 이름을 모두 입력해 주세요.`);
    const [date, time, name] = values;
    if (!validDate(date)) throw new Error(`${rowNumber}행 날짜 형식이나 값이 올바르지 않습니다: ${date}`);
    if (!validTime(time)) throw new Error(`${rowNumber}행 시간 형식이나 값이 올바르지 않습니다: ${time}`);
    if (!date.startsWith(`${month}-`)) throw new Error(`${rowNumber}행 날짜가 기준월(${month})과 다릅니다.`);
    if (!memberNames.has(name) && !(kind === "car" && name === "관리장님")) throw new Error(`${rowNumber}행에 명단에 없는 이름이 있습니다: ${name}`);
    const scheduleKey = makeScheduleKey(date, time);
    const duplicateKey = `${kind}:${scheduleKey}:${name}`;
    if (seen.has(duplicateKey)) throw new Error(`${rowNumber}행에 중복 투표가 있습니다: ${name}`);
    seen.add(duplicateKey);
    const entry: VoteEntry = { scheduleKey, displayText: formatKoreanDateTime(date, time), name, source: "import" };
    if (kind === "service") {
      serviceVotes.push(entry);
      if (!serviceSchedules.some(({ key }) => key === scheduleKey)) serviceSchedules.push({ ...createServiceSchedule(date, time), source: "import" });
    } else {
      carVotes.push(entry);
      if (!carSchedules.some(({ key }) => key === scheduleKey)) carSchedules.push({ ...createCarSchedule(date, time), source: "import" });
    }
  };

  body.forEach(({ values: row, lineNumber: rowNumber }) => {
    if (row.length > 4) throw new Error(`${rowNumber}행은 4열을 초과할 수 없습니다.`);
    const [category = "", date = "", time = "", name = ""] = row;
    if (category !== "복사일정" && category !== "차량봉사") {
      throw new Error(`${rowNumber}행 구분은 복사일정 또는 차량봉사여야 합니다: ${category || "(비어 있음)"}`);
    }
    consume([date, time, name], category === "복사일정" ? "service" : "car", rowNumber);
  });
  if (serviceVotes.length === 0 && carVotes.length === 0) throw new Error("가져올 투표결과가 없습니다.");

  return {
    settings: { ...baseSettings, serviceSchedules: dedupeSchedulesByKey(serviceSchedules), carSchedules: dedupeSchedulesByKey(carSchedules) },
    votes: { month, rawText: "", serviceVotes, carVotes },
  };
}
