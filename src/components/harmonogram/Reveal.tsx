import { ViewTransition, type ReactNode } from "react";
import { PRZEJSCIE } from "@/lib/motion";

/** Suspense fallback for the timetables; fades out when the content arrives. */
export function HarmonogramFallback() {
  return (
    <ViewTransition exit="fallback-exit" default="none">
      <div className="empty-state">Wczytywanie harmonogramu…</div>
    </ViewTransition>
  );
}

/**
 * Streamed timetable content; fades in when it replaces the fallback (a reveal carries no type).
 * Typed navigations remount it too, but their own animations already cover the change.
 */
const REVEAL = {
  [PRZEJSCIE.strona]: "none",
  [PRZEJSCIE.filtr]: "none",
  [PRZEJSCIE.tydzienNastepny]: "none",
  [PRZEJSCIE.tydzienPoprzedni]: "none",
  default: "content-enter",
};

export function Reveal({ children }: { children: ReactNode }) {
  return (
    <ViewTransition enter={REVEAL} default="none">
      <div className="page">{children}</div>
    </ViewTransition>
  );
}

/** Calendar: a week change slides in the direction of travel; anything else (group, instructor) crossfades. */
export const WEEK_TRANSITION = {
  [PRZEJSCIE.tydzienNastepny]: "tydzien-nastepny",
  [PRZEJSCIE.tydzienPoprzedni]: "tydzien-poprzedni",
  default: "crossfade",
};

/** Instructor summary card: crossfades when the instructor changes, stays put when only the week changes. */
export const SUMMARY_TRANSITION = {
  [PRZEJSCIE.tydzienNastepny]: "none",
  [PRZEJSCIE.tydzienPoprzedni]: "none",
  default: "crossfade",
};
