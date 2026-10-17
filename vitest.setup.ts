import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";
import { resetNavigation } from "@/test/navigation";

// Every component test gets the controllable next/navigation mock from src/test/navigation.ts.
vi.mock("next/navigation", async () => (await import("@/test/navigation")).navigationMock);

afterEach(() => {
  cleanup();
  resetNavigation();
});
