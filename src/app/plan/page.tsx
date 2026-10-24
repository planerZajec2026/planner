import type { Metadata } from "next";
import { PlanView } from "@/components/plan/PlanView";
import type { SearchParams } from "@/lib/search-params";

export const metadata: Metadata = { title: "Plan zajęć" };

export default function PlanPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  return <PlanView searchParams={searchParams} />;
}
