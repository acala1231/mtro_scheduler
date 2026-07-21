// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, useLocation, useNavigate as useRouterNavigate } from "react-router-dom";

const { navigate, useMockNavigate } = vi.hoisted(() => ({ navigate: vi.fn(), useMockNavigate: { current: false } }));

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return {
    ...actual,
    useNavigate: () => useMockNavigate.current ? navigate : actual.useNavigate(),
  };
});

import { AppBackButton, RouteFocusHeading } from "./App";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe("AppBackButton", () => {
  afterEach(() => {
    navigate.mockClear();
    useMockNavigate.current = false;
    document.body.innerHTML = "";
  });

  it("상단 화살표를 누르면 브라우저 history의 이전 화면으로 이동한다", async () => {
    useMockNavigate.current = true;
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => root.render(<AppBackButton />));
    const button = container.querySelector<HTMLButtonElement>('button[aria-label="이전 화면으로 돌아가기"]');
    expect(button).not.toBeNull();

    await act(async () => button?.click());

    expect(navigate).toHaveBeenCalledWith(-1);
    await act(async () => root.unmount());
  });
});

function FocusHarness() {
  const location = useLocation();
  const routerNavigate = useRouterNavigate();
  return (
    <>
      <button type="button" onClick={() => routerNavigate("/settings")}>일정편집 이동</button>
      <button type="button" onClick={() => routerNavigate(-1)}>뒤로가기</button>
      <RouteFocusHeading>{location.pathname === "/" ? "홈" : "일정편집"}</RouteFocusHeading>
    </>
  );
}

describe("RouteFocusHeading", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("초기 마운트에서는 포커스를 탈취하지 않고 경로가 바뀌면 화면 제목에 포커스한다", async () => {
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => root.render(<MemoryRouter><FocusHarness /></MemoryRouter>));
    const heading = container.querySelector<HTMLHeadingElement>('h1[tabindex="-1"]');
    expect(heading).not.toBeNull();
    expect(heading).toHaveProperty("textContent", "홈");
    expect(document.activeElement).toBe(document.body);

    await act(async () => container.querySelector<HTMLButtonElement>("button")?.click());
    expect(heading).toHaveProperty("textContent", "일정편집");
    expect(document.activeElement).toBe(heading);

    await act(async () => container.querySelectorAll<HTMLButtonElement>("button")[1]?.click());
    expect(heading).toHaveProperty("textContent", "홈");
    expect(document.activeElement).toBe(heading);
    await act(async () => root.unmount());
  });
});
