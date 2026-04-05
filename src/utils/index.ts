import type { Day, Spot } from "../types";

/** Format minutes to HH:MM */
export function fmt(m: number): string {
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${String(h).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

/** Get spots from a day (handles uncertain days with variants) */
export function getSpotsForDay(day: Day): Spot[] {
  if (day.st === "u" && day.vs && day.av !== undefined) {
    return day.vs[day.av]?.sp || [];
  }
  return day.sp || [];
}

/** Check conflict level: 0=none, 1=warning, 2=hard conflict */
export function getConflictLevel(spot: Spot): number {
  if (!spot) return 0;
  if (spot.cl && spot.t >= spot.cl) return 2;
  if (spot.cl && spot.t + spot.d > spot.cl) return 1;
  if (spot.sa && spot.t < spot.sa - 30) return 1;
  if (spot.sb && spot.t + spot.d > spot.sb) return 1;
  return 0;
}

/** Recalculate times for all spots in a day (cascade adjustment) */
export function recalcDay(day: Day): Day {
  const spots = getSpotsForDay(day);
  if (spots.length === 0) return day;

  let t = spots[0].t;
  const newSpots = spots.map((s, i) => {
    const updated = { ...s, t: i === 0 ? s.t : t };
    t = updated.t + updated.d + (updated.tr || 0);
    return updated;
  });

  if (day.st === "u" && day.vs && day.av !== undefined) {
    const newVariants = day.vs.map((v, i) =>
      i === day.av ? { ...v, sp: newSpots } : v
    );
    return { ...day, vs: newVariants };
  }
  return { ...day, sp: newSpots };
}
