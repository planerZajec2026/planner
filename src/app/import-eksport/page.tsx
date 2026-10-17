import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import { Placeholder } from "@/components/layout/Placeholder";

export const metadata: Metadata = { title: "Import i eksport danych" };

export default function Page() {
  return (
    <>
      <PageHeader title="Import i eksport danych" description="Wczytaj plan zajęć z pliku JSON albo dodaj pojedyncze zajęcia ręcznie." />
      <Placeholder spec="spec 05" />
    </>
  );
}
