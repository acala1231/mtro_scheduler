export function isMissingAssignment(name: string | undefined) {
  return !name || name === "X";
}

export function assignmentDisplayName(name: string | undefined) {
  return isMissingAssignment(name) ? "없음" : name;
}

export function assignmentInputValue(name: string | undefined) {
  return name === "X" ? "" : name ?? "";
}
