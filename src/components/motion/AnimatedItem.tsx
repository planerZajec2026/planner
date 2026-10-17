"use client";

import * as m from "motion/react-m";
import type { ComponentProps } from "react";
import { enter, exit, move } from "@/lib/motion";

/**
 * A grid/list item for a parent <AnimatePresence mode="popLayout">: new items fade and scale in from 0.98,
 * removed items fade out, and the remaining items glide to their new place.
 */
export function AnimatedItem(props: ComponentProps<typeof m.article>) {
  return (
    <m.article
      layout="position"
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1, transition: enter }}
      exit={{ opacity: 0, scale: 0.98, transition: exit }}
      transition={{ layout: move }}
      {...props}
    />
  );
}
