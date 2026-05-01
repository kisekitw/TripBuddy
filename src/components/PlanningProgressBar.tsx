interface Props {
  score: number;
  compact?: boolean;
}

export function PlanningProgressBar({ score, compact = false }: Props) {
  const pct = Math.max(0, Math.min(100, score));
  const ACCENT = "#c8946d";

  if (compact) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <div style={{ flex: 1, height: 4, borderRadius: 2, background: "#e8ddd5", overflow: "hidden" }}>
          <div style={{ width: `${pct}%`, height: "100%", background: ACCENT, borderRadius: 2, transition: "width .3s" }} />
        </div>
        <span style={{ fontSize: 10, color: ACCENT, fontWeight: 600, minWidth: 28, textAlign: "right" }}>{pct}%</span>
      </div>
    );
  }

  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
        <span style={{ fontSize: 10, color: "#9e7b5e", letterSpacing: ".05em" }}>PLANNING</span>
        <span style={{ fontSize: 11, color: ACCENT, fontWeight: 600 }}>{pct}%</span>
      </div>
      <div style={{ height: 5, borderRadius: 3, background: "#e8ddd5", overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: ACCENT, borderRadius: 3, transition: "width .4s" }} />
      </div>
    </div>
  );
}
