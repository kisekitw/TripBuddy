// "location" is intentionally absent: location messages are routed by event.message.type
// in handlers.ts directly, never by detectIntent()
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
