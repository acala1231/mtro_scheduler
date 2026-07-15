import { BASE_ROLES, type Member } from "../domain/scheduleTypes";

export const SAMPLE_MEMBERS_CSV = `이름,세례명,정,부,향,향합
홍길동,베드로,true,true,true,true
김철수,마태오,false,true,true,false
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

function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  const ensureCellLength = () => {
    // 내보내기 예약 표식은 데이터가 아니므로 복원한 최종 셀 길이를 기준으로 제한한다.
    if (restoreFormulaSafeCell(cell).length > MAX_CSV_CELL_LENGTH) throw new Error(`명단 CSV의 셀은 최대 ${MAX_CSV_CELL_LENGTH}자까지 입력할 수 있습니다.`);
  };
  const pushRow = () => {
    if (row.some(Boolean)) rows.push(row);
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
      quoted = !quoted;
      continue;
    }

    if (!quoted && char === ",") {
      row.push(cell.trim());
      cell = "";
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
      continue;
    }

    cell += char;
    ensureCellLength();
  }

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
    ["이름", "세례명", ...BASE_ROLES],
    ...members.map((member) => [
      member.name,
      member.baptismalName ?? "",
      ...BASE_ROLES.map((role) => String(member.roles[role])),
    ]),
  ];

  return `${rows.map((row) => row.map(escapeCsvCell).join(",")).join("\n")}\n`;
}

export function membersFromCsv(text: string): Partial<Member>[] {
  const rows = parseCsvRows(text);
  const [header, ...body] = rows;

  if (!header) {
    throw new Error("명단 파일에 헤더가 없습니다.");
  }

  const indexes = new Map(header.map((column, index) => [column.trim(), index]));
  const nameIndex = indexes.get("이름") ?? indexes.get("name");
  const baptismalNameIndex = indexes.get("세례명") ?? indexes.get("baptismalName");
  const aliasIndex = indexes.get("별칭") ?? indexes.get("alias");

  if (nameIndex === undefined) {
    throw new Error("명단 파일에 이름 열이 필요합니다.");
  }

  return body.map((row) => ({
    name: restoreFormulaSafeCell(row[nameIndex] ?? ""),
    baptismalName: restoreFormulaSafeCell(row[baptismalNameIndex ?? -1] ?? ""),
    alias: restoreFormulaSafeCell(row[aliasIndex ?? -1] ?? ""),
    roles: {
      정: parseBoolean(row[indexes.get("정") ?? -1] ?? ""),
      부: parseBoolean(row[indexes.get("부") ?? -1] ?? ""),
      향: parseBoolean(row[indexes.get("향") ?? -1] ?? ""),
      향합: parseBoolean(row[indexes.get("향합") ?? -1] ?? ""),
    },
  }));
}
