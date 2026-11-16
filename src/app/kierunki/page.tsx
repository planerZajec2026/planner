import type { Metadata } from "next";
import { Suspense } from "react";
import { KierunkiList } from "@/components/kierunki/KierunkiList";
import { BrakDanych } from "@/components/layout/BrakDanych";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageTransition } from "@/components/layout/PageTransition";
import { getGrupy, getKierunki } from "@/lib/data/kierunki";

export const metadata: Metadata = { title: "Kierunki i grupy" };

export default function KierunkiPage() {
  return (
    <PageTransition>
      <Suspense fallback={<div className="empty-state">Wczytywanie kierunków…</div>}>
        <Kierunki />
      </Suspense>
    </PageTransition>
  );
}

async function Kierunki() {
  const [kierunki, grupy] = await Promise.all([getKierunki(), getGrupy()]);
  if (kierunki.length === 0) {
    return (
      <>
        <PageHeader title="Kierunki i grupy" description="Przeglądaj kierunki studiów oraz przypisane im grupy." />
        <BrakDanych />
      </>
    );
  }
  return <KierunkiList kierunki={kierunki} grupy={grupy} />;
}
