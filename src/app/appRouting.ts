import type { AppStep } from "../domain/scheduleTypes";

const CANONICAL_HASHES = new Set(["#/", "#/members", "#/settings", "#/votes", "#/generate"]);

const LEGACY_HASHES: Record<string, string> = {
  "#home": "#/",
  "#members": "#/members",
  "#settings": "#/settings",
  "#votes": "#/votes",
  "#generate": "#/generate",
};

const STEP_PATHS: Record<AppStep, string> = {
  home: "/",
  members: "/members",
  settings: "/settings",
  votes: "/votes",
  generate: "/generate",
};

export function pathForStep(step: AppStep): string {
  return STEP_PATHS[step];
}

export function stepFromPath(pathname: string): AppStep | undefined {
  return (Object.entries(STEP_PATHS).find(([, path]) => path === pathname)?.[0] as AppStep | undefined);
}

export type StepNavigation = "none" | "close-popup" | "push" | "replace-popup";

export function navigationForStepSelection(next: AppStep, current: AppStep, menuOpen: boolean): StepNavigation {
  if (next === current) return menuOpen ? "close-popup" : "none";
  return menuOpen ? "replace-popup" : "push";
}

export function normalizeInitialHash() {
  const { hash, pathname, search } = window.location;
  if (CANONICAL_HASHES.has(hash)) return;

  const canonicalHash = LEGACY_HASHES[hash] ?? "#/";
  window.history.replaceState(window.history.state, "", `${pathname}${search}${canonicalHash}`);
}
