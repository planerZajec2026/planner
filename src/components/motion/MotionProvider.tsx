"use client";

import { LazyMotion, MotionConfig } from "motion/react";
import type { ReactNode } from "react";

const loadFeatures = () => import("./features").then((mod) => mod.default);

/**
 * App-wide Motion setup: follows the OS reduced-motion setting (transforms and layout off, fades kept)
 * and loads animation features lazily. `strict` makes a stray `motion.*` component throw in development.
 * Import components as `import * as m from "motion/react-m"`: taking `m` from the `motion/react` barrel
 * pulls every animation feature into the initial bundle and defeats LazyMotion.
 */
export function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <LazyMotion features={loadFeatures} strict>
        {children}
      </LazyMotion>
    </MotionConfig>
  );
}
