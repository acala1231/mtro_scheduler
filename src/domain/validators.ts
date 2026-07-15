import type { ScheduleSettings, ValidationIssue, VoteData, Member } from "./scheduleTypes";

function duplicates(values: string[]): string[] {
  const seen = new Set<string>();
  const dupes = new Set<string>();
  values.forEach((value) => {
    if (seen.has(value)) dupes.add(value);
    seen.add(value);
  });
  return [...dupes];
}

export function validateMembers(members: Member[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  duplicates(members.map((member) => member.name.trim())).forEach((name) => {
    issues.push({
      severity: "error",
      code: "member.duplicate-name",
      message: `현재 투표/결과는 이름으로 연결되므로 같은 이름을 사용할 수 없습니다: ${name}`,
      target: { type: "member", id: name },
    });
  });
  return issues;
}

export function validateSettings(settings: ScheduleSettings): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  duplicates(settings.serviceSchedules.map((schedule) => schedule.key)).forEach((key) => {
    issues.push({
      severity: "error",
      code: "setting.duplicate-service",
      message: `복사 일정이 중복됩니다: ${key}`,
      target: { type: "setting", id: key },
    });
  });

  duplicates(settings.carSchedules.map((schedule) => schedule.key)).forEach((key) => {
    issues.push({
      severity: "error",
      code: "setting.duplicate-car",
      message: `차량봉사 일정이 중복됩니다: ${key}`,
      target: { type: "setting", id: key },
    });
  });

  settings.serviceSchedules.forEach((schedule) => {
    if (schedule.baseRoles.length === 0 && schedule.subRoles.length === 0) {
      issues.push({
        severity: "warning",
        code: "setting.no-roles",
        message: `${schedule.displayDate} 일정에 켜진 역할이 없습니다.`,
        target: { type: "setting", id: schedule.key },
      });
    }
  });

  return issues;
}

export function validateVotes(settings: ScheduleSettings, members: Member[], votes: VoteData): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const memberNames = new Set(members.map((member) => member.name));
  const serviceKeys = new Set(settings.serviceSchedules.map((schedule) => schedule.key));
  const carKeys = new Set(settings.carSchedules.map((schedule) => schedule.key));

  const validateEntries = (kind: "일반" | "차량", entries = votes.serviceVotes) => {
    const seen = new Set<string>();
    entries.forEach((entry) => {
      const scheduleExists = kind === "일반" ? serviceKeys.has(entry.scheduleKey) : carKeys.has(entry.scheduleKey);
      if (!scheduleExists) {
        issues.push({
          severity: "error",
          code: "vote.unknown-schedule",
          message: `${kind} 투표에 설정되지 않은 일정이 있습니다: ${entry.displayText || entry.scheduleKey}`,
          target: { type: "vote", id: entry.scheduleKey },
        });
      }

      const isSpecialCarMember = kind === "차량" && entry.name === "관리장님";
      if (!memberNames.has(entry.name) && !isSpecialCarMember) {
        issues.push({
          severity: "warning",
          code: "vote.unknown-member",
          message: `명단에 없는 이름입니다: ${entry.name}`,
          target: { type: "member", id: entry.name },
        });
      }

      const duplicateKey = `${kind}:${entry.scheduleKey}:${entry.name}`;
      if (seen.has(duplicateKey)) {
        issues.push({
          severity: "warning",
          code: "vote.duplicate",
          message: `중복 투표입니다: ${entry.name} (${entry.displayText || entry.scheduleKey})`,
          target: { type: "vote", id: duplicateKey },
        });
      }
      seen.add(duplicateKey);
    });
  };

  validateEntries("일반", votes.serviceVotes);
  validateEntries("차량", votes.carVotes);

  return issues;
}
