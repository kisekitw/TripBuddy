import type { Trip, Day } from "../types";

export interface Achievement {
  id: string;
  name: string;
  nameEn: string;
  description: string;
  descriptionEn: string;
  rule: (trip: Trip, days: Day[]) => boolean;
}

export interface EvaluatedAchievement extends Achievement {
  unlocked: boolean;
  isNew: boolean;
}

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: "has-backup-plan",
    name: "備案達人",
    nameEn: "Always Prepared",
    description: "為行程設置了備案景點",
    descriptionEn: "Added an alternative spot to the itinerary",
    rule: (_trip, days) =>
      days.some((d) => (d.sp ?? []).some((s) => s.isA)),
  },
  {
    id: "fully-scheduled",
    name: "精準規劃師",
    nameEn: "Precision Planner",
    description: "所有景點都設有出發時間",
    descriptionEn: "Every spot has a scheduled time",
    rule: (_trip, days) => {
      const spots = days.flatMap((d) => d.sp ?? []);
      return spots.length > 0 && spots.every((s) => s.t > 0);
    },
  },
  {
    id: "multi-day-planner",
    name: "多天旅行者",
    nameEn: "Multi-Day Explorer",
    description: "規劃了 3 天以上的行程",
    descriptionEn: "Planned a trip with 3+ days each with spots",
    rule: (_trip, days) =>
      days.filter((d) => (d.sp ?? []).length > 0).length >= 3,
  },
  {
    id: "date-setter",
    name: "出發準備好",
    nameEn: "Ready to Go",
    description: "設定了旅行出發日期",
    descriptionEn: "Set a start date for the trip",
    rule: (trip) => !!trip.startDate,
  },
  {
    id: "well-packed",
    name: "行程豐富",
    nameEn: "Well-Packed",
    description: "行程中有 5 個以上的景點",
    descriptionEn: "Added 5 or more spots across all days",
    rule: (_trip, days) =>
      days.flatMap((d) => d.sp ?? []).length >= 5,
  },
];

const LS_PREFIX = "tripbuddy_achievements_";

function loadSeen(tripId: number): string[] {
  try {
    return JSON.parse(localStorage.getItem(`${LS_PREFIX}${tripId}`) ?? "[]");
  } catch {
    return [];
  }
}

function saveSeen(tripId: number, ids: string[]): void {
  try {
    localStorage.setItem(`${LS_PREFIX}${tripId}`, JSON.stringify(ids));
  } catch {
    // silent fallback
  }
}

export function evaluateAchievements(
  tripId: number,
  trip: Trip,
  days: Day[]
): EvaluatedAchievement[] {
  const seen = loadSeen(tripId);
  const newlySeen: string[] = [];

  const results = ACHIEVEMENTS.map((a) => {
    const unlocked = a.rule(trip, days);
    const isNew = unlocked && !seen.includes(a.id);
    if (isNew) newlySeen.push(a.id);
    return { ...a, unlocked, isNew };
  });

  if (newlySeen.length > 0) {
    saveSeen(tripId, [...seen, ...newlySeen]);
  }

  return results;
}
