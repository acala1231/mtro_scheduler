import type { CarSchedule, CountRole, GenerateScheduleResult, Member, Role, ServiceSchedule } from "./scheduleTypes";

const MISSING_ASSIGNMENT = "X";

function cloneMembers(members: Member[]): Member[] {
  return members.map((member) => ({
    ...member,
    roles: { ...member.roles },
    counts: { ...member.counts },
  }));
}

function validAssignmentName(value: string | undefined): string {
  const name = String(value ?? "").trim();
  return name && name !== MISSING_ASSIGNMENT ? name : "";
}

function datePartFromDisplayDate(value: string): string {
  return value.match(/^\d{1,2}\/\d{1,2}/)?.[0] ?? value;
}

function scheduleDateByDisplayDate(schedules: Array<ServiceSchedule | CarSchedule>) {
  return new Map(schedules.map((schedule) => [schedule.displayDate, schedule.date]));
}

function increaseCount(member: Member, role: CountRole, amount = 1) {
  member.counts[role] = (member.counts[role] ?? 0) + amount;
}

export function recalculateResultMembers({
  sourceMembers,
  serviceSchedules,
  carSchedules,
  result,
}: {
  sourceMembers: Member[];
  serviceSchedules: ServiceSchedule[];
  carSchedules: CarSchedule[];
  result: GenerateScheduleResult;
}): Member[] {
  const members = cloneMembers(sourceMembers);
  const memberMap = new Map(members.map((member) => [member.name, member]));
  const serviceDateMap = scheduleDateByDisplayDate(serviceSchedules);
  const carDateMap = scheduleDateByDisplayDate(carSchedules);
  const carNameByDate = new Map<string, string>();

  result.carRows.forEach((row) => {
    const name = validAssignmentName(row.name);
    const member = memberMap.get(name);
    if (!member) return;

    const date = carDateMap.get(row.displayDate) ?? datePartFromDisplayDate(row.displayDate);
    carNameByDate.set(date, name);
    increaseCount(member, "전체");
    increaseCount(member, "차량");
  });

  result.serviceRows.forEach((row) => {
    const date = serviceDateMap.get(row.displayDate) ?? datePartFromDisplayDate(row.displayDate);
    const carName = carNameByDate.get(date);

    Object.entries(row.roles).forEach(([role, value]) => {
      const name = validAssignmentName(value);
      const member = memberMap.get(name);
      if (!member) return;

      if (name !== carName) increaseCount(member, "전체");
      increaseCount(member, role as Role);
    });
  });

  return members;
}
