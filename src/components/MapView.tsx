
import type { Day } from "../types";
import { colors as C, dayColors as DC } from "../utils/colors";
import { getSpotsForDay, getConflictLevel } from "../utils";

interface Props {
  day: Day;
  dayIndex: number;
}

export function MapView({ day, dayIndex }: Props) {
  const spots = getSpotsForDay(day);
  const pts = spots.filter((s) => s.la);
  if (!pts.length) return null;

  const lats = pts.map((s) => s.la);
  const lngs = pts.map((s) => s.ln);
  const cLat = lats.reduce((a, b) => a + b, 0) / lats.length;
  const cLng = lngs.reduce((a, b) => a + b, 0) / lngs.length;
  const s1 = Math.max(Math.max(...lats) - Math.min(...lats), 0.03);
  const s2 = Math.max(Math.max(...lngs) - Math.min(...lngs), 0.03);
  const sc = Math.min(260 / (s1 * 1.4), 260 / (s2 * 1.4));
  const cx = 185, cy = 195;
  const pr = (la: number, ln: number) => ({
    x: cx + (ln - cLng) * sc,
    y: cy - (la - cLat) * sc,
  });
  const dc = DC[Math.max(0, dayIndex) % DC.length];

  return (
    <div style={{ height: "100%", position: "relative" }}>
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 30% 40%,#e8e6e1,#d5d3cd)" }}>
        <div style={{ position: "absolute", inset: 0, opacity: 0.06, backgroundImage: "repeating-linear-gradient(0deg,transparent,transparent 30px,#999 30px,#999 31px),repeating-linear-gradient(90deg,transparent,transparent 30px,#999 30px,#999 31px)" }} />
      </div>
      <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
        {pts.map((s, i) => {
          if (i === 0) return null;
          const p = pts[i - 1];
          const a = pr(p.la, p.ln);
          const b = pr(s.la, s.ln);
          return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={dc} strokeWidth="2" strokeDasharray="6 4" opacity="0.5" />;
        })}
      </svg>
      {pts.map((s, i) => {
        const p = pr(s.la, s.ln);
        const c = getConflictLevel(s);
        return (
          <div key={s.id} style={{ position: "absolute", left: p.x - 10, top: p.y - 10, width: 20, height: 20, borderRadius: 10, background: c >= 2 ? C.errBorder : c === 1 ? C.warnBorder : dc, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 9, fontWeight: 700, boxShadow: "0 1px 4px rgba(0,0,0,.2)", zIndex: 10, cursor: "pointer" }}>
            {i + 1}
          </div>
        );
      })}
      {pts.map((s) => {
        const p = pr(s.la, s.ln);
        return (
          <div key={`l-${s.id}`} style={{ position: "absolute", left: p.x + 14, top: p.y - 5, background: "rgba(255,255,255,.88)", padding: "1px 5px", borderRadius: 4, fontSize: 9, fontWeight: 500, color: C.ink, whiteSpace: "nowrap", pointerEvents: "none", zIndex: 5, maxWidth: 130, overflow: "hidden", textOverflow: "ellipsis" }}>
            {s.nm}
          </div>
        );
      })}
      <div style={{ position: "absolute", bottom: 8, left: 8, background: "rgba(255,255,255,.9)", borderRadius: 8, padding: "5px 10px", fontSize: 10, color: C.muted }}>
        Day {day.n} · {pts.length} spots
      </div>
    </div>
  );
}
