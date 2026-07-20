import { BASE_ROLES, type Member } from "../domain/scheduleTypes";
import { compareMembersByFeastDay, normalizeFeastDay } from "../domain/feastDay";

export const SAMPLE_MEMBERS_CSV = `이름,세례명,축일,정,부,향,향합
홍길동,베드로,06/29,true,true,true,true
김철수,마태오,09/21,false,true,true,false
`;

const MAX_CSV_ROWS = 2_000;
const MAX_CSV_CELL_LENGTH = 500;

function escapeCsvCell(value: string) {
  const safeValue = /^[=+\-@\t\r]/.test(value) ? `'\u200B${value}` : value;
  return /[",\n\r]/.test(safeValue) ? `"${safeValue.replaceAll('"', '""')}"` : safeValue;
}

function restoreFormulaSafeCell(value: string): string {
  // 앱이 내보낼 때만 붙이는 예약 표식(' + ZWSP)만 제거한다. 사용자가 입력한 일반 아포스트로피는 보존한다.
  return value.startsWith("'\u200B") ? value.slice(2) : value;
}

type CsvRow = { cells: string[]; lineNumber: number };

function parseCsvRows(text: string): CsvRow[] {
  const rows: CsvRow[] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  let closedQuotedCell = false;
  let lineNumber = 1;
  let rowLineNumber = 1;

  const ensureCellLength = () => {
    // 내보내기 예약 표식은 데이터가 아니므로 복원한 최종 셀 길이를 기준으로 제한한다.
    if (restoreFormulaSafeCell(cell).length > MAX_CSV_CELL_LENGTH) throw new Error(`명단 CSV의 셀은 최대 ${MAX_CSV_CELL_LENGTH}자까지 입력할 수 있습니다.`);
  };
  const pushRow = () => {
    if (row.some(Boolean)) rows.push({ cells: row, lineNumber: rowLineNumber });
    if (rows.length > MAX_CSV_ROWS) throw new Error(`명단은 최대 ${MAX_CSV_ROWS}행까지 등록할 수 있습니다.`);
  };

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const nextChar = text[index + 1];

    if (quoted && char === '"' && nextChar === '"') {
      cell += '"';
      ensureCellLength();
      index += 1;
      continue;
    }

    if (char === '"') {
      if (quoted) {
        quoted = false;
        closedQuotedCell = true;
      } else if (cell.length === 0 && !closedQuotedCell) {
        quoted = true;
      } else {
        throw new Error(`명단 CSV ${lineNumber}행의 따옴표 형식이 올바르지 않습니다.`);
      }
      continue;
    }

    if (closedQuotedCell && char !== "," && char !== "\n" && char !== "\r") {
      throw new Error(`명단 CSV ${lineNumber}행의 따옴표 형식이 올바르지 않습니다.`);
    }

    if (!quoted && char === ",") {
      row.push(cell.trim());
      cell = "";
      closedQuotedCell = false;
      continue;
    }

    if (!quoted && (char === "\n" || char === "\r")) {
      if (char === "\r" && nextChar === "\n") {
        index += 1;
      }

      row.push(cell.trim());
      pushRow();
      row = [];
      cell = "";
      closedQuotedCell = false;
      lineNumber += 1;
      rowLineNumber = lineNumber;
      continue;
    }

    if (quoted && (char === "\n" || char === "\r")) {
      if (char === "\r" && nextChar === "\n") {
        cell += "\r\n";
        index += 1;
      } else {
        cell += char;
      }
      ensureCellLength();
      lineNumber += 1;
      continue;
    }

    cell += char;
    ensureCellLength();
  }

  if (quoted) throw new Error(`명단 CSV ${rowLineNumber}행에 닫히지 않은 따옴표가 있습니다.`);

  row.push(cell.trim());
  pushRow();

  return rows;
}

function parseBoolean(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  return ["true", "1", "y", "yes", "o", "ok", "예", "네", "가능"].includes(normalized);
}

export function membersToCsv(members: Member[]) {
  const rows = [
    ["이름", "세례명", "축일", ...BASE_ROLES],
    ...[...members].sort(compareMembersByFeastDay).map((member) => [
      member.name,
      member.baptismalName ?? "",
      member.feastDay ?? "",
      ...BASE_ROLES.map((role) => String(member.roles[role])),
    ]),
  ];

  return `${rows.map((row) => row.map(escapeCsvCell).join(",")).join("\n")}\n`;
}

export function membersFromCsv(text: string): Partial<Member>[] {
  const rows = parseCsvRows(text);
  const [headerRow, ...body] = rows;

  if (!headerRow) {
    throw new Error("명단 파일에 헤더가 없습니다.");
  }

  const header = headerRow.cells.map((column, index) => index === 0 ? column.replace(/^\uFEFF/, "") : column);

  const indexes = new Map(header.map((column, index) => [column.trim(), index]));
  const nameIndex = indexes.get("이름") ?? indexes.get("name");
  const baptismalNameIndex = indexes.get("세례명") ?? indexes.get("baptismalName");
  const feastDayIndex = indexes.get("축일") ?? indexes.get("feastDay");
  const aliasIndex = indexes.get("별칭") ?? indexes.get("alias");

  if (nameIndex === undefined) {
    throw new Error("명단 파일에 이름 열이 필요합니다.");
  }

  return body.map(({ cells: row, lineNumber }) => {
    let feastDay = "";
    try {
      feastDay = normalizeFeastDay(restoreFormulaSafeCell(row[feastDayIndex ?? -1] ?? ""));
    } catch {
      throw new Error(`${lineNumber}행의 축일이 올바르지 않습니다. 실제 날짜를 MM/dd 형식으로 입력해 주세요.`);
    }
    return {
      name: restoreFormulaSafeCell(row[nameIndex] ?? ""),
      baptismalName: restoreFormulaSafeCell(row[baptismalNameIndex ?? -1] ?? ""),
      feastDay,
      alias: restoreFormulaSafeCell(row[aliasIndex ?? -1] ?? ""),
      roles: {
        정: parseBoolean(row[indexes.get("정") ?? -1] ?? ""),
        부: parseBoolean(row[indexes.get("부") ?? -1] ?? ""),
        향: parseBoolean(row[indexes.get("향") ?? -1] ?? ""),
        향합: parseBoolean(row[indexes.get("향합") ?? -1] ?? ""),
      },
    };
  });
}
