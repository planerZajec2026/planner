import type { Metadata } from "next";
import { Suspense } from "react";
import { BrakDanych } from "@/components/layout/BrakDanych";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageTransition } from "@/components/layout/PageTransition";
import { ProwadzacyView } from "@/components/prowadzacy/ProwadzacyView";
import { getProwadzacy } from "@/lib/data/prowadzacy";

export const metadata: Metadata = { title: "Prowadzący" };

export default function ProwadzacyPage() {
  return (
    <PageTransition>
      <Suspense fallback={<div className="empty-state">Wczytywanie prowadzących…</div>}>
        <Prowadzacy />
      </Suspense>
    </PageTransition>
  );
}

async function Prowadzacy() {
  const prowadzacy = await getProwadzacy();
  if (prowadzacy.length === 0) {
    return (
      <>
        <PageHeader title="Prowadzący zajęcia" description="Lista prowadzących wraz z jednostką i przedmiotami, które prowadzą." />
        <BrakDanych />
      </>
    );
  }
  return <ProwadzacyView prowadzacy={prowadzacy} />;
}
