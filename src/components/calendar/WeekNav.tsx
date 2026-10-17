"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useOptimistic } from "react";
import { useNavigationTransition } from "@/components/harmonogram/PendingNavigation";
import { Icon } from "@/components/ui/Icon";
import { addDays, parseISODate, toISODate, weekLabel } from "@/lib/dates";
import { PRZEJSCIE } from "@/lib/motion";

type WeekNavProps = {
  /** Monday of the displayed week, "YYYY-MM-DD". */
  weekStart: string;
};

/** ‹ "12–18 października 2026" › — moves the `tydzien` search param by one week. */
export function WeekNav({ weekStart }: WeekNavProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useNavigationTransition();
  const [shown, setShown] = useOptimistic(weekStart);
  const monday = parseISODate(shown) ?? new Date();

  const go = (days: number) => {
    const next = toISODate(addDays(monday, days));
    const params = new URLSearchParams(searchParams);
    params.set("tydzien", next);
    startTransition(() => {
      setShown(next);
      // The type lets the calendar's <ViewTransition> slide in the direction of travel.
      router.replace(`${pathname}?${params}`, {
        scroll: false,
        transitionTypes: [days > 0 ? PRZEJSCIE.tydzienNastepny : PRZEJSCIE.tydzienPoprzedni],
      });
    });
  };

  return (
    <div className="week-nav">
      <button type="button" aria-label="Poprzedni tydzień" onClick={() => go(-7)}>
        <Icon name="chevron-left" strokeWidth={2} />
      </button>
      <span aria-live="polite">{weekLabel(monday)}</span>
      <button type="button" aria-label="Następny tydzień" onClick={() => go(7)}>
        <Icon name="chevron-right" strokeWidth={2} />
      </button>
    </div>
  );
}
