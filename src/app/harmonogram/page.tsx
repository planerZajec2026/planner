import type { Metadata } from "next";
import { Suspense } from "react";
import { HarmonogramGrupy } from "@/components/harmonogram/HarmonogramGrupy";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";

export const metadata: Metadata = { title: "Harmonogram grup" };

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default function HarmonogramPage({ searchParams }: PageProps) {
  return (
    <>
      <PageHeader
        back={{ href: "/kierunki", label: "Kierunki i grupy" }}
        title="Harmonogram zajęć"
        description="Plan zajęć dla wybranego kierunku i grupy, poniedziałek–niedziela."
        actions={
          // TODO(backend): export the selected group's timetable for the selected week to .xlsx.
          <Button variant="secondary" disabled title="Eksport będzie dostępny po podłączeniu backendu">
            <Icon name="table" />
            Eksportuj do Excela
          </Button>
        }
      />
      <Suspense fallback={<div className="empty-state">Wczytywanie harmonogramu…</div>}>
        <HarmonogramGrupy searchParams={searchParams} />
      </Suspense>
    </>
  );
}
