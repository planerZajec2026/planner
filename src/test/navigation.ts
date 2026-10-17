// Test double for next/navigation (wired up in vitest.setup.ts).
import { vi } from "vitest";

export const router = {
  replace: vi.fn(),
  push: vi.fn(),
  refresh: vi.fn(),
  back: vi.fn(),
  forward: vi.fn(),
  prefetch: vi.fn(),
};

let url = new URL("http://localhost/");

/** Sets what usePathname() and useSearchParams() return, e.g. setUrl("/harmonogram?grupa=inf-z-3"). */
export function setUrl(pathAndQuery: string) {
  url = new URL(pathAndQuery, "http://localhost");
}

/** The search params of the last router.replace call. */
export function lastReplacedParams(): URLSearchParams {
  const href = router.replace.mock.lastCall?.[0];
  if (typeof href !== "string") throw new Error("router.replace was not called");
  return new URL(href, "http://localhost").searchParams;
}

export function resetNavigation() {
  Object.values(router).forEach((fn) => fn.mockReset());
  url = new URL("http://localhost/");
}

export const navigationMock = {
  useRouter: () => router,
  usePathname: () => url.pathname,
  useSearchParams: () => new URLSearchParams(url.search),
};
