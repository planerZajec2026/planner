import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import { Placeholder } from "@/components/layout/Placeholder";

export const metadata: Metadata = { title: "Prowadzący" };

export default function Page() {
  return (
    <>
      <PageHeader title="Prowadzący zajęcia" description="Lista prowadzących wraz z danymi kontaktowymi i przypisanymi przedmiotami." />
      <Placeholder spec="spec 03" />
    </>
  );
}
