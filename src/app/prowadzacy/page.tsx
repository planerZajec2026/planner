import type { Metadata } from "next";
import { PageTransition } from "@/components/layout/PageTransition";
import { ProwadzacyView } from "@/components/prowadzacy/ProwadzacyView";
import { getProwadzacy } from "@/lib/data/prowadzacy";

export const metadata: Metadata = { title: "Prowadzący" };

export default async function ProwadzacyPage() {
  const prowadzacy = await getProwadzacy();
  return (
    <PageTransition>
      <ProwadzacyView initial={prowadzacy} />
    </PageTransition>
  );
}
