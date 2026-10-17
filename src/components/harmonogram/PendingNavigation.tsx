"use client";

import { createContext, use, useTransition, type ReactNode, type TransitionStartFunction } from "react";

type PendingContext = { isPending: boolean; startTransition: TransitionStartFunction };

const Ctx = createContext<PendingContext | null>(null);

/** Shares one navigation transition between the filters/week buttons and the region that shows the result. */
export function PendingProvider({ children }: { children: ReactNode }) {
  const [isPending, startTransition] = useTransition();
  return <Ctx value={{ isPending, startTransition }}>{children}</Ctx>;
}

/** The shared transition when inside a PendingProvider, otherwise a local one. */
export function useNavigationTransition(): [boolean, TransitionStartFunction] {
  const shared = use(Ctx);
  const local = useTransition();
  return shared ? [shared.isPending, shared.startTransition] : local;
}

/** Dims its content (after a short delay, see .pending-region) and sets aria-busy while a navigation is pending. */
export function PendingRegion({ children }: { children: ReactNode }) {
  const isPending = use(Ctx)?.isPending ?? false;
  return (
    <div className="pending-region" aria-busy={isPending || undefined}>
      {children}
    </div>
  );
}
