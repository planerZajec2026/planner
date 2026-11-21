import type { ReactNode } from "react";
import { PageTransition } from "@/components/layout/PageTransition";

/** Each page under /plan has its own header: the plan, and the board that edits it (spec 16). */
export default function PlanLayout({ children }: { children: ReactNode }) {
  return <PageTransition>{children}</PageTransition>;
}
