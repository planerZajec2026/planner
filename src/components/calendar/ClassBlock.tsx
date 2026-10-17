import type { CSSProperties } from "react";
import { typLabel } from "@/lib/schedule";
import type { TypZajec } from "@/lib/types";

type ClassBlockProps = {
  typ: TypZajec;
  tytul: string;
  meta: string;
  /** Screen-reader-only context (day and time), since the grid position is visual only. */
  srLabel?: string;
  style?: CSSProperties;
};

export function ClassBlock({ typ, tytul, meta, srLabel, style }: ClassBlockProps) {
  return (
    <div className="class-block" style={style}>
      {srLabel && <span className="visually-hidden">{srLabel}</span>}
      <span className="block-tag">{typLabel(typ)}</span>
      <span className="title">{tytul}</span>
      <span className="meta">{meta}</span>
    </div>
  );
}
