import type { Day, Spot } from "../types";
import { AIRPORT_INFO } from "../data/airports";

/** Normalize IATA input: uppercase, trim, return airport info or null */
export function lookupAirport(input: string) {
  const code = input.trim().toUpperCase();
  return AIRPORT_INFO[code] ?? null;
}

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

/** Auto-adjust all conflicting spots in a day to resolve Level-1/2 conflicts.
 *  Level 2 (t >= cl): move start time back to cl - d
 *  Level 1 (t + d > cl): shorten duration to cl - t
 *  Then recalculate cascade. */
export function autoAdjustDay(day: Day): Day {
  const spots = getSpotsForDay(day);
  const adjusted = spots.map((s) => {
    if (!s.cl) return s;
    if (s.t >= s.cl) return { ...s, t: Math.max(0, s.cl - s.d) };
    if (s.t + s.d > s.cl) return { ...s, d: Math.max(1, s.cl - s.t) };
    return s;
  });
  const updatedDay: Day = day.st === "u" && day.vs && day.av !== undefined
    ? { ...day, vs: day.vs.map((v, i) => i === day.av ? { ...v, sp: adjusted } : v) }
    : { ...day, sp: adjusted };
  return recalcDay(updatedDay);
}

/** Recalculate times for all spots in a day (cascade adjustment).
 *  Cross-midnight departure/arrival cards have user-specified fixed times
 *  and are excluded from cascade — their position in the chain is preserved
 *  but the cascade chain resets to their own time. */
export function recalcDay(day: Day): Day {
  const spots = getSpotsForDay(day);
  if (spots.length === 0) return day;

  let t = spots[0].t;
  const newSpots = spots.map((s, i) => {
    // Cross-midnight cards: keep their time fixed, advance cascade pointer from them
    if (s.nextDayArrival !== undefined || s.isArrival) {
      t = s.t + s.d + (s.tr || 0);
      return s;
    }
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
