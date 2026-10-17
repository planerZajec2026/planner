import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { lastReplacedParams, router, setUrl } from "@/test/navigation";
import { WeekNav } from "./WeekNav";

describe("WeekNav", () => {
  it("shows the week label", () => {
    render(<WeekNav weekStart="2026-10-12" />);
    expect(screen.getByText("12–18 października 2026")).toBeInTheDocument();
  });

  it("moves tydzien by a week and keeps the other params", async () => {
    setUrl("/harmonogram?grupa=inf-z-3&tydzien=2026-10-12");
    render(<WeekNav weekStart="2026-10-12" />);

    await userEvent.click(screen.getByRole("button", { name: "Następny tydzień" }));
    expect(router.replace).toHaveBeenLastCalledWith(expect.stringMatching(/^\/harmonogram\?/), { scroll: false });
    expect(Object.fromEntries(lastReplacedParams())).toEqual({ grupa: "inf-z-3", tydzien: "2026-10-19" });

    await userEvent.click(screen.getByRole("button", { name: "Poprzedni tydzień" }));
    expect(lastReplacedParams().get("tydzien")).toBe("2026-10-05");
  });

  it("crosses into the next year", async () => {
    setUrl("/harmonogram");
    render(<WeekNav weekStart="2026-12-28" />);
    await userEvent.click(screen.getByRole("button", { name: "Następny tydzień" }));
    expect(lastReplacedParams().get("tydzien")).toBe("2027-01-04");
  });

  // The optimistic label during a real navigation is covered by e2e; here the server answer arrives as new props.
  it("shows the new week once the page re-renders with it", () => {
    const { rerender } = render(<WeekNav weekStart="2026-10-12" />);
    rerender(<WeekNav weekStart="2026-10-19" />);
    expect(screen.getByText("19–25 października 2026")).toBeInTheDocument();
  });
});
