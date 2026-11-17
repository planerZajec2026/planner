import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getLiczbaZajec } from "@/lib/data/plan";

/** The app opens on the import page until input data is loaded, then on the groups list. */
export default function Home() {
  // Reading the database is runtime data, so with Cache Components it has to sit behind a boundary.
  return (
    <Suspense fallback={null}>
      <Przekierowanie />
    </Suspense>
  );
}

async function Przekierowanie(): Promise<never> {
  redirect((await getLiczbaZajec()) > 0 ? "/kierunki" : "/import");
}
