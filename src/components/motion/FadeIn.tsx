"use client";

import * as m from "motion/react-m";
import type { ReactNode } from "react";
import { enter, exit } from "@/lib/motion";

/** Fades in and rises 8px (opacity only with reduced motion). Use inside <AnimatePresence> to fade out too. */
export function FadeIn({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <m.div
      className={className}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0, transition: enter }}
      exit={{ opacity: 0, transition: exit }}
    >
      {children}
    </m.div>
  );
}
