import type { Member } from "./scheduleTypes";

export function normalizeMemberNameForMatch(value: string): string {
  return value.replace(/[^A-Za-z가-힣]/g, "").toLowerCase();
}

function normalizeOcrConfusions(value: string): string {
  return value
    .replace(/확/g, "황")
    .replace(/헌/g, "현")
    .replace(/칠/g, "철")
    .replace(/무/g, "문");
}

function distance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a) return b.length;
  if (!b) return a.length;

  const previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  const current = Array.from({ length: b.length + 1 }, () => 0);

  for (let i = 1; i <= a.length; i += 1) {
    current[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      current[j] = Math.min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + cost);
    }
    for (let j = 0; j <= b.length; j += 1) previous[j] = current[j];
  }

  return previous[b.length];
}

function similarity(a: string, b: string): number {
  const maxLength = Math.max(a.length, b.length);
  if (maxLength === 0) return 0;
  return 1 - distance(a, b) / maxLength;
}

function bestWindowSimilarity(input: string, target: string): number {
  if (!input || !target) return 0;
  if (input.includes(target)) return 1;

  const minLength = Math.max(1, target.length - 1);
  const maxLength = Math.min(input.length, target.length + 1);
  let best = similarity(input, target);

  for (let size = minLength; size <= maxLength; size += 1) {
    for (let index = 0; index <= input.length - size; index += 1) {
      best = Math.max(best, similarity(input.slice(index, index + size), target));
    }
  }

  return best;
}

function uniqueBaptismalNames(members: Member[]): Set<string> {
  const counts = new Map<string, number>();
  members.forEach((member) => {
    const baptismalName = normalizeMemberNameForMatch(member.baptismalName ?? "");
    if (!baptismalName) return;
    counts.set(baptismalName, (counts.get(baptismalName) ?? 0) + 1);
  });

  return new Set([...counts.entries()].filter(([, count]) => count === 1).map(([name]) => name));
}

function memberAliases(member: Member, uniqueBaptismalNameSet: Set<string>): string[] {
  const name = normalizeMemberNameForMatch(member.name);
  const baptismalName = normalizeMemberNameForMatch(member.baptismalName ?? "");
  const aliases = [name];

  if (name && baptismalName) aliases.push(`${name}${baptismalName}`);
  if (baptismalName && uniqueBaptismalNameSet.has(baptismalName)) aliases.push(baptismalName);
  if (member.name === "추용호") aliases.push("mark", "marco");

  return aliases.filter(Boolean);
}

function normalizedTokens(value: string): string[] {
  return value
    .split(/[^A-Za-z가-힣]+/)
    .map((token) => normalizeOcrConfusions(normalizeMemberNameForMatch(token)))
    .filter(Boolean);
}

function resolveByUniqueNameSuffix(members: Member[], value: string): string | undefined {
  const tokens = normalizedTokens(value);
  if (tokens.length === 0) return undefined;

  const suffixCounts = new Map<string, number>();
  members.forEach((member) => {
    const name = normalizeOcrConfusions(normalizeMemberNameForMatch(member.name));
    if (name.length < 3) return;
    const suffix = name.slice(-2);
    suffixCounts.set(suffix, (suffixCounts.get(suffix) ?? 0) + 1);
  });

  const matchedMember = members.find((member) => {
    const name = normalizeOcrConfusions(normalizeMemberNameForMatch(member.name));
    const suffix = name.length >= 3 ? name.slice(-2) : "";
    const nicknameTokens = new Set([suffix, `${suffix}형`, `${suffix}형님`, `${suffix}이형`]);
    return suffix && suffixCounts.get(suffix) === 1 && tokens.some((token) => nicknameTokens.has(token));
  });

  return matchedMember?.name;
}

function resolveByUniqueStandaloneAlias(members: Member[], input: string): string | undefined {
  const aliasMatches = members.filter(
    (member) => normalizeOcrConfusions(normalizeMemberNameForMatch(member.alias ?? "")) === input,
  );
  return aliasMatches.length === 1 ? aliasMatches[0].name : undefined;
}

export type MemberTextMatch = {
  name: string;
  matchedByAlias: boolean;
  matchKind: "exact" | "nickname" | "fuzzy" | "alias";
};

