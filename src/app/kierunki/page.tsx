import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import { Placeholder } from "@/components/layout/Placeholder";

export const metadata: Metadata = { title: "Kierunki i grupy" };

export default function Page() {
  return (
    <>
      <PageHeader title="Kierunki i grupy" description="Przeglądaj kierunki studiów oraz przypisane im grupy i tryby zajęć." />
      <Placeholder spec="spec 01" />
    </>
  );
}
