export type BaseRole = "정" | "부" | "향" | "향합";
export type SubRole = "초1" | "초2" | "십자가";
export type Role = BaseRole | SubRole;
export type CountRole = Role | "전체" | "차량";

export const BASE_ROLES: BaseRole[] = ["정", "부", "향", "향합"];
export const SUB_ROLES: SubRole[] = ["초1", "초2", "십자가"];
export const COUNT_ROLES: CountRole[] = [
  "전체",
  "정",
  "부",
  "향",
  "향합",
  "초1",
  "초2",
  "십자가",
  "차량",
];

export type Member = {
  /** v2부터 저장 시 부여되는 안정 식별자. 기존 in-memory fixture 호환을 위해 선택적이다. */
  id?: string;
  name: string;
  baptismalName?: string;
  feastDay?: string;
  alias?: string;
  roles: Record<BaseRole, boolean>;
  counts: Record<CountRole, number>;
};

export type MembersFile = {
  version: string;
  updatedAt: string;
  members: Member[];
};

export type ServiceSchedule = {
  key: string;
  date: string;
  time: string;
  displayDate: string;
  baseRoles: BaseRole[];
  subRoles: SubRole[];
  source?: "ocr" | "import";
};

export type CarSchedule = {
  key: string;
  date: string;
  time: string;
  displayDate: string;
  source?: "ocr" | "import";
};

export type ScheduleSettings = {
  month: string;
  titleColor: string;
  headerColor: string;
  serviceSchedules: ServiceSchedule[];
  carSchedules: CarSchedule[];
};

export type VoteEntry = {
  scheduleKey: string;
  displayText?: string;
  name: string;
  source?: "ocr" | "manual" | "import";
};

export type VoteCountInfo = {
  scheduleKey: string;
  displayText: string;
  kind: "service" | "car";
  expectedCount: number;
};

export type VoteData = {
  month: string;
  rawText: string;
  serviceVotes: VoteEntry[];
  carVotes: VoteEntry[];
};

export type ScheduleResultRow = {
  displayDate: string;
  note?: string;
  roles: Partial<Record<Role, string>>;
};

export type CarResultRow = {
  displayDate: string;
  name: string;
  note?: string;
};

export type ValidationSeverity = "info" | "warning" | "error";

export type ValidationIssue = {
  severity: ValidationSeverity;
  code: string;
  message: string;
  target?: {
    type: "member" | "setting" | "vote" | "schedule";
    id?: string;
  };
};

export type GenerateScheduleInput = {
  members: Member[];
  serviceSchedules: ServiceSchedule[];
  carSchedules: CarSchedule[];
  serviceVotes: VoteEntry[];
  carVotes: VoteEntry[];
};

export type GenerateScheduleResult = {
  serviceRows: ScheduleResultRow[];
  carRows: CarResultRow[];
  updatedMembers: Member[];
  issues: ValidationIssue[];
  generatedAt: string;
};

export type AppStep = "home" | "members" | "settings" | "votes" | "generate";
