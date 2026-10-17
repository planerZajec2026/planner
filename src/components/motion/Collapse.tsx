"use client";

import { AnimatePresence } from "motion/react";
import * as m from "motion/react-m";
import type { ReactNode } from "react";
import { collapse } from "@/lib/motion";

type CollapseProps = {
  show: boolean;
  children: ReactNode;
  /** Changing the key replays the animation for new content (e.g. a different error message). */
  contentKey?: string;
  className?: string;
};

/** Opens (height 0 → auto, fade in) and closes a block in the document flow. */
export function Collapse({ show, children, contentKey = "content", className }: CollapseProps) {
  return (
    <AnimatePresence initial={false}>
      {show && (
        <m.div key={contentKey} {...collapse} className={className}>
          {children}
        </m.div>
      )}
    </AnimatePresence>
  );
}

/** A collapsing item for use directly inside a parent's <AnimatePresence> list. */
export function CollapseItem({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <m.div {...collapse} className={className}>
      {children}
    </m.div>
  );
}
