import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { MotionGlobalConfig } from "motion/react";
import { afterEach, vi } from "vitest";
import { resetNavigation } from "@/test/navigation";

// Motion animations finish instantly in tests. AnimatePresence still removes exiting elements
// asynchronously, so assert disappearance with waitFor / waitForElementToBeRemoved.
MotionGlobalConfig.skipAnimations = true;

// Every component test gets the controllable next/navigation mock from src/test/navigation.ts.
vi.mock("next/navigation", async () => (await import("@/test/navigation")).navigationMock);

afterEach(() => {
  cleanup();
  resetNavigation();
});
