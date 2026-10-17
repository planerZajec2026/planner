import { describe, expect, it } from "vitest";
import {
  addDays,
  isoWeekNumber,
  minutesToTime,
  parseISODate,
  startOfWeek,
  timeToMinutes,
  toISODate,
  weekLabel,
} from "./dates";

const d = (iso: string) => parseISODate(iso)!;

describe("parseISODate", () => {
  it.each(["2026-02-30", "2026-1-5", "2026-13-01", "", "12.10.2026"])("rejects %j", (value) => {
    expect(parseISODate(value)).toBeNull();
  });

  it("rejects missing values", () => {
    expect(parseISODate(undefined)).toBeNull();
    expect(parseISODate(null)).toBeNull();
  });

  it("returns a local date", () => {
    const date = parseISODate("2026-10-12")!;
    expect([date.getFullYear(), date.getMonth(), date.getDate(), date.getHours()]).toEqual([2026, 9, 12, 0]);
  });
});

describe("startOfWeek", () => {
  it("returns Monday for every day of the week, Sunday included", () => {
    for (let i = 0; i < 7; i++) {
      expect(toISODate(startOfWeek(addDays(d("2026-10-12"), i)))).toBe("2026-10-12");
    }
  });

  it("crosses month and year boundaries", () => {
    expect(toISODate(startOfWeek(d("2026-01-01")))).toBe("2025-12-29");
  });
});

describe("weekLabel", () => {
  it("formats a week within one month", () => {
    expect(weekLabel(d("2026-10-12"))).toBe("12–18 października 2026");
  });

  it("formats a week spanning two months", () => {
    expect(weekLabel(d("2026-09-28"))).toBe("28 września – 4 października 2026");
  });

  it("formats a week spanning two years", () => {
    expect(weekLabel(d("2025-12-29"))).toBe("29 grudnia 2025 – 4 stycznia 2026");
  });
});

describe("isoWeekNumber", () => {
  it.each([
    ["2026-10-12", 42],
    ["2026-10-19", 43],
    ["2026-01-01", 1],
    ["2020-12-31", 53],
    ["2021-01-03", 53],
    ["2021-01-04", 1],
  ])("%s is week %i", (iso, week) => {
    expect(isoWeekNumber(d(iso))).toBe(week);
  });
});

describe("time conversion", () => {
  it("converts HH:MM to minutes and back", () => {
    expect(timeToMinutes("08:05")).toBe(485);
    expect(minutesToTime(485)).toBe("08:05");
    expect(minutesToTime(timeToMinutes("23:59"))).toBe("23:59");
  });
});
