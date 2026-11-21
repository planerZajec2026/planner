import type { Naruszenie } from "@/lib/plan-edycja";

/** Hard-constraint violations of a placement, with a title saying what they prevent. */
export function ListaNaruszen({ tytul, lista }: { tytul: string; lista: Naruszenie[] }) {
  return (
    <div className="conflict-banner">
      <div>
        <strong>{tytul}</strong>
        <ul>
          {lista.map((n, nr) => (
            <li key={nr}>{n.opis}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
