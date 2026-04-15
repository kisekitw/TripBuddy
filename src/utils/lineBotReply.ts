import type { Spot } from "../types";

// "location" is intentionally absent: location messages are handled by event.message.type,
// not by detectIntent()
export type Intent = "itinerary" | "crowd" | "navigation" | "link" | "unknown";

export interface IntentResult {
  intent: Intent;
  code?: string;
}

// Check navigation first so "怎麼去…景點" isn't mis-classified as itinerary
const KEYWORD_ORDER: Array<[Exclude<Intent, "link" | "unknown">, string[]]> = [
  ["navigation", ["導航", "怎麼去", "怎麼到", "路線", "交通", "navigate", "directions"]],
  ["crowd",      ["人潮", "擠", "多少人", "人多", "crowd", "busy"]],
  ["itinerary",  ["行程", "接下來", "今天", "景點", "next", "itinerary"]],
];

export function detectIntent(text: string): IntentResult {
  if (text.startsWith("/link ")) {
    const code = text.slice(6).trim();
    if (code) return { intent: "link", code };
    // "/link " with empty code → fall through to unknown
  }
  for (const [intent, keywords] of KEYWORD_ORDER) {
    if (keywords.some((kw) => text.includes(kw))) {
      return { intent };
    }
  }
  return { intent: "unknown" };
}

function tToHHMM(t: number): string {
  const h = Math.floor(t / 60);
  const m = t % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function formatDuration(d: number): string {
  const h = Math.floor(d / 60);
  const m = d % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h${m}m`;
}

export function formatItineraryReply(spots: Spot[], dayLabel: string): string {
  const lines = spots.map((s) => `${tToHHMM(s.t)} ${s.nm}（${formatDuration(s.d)}）`);
  return `📅 今日接下來行程（${dayLabel}）\n\n${lines.join("\n")}\n\n共 ${spots.length} 個景點。Have a great trip! 🚀`;
}

export function formatNavigationReply(spot: Spot): string {
  const url = `https://www.google.com/maps/dir/?api=1&destination=${spot.la},${spot.ln}&travelmode=transit`;
  return `🧭 前往下一個景點：${spot.nm}\n\n👉 ${url}\n\n（若已分享位置，路線從你的位置出發）`;
}

export function formatCrowdReply(spot: Spot): string {
  const url = `https://maps.google.com/?q=${spot.la},${spot.ln}`;
  return `🗺 查看${spot.nm}目前人潮：\n${url}\n\n（點開後可見各時段人潮預估圖）`;
}
