import type { Metadata } from "next";
import { HarmonogramProwadzacego } from "@/components/harmonogram/HarmonogramProwadzacego";
import type { SearchParams } from "@/lib/search-params";

export const metadata: Metadata = { title: "Harmonogram prowadzącego" };

/** Header and loading state live in layout.tsx (see there why). */
export default function HarmonogramProwadzacychPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  return <HarmonogramProwadzacego searchParams={searchParams} />;
}
