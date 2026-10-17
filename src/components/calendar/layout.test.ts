import { describe, expect, it } from "vitest";
import { layoutDay } from "./layout";

const ev = (id: string, od: string, doGodz: string) => ({ id, od, do: doGodz });
const lanes = (events: ReturnType<typeof ev>[]) =>
  Object.fromEntries(layoutDay(events).map((e) => [e.id, [e.lane, e.lanes]]));

describe("layoutDay", () => {
  it("gives non-overlapping events one full-width lane", () => {
    expect(lanes([ev("a", "08:00", "10:00"), ev("b", "12:00", "14:00")])).toEqual({ a: [0, 1], b: [0, 1] });
  });

  it("puts two overlapping events side by side", () => {
    expect(lanes([ev("a", "08:00", "10:00"), ev("b", "09:00", "11:00")])).toEqual({ a: [0, 2], b: [1, 2] });
  });

  it("reuses a freed lane within a chained cluster", () => {
    // a–b overlap, b–c overlap, a and c don't: c takes a's lane, all three share the cluster width.
    expect(lanes([ev("a", "08:00", "10:00"), ev("b", "09:00", "12:00"), ev("c", "10:00", "11:00")])).toEqual({
      a: [0, 2],
      b: [1, 2],
      c: [0, 2],
    });
  });

  it("does not treat touching events as overlapping", () => {
    expect(lanes([ev("a", "08:00", "10:00"), ev("b", "10:00", "12:00")])).toEqual({ a: [0, 1], b: [0, 1] });
  });

  it("adds start/end minutes and sorts by start time", () => {
    const placed = layoutDay([ev("late", "12:00", "13:00"), ev("early", "08:15", "09:00")]);
    expect(placed.map((e) => [e.id, e.start, e.end])).toEqual([
      ["early", 495, 540],
      ["late", 720, 780],
    ]);
  });
});
