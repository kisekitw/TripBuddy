import React, { useState, useRef } from "react";
import type { Locale } from "./i18n";
import type { Day, Trip, User } from "./types";
import { getTranslations } from "./i18n";
import { colors as C, dayColors as DC } from "./utils/colors";
import { fmt, getSpotsForDay, getConflictLevel, recalcDay } from "./utils";
import { SAMPLE_TRIP, SAMPLE_DAYS } from "./data/sampleTrip";
import { LangSwitcher } from "./components/LangSwitcher";
import { MapView } from "./components/MapView";
import { LoginPage } from "./pages/LoginPage";

const pill: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 4,
  padding: "5px 12px", borderRadius: 100, fontSize: 12,
  border: `1px solid ${C.light}`, background: "transparent",
  color: C.muted, cursor: "pointer", whiteSpace: "nowrap",
};

export default function App() {
  const [lang, setLang] = useState<Locale>("zh-TW");
  const [view, setView] = useState<"login" | "trips" | "editor">("login");
  const [user, setUser] = useState<User | null>(null);

  // E-1: trip list state
  const [trips, setTrips] = useState<Trip[]>([SAMPLE_TRIP]);
  const [tripDaysMap, setTripDaysMap] = useState<Record<number, Day[]>>({
    [SAMPLE_TRIP.id]: SAMPLE_DAYS,
  });

  // Active editor state
  const [trip, setTrip] = useState(SAMPLE_TRIP);
  const [days, setDays] = useState<Day[]>(SAMPLE_DAYS);
  const [selDay, setSelDay] = useState<number | null>(null);
  const [tMode, setTMode] = useState<"auto" | "lock">("auto");
  const [dragI, setDragI] = useState<number | null>(null);
  const [impOpen, setImpOpen] = useState(false);
  const [impStep, setImpStep] = useState<"idle" | "parsing" | "done">("idle");

  // E-1: new trip modal state
  const [newTripOpen, setNewTripOpen] = useState(false);
  const [newTripTitle, setNewTripTitle] = useState("");
  const [newTripDest, setNewTripDest] = useState("");
  const [newTripErr, setNewTripErr] = useState("");

  // E-2: delete day confirmation state
  const [deleteConfirmDayId, setDeleteConfirmDayId] = useState<number | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);
  const t = getTranslations(lang);

  // ── Handlers ────────────────────────────────────────────────────

  const doLogin = () => {
    setUser({ name: "旅行者", avatar: "T" });
    setView("trips");
  };

  /** E-1: Open editor for a trip */
  const openTrip = (selectedTrip: Trip) => {
    setTrip(selectedTrip);
    setDays(
      tripDaysMap[selectedTrip.id] ?? [
        { id: 1, n: 1, dt: "", st: "c", lb: t.addDayLabel.replace("{n}", "1"), sp: [] },
      ]
    );
    setView("editor");
    setSelDay(null);
  };

  /** E-1: Create a new trip */
  const handleCreateTrip = () => {
    if (!newTripTitle.trim()) {
      setNewTripErr(t.newTripTitleRequired);
      return;
    }
    const maxId = trips.length > 0 ? Math.max(...trips.map((tr) => tr.id)) : 0;
    const newId = maxId + 1;
    const newTrip: Trip = {
      id: newId,
      title: newTripTitle.trim(),
      dest: newTripDest.trim() || undefined,
      dates: "",
      img: "✈️",
    };
    const defaultDay: Day = {
      id: 1, n: 1, dt: "", st: "c", lb: t.addDayLabel.replace("{n}", "1"), sp: [],
    };
    setTrips((prev) => [...prev, newTrip]);
    setTripDaysMap((prev) => ({ ...prev, [newId]: [defaultDay] }));
    setNewTripOpen(false);
    setNewTripTitle("");
    setNewTripDest("");
    setNewTripErr("");
  };

  const closeNewTripModal = () => {
    setNewTripOpen(false);
    setNewTripTitle("");
    setNewTripDest("");
    setNewTripErr("");
  };

  /** E-2: Add a day to the current trip */
  const addDay = () => {
    setDays((prev) => {
      const maxN = prev.length > 0 ? Math.max(...prev.map((d) => d.n)) : 0;
      const maxId = prev.length > 0 ? Math.max(...prev.map((d) => d.id)) : 0;
      return [
        ...prev,
        { id: maxId + 1, n: maxN + 1, dt: "", st: "c", lb: t.addDayLabel.replace("{n}", String(maxN + 1)), sp: [] },
      ];
    });
  };

  /** E-2: Request deletion — shows confirm dialog if day has spots */
  const requestDeleteDay = (dayId: number) => {
    const day = days.find((d) => d.id === dayId);
    if (!day) return;
    // Use getSpotsForDay so uncertain days (st:"u") with spots in vs[av].sp are handled correctly
    if (getSpotsForDay(day).length > 0) {
      setDeleteConfirmDayId(dayId);
    } else {
      setDays((prev) => prev.filter((d) => d.id !== dayId));
      if (selDay === dayId) setSelDay(null);
    }
  };

  /** E-2: Confirm deletion of a day with spots */
  const confirmDeleteDay = () => {
    if (deleteConfirmDayId === null) return;
    setDays((prev) => prev.filter((d) => d.id !== deleteConfirmDayId));
    if (selDay === deleteConfirmDayId) setSelDay(null);
    setDeleteConfirmDayId(null);
  };

  // ── Spot handlers ────────────────────────────────────────────────

  const moveSpot = (dayId: number, from: number, to: number) => {
    setDays((prev) =>
      prev.map((d) => {
        if (d.id !== dayId) return d;
        const arr = d.st === "u" && d.vs && d.av !== undefined
          ? [...d.vs[d.av].sp]
          : [...d.sp];
        const [moved] = arr.splice(from, 1);
        arr.splice(to, 0, moved);
        let upd: Day;
        if (d.st === "u" && d.vs && d.av !== undefined) {
          upd = { ...d, vs: d.vs.map((v, i) => i === d.av ? { ...v, sp: arr } : v) };
        } else {
          upd = { ...d, sp: arr };
        }
        return tMode === "auto" ? recalcDay(upd) : upd;
      })
    );
  };

  const switchAlt = (dayId: number, spotId: string, ai: number) => {
    setDays((prev) =>
      prev.map((d) => {
        if (d.id !== dayId) return d;
        const arr = getSpotsForDay(d).map((s) => {
          if (s.id !== spotId || !s.isA || !s.ao) return s;
          const o = s.ao[ai];
          return { ...s, si: ai, nm: o.nm, d: o.d, tr: o.tr };
        });
        let upd: Day;
        if (d.st === "u" && d.vs && d.av !== undefined) {
          upd = { ...d, vs: d.vs.map((v, i) => i === d.av ? { ...v, sp: arr } : v) };
        } else {
          upd = { ...d, sp: arr };
        }
        return tMode === "auto" ? recalcDay(upd) : upd;
      })
    );
  };

  const switchVar = (dayId: number, vi: number) => {
    setDays((prev) => prev.map((d) => d.id === dayId ? { ...d, av: vi } : d));
  };

  // ── Views ────────────────────────────────────────────────────────

  // LOGIN
  if (view === "login") {
    return (
      <LoginPage
        t={t} lang={lang} setLang={setLang}
        onLogin={doLogin}
        onGuest={() => { setUser(null); setView("trips"); }}
      />
    );
  }

  // TRIPS LIST
  if (view === "trips") {
    return (
      <div style={{ minHeight: "100vh", background: C.bg }}>
        <div style={{ maxWidth: 960, margin: "0 auto", padding: "32px 24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28, flexWrap: "wrap", gap: 12 }}>
            <div>
              <h1 style={{ fontFamily: "Georgia,serif", fontSize: 28, fontWeight: 700, color: C.ink, margin: 0 }}>TripBuddy</h1>
              <p style={{ color: C.muted, fontSize: 13, margin: "3px 0 0" }}>{t.tagline}</p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <LangSwitcher lang={lang} setLang={setLang} />
              {user && (
                <>
                  <div style={{ width: 30, height: 30, borderRadius: 15, background: C.accent, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 13, fontWeight: 600 }}>{user.avatar}</div>
                  <span style={{ fontSize: 13, color: C.ink, fontWeight: 500 }}>{user.name}</span>
                  <button onClick={() => { setUser(null); setView("login"); }} style={{ fontSize: 11, color: C.muted, background: "none", border: "none", cursor: "pointer" }}>{t.logout}</button>
                </>
              )}
              <button onClick={() => setImpOpen(true)} style={{ background: "transparent", color: C.accent, border: `1px solid ${C.accent}`, padding: "10px 20px", borderRadius: 100, fontSize: 13, fontWeight: 500, cursor: "pointer" }}>{t.importBtn}</button>
              {/* E-1: wire new trip button */}
              <button onClick={() => setNewTripOpen(true)} style={{ background: C.accent, color: "#fff", border: "none", padding: "10px 24px", borderRadius: 100, fontSize: 13, fontWeight: 500, cursor: "pointer" }}>{t.newTrip}</button>
            </div>
          </div>

          {/* Trip cards — rendered from state */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 20 }}>
            {trips.map((tr) => (
              <div
                key={tr.id}
                data-testid="trip-card"
                onClick={() => openTrip(tr)}
                style={{ background: C.card, borderRadius: 16, border: `1px solid ${C.light}`, padding: 24, cursor: "pointer" }}
              >
                <div style={{ fontSize: 36, marginBottom: 10 }}>{tr.img}</div>
                <h3 style={{ fontSize: 15, fontWeight: 600, color: C.ink, margin: "0 0 3px" }}>{tr.title}</h3>
                <p style={{ fontSize: 12, color: C.muted, margin: "0 0 8px" }}>
                  {tr.dates}{tr.dates ? " · " : ""}{tripDaysMap[tr.id]?.length ?? 0} {t.days}
                </p>
                {tr.id === SAMPLE_TRIP.id && (
                  <span style={{ fontSize: 10, padding: "3px 10px", borderRadius: 100, background: C.successBg, color: C.successText, fontWeight: 500 }}>{t.importedFrom}</span>
                )}
              </div>
            ))}
            <div style={{ background: C.light, borderRadius: 16, border: `2px dashed ${C.muted}40`, padding: 24, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", minHeight: 150, opacity: 0.5 }}>
              <span style={{ fontSize: 13, color: C.muted }}>{t.createTrip}</span>
            </div>
          </div>
        </div>

        {/* Import Modal */}
        {impOpen && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }} onClick={() => { setImpOpen(false); setImpStep("idle"); }}>
            <div onClick={(e) => e.stopPropagation()} style={{ background: C.card, borderRadius: 20, padding: 28, width: 440, maxWidth: "90vw" }}>
              <h3 style={{ fontSize: 17, fontWeight: 700, color: C.ink, margin: "0 0 5px" }}>{t.importTitle}</h3>
              <p style={{ fontSize: 12, color: C.muted, margin: "0 0 16px", lineHeight: 1.6 }}>{t.importDesc}</p>
              {impStep === "idle" && (
                <>
                  <div style={{ border: `2px dashed ${C.light}`, borderRadius: 14, padding: "26px 18px", textAlign: "center", cursor: "pointer", marginBottom: 12 }} onClick={() => fileRef.current?.click()}>
                    <p style={{ fontSize: 13, color: C.ink, fontWeight: 500, margin: "0 0 3px" }}>{t.dropHere}</p>
                    <p style={{ fontSize: 11, color: C.muted, margin: 0 }}>{t.supportedFormats}</p>
                    <input ref={fileRef} type="file" accept=".md,.docx,.pdf" style={{ display: "none" }} onChange={() => { setImpStep("parsing"); setTimeout(() => setImpStep("done"), 2200); }} />
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                    <div style={{ flex: 1, height: 1, background: C.light }} /><span style={{ fontSize: 11, color: C.muted }}>{t.or}</span><div style={{ flex: 1, height: 1, background: C.light }} />
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <input placeholder={t.pasteLink} style={{ flex: 1, padding: "8px 12px", borderRadius: 10, border: `1px solid ${C.light}`, fontSize: 12, outline: "none" }} />
                    <button onClick={() => { setImpStep("parsing"); setTimeout(() => setImpStep("done"), 2200); }} style={{ ...pill, background: C.accent, color: "#fff", borderColor: C.accent }}>{t.parse}</button>
                  </div>
                </>
              )}
              {impStep === "parsing" && (
                <div style={{ textAlign: "center", padding: "32px 0" }}>
                  <div className="spinner" style={{ width: 32, height: 32, border: `3px solid ${C.light}`, borderTopColor: C.accent, borderRadius: "50%", margin: "0 auto 12px" }} />
                  <p style={{ fontSize: 13, color: C.ink, fontWeight: 500, margin: "0 0 3px" }}>{t.parsing}</p>
                  <p style={{ fontSize: 11, color: C.muted, margin: 0 }}>{t.parsingDesc}</p>
                </div>
              )}
              {impStep === "done" && (
                <div>
                  <div style={{ background: C.successBg, borderRadius: 10, padding: 12, marginBottom: 12 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: C.successText, margin: "0 0 8px" }}>{t.parseSuccess}</p>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
                      {[["16", t.daysLabel], ["52", t.spotsLabel], ["1", t.uncertainLabel]].map(([v, l], i) => (
                        <div key={i} style={{ textAlign: "center" }}>
                          <div style={{ fontSize: 17, fontWeight: 700, color: C.ink }}>{v}</div>
                          <div style={{ fontSize: 10, color: C.muted }}>{l}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <button onClick={() => { setImpOpen(false); setImpStep("idle"); openTrip(SAMPLE_TRIP); }} style={{ width: "100%", background: C.accent, color: "#fff", border: "none", padding: "12px 0", borderRadius: 100, fontSize: 13, fontWeight: 500, cursor: "pointer" }}>{t.openEditor}</button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* E-1: Create new trip modal */}
        {newTripOpen && (
          <div
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}
            onClick={closeNewTripModal}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-label={t.newTripModalTitle}
              onClick={(e) => e.stopPropagation()}
              style={{ background: C.card, borderRadius: 20, padding: 28, width: 440, maxWidth: "90vw" }}
            >
              <h3 style={{ fontSize: 17, fontWeight: 700, color: C.ink, margin: "0 0 20px" }}>{t.newTripModalTitle}</h3>

              {/* Trip name */}
              <div style={{ marginBottom: 14 }}>
                <label
                  htmlFor="new-trip-title"
                  style={{ fontSize: 12, fontWeight: 600, color: C.ink, display: "block", marginBottom: 5 }}
                >
                  {t.newTripTitleLabel}
                </label>
                <input
                  id="new-trip-title"
                  type="text"
                  value={newTripTitle}
                  onChange={(e) => { setNewTripTitle(e.target.value); setNewTripErr(""); }}
                  placeholder={t.newTripTitlePlaceholder}
                  style={{
                    width: "100%", padding: "10px 12px", borderRadius: 10,
                    border: `1px solid ${newTripErr ? C.errBorder : C.light}`,
                    fontSize: 13, outline: "none", boxSizing: "border-box",
                  }}
                />
                {newTripErr && (
                  <p style={{ fontSize: 11, color: C.errText, margin: "4px 0 0" }}>{newTripErr}</p>
                )}
              </div>

              {/* Destination (optional) */}
              <div style={{ marginBottom: 24 }}>
                <label
                  htmlFor="new-trip-dest"
                  style={{ fontSize: 12, fontWeight: 600, color: C.ink, display: "block", marginBottom: 5 }}
                >
                  {t.newTripDestLabel}
                </label>
                <input
                  id="new-trip-dest"
                  type="text"
                  value={newTripDest}
                  onChange={(e) => setNewTripDest(e.target.value)}
                  placeholder={t.newTripDestPlaceholder}
                  style={{
                    width: "100%", padding: "10px 12px", borderRadius: 10,
                    border: `1px solid ${C.light}`,
                    fontSize: 13, outline: "none", boxSizing: "border-box",
                  }}
                />
              </div>

              {/* Action buttons */}
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={closeNewTripModal}
                  style={{ flex: 1, padding: "11px 0", borderRadius: 100, border: `1px solid ${C.light}`, background: "transparent", color: C.muted, fontSize: 13, cursor: "pointer" }}
                >
                  {t.newTripCancelBtn}
                </button>
                <button
                  onClick={handleCreateTrip}
                  style={{ flex: 1, padding: "11px 0", borderRadius: 100, border: "none", background: C.accent, color: "#fff", fontSize: 13, fontWeight: 500, cursor: "pointer" }}
                >
                  {t.newTripConfirmBtn}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // EDITOR
  const dd = selDay !== null ? days.find((d) => d.id === selDay) ?? null : null;
  const sp = dd ? getSpotsForDay(dd) : [];
  const di = days.findIndex((d) => d.id === selDay);
  const dc = DC[Math.max(0, di) % DC.length];
  const nC = sp.filter((s) => getConflictLevel(s) >= 2).length;
  const nW = sp.filter((s) => getConflictLevel(s) === 1).length;

  return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", flexDirection: "column" }}>
      {/* Top bar */}
      <div style={{ background: C.card, borderBottom: `1px solid ${C.light}`, padding: "8px 16px", display: "flex", alignItems: "center", gap: 10, flexShrink: 0, flexWrap: "wrap" }}>
        <button
          onClick={() => {
            // Persist editor changes before leaving
            setTripDaysMap((prev) => ({ ...prev, [trip.id]: days }));
            setDeleteConfirmDayId(null);
            setView("trips");
          }}
          style={{ background: "none", border: "none", fontSize: 13, color: C.muted, cursor: "pointer" }}
        >{t.back}</button>
        <div style={{ width: 1, height: 18, background: C.light }} />
        <span style={{ fontSize: 14, fontWeight: 600, color: C.ink }}>{trip.img} {trip.title}</span>
        <span style={{ fontSize: 11, color: C.muted }}>{trip.dates}</span>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
          <LangSwitcher lang={lang} setLang={setLang} small />
          {user && <div style={{ width: 24, height: 24, borderRadius: 12, background: C.accent, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 10, fontWeight: 600 }}>{user.avatar}</div>}
          <button style={{ ...pill, background: tMode === "auto" ? C.infoBg : "transparent", color: tMode === "auto" ? C.infoText : C.muted, borderColor: tMode === "auto" ? C.infoBorder : C.light }} onClick={() => setTMode("auto")}>{t.autoAdjust}</button>
          <button style={{ ...pill, background: tMode === "lock" ? C.warnBg : "transparent", color: tMode === "lock" ? C.warnText : C.muted, borderColor: tMode === "lock" ? C.warnBorder : C.light }} onClick={() => setTMode("lock")}>{t.lockTimes}</button>
        </div>
      </div>

      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "210px 1fr 1fr", minHeight: 0 }}>
        {/* Sidebar */}
        <div style={{ background: C.card, borderRight: `1px solid ${C.light}`, padding: 8, overflowY: "auto" }}>
          <p style={{ fontSize: 10, fontWeight: 600, color: C.muted, letterSpacing: ".05em", marginBottom: 6 }}>DAYS ({days.length})</p>

          {/* E-2: Day list with delete buttons */}
          {days.map((d) => (
            <div key={d.id} style={{ position: "relative", marginBottom: 3 }}>
              <div
                onClick={() => setSelDay(d.id)}
                style={{ padding: "6px 24px 6px 8px", borderRadius: 8, cursor: "pointer", border: `1px solid ${selDay === d.id ? C.accent : C.light}`, background: selDay === d.id ? `${C.accent}08` : "transparent" }}
              >
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: C.ink }}>D{d.n}</span>
                  <span style={{ fontSize: 9, color: C.muted }}>{d.dt}</span>
                </div>
                <p style={{ fontSize: 10, color: C.muted, margin: "1px 0 0", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{d.lb}</p>
                {d.st === "u" && <span style={{ fontSize: 8, padding: "1px 5px", borderRadius: 100, background: C.warnBg, color: C.warnText, fontWeight: 500, marginTop: 2, display: "inline-block" }}>{t.uncertainLabel}</span>}
              </div>
              {/* E-2: Delete button */}
              <button
                aria-label={`${t.deleteDayLabel} D${d.n}`}
                disabled={days.length <= 1}
                onClick={(e) => { e.stopPropagation(); requestDeleteDay(d.id); }}
                style={{
                  position: "absolute", top: 6, right: 4,
                  width: 16, height: 16, borderRadius: 8,
                  border: "none", background: "transparent",
                  color: days.length <= 1 ? C.light : C.muted,
                  cursor: days.length <= 1 ? "not-allowed" : "pointer",
                  fontSize: 12, padding: 0, lineHeight: "16px",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >
                ×
              </button>
            </div>
          ))}

          {/* E-2: Add day button */}
          <button
            onClick={addDay}
            style={{ width: "100%", padding: "6px 0", borderRadius: 8, border: `1px dashed ${C.light}`, background: "transparent", color: C.muted, fontSize: 11, cursor: "pointer", marginTop: 4 }}
          >
            {t.addDay}
          </button>
        </div>

        {/* Itinerary */}
        <div style={{ padding: 12, overflowY: "auto" }}>
          {!dd ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: C.muted, fontSize: 13 }}>{t.selectDay}</div>
          ) : (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                <div>
                  <h3 style={{ fontSize: 14, fontWeight: 700, color: C.ink, margin: 0 }}><span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 4, background: dc, marginRight: 6 }} />Day {dd.n} — {dd.dt}</h3>
                  <p style={{ fontSize: 11, color: C.muted, margin: "2px 0 0" }}>{dd.lb}</p>
                </div>
                <div style={{ display: "flex", gap: 8, fontSize: 10 }}>
                  <div style={{ textAlign: "center" }}><div style={{ fontSize: 13, fontWeight: 600, color: nC ? C.errText : C.successText }}>{nC}</div><div style={{ color: C.muted }}>{t.conflicts}</div></div>
                  <div style={{ textAlign: "center" }}><div style={{ fontSize: 13, fontWeight: 600, color: nW ? C.warnText : C.successText }}>{nW}</div><div style={{ color: C.muted }}>{t.warnings}</div></div>
                  <div style={{ textAlign: "center" }}><div style={{ fontSize: 13, fontWeight: 600, color: C.ink }}>{sp.length ? fmt(sp[sp.length - 1].t + sp[sp.length - 1].d) : "--"}</div><div style={{ color: C.muted }}>{t.ends}</div></div>
                </div>
              </div>
              {dd.st === "u" && dd.vs && (
                <div style={{ marginBottom: 8 }}>
                  <div style={{ background: C.warnBg, border: `1px solid ${C.warnBorder}`, borderRadius: 8, padding: "5px 10px", fontSize: 11, color: C.warnText, marginBottom: 6 }}>{dd.ur}</div>
                  <div style={{ display: "flex", gap: 4 }}>
                    {dd.vs.map((v, i) => (
                      <button key={i} onClick={() => switchVar(dd.id, i)} style={{ ...pill, flex: 1, justifyContent: "center", fontSize: 10, background: dd.av === i ? C.infoBg : "transparent", color: dd.av === i ? C.infoText : C.muted, borderColor: dd.av === i ? C.infoBorder : C.light, fontWeight: dd.av === i ? 600 : 400 }}>{v.lb}</button>
                    ))}
                  </div>
                </div>
              )}
              {sp.map((s, i) => {
                const c = getConflictLevel(s);
                return (
                  <div key={s.id}>
                    {i > 0 && <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "1px 0 1px 38px", fontSize: 9, color: C.muted }}>&#9201; {sp[i - 1].tr || 0}{t.min}</div>}
                    <div draggable onDragStart={() => setDragI(i)} onDragOver={(e) => e.preventDefault()} onDrop={() => { if (dragI !== null && dragI !== i) moveSpot(dd.id, dragI, i); setDragI(null); }} onDragEnd={() => setDragI(null)} style={{ display: "flex", gap: 0, marginBottom: 2, opacity: dragI === i ? 0.4 : 1, cursor: "grab" }}>
                      <div style={{ minWidth: 38, display: "flex", flexDirection: "column", alignItems: "flex-end", justifyContent: "center", paddingRight: 6, position: "relative" }}>
                        <span style={{ fontSize: 11, fontWeight: 500, color: c >= 2 ? C.errText : c === 1 ? C.warnText : C.muted }}>{fmt(s.t)}</span>
                        <span style={{ fontSize: 8, color: C.muted }}>{s.d}{t.min}</span>
                        <div style={{ position: "absolute", right: 0, top: 0, bottom: -2, width: 2, background: C.light }} />
                        <div style={{ position: "absolute", right: -2.5, top: "50%", transform: "translateY(-50%)", width: 6, height: 6, borderRadius: 3, background: s.isA ? C.infoBorder : dc }} />
                      </div>
                      {s.isA && s.ao ? (
                        <div style={{ flex: 1, marginLeft: 8, border: `1.5px dashed ${C.infoBorder}`, borderRadius: 8, padding: 6 }}>
                          <div style={{ fontSize: 9, color: C.infoText, fontWeight: 500, marginBottom: 3 }}>{t.alternatives}</div>
                          <div style={{ display: "flex", gap: 2, marginBottom: 4, flexWrap: "wrap" }}>
                            {s.ao.map((o, ai) => (
                              <button key={ai} onClick={() => switchAlt(dd.id, s.id, ai)} style={{ ...pill, fontSize: 9, padding: "2px 6px", background: s.si === ai ? C.infoBg : "transparent", color: s.si === ai ? C.infoText : C.muted, borderColor: s.si === ai ? C.infoBorder : C.light }}>{o.nm.length > 14 ? o.nm.slice(0, 14) + ".." : o.nm}</button>
                            ))}
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            <span style={{ fontSize: 9, color: C.muted }}>&#x2630;</span>
                            <span style={{ fontSize: 11, fontWeight: 500, color: C.ink, flex: 1 }}>{s.nm}</span>
                          </div>
                          {s.nt && <p style={{ fontSize: 9, color: C.accent, margin: "2px 0 0 12px" }}>{s.nt}</p>}
                        </div>
                      ) : (
                        <div style={{ flex: 1, marginLeft: 8, padding: "6px 10px", borderRadius: 8, background: c >= 2 ? C.errBg : c === 1 ? C.warnBg : C.card, border: `1px solid ${c >= 2 ? C.errBorder : c === 1 ? C.warnBorder : C.light}` }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            <span style={{ fontSize: 9, color: C.muted }}>&#x2630;</span>
                            <span style={{ fontSize: 11, fontWeight: 500, color: C.ink, flex: 1 }}>{s.nm}</span>
                            {c >= 2 && <span style={{ fontSize: 8, padding: "1px 5px", borderRadius: 100, background: C.errBg, color: C.errText, fontWeight: 500, border: `1px solid ${C.errBorder}` }}>{t.closed}</span>}
                            {c === 1 && <span style={{ fontSize: 8, padding: "1px 5px", borderRadius: 100, background: C.warnBg, color: C.warnText, fontWeight: 500, border: `1px solid ${C.warnBorder}` }}>{t.warning}</span>}
                            {s.cl && c === 0 && <span style={{ fontSize: 8, color: C.muted }}>{t.closes} {fmt(s.cl)}</span>}
                          </div>
                          {s.nt && <p style={{ fontSize: 9, color: C.accent, margin: "2px 0 0 12px" }}>{s.nt}</p>}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              {nC > 0 && (
                <div style={{ marginTop: 8, background: C.errBg, border: `1px solid ${C.errBorder}`, borderRadius: 8, padding: 10 }}>
                  <p style={{ fontSize: 11, fontWeight: 600, color: C.errText, margin: "0 0 6px" }}>{t.conflictN.replace("{n}", String(nC))}</p>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button style={{ ...pill, fontSize: 10, background: C.infoBg, color: C.infoText, borderColor: C.infoBorder }}>{t.aiAutoAdjust}</button>
                    <button style={{ ...pill, fontSize: 10 }}>{t.keepAnyway}</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Map */}
        <div style={{ background: "#e8e6e1", position: "relative", overflow: "hidden" }}>
          {(!dd || !sp.length) ? (
            <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 6 }}>
              <div style={{ fontSize: 36, opacity: 0.3 }}>&#128506;</div>
              <span style={{ color: C.muted, fontSize: 12 }}>{t.selectDayMap}</span>
            </div>
          ) : (
            <MapView day={dd} dayIndex={di} />
          )}
        </div>
      </div>

      {/* E-2: Delete day confirmation dialog */}
      {deleteConfirmDayId !== null && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }}>
          <div
            role="alertdialog"
            aria-modal="true"
            style={{ background: C.card, borderRadius: 16, padding: 24, width: 320, maxWidth: "90vw" }}
          >
            <p style={{ fontSize: 14, fontWeight: 600, color: C.ink, margin: "0 0 20px" }}>{t.deleteDayConfirmMsg}</p>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => setDeleteConfirmDayId(null)}
                style={{ flex: 1, padding: "10px 0", borderRadius: 100, border: `1px solid ${C.light}`, background: "transparent", color: C.muted, fontSize: 13, cursor: "pointer" }}
              >
                {t.deleteDayCancelBtn}
              </button>
              <button
                onClick={confirmDeleteDay}
                style={{ flex: 1, padding: "10px 0", borderRadius: 100, border: "none", background: C.errText, color: "#fff", fontSize: 13, fontWeight: 500, cursor: "pointer" }}
              >
                {t.deleteDayConfirmBtn}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
