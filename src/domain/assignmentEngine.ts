import { BASE_ROLES, SUB_ROLES, type BaseRole, type GenerateScheduleInput, type GenerateScheduleResult, type Role, type ValidationIssue, type VoteEntry, type Member } from "./scheduleTypes";
import { makeDateKeyFromScheduleKey } from "./dateTime";

const SPECIAL_CAR_MEMBER = "관리장님";

function cloneMembers(members: Member[]): Member[] {
  return members.map((member) => ({
    ...member,
    roles: { ...member.roles },
    counts: { ...member.counts },
  }));
}

function uniqueVotes(entries: VoteEntry[], memberMap: Map<string, Member>, issues: ValidationIssue[]): Map<string, string[]> {
  const map = new Map<string, string[]>();
  const seen = new Set<string>();

  entries.forEach((entry) => {
    const name = entry.name.trim();
    if (!memberMap.has(name) && name !== SPECIAL_CAR_MEMBER) return;

    const key = `${entry.scheduleKey}:${name}`;
    if (seen.has(key)) {
      issues.push({
        severity: "warning",
        code: "vote.duplicate-ignored",
        message: `중복 투표는 한 번만 사용했습니다: ${name}`,
        target: { type: "vote", id: key },
      });
      return;
    }

    seen.add(key);
    map.set(entry.scheduleKey, [...(map.get(entry.scheduleKey) ?? []), name]);
  });

  return map;
}

function randomTieBreakers(members: Member[]): Map<string, number> {
  return new Map(members.map((member) => [member.name, Math.random()]));
}

export function generateSchedule(input: GenerateScheduleInput): GenerateScheduleResult {
  const members = cloneMembers(input.members);
  const issues: ValidationIssue[] = [];
  const memberMap = new Map(members.map((member) => [member.name, member]));
  const tieBreakers = randomTieBreakers(members);
  const serviceVoteMap = uniqueVotes(input.serviceVotes, memberMap, issues);
  const carVoteMap = uniqueVotes(input.carVotes, memberMap, issues);
  const assignedCarMap = new Map<string, { displayDate: string; name: string }>();
  const carByDateKey = new Map<string, (typeof input.carSchedules)[number]>();

  input.carSchedules.forEach((schedule) => {
    const dateKey = makeDateKeyFromScheduleKey(schedule.key);
    if (!carByDateKey.has(dateKey)) carByDateKey.set(dateKey, schedule);
  });

  const assignCar = (schedule: (typeof input.carSchedules)[number] | undefined): string => {
    if (!schedule) return "";
    const cached = assignedCarMap.get(schedule.key);
    if (cached) return cached.name;

    const carVotes = carVoteMap.get(schedule.key) ?? [];
    if (carVotes.includes(SPECIAL_CAR_MEMBER)) {
      assignedCarMap.set(schedule.key, { displayDate: schedule.displayDate, name: SPECIAL_CAR_MEMBER });
      return SPECIAL_CAR_MEMBER;
    }

    const candidates = carVotes
      .map((name) => memberMap.get(name))
      .filter((member): member is Member => Boolean(member))
      .sort((a, b) => a.counts["전체"] - b.counts["전체"] || a.counts["차량"] - b.counts["차량"] || (tieBreakers.get(a.name) ?? 0) - (tieBreakers.get(b.name) ?? 0));

    const chosen = candidates[0];
    const name = chosen?.name ?? "";

    if (chosen) {
      chosen.counts["전체"] += 1;
      chosen.counts["차량"] += 1;
    } else {
      issues.push({
        severity: "warning",
        code: "assignment.no-car-candidate",
        message: `${schedule.displayDate} 차량봉사 후보가 없습니다.`,
        target: { type: "schedule", id: schedule.key },
      });
    }

    assignedCarMap.set(schedule.key, { displayDate: schedule.displayDate, name });
    return name;
  };

  const serviceRows = [...input.serviceSchedules]
    .sort((a, b) => a.key.localeCompare(b.key))
    .map((schedule) => {
      const availableNames = serviceVoteMap.get(schedule.key) ?? [];
      const selected: Partial<Record<Role, string>> = {};
      const used = new Set<string>();
      const carName = assignCar(carByDateKey.get(makeDateKeyFromScheduleKey(schedule.key)));

      schedule.baseRoles.forEach((role: BaseRole) => {
        const candidates = availableNames
          .map((name) => memberMap.get(name))
          .filter((member): member is Member => Boolean(member))
          .filter((member) => !used.has(member.name))
          .filter((member) => member.roles[role])
          .sort((a, b) => {
            const aCarPriority = a.name === carName ? -10000 : 0;
            const bCarPriority = b.name === carName ? -10000 : 0;
            const aScore = aCarPriority + a.counts["전체"] * 100 + a.counts[role] * 10;
            const bScore = bCarPriority + b.counts["전체"] * 100 + b.counts[role] * 10;
            return aScore - bScore || (tieBreakers.get(a.name) ?? 0) - (tieBreakers.get(b.name) ?? 0);
          });

        const chosen = candidates[0];
        if (!chosen) {
          selected[role] = "X";
          issues.push({
            severity: "warning",
            code: "assignment.no-role-candidate",
            message: `${schedule.displayDate} ${role} 후보가 없습니다.`,
            target: { type: "schedule", id: schedule.key },
          });
          return;
        }

        selected[role] = chosen.name;
        used.add(chosen.name);
        if (chosen.name !== carName) chosen.counts["전체"] += 1;
        chosen.counts[role] += 1;
      });

      BASE_ROLES.forEach((role) => {
        if (!schedule.baseRoles.includes(role)) selected[role] = "";
      });

      schedule.subRoles.forEach((role) => {
        const candidates = availableNames
          .map((name) => memberMap.get(name))
          .filter((member): member is Member => Boolean(member))
          .filter((member) => !used.has(member.name))
          .sort((a, b) => a.counts["전체"] * 100 + a.counts[role] * 10 - (b.counts["전체"] * 100 + b.counts[role] * 10) || (tieBreakers.get(a.name) ?? 0) - (tieBreakers.get(b.name) ?? 0));

        const chosen = candidates[0];
        if (!chosen) {
          selected[role] = "X";
          issues.push({
            severity: "warning",
            code: "assignment.no-sub-role-candidate",
            message: `${schedule.displayDate} ${role} 후보가 없습니다.`,
            target: { type: "schedule", id: schedule.key },
          });
          return;
        }

        selected[role] = chosen.name;
        used.add(chosen.name);
        chosen.counts["전체"] += 1;
        chosen.counts[role] += 1;
      });

      SUB_ROLES.forEach((role) => {
        if (!schedule.subRoles.includes(role)) selected[role] = "";
      });

      return {
        displayDate: schedule.displayDate,
        roles: selected,
      };
    });

  input.carSchedules.forEach(assignCar);
  const carRows = input.carSchedules.map((schedule) => {
    const assigned = assignedCarMap.get(schedule.key);
    return {
      displayDate: schedule.displayDate,
      name: assigned?.name ?? "",
    };
  });

  return {
    serviceRows,
    carRows,
    updatedMembers: members,
    issues,
    generatedAt: new Date().toISOString(),
  };
}
