import type { ReactNode } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageTransition } from "@/components/layout/PageTransition";

/** The header is static; the data (and its Suspense boundary) lives in page.tsx, where Next.js expects it. */
export default function HarmonogramLayout({ children }: { children: ReactNode }) {
  return (
    <PageTransition>
      <PageHeader
        back={{ href: "/kierunki", label: "Kierunki i grupy" }}
        title="Harmonogram zajęć"
        description="Plan zajęć dla wybranego kierunku i grupy, poniedziałek–niedziela."
      />
      {children}
    </PageTransition>
  );
}
