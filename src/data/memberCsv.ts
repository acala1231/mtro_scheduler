import { BASE_ROLES, type Member } from "../domain/scheduleTypes";

export const SAMPLE_MEMBERS_CSV = `이름,세례명,정,부,향,향합
홍길동,베드로,true,true,true,true
김철수,마태오,false,true,true,false
`;

function escapeCsvCell(value: string) {
  return /[",\n\r]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}

function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const nextChar = text[index + 1];

    if (quoted && char === '"' && nextChar === '"') {
      cell += '"';
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
      if (row.some(Boolean)) {
        rows.push(row);
      }
      row = [];
      cell = "";
      continue;
    }

    cell += char;
  }

  row.push(cell.trim());
  if (row.some(Boolean)) {
    rows.push(row);
  }

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

  if (nameIndex === undefined) {
    throw new Error("명단 파일에 이름 열이 필요합니다.");
  }

  return body.map((row) => ({
    name: row[nameIndex] ?? "",
    baptismalName: row[baptismalNameIndex ?? -1] ?? "",
    roles: {
      정: parseBoolean(row[indexes.get("정") ?? -1] ?? ""),
      부: parseBoolean(row[indexes.get("부") ?? -1] ?? ""),
      향: parseBoolean(row[indexes.get("향") ?? -1] ?? ""),
      향합: parseBoolean(row[indexes.get("향합") ?? -1] ?? ""),
    },
  }));
}
