import type { Trip, Day } from "../types";

/**
 * Compute a planning progress score (0–100) for a trip.
 * Components:
 *   +15  Trip has a valid start date (>= today)
 *   +25  All non-empty days have at least one spot
 *   +20  All spots have a scheduled time (t > 0)
 *   +20  At least one alternative spot exists (isA)
 *   +20  All non-empty days have a non-empty label (lb)
 */
export function computePlanningProgress(trip: Trip, days: Day[]): number {
  let lastValidScore = 0;
  try {
    if (!days || days.length === 0) return 0;

    const nonEmptyDays = days.filter((d) => {
      const spots = d.sp ?? [];
      return spots.length > 0;
    });

    let score = 0;

    // +15: valid start date (>= today)
    if (trip.startDate) {
      try {
        const parts = trip.startDate.split("-").map(Number);
        if (parts.length === 3 && parts.every((p) => !isNaN(p))) {
          const tripDate = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
          const today = new Date();
          const todayUTC = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
          if (tripDate >= todayUTC) score += 15;
        } else {
          console.warn("[planningProgress] Invalid startDate format:", trip.startDate);
        }
      } catch {
        console.warn("[planningProgress] Failed to parse startDate:", trip.startDate);
      }
    }

    lastValidScore = score;

    // +25: all days have at least one spot (using total days, not just non-empty)
    if (days.every((d) => (d.sp ?? []).length > 0)) score += 25;

    lastValidScore = score;

    // +20: all spots have t > 0
    const allSpots = nonEmptyDays.flatMap((d) => d.sp ?? []);
    if (allSpots.length > 0 && allSpots.every((s) => {
      if (s === null || s === undefined || typeof s.t !== "number") {
        console.warn("[planningProgress] Malformed spot detected:", s);
        return false;
      }
      return s.t > 0;
    })) {
      score += 20;
    }

    lastValidScore = score;

    // +20: at least one alternative spot
    if (allSpots.some((s) => s.isA)) score += 20;

    lastValidScore = score;

    // +20: all non-empty days have a non-empty label
    if (nonEmptyDays.length > 0 && nonEmptyDays.every((d) => d.lb && d.lb.trim() !== "")) {
      score += 20;
    }

    return score;
  } catch (err) {
    console.warn("[planningProgress] Error during computation, returning lastValidScore:", err);
    return lastValidScore;
  }
}
