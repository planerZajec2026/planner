import type { Metadata } from "next";
import { ImportEksportView } from "@/components/import/ImportEksportView";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageTransition } from "@/components/layout/PageTransition";
import { getGrupy, getKierunki } from "@/lib/data/kierunki";
import { getProwadzacy } from "@/lib/data/prowadzacy";
import { getWszystkieZajecia } from "@/lib/data/zajecia";

export const metadata: Metadata = { title: "Import i eksport danych" };

export default async function ImportEksportPage() {
  const [kierunki, grupy, prowadzacy, zajecia] = await Promise.all([
    getKierunki(),
    getGrupy(),
    getProwadzacy(),
    getWszystkieZajecia(),
  ]);

  return (
    <PageTransition>
      <PageHeader
        title="Import i eksport danych"
        description="Wczytaj plan zajęć z pliku JSON albo dodaj pojedyncze zajęcia ręcznie."
      />
      <ImportEksportView kierunki={kierunki} grupy={grupy} prowadzacy={prowadzacy} zajecia={zajecia} />
    </PageTransition>
  );
}
