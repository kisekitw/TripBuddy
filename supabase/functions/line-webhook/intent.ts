export type Intent = "itinerary" | "crowd" | "navigation" | "link" | "location" | "unknown";

export interface IntentResult {
  intent: Intent;
  code?: string;
}

// Check navigation first so "怎麼去…景點" isn't mis-classified as itinerary
const KEYWORD_ORDER: Array<[Exclude<Intent, "link" | "location" | "unknown">, string[]]> = [
  ["navigation", ["導航", "怎麼去", "怎麼到", "路線", "交通", "navigate", "directions"]],
  ["crowd",      ["人潮", "擠", "多少人", "人多", "crowd", "busy"]],
  ["itinerary",  ["行程", "接下來", "今天", "景點", "next", "itinerary"]],
];

export function detectIntent(text: string): IntentResult {
  if (text.startsWith("/link ")) {
    return { intent: "link", code: text.slice(6).trim() };
  }
  for (const [intent, keywords] of KEYWORD_ORDER) {
    if (keywords.some((kw) => text.includes(kw))) {
      return { intent };
    }
  }
  return { intent: "unknown" };
}
