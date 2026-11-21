import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, describe, expect, it } from "vitest";
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

  it("shows only the given days with their own subtitles (generated plan, no weekend, no weekStart)", () => {
    const { container } = render(
      <WeekCalendar
        events={[ev("a", 3, "10:15", "12:00")]}
        days={[1, 2, 3, 4, 5]}
        daySubtitles={{ 1: "05.01", 3: "08.01" }}
      />,
    );
    const headers = [...container.querySelectorAll(".day-header")];
    expect(headers.map((h) => h.textContent)).toEqual(["Pon05.01", "Wt", "Śr08.01", "Czw", "Pt"]);
    expect(headers.some((h) => h.classList.contains("weekend"))).toBe(false);
  });

  it("shows a one-slot (45 min) class as a compact block without the type tag", () => {
    const { container } = render(
      <WeekCalendar events={[ev("a", 1, "08:15", "09:00"), ev("b", 1, "09:15", "11:00")]} weekStart={weekStart} />,
    );
    const [krotkie, dlugie] = blocks(container);
    expect(krotkie).toHaveClass("compact");
    expect(krotkie.querySelector(".block-tag")).toBeNull();
    expect(krotkie).toHaveTextContent("Wykład: Zajęcia a");
    expect(dlugie).not.toHaveClass("compact");
    expect(dlugie.querySelector(".block-tag")).toHaveTextContent("Wykład");
  });

  describe("details popup", () => {
    // jsdom has <dialog> but not its modal API.
    beforeAll(() => {
      HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
        this.open = true;
      };
      HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
        this.open = false;
        this.dispatchEvent(new Event("close"));
      };
    });

    const szczegoly = [
      { etykieta: "Sala", wartosc: "A283" },
      { etykieta: "Prowadzi", wartosc: "prof. P16" },
    ];

    it("opens on click with the day, date, time and details", async () => {
      const user = userEvent.setup();
      render(<WeekCalendar events={[{ ...ev("a", 4, "13:15", "14:00"), szczegoly }]} weekStart={weekStart} />);
      expect(screen.queryByRole("dialog")).toBeNull();

      await user.click(screen.getByRole("button", { name: /Zajęcia a/ }));
      const dialog = screen.getByRole("dialog", { name: "Zajęcia a" });
      expect(dialog).toHaveTextContent("Czwartek 15.10, 13:15–14:00 (45 min)");
      expect(within(dialog).getByText("A283")).toBeInTheDocument();
      expect(within(dialog).getByText("prof. P16")).toBeInTheDocument();
    });

    it("closes with the close button", async () => {
      const user = userEvent.setup();
      render(<WeekCalendar events={[{ ...ev("a", 4, "13:15", "14:00"), szczegoly }]} weekStart={weekStart} />);
      await user.click(screen.getByRole("button", { name: /Zajęcia a/ }));
      await user.click(screen.getByRole("button", { name: "Zamknij" }));
      expect(screen.queryByRole("dialog")).toBeNull();
    });

    it("falls back to the block's meta line when an event has no details", async () => {
      const user = userEvent.setup();
      render(<WeekCalendar events={[ev("a", 1, "10:15", "12:00")]} weekStart={weekStart} />);
      await user.click(screen.getByRole("button", { name: /Zajęcia a/ }));
      expect(screen.getByRole("dialog")).toHaveTextContent("SzczegółyB21 · dr Test");
    });
  });

  it("places events in the column of their day when only some days are shown", () => {
    const { container } = render(<WeekCalendar events={[ev("a", 3, "10:15", "12:00")]} days={[1, 2, 3, 4, 5]} />);
    // Column 1 is the time column, so Wednesday (3rd day) is column 4.
    expect(blocks(container)[0].style.gridColumn).toMatch(/^4/);
    expect(container.querySelector<HTMLElement>(".calendar-grid")!.style.gridTemplateColumns).toContain("repeat(5,");
  });
});
