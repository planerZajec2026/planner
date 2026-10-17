import { timeToMinutes } from "@/lib/dates";

export type Placed<T> = T & { start: number; end: number; lane: number; lanes: number };

/**
 * Splits one day's events into side-by-side lanes. Events that overlap (directly or through a chain)
 * form a cluster; every event in a cluster gets the cluster's lane count so their widths match.
 */
export function layoutDay<T extends { od: string; do: string }>(events: T[]): Placed<T>[] {
  const sorted = events
    .map((e) => ({ ...e, start: timeToMinutes(e.od), end: timeToMinutes(e.do), lane: 0, lanes: 1 }))
    .sort((a, b) => a.start - b.start || b.end - a.end);

  const placed: Placed<T>[] = [];
  let cluster: Placed<T>[] = [];
  let laneEnds: number[] = [];
  let clusterEnd = -1;

  const closeCluster = () => {
    for (const e of cluster) e.lanes = laneEnds.length;
    cluster = [];
    laneEnds = [];
  };

  for (const e of sorted) {
    if (e.start >= clusterEnd) closeCluster();
    let lane = laneEnds.findIndex((end) => end <= e.start);
    if (lane === -1) lane = laneEnds.push(0) - 1;
    laneEnds[lane] = e.end;
    e.lane = lane;
    cluster.push(e);
    placed.push(e);
    clusterEnd = Math.max(clusterEnd, e.end);
  }
  closeCluster();
  return placed;
}
