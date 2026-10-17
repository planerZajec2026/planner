import type { Metadata } from "next";
import { PageTransition } from "@/components/layout/PageTransition";
import { KierunkiList } from "@/components/kierunki/KierunkiList";
import { getGrupy, getKierunki } from "@/lib/data/kierunki";

export const metadata: Metadata = { title: "Kierunki i grupy" };

export default async function KierunkiPage() {
  const [kierunki, grupy] = await Promise.all([getKierunki(), getGrupy()]);
  return (
    <PageTransition>
      <KierunkiList kierunki={kierunki} grupy={grupy} />
    </PageTransition>
  );
}
