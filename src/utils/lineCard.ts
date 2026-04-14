import type { Day } from "../types";
import type { WeatherData } from "./weather";
import { fmt, getSpotsForDay } from "./index";

const WEEKDAY_ZH = ["日", "一", "二", "三", "四", "五", "六"];

export function formatDayCard(
  day: Day,
  year: number,
  weather: WeatherData | null
): string {
  // Parse date from day.dt pattern "8/12 三" or "8/9 六"
  const dtM = day.dt.match(/^(\d{1,2})\/(\d{1,2})/);
  const month = dtM ? parseInt(dtM[1]) : 1;
  const date = dtM ? parseInt(dtM[2]) : 1;

  // Derive weekday label
  const weekdayLabel = dtM
    ? WEEKDAY_ZH[new Date(year, month - 1, date).getDay()]
    : "";

  const lines: string[] = [];

  // Title
  lines.push(`🗓 ${year}/${month}/${date} (週${weekdayLabel}) — ${day.lb}`);

  // Weather
  if (weather) {
    lines.push(
      `${weather.emoji} ${weather.desc} ${weather.maxTemp}°C / ${weather.minTemp}°C`
    );
  }

  lines.push("");

  // Spots
  const spots = getSpotsForDay(day);
  for (const s of spots) {
    if (s.isArrival) continue;
    const h = Math.floor(s.d / 60);
    const m = s.d % 60;
    const durStr = h > 0 ? (m > 0 ? `${h}h${m}m` : `${h}h`) : `${m}m`;
    lines.push(`${fmt(s.t)} ${s.nm} (${durStr})`);
  }

  lines.push("");
  lines.push("Have a great day! 🚀 — TripBuddy");

  return lines.join("\n");
}
