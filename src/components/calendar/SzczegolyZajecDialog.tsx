"use client";

import { useEffect, useId, useRef } from "react";
import { Icon } from "@/components/ui/Icon";
import { klasaTagu } from "@/lib/labels";
import { typLabel } from "@/lib/schedule";
import type { TypZajec } from "@/lib/types";
import type { Szczegol } from "./WeekCalendar";

type SzczegolyZajecDialogProps = {
  typ: TypZajec;
  tytul: string;
  /** Day, date and time shown under the title. */
  termin: string;
  szczegoly: Szczegol[];
  onZamknij: () => void;
};

/**
 * Everything about one class in a modal <dialog>, opened while mounted. Escape, the close button or a click on the
 * backdrop closes it, and the browser returns focus to what opened it.
 */
export function SzczegolyZajecDialog({ typ, tytul, termin, szczegoly, onZamknij }: SzczegolyZajecDialogProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    dialog.current?.showModal();
  }, []);

  return (
    <dialog
      ref={dialog}
      className="class-dialog"
      aria-labelledby={titleId}
      onClose={onZamknij}
      // A click on the dialog element itself (not its content) is a click on the backdrop.
      onClick={(e) => e.target === e.currentTarget && e.currentTarget.close()}
    >
      <div className="class-dialog-body">
        <div className="class-dialog-head">
          <span className={klasaTagu(typ)}>{typLabel(typ)}</span>
          <button type="button" className="btn-icon" aria-label="Zamknij" onClick={() => dialog.current?.close()}>
            <Icon name="x" />
          </button>
        </div>
        <h2 id={titleId}>{tytul}</h2>
        <p className="class-dialog-termin">{termin}</p>
        <dl className="class-dialog-list">
          {szczegoly.map((s) => (
            <div key={s.etykieta}>
              <dt>{s.etykieta}</dt>
              <dd>{s.wartosc}</dd>
            </div>
          ))}
        </dl>
      </div>
    </dialog>
  );
}
