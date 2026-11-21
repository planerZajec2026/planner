"use client";

import { useEffect, useId, useRef, useState, type CSSProperties } from "react";
import { Icon } from "@/components/ui/Icon";
import { typLabel } from "@/lib/schedule";
import type { TypZajec } from "@/lib/types";
import type { Szczegol } from "./WeekCalendar";

type ClassBlockProps = {
  typ: TypZajec;
  tytul: string;
  meta: string;
  /** Screen-reader-only context (day and time), since the grid position is visual only. */
  srLabel?: string;
  /** Day, date and time shown at the top of the popup. */
  termin: string;
  szczegoly: Szczegol[];
  /** A short class: two single lines (title, meta) and no type tag, so nothing is cut off mid-line. */
  compact?: boolean;
  style?: CSSProperties;
};

/**
 * One class on the calendar. Clicking it opens a modal <dialog> with the full details, which the block itself may
 * have to truncate. The dialog exists only while open, so its text never doubles the block's for screen readers.
 */
export function ClassBlock({ typ, tytul, meta, srLabel, termin, szczegoly, compact = false, style }: ClassBlockProps) {
  const [open, setOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    if (open) dialog.current?.showModal();
  }, [open]);

  return (
    <>
      <button
        type="button"
        className={compact ? "class-block compact" : "class-block"}
        style={style}
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
      >
        {srLabel && <span className="visually-hidden">{srLabel}</span>}
        {compact ? (
          <span className="visually-hidden">{typLabel(typ)}: </span>
        ) : (
          <span className="block-tag">{typLabel(typ)}</span>
        )}
        <span className="title">{tytul}</span>
        <span className="meta">{meta}</span>
      </button>
      {open && (
        <dialog
          ref={dialog}
          className="class-dialog"
          aria-labelledby={titleId}
          onClose={() => setOpen(false)}
          // A click on the dialog element itself (not its content) is a click on the backdrop.
          onClick={(e) => e.target === e.currentTarget && e.currentTarget.close()}
        >
          <div className="class-dialog-body">
            <div className="class-dialog-head">
              <span className="block-tag">{typLabel(typ)}</span>
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
      )}
    </>
  );
}
