import type { Metadata } from "next";
import { HarmonogramGrupy } from "@/components/harmonogram/HarmonogramGrupy";
import type { SearchParams } from "@/lib/search-params";

export const metadata: Metadata = { title: "Harmonogram grup" };

/** Header and loading state live in layout.tsx (see there why). */
export default function HarmonogramPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  return <HarmonogramGrupy searchParams={searchParams} />;
}
