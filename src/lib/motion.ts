// Motion tokens (spec 07). Mirror of the --ease-* / --dur-* custom properties in globals.css — keep both in sync.
import type { Transition } from "motion/react";

export const EASE_OUT = [0.22, 1, 0.36, 1] as const;
export const EASE_IN = [0.55, 0, 1, 0.45] as const;
export const EASE_IN_OUT = [0.65, 0, 0.35, 1] as const;

/**
 * Transition types attached to navigations (Link `transitionTypes`, router.replace). <ViewTransition>s map them
 * to animations: a page link animates the page, a filter change crossfades the result, a week change slides.
 * Search-param navigations remount the page segment, so without a type the page entrance would replay on every
 * filter change.
 */
export const PRZEJSCIE = {
  strona: "strona",
  filtr: "filtr",
  tydzienNastepny: "tydzien-nastepny",
  tydzienPoprzedni: "tydzien-poprzedni",
} as const;

/** Durations in seconds (Motion's unit). */
export const DUR = { fast: 0.12, enter: 0.22, exit: 0.15, move: 0.32 } as const;

export const enter: Transition = { duration: DUR.enter, ease: EASE_OUT };
export const exit: Transition = { duration: DUR.exit, ease: EASE_IN };
export const move: Transition = { duration: DUR.move, ease: EASE_IN_OUT };

/**
 * Height + opacity, for panels and list rows that open and close in the document flow.
 * Overflow is clipped only while moving, so shadows and hover lifts aren't cut off once open.
 */
export const collapse = {
  initial: { height: 0, opacity: 0, overflow: "hidden" },
  animate: { height: "auto", opacity: 1, transition: enter, transitionEnd: { overflow: "visible" } },
  exit: { height: 0, opacity: 0, overflow: "hidden", transition: exit },
} as const;
