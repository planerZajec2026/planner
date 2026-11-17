import type { ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  liczba: vi.fn<() => Promise<number>>(),
  redirect: vi.fn((url: string) => {
    throw new Error(`redirect:${url}`);
  }),
}));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/lib/data/plan", () => ({ getLiczbaZajec: mocks.liczba }));

import Home from "./page";

/** The async component inside Home's Suspense boundary. */
const przekieruj = () => ((Home() as ReactElement<{ children: ReactElement }>).props.children.type as () => Promise<never>)();

describe("/", () => {
  beforeEach(() => {
    mocks.liczba.mockReset();
  });

  it("opens the import page while no input data is loaded", async () => {
    mocks.liczba.mockResolvedValue(0);
    await expect(przekieruj()).rejects.toThrow("redirect:/import");
  });

  it("opens the groups list once data is loaded", async () => {
    mocks.liczba.mockResolvedValue(174);
    await expect(przekieruj()).rejects.toThrow("redirect:/kierunki");
  });
});
