import type { Metadata } from "next";
import { ProwadzacyView } from "@/components/prowadzacy/ProwadzacyView";
import { getProwadzacy } from "@/lib/data/prowadzacy";

export const metadata: Metadata = { title: "Prowadzący" };

export default async function ProwadzacyPage() {
  const prowadzacy = await getProwadzacy();
  return <ProwadzacyView initial={prowadzacy} />;
}
