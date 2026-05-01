import { useRef } from "react";
import type { Trip, Day } from "../types";
import { evaluateAchievements } from "../utils/achievements";

interface Props {
  tripId: number;
  trip: Trip;
  days: Day[];
  lang?: string;
}

export function AchievementBadges({ tripId, trip, days, lang = "zh-TW" }: Props) {
  const animatedRef = useRef<Set<string>>(new Set());
  const results = evaluateAchievements(tripId, trip, days);

  const unlocked = results.filter((a) => a.unlocked);
  const locked = results.filter((a) => !a.unlocked);
  const ordered = [...unlocked, ...locked];

  if (ordered.length === 0) return null;

  return (
    <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px solid #e8ddd5" }}>
      <p style={{ fontSize: 10, fontWeight: 600, color: "#9e7b5e", letterSpacing: ".05em", margin: "0 0 6px" }}>
        {lang === "zh-TW" ? "成就" : "ACHIEVEMENTS"}
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {ordered.map((a) => {
          const shouldAnimate = a.isNew && !animatedRef.current.has(a.id);
          if (shouldAnimate) animatedRef.current.add(a.id);

          const name = lang === "zh-TW" ? a.name : a.nameEn;
          const desc = lang === "zh-TW" ? a.description : a.descriptionEn;

          return (
            <div
              key={a.id}
              className={shouldAnimate ? "achievement-new" : undefined}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 6,
                padding: "5px 7px",
                borderRadius: 6,
                background: a.unlocked ? "#fdf6f0" : "transparent",
                border: `1px solid ${a.unlocked ? "#e8c9a8" : "#ece5de"}`,
                opacity: a.unlocked ? 1 : 0.45,
              }}
            >
              <span style={{ fontSize: 13, lineHeight: 1, marginTop: 1 }}>
                {a.unlocked ? "🏅" : "⬜"}
              </span>
              <div>
                <div style={{ fontSize: 10, fontWeight: 600, color: a.unlocked ? "#8b5e3c" : "#b0a090", lineHeight: 1.2 }}>
                  {name}
                </div>
                <div style={{ fontSize: 9, color: "#b0a090", lineHeight: 1.3, marginTop: 1 }}>
                  {desc}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
