import { ViewTransition, type ReactNode } from "react";
import { PRZEJSCIE } from "@/lib/motion";

/** Only page links animate the page; filter/week changes (same page, new search params) leave it still. */
const ON_PAGE_LINK = { [PRZEJSCIE.strona]: "page-enter", default: "none" };
const ON_PAGE_LINK_EXIT = { [PRZEJSCIE.strona]: "page-exit", default: "none" };

/**
 * Page enter/exit animation for route changes (spec 07). Put it in each page, or in a route's own layout
 * (app/harmonogram*): a layout persists while you stay on its route, so it animates only when you arrive or leave.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  return (
    <ViewTransition enter={ON_PAGE_LINK} exit={ON_PAGE_LINK_EXIT} default="none">
      <div className="page">{children}</div>
    </ViewTransition>
  );
}
