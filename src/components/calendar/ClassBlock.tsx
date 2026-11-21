"use client";

import { useState, type CSSProperties } from "react";
import { klasaTagu } from "@/lib/labels";
import { typLabel } from "@/lib/schedule";
import type { TypZajec } from "@/lib/types";
import { SzczegolyZajecDialog } from "./SzczegolyZajecDialog";
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
 * One class on the calendar. Clicking it opens a modal dialog with the full details, which the block itself may
 * have to truncate. The dialog exists only while open, so its text never doubles the block's for screen readers.
 */
export function ClassBlock({ typ, tytul, meta, srLabel, termin, szczegoly, compact = false, style }: ClassBlockProps) {
  const [open, setOpen] = useState(false);

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
          <span className={klasaTagu(typ)}>{typLabel(typ)}</span>
        )}
        <span className="title">{tytul}</span>
        <span className="meta">{meta}</span>
      </button>
      {open && (
        <SzczegolyZajecDialog typ={typ} tytul={tytul} termin={termin} szczegoly={szczegoly} onZamknij={() => setOpen(false)} />
      )}
    </>
  );
}
