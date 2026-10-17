import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { parseISODate } from "@/lib/dates";
import { WeekCalendar, type CalendarEvent } from "./WeekCalendar";

const weekStart = parseISODate("2026-10-12")!;
const ev = (id: string, dzien: CalendarEvent["dzien"], od: string, doGodz: string): CalendarEvent => ({
  id,
  dzien,
  od,
  do: doGodz,
  typ: "wyklad",
  tytul: `Zajęcia ${id}`,
  meta: "B21 · dr Test",
});

const blocks = (container: HTMLElement) => [...container.querySelectorAll<HTMLElement>(".class-block")];

describe("WeekCalendar", () => {
  it("renders Monday–Sunday headers with dates, weekend marked", () => {
    const { container } = render(<WeekCalendar events={[]} weekStart={weekStart} />);
    const headers = [...container.querySelectorAll(".day-header")];
    expect(headers.map((h) => h.textContent)).toEqual([
      "Pon12.10",
      "Wt13.10",
      "Śr14.10",
      "Czw15.10",
      "Pt16.10",
      "Sob17.10",
      "Niedz18.10",
    ]);
    expect(headers.map((h) => h.classList.contains("weekend"))).toEqual([false, false, false, false, false, true, true]);
  });

  it("shows hour labels 8:00–19:00 by default", () => {
    const { container } = render(<WeekCalendar events={[]} weekStart={weekStart} />);
    const labels = [...container.querySelectorAll(".time-col")].map((t) => t.textContent);
    expect(labels[0]).toBe("8:00");
    expect(labels.at(-1)).toBe("19:00");
  });

  it("places a class on 15-minute rows in its day column", () => {
    const { container, getByText } = render(<WeekCalendar events={[ev("a", 4, "12:00", "13:30")]} weekStart={weekStart} />);
    const [block] = blocks(container);
    expect(block.style.gridColumn).toBe("5");
    expect(block.style.gridRow).toBe("18 / 24");
    expect(getByText("Zajęcia a")).toBeInTheDocument();
    expect(getByText("Wykład")).toBeInTheDocument();
    expect(block).toHaveTextContent("Czwartek, 12:00–13:30");
  });

  it("puts overlapping classes side by side", () => {
    const { container } = render(
      <WeekCalendar events={[ev("a", 1, "08:00", "10:00"), ev("b", 1, "09:00", "11:00")]} weekStart={weekStart} />,
    );
    const [a, b] = blocks(container);
    expect([a.style.width, a.style.marginLeft]).toEqual(["calc(50% - 6px)", "calc(0% + 3px)"]);
    expect([b.style.width, b.style.marginLeft]).toEqual(["calc(50% - 6px)", "calc(50% + 3px)"]);
  });

  it("extends the hour range to fit an early class", () => {
    const { container } = render(<WeekCalendar events={[ev("a", 2, "07:00", "08:00")]} weekStart={weekStart} />);
    expect(container.querySelector(".time-col")).toHaveTextContent("7:00");
    expect(blocks(container)[0].style.gridRow).toBe("2 / 6");
  });
});
