import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import { Placeholder } from "@/components/layout/Placeholder";

export const metadata: Metadata = { title: "Harmonogram prowadzącego" };

export default function Page() {
  return (
    <>
      <PageHeader title="Harmonogram prowadzącego" description="Plan zajęć wybranego prowadzącego we wszystkich grupach i trybach studiów." />
      <Placeholder spec="spec 04" />
    </>
  );
}