export function resolveMemberMatchFromText(members: Member[], value: string): MemberTextMatch | undefined {
  const input = normalizeOcrConfusions(normalizeMemberNameForMatch(value));
  if (!input) return undefined;

  const exactName = members.find(
    (member) => normalizeOcrConfusions(normalizeMemberNameForMatch(member.name)) === input,
  );
  if (exactName) return { name: exactName.name, matchedByAlias: false, matchKind: "exact" };

  const uniqueBaptismalNameSet = uniqueBaptismalNames(members);
  const matches = members
    .map((member) => {
      const score = Math.max(
        ...memberAliases(member, uniqueBaptismalNameSet).map((alias) => bestWindowSimilarity(input, normalizeOcrConfusions(alias))),
      );
      return { member, score };
    })
    .sort((a, b) => b.score - a.score);

  const [best, second] = matches;
  if (!best) return undefined;

  const confident = best.score >= 0.92;
  const fuzzyButClear = best.score >= 0.72 && best.score - (second?.score ?? 0) >= 0.08;
  if (confident || fuzzyButClear) return { name: best.member.name, matchedByAlias: false, matchKind: "fuzzy" };

  const suffixMatch = resolveByUniqueNameSuffix(members, value);
  if (suffixMatch) return { name: suffixMatch, matchedByAlias: false, matchKind: "nickname" };

  const aliasMatch = resolveByUniqueStandaloneAlias(members, input);
  return aliasMatch ? { name: aliasMatch, matchedByAlias: true, matchKind: "alias" } : undefined;
}

export function resolveMemberNameFromText(members: Member[], value: string): string | undefined {
  return resolveMemberMatchFromText(members, value)?.name;
}

export function resolveMemberNamesFromText(members: Member[], value: string): string[] {
  return resolveMemberMatchesFromText(members, value).map((match) => match.name);
}

export function resolveMemberMatchesFromText(members: Member[], value: string): MemberTextMatch[] {
  const input = normalizeOcrConfusions(normalizeMemberNameForMatch(value));
  if (!input) return [];

  const positionedMatches: Array<{ match: MemberTextMatch; index: number }> = members
    .map((member) => ({ member, index: input.indexOf(normalizeOcrConfusions(normalizeMemberNameForMatch(member.name))) }))
    .filter(({ index }) => index >= 0)
    .map(({ member, index }) => ({ match: { name: member.name, matchedByAlias: false, matchKind: "exact" as const }, index }));

  if (positionedMatches.length === 0) {
    const primaryMatch = resolveMemberMatchFromText(members, value);
    if (!primaryMatch) return [];
    if (primaryMatch.matchedByAlias) return [primaryMatch];

    const member = members.find((item) => item.name === primaryMatch.name);
    const nameIndex = normalizeOcrConfusions(normalizeMemberNameForMatch(member?.name ?? ""));
    const baptismalIndex = normalizeOcrConfusions(normalizeMemberNameForMatch(member?.baptismalName ?? ""));
    positionedMatches.push({
      match: primaryMatch,
      index: Math.max(0, nameIndex ? input.indexOf(nameIndex) : baptismalIndex ? input.indexOf(baptismalIndex) : 0),
    });
  }

  const aliasCounts = new Map<string, number>();
  members.forEach((member) => {
    const alias = normalizeOcrConfusions(normalizeMemberNameForMatch(member.alias ?? ""));
    if (alias) aliasCounts.set(alias, (aliasCounts.get(alias) ?? 0) + 1);
  });
  const memberNames = new Set(
    members.map((member) => normalizeOcrConfusions(normalizeMemberNameForMatch(member.name))).filter(Boolean),
  );
  const uniqueBaptismalNameSet = new Set(
    [...uniqueBaptismalNames(members)].map((name) => normalizeOcrConfusions(name)),
  );
  const tokenPattern = /[A-Za-z가-힣]+/g;
  for (const tokenMatch of value.matchAll(tokenPattern)) {
    const token = normalizeOcrConfusions(normalizeMemberNameForMatch(tokenMatch[0]));
    if (memberNames.has(token) || uniqueBaptismalNameSet.has(token)) continue;
    if (aliasCounts.get(token) !== 1) continue;
    const member = members.find(
      (item) => normalizeOcrConfusions(normalizeMemberNameForMatch(item.alias ?? "")) === token,
    );
    if (member) positionedMatches.push({ match: { name: member.name, matchedByAlias: true, matchKind: "alias" }, index: tokenMatch.index ?? 0 });
  }

  return positionedMatches
    .sort((a, b) => a.index - b.index)
    .map(({ match }) => match)
    .filter((match, index, matches) => matches.findIndex((item) => item.name === match.name) === index);
}
