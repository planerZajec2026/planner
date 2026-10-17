import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import { Placeholder } from "@/components/layout/Placeholder";

export const metadata: Metadata = { title: "Harmonogram grup" };

export default function Page() {
  return (
    <>
      <PageHeader title="Harmonogram zajęć" description="Plan zajęć dla wybranego kierunku i grupy, poniedziałek–niedziela." />
      <Placeholder spec="spec 02" />
    </>
  );
}
