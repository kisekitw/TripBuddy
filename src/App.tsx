import React, { useState, useRef, useEffect } from "react";
import type { Locale } from "./i18n";
import type { Day, Trip, User, Spot, AltOption } from "./types";
import { getTranslations } from "./i18n";
import { colors as C, dayColors as DC } from "./utils/colors";
import { fmt, getSpotsForDay, getConflictLevel, recalcDay, autoAdjustDay, lookupAirport } from "./utils";
import { getDSTAdjustment } from "./data/airports";
import { SAMPLE_TRIP, SAMPLE_DAYS } from "./data/sampleTrip";
import { LangSwitcher } from "./components/LangSwitcher";
import { MapView } from "./components/MapView";
import { LoginPage } from "./pages/LoginPage";

/** Sync arrival card t values with their linked departure's nextDayArrival */
function syncCrossNightArrivals(days: Day[]): Day[] {
  // Build map: arrival card id → departure card's current nextDayArrival
  const updates: Record<string, number> = {};
  for (const d of days) {
    for (const s of getSpotsForDay(d)) {
      if (s.nextDayArrival !== undefined && s.linkedSpotId) {
        updates[s.linkedSpotId] = s.nextDayArrival;
      }
    }
  }
  if (Object.keys(updates).length === 0) return days;

  let anyChange = false;
  const newDays = days.map((d) => {
    const spots = getSpotsForDay(d);
    let changed = false;
    const updatedSpots = spots.map((s) => {
      if (s.isArrival && s.id in updates && updates[s.id] !== s.t) {
        changed = true;
        anyChange = true;
        return { ...s, t: updates[s.id] };
      }
      return s;
    });
    if (!changed) return d;
    return d.st === "u" && d.vs && d.av !== undefined
      ? { ...d, vs: d.vs.map((v, i) => i === d.av ? { ...v, sp: updatedSpots } : v) }
      : { ...d, sp: updatedSpots };
  });
  return anyChange ? newDays : days;
}

const pill: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 4,
  padding: "5px 12px", borderRadius: 100, fontSize: 12,
  border: `1px solid ${C.light}`, background: "transparent",
  color: C.muted, cursor: "pointer", whiteSpace: "nowrap",
};

export default function App() {
  const [lang, setLang] = useState<Locale>("zh-TW");
  // Restore session from sessionStorage so page refresh doesn't force re-login
  const [user, setUser] = useState<User | null>(() => {
    try { const s = sessionStorage.getItem("tb_user"); return s ? JSON.parse(s) : null; } catch { return null; }
  });
  const [view, setView] = useState<"login" | "trips" | "editor">(() => {
    try { return sessionStorage.getItem("tb_user") ? "trips" : "login"; } catch { return "login"; }
  });

  // E-1: trip list state  (E-5: lazy-init from localStorage)
  const [trips, setTrips] = useState<Trip[]>(() => {
    try { const s = localStorage.getItem("tb_trips"); return s ? JSON.parse(s) : [SAMPLE_TRIP]; } catch { return [SAMPLE_TRIP]; }
  });
  const [tripDaysMap, setTripDaysMap] = useState<Record<number, Day[]>>(() => {
    try { const s = localStorage.getItem("tb_tripDaysMap"); return s ? JSON.parse(s) : { [SAMPLE_TRIP.id]: SAMPLE_DAYS }; } catch { return { [SAMPLE_TRIP.id]: SAMPLE_DAYS }; }
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

  // E-3: spot add/edit modal state
  const [spotModalOpen, setSpotModalOpen] = useState(false);
  const [editingSpotId, setEditingSpotId] = useState<string | null>(null);
  const [spotFormName, setSpotFormName] = useState("");
  const [spotFormErr, setSpotFormErr] = useState("");
  const [spotModalType, setSpotModalType] = useState<"spot" | "transit">("spot");
  const [spotFormIsAlt, setSpotFormIsAlt] = useState(false);

  //改動 4: editing transit id (re-uses transit modal for edits)
  const [editingTransitId, setEditingTransitId] = useState<string | null>(null);

  // Alt option modal state
  const [altModalOpen, setAltModalOpen] = useState(false);
  const [altModalSpotId, setAltModalSpotId] = useState<string | null>(null);
  const [altModalIndex, setAltModalIndex] = useState<number | null>(null); // null = add new
  const [altFormNm, setAltFormNm] = useState("");
  const [altFormD, setAltFormD] = useState("");
  const [altFormTr, setAltFormTr] = useState("");

  // T-1: transit modal state
  const [transitModalOpen, setTransitModalOpen] = useState(false);
  const [transitFormName, setTransitFormName] = useState("");
  const [transitFormErr, setTransitFormErr] = useState("");

  // T-2: cross-midnight transit form state
  const [transitFormTime, setTransitFormTime] = useState("09:00");
  const [transitFormHours, setTransitFormHours] = useState(1);
  const [transitFormMins, setTransitFormMins] = useState(0);
  const [linkedDeleteTargetId, setLinkedDeleteTargetId] = useState<string | null>(null);

  // T-3: timezone-aware transit (string state to allow negative number input)
  const [transitFormTzOffset, setTransitFormTzOffset] = useState("0");
  const [transitFormDep, setTransitFormDep] = useState("");
  const [transitFormDest, setTransitFormDest] = useState("");

  useEffect(() => {
    if (!transitModalOpen) return;
    const depInfo = lookupAirport(transitFormDep);
    const destInfo = lookupAirport(transitFormDest);
    if (depInfo && destInfo) {
      // Determine the transit date to apply DST correctly
      const year = parseInt(trip.dates.match(/\d{4}/)?.[0] ?? String(new Date().getFullYear()));
      const curDay = days.find(d => d.id === selDay);
      const dtM = curDay?.dt.match(/^(\d{1,2})\/(\d{1,2})/);
      const date = dtM ? new Date(year, parseInt(dtM[1]) - 1, parseInt(dtM[2])) : new Date();
      const depEff = depInfo.utc + (depInfo.dst ? getDSTAdjustment(depInfo.dst, date) : 0);
      const destEff = destInfo.utc + (destInfo.dst ? getDSTAdjustment(destInfo.dst, date) : 0);
      setTransitFormTzOffset(String(destEff - depEff));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transitFormDep, transitFormDest, transitModalOpen]);

  // E-4: inline time / duration editing
  const [editingTimeSpotId, setEditingTimeSpotId] = useState<string | null>(null);
  const [editingDurSpotId, setEditingDurSpotId] = useState<string | null>(null);
  const [editingDurH, setEditingDurH] = useState(0);
  const [editingDurM, setEditingDurM] = useState(0);
  // 改動 3: inline transit-time (tr) editing
  const [editingTrSpotId, setEditingTrSpotId] = useState<string | null>(null);

  // DL: inline day label editing
  const [editingDayLabelId, setEditingDayLabelId] = useState<number | null>(null);

  // E-6: cascade delta badges
  const [spotDeltas, setSpotDeltas] = useState<Record<string, number>>({});

  // C-2: ignored conflicts (Set of spotIds)
  const [ignoredConflicts, setIgnoredConflicts] = useState<Set<string>>(new Set());
  // C-4: day picker for "move spot to day"
  const [moveSpotPickerSpotId, setMoveSpotPickerSpotId] = useState<string | null>(null);
  // C-5: resolution wizard
  const [wizardOpen, setWizardOpen] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);
  const t = getTranslations(lang);

  // Persist user session to sessionStorage (survives page refresh, cleared on tab close)
  useEffect(() => {
    if (user) { sessionStorage.setItem("tb_user", JSON.stringify(user)); }
    else { sessionStorage.removeItem("tb_user"); }
  }, [user]);

  // E-5: persist trips & days to localStorage whenever they change
  useEffect(() => { localStorage.setItem("tb_trips", JSON.stringify(trips)); }, [trips]);
  useEffect(() => { localStorage.setItem("tb_tripDaysMap", JSON.stringify(tripDaysMap)); }, [tripDaysMap]);

  // Auto-save editor state: sync `days` → `tripDaysMap` on every edit so closing
  // the browser tab while in the editor does NOT lose unsaved changes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (view === "editor") {
      setTripDaysMap((prev) => ({ ...prev, [trip.id]: days }));
    }
  }, [days]); // intentionally omit view/trip.id — only trigger on days change

  // E-6: clear delta badges whenever selected day changes
  // C-4/C-5: also reset picker & wizard on day switch
  useEffect(() => {
    setSpotDeltas({});
    setMoveSpotPickerSpotId(null);
    setWizardOpen(false);
  }, [selDay]);

  // CX: sync arrival card t whenever a linked departure's nextDayArrival changes
  useEffect(() => {
    const synced = syncCrossNightArrivals(days);
    if (synced !== days) setDays(synced);
  }, [days]);

  // ── Handlers ────────────────────────────────────────────────────

  const doLogin = () => { setUser({ name: "旅行者", avatar: "T" }); setView("trips"); };

  /** E-1: Open editor for a trip */
  const openTrip = (selectedTrip: Trip) => {
    setTrip(selectedTrip);
    setDays(tripDaysMap[selectedTrip.id] ?? [
      { id: 1, n: 1, dt: "", st: "c", lb: t.addDayLabel.replace("{n}", "1"), sp: [] },
    ]);
    setView("editor");
    setSelDay(null);
  };

  /** E-1: Create a new trip */
  const handleCreateTrip = () => {
    if (!newTripTitle.trim()) { setNewTripErr(t.newTripTitleRequired); return; }
    const maxId = trips.length > 0 ? Math.max(...trips.map((tr) => tr.id)) : 0;
    const newId = maxId + 1;
    const newTrip: Trip = { id: newId, title: newTripTitle.trim(), dest: newTripDest.trim() || undefined, dates: "", img: "✈️" };
    const defaultDay: Day = { id: 1, n: 1, dt: "", st: "c", lb: t.addDayLabel.replace("{n}", "1"), sp: [] };
    setTrips((prev) => [...prev, newTrip]);
    setTripDaysMap((prev) => ({ ...prev, [newId]: [defaultDay] }));
    setNewTripOpen(false); setNewTripTitle(""); setNewTripDest(""); setNewTripErr("");
  };

  const closeNewTripModal = () => {
    setNewTripOpen(false); setNewTripTitle(""); setNewTripDest(""); setNewTripErr("");
  };

  /** E-2: Add a day to the current trip */
  const addDay = () => {
    setDays((prev) => {
      const maxN = prev.length > 0 ? Math.max(...prev.map((d) => d.n)) : 0;
      const maxId = prev.length > 0 ? Math.max(...prev.map((d) => d.id)) : 0;
      return [...prev, { id: maxId + 1, n: maxN + 1, dt: "", st: "c", lb: t.addDayLabel.replace("{n}", String(maxN + 1)), sp: [] }];
    });
  };

  /** E-2: Request deletion — shows confirm dialog if day has spots */
  const requestDeleteDay = (dayId: number) => {
    const day = days.find((d) => d.id === dayId);
    if (!day) return;
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

  // ── Spot drag/alt/var handlers ───────────────────────────────────

  const moveSpot = (dayId: number, from: number, to: number) => {
    setDays((prev) => prev.map((d) => {
      if (d.id !== dayId) return d;
      const arr = d.st === "u" && d.vs && d.av !== undefined ? [...d.vs[d.av].sp] : [...d.sp];
      const [moved] = arr.splice(from, 1);
      arr.splice(to, 0, moved);
      const upd: Day = d.st === "u" && d.vs && d.av !== undefined
        ? { ...d, vs: d.vs.map((v, i) => i === d.av ? { ...v, sp: arr } : v) }
        : { ...d, sp: arr };
      return tMode === "auto" ? recalcDay(upd) : upd;
    }));
  };

  const switchAlt = (dayId: number, spotId: string, ai: number) => {
    setDays((prev) => prev.map((d) => {
      if (d.id !== dayId) return d;
      const arr = getSpotsForDay(d).map((s) => {
        if (s.id !== spotId || !s.isA || !s.ao) return s;
        const o = s.ao[ai];
        return { ...s, si: ai, nm: o.nm, d: o.d, tr: o.tr };
      });
      const upd: Day = d.st === "u" && d.vs && d.av !== undefined
        ? { ...d, vs: d.vs.map((v, i) => i === d.av ? { ...v, sp: arr } : v) }
        : { ...d, sp: arr };
      return tMode === "auto" ? recalcDay(upd) : upd;
    }));
  };

  const convertAltToSpot = (spotId: string) => {
    setDays((prev) => prev.map((day) => {
      if (day.id !== selDay) return day;
      const arr = getSpotsForDay(day).map((s) => {
        if (s.id !== spotId || !s.isA) return s;
        const active = s.ao && s.ao[s.si ?? 0] ? s.ao[s.si ?? 0] : null;
        const { isA: _isA, ao: _ao, si: _si, ...rest } = s;
        return active ? { ...rest, nm: active.nm, d: active.d, tr: active.tr } : rest;
      });
      const upd: Day = day.st === "u" && day.vs && day.av !== undefined
        ? { ...day, vs: day.vs.map((v, i) => i === day.av ? { ...v, sp: arr } : v) }
        : { ...day, sp: arr };
      return tMode === "auto" ? recalcDay(upd) : upd;
    }));
    closeSpotModal();
  };

  const convertSpotToAlt = (spotId: string) => {
    setDays((prev) => prev.map((day) => {
      if (day.id !== selDay) return day;
      const arr = getSpotsForDay(day).map((s) => {
        if (s.id !== spotId || s.isA) return s;
        const firstOption: AltOption = { id: `ao-${Date.now()}`, nm: s.nm, d: s.d, tr: s.tr };
        return { ...s, isA: true, ao: [firstOption], si: 0 };
      });
      const upd: Day = day.st === "u" && day.vs && day.av !== undefined
        ? { ...day, vs: day.vs.map((v, i) => i === day.av ? { ...v, sp: arr } : v) }
        : { ...day, sp: arr };
      return tMode === "auto" ? recalcDay(upd) : upd;
    }));
    closeSpotModal();
  };

  const openAddAlt = (spotId: string) => {
    setAltModalSpotId(spotId);
    setAltModalIndex(null);
    setAltFormNm("");
    setAltFormD("60");
    setAltFormTr("10");
    setAltModalOpen(true);
  };

  const openEditAlt = (spotId: string, ai: number) => {
    if (!dd) return;
    const opt = getSpotsForDay(dd).find(s => s.id === spotId)?.ao?.[ai];
    if (!opt) return;
    setAltModalSpotId(spotId);
    setAltModalIndex(ai);
    setAltFormNm(opt.nm);
    setAltFormD(String(opt.d));
    setAltFormTr(String(opt.tr));
    setAltModalOpen(true);
  };

  const saveAlt = () => {
    if (!altModalSpotId || !dd) return;
    const nm = altFormNm.trim();
    if (!nm) return;
    const d = parseInt(altFormD) || 60;
    const tr = parseInt(altFormTr) || 0;
    setDays(prev => prev.map(day => {
      if (day.id !== dd.id) return day;
      const arr = getSpotsForDay(day).map(s => {
        if (s.id !== altModalSpotId || !s.isA || !s.ao) return s;
        if (altModalIndex === null) {
          const newOpt: AltOption = { id: `ao${Date.now()}`, nm, d, tr };
          return { ...s, ao: [...s.ao, newOpt] };
        }
        const newAo = s.ao.map((o, i) => i === altModalIndex ? { ...o, nm, d, tr } : o);
        const isSel = altModalIndex === (s.si ?? 0);
        return isSel ? { ...s, ao: newAo, nm, d, tr } : { ...s, ao: newAo };
      });
      const upd: Day = day.st === "u" && day.vs && day.av !== undefined
        ? { ...day, vs: day.vs.map((v, i) => i === day.av ? { ...v, sp: arr } : v) }
        : { ...day, sp: arr };
      return tMode === "auto" ? recalcDay(upd) : upd;
    }));
    setAltModalOpen(false);
  };

  const deleteAlt = (spotId: string, ai: number) => {
    if (!dd) return;
    setDays(prev => prev.map(day => {
      if (day.id !== dd.id) return day;
      const arr = getSpotsForDay(day).map(s => {
        if (s.id !== spotId || !s.isA || !s.ao || s.ao.length <= 1) return s;
        const newAo = s.ao.filter((_, i) => i !== ai);
        const newSi = Math.min(s.si ?? 0, newAo.length - 1);
        const sel = newAo[newSi];
        return { ...s, ao: newAo, si: newSi, nm: sel.nm, d: sel.d, tr: sel.tr };
      });
      const upd: Day = day.st === "u" && day.vs && day.av !== undefined
        ? { ...day, vs: day.vs.map((v, i) => i === day.av ? { ...v, sp: arr } : v) }
        : { ...day, sp: arr };
      return tMode === "auto" ? recalcDay(upd) : upd;
    }));
    setAltModalOpen(false);
  };

  const switchVar = (dayId: number, vi: number) => {
    setDays((prev) => prev.map((d) => d.id === dayId ? { ...d, av: vi } : d));
  };

  // ── E-3: Spot CRUD ───────────────────────────────────────────────

  const openAddSpot = () => {
    setSpotModalType("spot"); setEditingSpotId(null); setSpotFormName(""); setSpotFormErr(""); setSpotFormIsAlt(false); setSpotModalOpen(true);
  };

  const openEditSpot = (spot: Spot) => {
    // 改動 4: transit (non-arrival) → open transit modal with pre-filled values
    if (spot.type === "transit" && !spot.isArrival) {
      setEditingTransitId(spot.id);
      setTransitFormName(spot.nm);
      setTransitFormTime(fmt(spot.t));
      setTransitFormHours(Math.floor(spot.d / 60));
      setTransitFormMins(spot.d % 60);
      setTransitFormTzOffset(String(spot.tzOffset ?? 0));
      setTransitFormDep(spot.dep ?? ""); setTransitFormDest(spot.dest ?? "");
      setTransitModalOpen(true);
      return;
    }
    setSpotModalType(spot.type === "transit" ? "transit" : "spot");
    setEditingSpotId(spot.id); setSpotFormName(spot.nm); setSpotFormErr(""); setSpotModalOpen(true);
  };

  const closeSpotModal = () => {
    setSpotModalOpen(false); setSpotFormName(""); setSpotFormErr(""); setEditingSpotId(null); setSpotFormIsAlt(false);
  };

  const handleSaveSpot = () => {
    if (!spotFormName.trim()) { setSpotFormErr(spotModalType === "transit" ? t.transitNameRequired : t.spotNameRequired); return; }
    const name = spotFormName.trim();
    setDays((prev) => prev.map((d) => {
      if (d.id !== selDay) return d;
      let spots = getSpotsForDay(d);
      if (editingSpotId !== null) {
        spots = spots.map((s) => s.id === editingSpotId ? { ...s, nm: name } : s);
      } else {
        const last = spots[spots.length - 1];
        const newT = last ? last.t + last.d + (last.tr || 0) : 540;
        if (spotFormIsAlt) {
          const firstOption: AltOption = { id: `ao-${Date.now()}`, nm: name, d: 60, tr: 15 };
          spots = [...spots, { id: `sp-${Date.now()}`, nm: name, t: newT, d: 60, tr: 15, la: 0, ln: 0, type: "spot", isA: true, ao: [firstOption], si: 0 } as Spot];
        } else {
          spots = [...spots, { id: `sp-${Date.now()}`, nm: name, t: newT, d: 60, tr: 15, la: 0, ln: 0, type: "spot" } as Spot];
        }
      }
      const upd: Day = d.st === "u" && d.vs && d.av !== undefined
        ? { ...d, vs: d.vs.map((v, i) => i === d.av ? { ...v, sp: spots } : v) }
        : { ...d, sp: spots };
      return tMode === "auto" ? recalcDay(upd) : upd;
    }));
    closeSpotModal();
  };

  const deleteSpot = (spotId: string) => {
    // T-2: if linked spot, show confirm dialog instead of direct delete
    let isLinked = false;
    for (const d of days) {
      for (const s of getSpotsForDay(d)) {
        if (s.id === spotId && s.linkedSpotId) { isLinked = true; break; }
      }
      if (isLinked) break;
    }
    if (isLinked) { setLinkedDeleteTargetId(spotId); return; }

    setDays((prev) => prev.map((d) => {
      if (d.id !== selDay) return d;
      const spots = getSpotsForDay(d).filter((s) => s.id !== spotId);
      const upd: Day = d.st === "u" && d.vs && d.av !== undefined
        ? { ...d, vs: d.vs.map((v, i) => i === d.av ? { ...v, sp: spots } : v) }
        : { ...d, sp: spots };
      return tMode === "auto" ? recalcDay(upd) : upd;
    }));
  };

  /** T-2: Confirm deletion of both linked departure + arrival cards */
  const confirmLinkedDelete = () => {
    if (!linkedDeleteTargetId) return;
    let linkedId: string | undefined;
    for (const d of days) {
      for (const s of getSpotsForDay(d)) {
        if (s.id === linkedDeleteTargetId && s.linkedSpotId) { linkedId = s.linkedSpotId; break; }
      }
      if (linkedId) break;
    }
    const idsToRemove = new Set([linkedDeleteTargetId, ...(linkedId ? [linkedId] : [])]);
    setDays((prev) => prev.map((d) => {
      const before = getSpotsForDay(d);
      const spots = before.filter((s) => !idsToRemove.has(s.id));
      if (spots.length === before.length) return d;
      const upd: Day = d.st === "u" && d.vs && d.av !== undefined
        ? { ...d, vs: d.vs.map((v, i) => i === d.av ? { ...v, sp: spots } : v) }
        : { ...d, sp: spots };
      return tMode === "auto" ? recalcDay(upd) : upd;
    }));
    setLinkedDeleteTargetId(null);
  };

  // ── T-1: Transit CRUD ────────────────────────────────────────────

  const openAddTransit = () => {
    setTransitFormName(""); setTransitFormErr("");
    setTransitFormTime("09:00"); setTransitFormHours(1); setTransitFormMins(0);
    setTransitFormTzOffset("0");
    setTransitModalOpen(true);
  };

  const closeTransitModal = () => {
    setTransitModalOpen(false); setTransitFormName(""); setTransitFormErr("");
    setTransitFormTime("09:00"); setTransitFormHours(1); setTransitFormMins(0);
    setTransitFormTzOffset("0"); setTransitFormDep(""); setTransitFormDest("");
    setEditingTransitId(null);
  };

  const handleSaveTransit = () => {
    if (!transitFormName.trim()) { setTransitFormErr(t.transitNameRequired); return; }
    const name = transitFormName.trim();

    // 改動 4: edit existing transit
    if (editingTransitId !== null) {
      const em = transitFormTime.match(/^(\d{1,2}):(\d{2})$/);
      const depT = em ? parseInt(em[1]) * 60 + parseInt(em[2]) : 540;
      const totalDur = transitFormHours * 60 + transitFormMins;
      const tz = parseInt(transitFormTzOffset) || 0;
      const corrected = depT + totalDur + tz * 60;

      setDays((prev) => prev.map((d) => {
        const spots = getSpotsForDay(d);

        // Update linked arrival card (may be on a different day)
        const hasLinkedArrival = spots.some((s) => s.isArrival && s.linkedSpotId === editingTransitId);
        if (hasLinkedArrival) {
          const updated = spots.map((s) =>
            (s.isArrival && s.linkedSpotId === editingTransitId && corrected >= 1440)
              ? { ...s, nm: name, t: corrected - 1440 }
              : s
          );
          return { ...d, sp: updated };
        }

        // Update departure card in its day
        if (!spots.some((s) => s.id === editingTransitId)) return d;
        const updated = spots.map((s) => {
          if (s.id !== editingTransitId) return s;
          const base: Spot = { ...s, nm: name, t: depT, d: totalDur || 60 };
          if (tz !== 0) base.tzOffset = tz; else delete base.tzOffset;
          if (transitFormDep.trim()) base.dep = transitFormDep.trim().toUpperCase(); else delete base.dep;
          if (transitFormDest.trim()) base.dest = transitFormDest.trim().toUpperCase(); else delete base.dest;
          if (s.nextDayArrival !== undefined && corrected >= 1440)
            return { ...base, nextDayArrival: corrected - 1440 };
          return base;
        });
        const upd: Day = d.st === "u" && d.vs && d.av !== undefined
          ? { ...d, vs: d.vs.map((v, vi) => vi === d.av ? { ...v, sp: updated } : v) }
          : { ...d, sp: updated };
        return tMode === "auto" ? recalcDay(upd) : upd;
      }));
      closeTransitModal();
      return;
    }

    const m = transitFormTime.match(/^(\d{1,2}):(\d{2})$/);
    const depT = m ? parseInt(m[1]) * 60 + parseInt(m[2]) : 540;
    const totalDur = transitFormHours * 60 + transitFormMins;
    // T-3: apply timezone offset to get local arrival time at destination
    const tz = parseInt(transitFormTzOffset) || 0;
    const correctedArrivalMin = depT + totalDur + tz * 60;

    if (correctedArrivalMin < 1440) {
      // ── Same-day transit ──
      setDays((prev) => prev.map((d) => {
        if (d.id !== selDay) return d;
        const spots = getSpotsForDay(d);
        const newSpot: Spot = {
          id: `tr-${Date.now()}`, nm: name, t: depT, d: totalDur || 60, tr: 0, la: 0, ln: 0, type: "transit",
          ...(tz !== 0 ? { tzOffset: tz } : {}),
          ...(transitFormDep.trim() ? { dep: transitFormDep.trim().toUpperCase() } : {}),
          ...(transitFormDest.trim() ? { dest: transitFormDest.trim().toUpperCase() } : {}),
        };
        const updated = [...spots, newSpot];
        const upd: Day = d.st === "u" && d.vs && d.av !== undefined
          ? { ...d, vs: d.vs.map((v, i) => i === d.av ? { ...v, sp: updated } : v) }
          : { ...d, sp: updated };
        return upd;
      }));
    } else {
      // ── Cross-midnight transit: linked departure + arrival ──
      const nextDayT = correctedArrivalMin - 1440;
      const ts = Date.now();
      const depId = `tr-dep-${ts}`;
      const arrId = `tr-arr-${ts}`;

      const departureSpot: Spot = {
        id: depId, nm: name, t: depT, d: totalDur,
        type: "transit", nextDayArrival: nextDayT,
        linkedSpotId: arrId, la: 0, ln: 0, tr: 0,
        ...(tz !== 0 ? { tzOffset: tz } : {}),
        ...(transitFormDep.trim() ? { dep: transitFormDep.trim().toUpperCase() } : {}),
        ...(transitFormDest.trim() ? { dest: transitFormDest.trim().toUpperCase() } : {}),
      };
      const arrivalSpot: Spot = {
        id: arrId, nm: name, t: nextDayT, d: 0,
        type: "transit", isArrival: true,
        linkedSpotId: depId, la: 0, ln: 0, tr: 0,
      };

      setDays((prev) => {
        const dayIdx = prev.findIndex((d) => d.id === selDay);
        if (dayIdx === -1) return prev;

        // Insert departure into current day
        const withDep = prev.map((d) => {
          if (d.id !== selDay) return d;
          const spots = getSpotsForDay(d);
          const updated = [...spots, departureSpot];
          return d.st === "u" && d.vs && d.av !== undefined
            ? { ...d, vs: d.vs.map((v, i) => i === d.av ? { ...v, sp: updated } : v) }
            : { ...d, sp: updated };
        });

        // Prepend arrival to next day (create if not exists)
        if (dayIdx + 1 < withDep.length) {
          return withDep.map((d, i) => {
            if (i !== dayIdx + 1) return d;
            const spots = getSpotsForDay(d);
            const updated = [arrivalSpot, ...spots];
            return d.st === "u" && d.vs && d.av !== undefined
              ? { ...d, vs: d.vs.map((v, i2) => i2 === d.av ? { ...v, sp: updated } : v) }
              : { ...d, sp: updated };
          });
        } else {
          const maxN = withDep.length > 0 ? Math.max(...withDep.map((d) => d.n)) : 0;
          const maxId = withDep.length > 0 ? Math.max(...withDep.map((d) => d.id)) : 0;
          const newDay: Day = {
            id: maxId + 1, n: maxN + 1, dt: "", st: "c",
            lb: t.addDayLabel.replace("{n}", String(maxN + 1)),
            sp: [arrivalSpot],
          };
          return [...withDep, newDay];
        }
      });
    }

    closeTransitModal();
  };

  // ── E-4: Inline spot time / duration editing ────────────────────

  const updateSpotTime = (dayId: number, spotId: string, val: string) => {
    const m = val.match(/^(\d{1,2}):(\d{2})$/);
    if (!m) { setEditingTimeSpotId(null); return; }
    const newT = parseInt(m[1]) * 60 + parseInt(m[2]);
    if (newT < 0 || newT >= 1440) { setEditingTimeSpotId(null); return; }
    // E-6: capture old times before update
    const currentDay = days.find((d) => d.id === dayId);
    const oldTimes = currentDay
      ? Object.fromEntries(getSpotsForDay(currentDay).map((s) => [s.id, s.t]))
      : {};
    const newDays = days.map((d) => {
      if (d.id !== dayId) return d;
      const spots = getSpotsForDay(d).map((s) => s.id === spotId ? { ...s, t: newT } : s);
      const upd: Day = d.st === "u" && d.vs && d.av !== undefined
        ? { ...d, vs: d.vs.map((v, i) => i === d.av ? { ...v, sp: spots } : v) }
        : { ...d, sp: spots };
      return tMode === "auto" ? recalcDay(upd) : upd;
    });
    // E-6: compute and set deltas
    if (tMode === "auto") {
      const newDay = newDays.find((d) => d.id === dayId);
      if (newDay) {
        const deltas: Record<string, number> = {};
        getSpotsForDay(newDay).forEach((s) => {
          const delta = s.t - (oldTimes[s.id] ?? s.t);
          if (delta !== 0) deltas[s.id] = delta;
        });
        setSpotDeltas(deltas);
      }
    } else {
      setSpotDeltas({});
    }
    setDays(newDays);
    setEditingTimeSpotId(null);
  };

  const updateSpotDuration = (dayId: number, spotId: string, val: string) => {
    const newD = parseInt(val);
    if (isNaN(newD) || newD <= 0) { setEditingDurSpotId(null); return; }
    // E-6: capture old times before update
    const currentDay = days.find((d) => d.id === dayId);
    const oldTimes = currentDay
      ? Object.fromEntries(getSpotsForDay(currentDay).map((s) => [s.id, s.t]))
      : {};
    const newDays = days.map((d) => {
      if (d.id !== dayId) return d;
      const spots = getSpotsForDay(d).map((s) => s.id === spotId ? { ...s, d: newD } : s);
      const upd: Day = d.st === "u" && d.vs && d.av !== undefined
        ? { ...d, vs: d.vs.map((v, i) => i === d.av ? { ...v, sp: spots } : v) }
        : { ...d, sp: spots };
      return tMode === "auto" ? recalcDay(upd) : upd;
    });
    // E-6: compute and set deltas
    if (tMode === "auto") {
      const newDay = newDays.find((d) => d.id === dayId);
      if (newDay) {
        const deltas: Record<string, number> = {};
        getSpotsForDay(newDay).forEach((s) => {
          const delta = s.t - (oldTimes[s.id] ?? s.t);
          if (delta !== 0) deltas[s.id] = delta;
        });
        setSpotDeltas(deltas);
      }
    } else {
      setSpotDeltas({});
    }
    setDays(newDays);
    setEditingDurSpotId(null);
  };

  // 改動 3: update transit time (tr) between spots
  const updateSpotTr = (dayId: number, spotId: string, val: string) => {
    const newTr = parseInt(val);
    if (isNaN(newTr) || newTr < 0) { setEditingTrSpotId(null); return; }
    setDays((prev) => prev.map((d) => {
      if (d.id !== dayId) return d;
      const spots = getSpotsForDay(d);
      const updated = spots.map((s) => s.id === spotId ? { ...s, tr: newTr } : s);
      const upd: Day = d.st === "u" && d.vs && d.av !== undefined
        ? { ...d, vs: d.vs.map((v, vi) => vi === d.av ? { ...v, sp: updated } : v) }
        : { ...d, sp: updated };
      return tMode === "auto" ? recalcDay(upd) : upd;
    }));
    setEditingTrSpotId(null);
  };

  // DL: update day label
  const updateDayLabel = (dayId: number, val: string) => {
    const label = val.trim();
    if (label) {
      setDays((prev) => prev.map((d) => d.id === dayId ? { ...d, lb: label } : d));
    }
    setEditingDayLabelId(null);
  };

  // ── C-1 ~ C-4: Conflict resolution handlers ─────────────────────

  /** C-1: Auto-adjust all conflicting spots in the selected day */
  const handleAutoAdjust = () => {
    if (selDay === null) return;
    setDays((prev) => prev.map((d) => d.id === selDay ? autoAdjustDay(d) : d));
  };

  /** C-2: Mark all current Level-2 spots as ignored (suppress panel) */
  const handleKeepAnyway = (conflictSpots: Spot[]) => {
    const ids = conflictSpots.map((s) => s.id);
    setIgnoredConflicts((prev) => new Set([...prev, ...ids]));
  };

  /** C-3: Fix a single spot's closing-time conflict (shorten or reschedule) */
  const handleShortenDuration = (spotId: string) => {
    setDays((prev) => prev.map((d) => {
      if (d.id !== selDay) return d;
      const spots = getSpotsForDay(d).map((s) => {
        if (s.id !== spotId || !s.cl) return s;
        if (s.t >= s.cl) return { ...s, t: Math.max(0, s.cl - s.d) };
        if (s.t + s.d > s.cl) return { ...s, d: Math.max(1, s.cl - s.t) };
        return s;
      });
      const upd: Day = d.st === "u" && d.vs && d.av !== undefined
        ? { ...d, vs: d.vs.map((v, i) => i === d.av ? { ...v, sp: spots } : v) }
        : { ...d, sp: spots };
      return tMode === "auto" ? recalcDay(upd) : upd;
    }));
  };

  /** C-4: Move a spot from the current day to targetDayId */
  const handleMoveSpotToDay = (spotId: string, targetDayId: number) => {
    setDays((prev) => {
      let movedSpot: Spot | undefined;
      const pass1 = prev.map((d) => {
        if (d.id !== selDay) return d;
        const spots = getSpotsForDay(d).filter((s) => {
          if (s.id === spotId) { movedSpot = s; return false; }
          return true;
        });
        const upd: Day = d.st === "u" && d.vs && d.av !== undefined
          ? { ...d, vs: d.vs.map((v, i) => i === d.av ? { ...v, sp: spots } : v) }
          : { ...d, sp: spots };
        return tMode === "auto" ? recalcDay(upd) : upd;
      });
      if (!movedSpot) return prev;
      const moved = movedSpot;
      return pass1.map((d) => {
        if (d.id !== targetDayId) return d;
        const spots = [...getSpotsForDay(d), moved];
        const upd: Day = d.st === "u" && d.vs && d.av !== undefined
          ? { ...d, vs: d.vs.map((v, i) => i === d.av ? { ...v, sp: spots } : v) }
          : { ...d, sp: spots };
        return tMode === "auto" ? recalcDay(upd) : upd;
      });
    });
    setMoveSpotPickerSpotId(null);
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
              <button onClick={() => setNewTripOpen(true)} style={{ background: C.accent, color: "#fff", border: "none", padding: "10px 24px", borderRadius: 100, fontSize: 13, fontWeight: 500, cursor: "pointer" }}>{t.newTrip}</button>
            </div>
          </div>

          {/* Trip cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 20 }}>
            {trips.map((tr) => (
              <div key={tr.id} data-testid="trip-card" onClick={() => openTrip(tr)}
                style={{ background: C.card, borderRadius: 16, border: `1px solid ${C.light}`, padding: 24, cursor: "pointer" }}>
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
                  <div style={{ width: 32, height: 32, border: `3px solid ${C.light}`, borderTopColor: C.accent, borderRadius: "50%", margin: "0 auto 12px" }} />
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
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }} onClick={closeNewTripModal}>
            <div role="dialog" aria-modal="true" aria-label={t.newTripModalTitle} onClick={(e) => e.stopPropagation()}
              style={{ background: C.card, borderRadius: 20, padding: 28, width: 440, maxWidth: "90vw" }}>
              <h3 style={{ fontSize: 17, fontWeight: 700, color: C.ink, margin: "0 0 20px" }}>{t.newTripModalTitle}</h3>
              <div style={{ marginBottom: 14 }}>
                <label htmlFor="new-trip-title" style={{ fontSize: 12, fontWeight: 600, color: C.ink, display: "block", marginBottom: 5 }}>{t.newTripTitleLabel}</label>
                <input id="new-trip-title" type="text" value={newTripTitle} onChange={(e) => { setNewTripTitle(e.target.value); setNewTripErr(""); }} placeholder={t.newTripTitlePlaceholder}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: `1px solid ${newTripErr ? C.errBorder : C.light}`, fontSize: 13, outline: "none", boxSizing: "border-box" }} />
                {newTripErr && <p style={{ fontSize: 11, color: C.errText, margin: "4px 0 0" }}>{newTripErr}</p>}
              </div>
              <div style={{ marginBottom: 24 }}>
                <label htmlFor="new-trip-dest" style={{ fontSize: 12, fontWeight: 600, color: C.ink, display: "block", marginBottom: 5 }}>{t.newTripDestLabel}</label>
                <input id="new-trip-dest" type="text" value={newTripDest} onChange={(e) => setNewTripDest(e.target.value)} placeholder={t.newTripDestPlaceholder}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: `1px solid ${C.light}`, fontSize: 13, outline: "none", boxSizing: "border-box" }} />
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={closeNewTripModal} style={{ flex: 1, padding: "11px 0", borderRadius: 100, border: `1px solid ${C.light}`, background: "transparent", color: C.muted, fontSize: 13, cursor: "pointer" }}>{t.newTripCancelBtn}</button>
                <button onClick={handleCreateTrip} style={{ flex: 1, padding: "11px 0", borderRadius: 100, border: "none", background: C.accent, color: "#fff", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>{t.newTripConfirmBtn}</button>
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
  const conflictSpots = sp.filter((s) => getConflictLevel(s) >= 2 && !ignoredConflicts.has(s.id));
  const nC = conflictSpots.length;
  const nW = sp.filter((s) => getConflictLevel(s) === 1).length;

  return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", flexDirection: "column" }}>
      {/* Top bar */}
      <div style={{ background: C.card, borderBottom: `1px solid ${C.light}`, padding: "8px 16px", display: "flex", alignItems: "center", gap: 10, flexShrink: 0, flexWrap: "wrap" }}>
        <button
          onClick={() => { setTripDaysMap((prev) => ({ ...prev, [trip.id]: days })); setDeleteConfirmDayId(null); setView("trips"); }}
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
          {days.map((d) => (
            <div key={d.id} style={{ position: "relative", marginBottom: 3 }}>
              <div onClick={() => setSelDay(d.id)}
                style={{ padding: "6px 24px 6px 8px", borderRadius: 8, cursor: "pointer", border: `1px solid ${selDay === d.id ? C.accent : C.light}`, background: selDay === d.id ? `${C.accent}08` : "transparent" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: C.ink }}>D{d.n}</span>
                  <span style={{ fontSize: 9, color: C.muted }}>{d.dt}</span>
                </div>
                {editingDayLabelId === d.id
                  ? <input type="text" defaultValue={d.lb} autoFocus
                      aria-label={`編輯天標籤 D${d.n}`}
                      style={{ fontSize: 10, color: C.ink, margin: "1px 0 0", width: "100%", border: `1px solid ${C.accent}`, borderRadius: 4, padding: "1px 4px", outline: "none", boxSizing: "border-box" }}
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") updateDayLabel(d.id, e.currentTarget.value);
                        if (e.key === "Escape") setEditingDayLabelId(null);
                      }}
                      onBlur={(e) => updateDayLabel(d.id, e.currentTarget.value)}
                    />
                  : <button onClick={(e) => { e.stopPropagation(); setEditingDayLabelId(d.id); }}
                      aria-label={`編輯天標籤 D${d.n}`}
                      style={{ fontSize: 10, color: C.muted, margin: "1px 0 0", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", background: "none", border: "none", cursor: "text", padding: 0, textAlign: "left", width: "100%", display: "block" }}>
                      {d.lb}
                    </button>
                }
                {d.st === "u" && <span style={{ fontSize: 8, padding: "1px 5px", borderRadius: 100, background: C.warnBg, color: C.warnText, fontWeight: 500, marginTop: 2, display: "inline-block" }}>{t.uncertainLabel}</span>}
              </div>
              {/* E-2: Delete day button */}
              <button aria-label={`${t.deleteDayLabel} D${d.n}`} disabled={days.length <= 1}
                onClick={(e) => { e.stopPropagation(); requestDeleteDay(d.id); }}
                style={{ position: "absolute", top: 6, right: 4, width: 16, height: 16, borderRadius: 8, border: "none", background: "transparent", color: days.length <= 1 ? C.light : C.muted, cursor: days.length <= 1 ? "not-allowed" : "pointer", fontSize: 12, padding: 0, lineHeight: "16px", display: "flex", alignItems: "center", justifyContent: "center" }}
              >×</button>
            </div>
          ))}
          {/* E-2: Add day button */}
          <button onClick={addDay} style={{ width: "100%", padding: "6px 0", borderRadius: 8, border: `1px dashed ${C.light}`, background: "transparent", color: C.muted, fontSize: 11, cursor: "pointer", marginTop: 4 }}>{t.addDay}</button>
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
                  <p data-testid="day-label-header" style={{ fontSize: 11, color: C.muted, margin: "2px 0 0" }}>{dd.lb}</p>
                </div>
                <div style={{ display: "flex", gap: 8, fontSize: 10 }}>
                  <div style={{ textAlign: "center" }}><div style={{ fontSize: 13, fontWeight: 600, color: nC ? C.errText : C.successText }}>{nC}</div><div style={{ color: C.muted }}>{t.conflicts}</div></div>
                  <div style={{ textAlign: "center" }}><div style={{ fontSize: 13, fontWeight: 600, color: nW ? C.warnText : C.successText }}>{nW}</div><div style={{ color: C.muted }}>{t.warnings}</div></div>
                  <div style={{ textAlign: "center" }}><div style={{ fontSize: 13, fontWeight: 600, color: C.ink }}>{(() => { const ls = sp[sp.length - 1]; return ls ? (ls.nextDayArrival !== undefined ? `${fmt(ls.t)}+1` : ls.isArrival ? fmt(ls.t) : fmt(ls.t + ls.d)) : "--"; })()}</div><div style={{ color: C.muted }}>{t.ends}</div></div>
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

              {/* Spot list */}
              {sp.map((s, i) => {
                const c = getConflictLevel(s);
                const pencilSvg = <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>;
                const deltaBadge = spotDeltas[s.id] !== undefined && spotDeltas[s.id] !== 0
                  ? <span data-testid="delta-badge" style={{ fontSize: 8, padding: "1px 5px", borderRadius: 100, background: C.infoBg, color: C.infoText, fontWeight: 600, border: `1px solid ${C.infoBorder}`, whiteSpace: "nowrap" }}>{spotDeltas[s.id] > 0 ? "+" : ""}{spotDeltas[s.id]}{t.min}</span>
                  : null;
                const durText = s.d >= 60
                  ? `${Math.floor(s.d / 60)}h${s.d % 60 > 0 ? ` ${s.d % 60}m` : ""}`
                  : `${s.d} ${t.min}`;
                // 改動 1: compute start–end time range for time button display
                // For transit with timezone offset, end time = local arrival time at destination
                const endT = s.t + s.d + (s.tzOffset ?? 0) * 60;
                const timeRangeText = endT >= 1440
                  ? `${fmt(s.t)} – ${t.nextDayBadge} ${fmt(endT - 1440)}`
                  : `${fmt(s.t)} – ${fmt(endT)}`;
                const durEl = (bg: string, color: string, borderColor: string) => editingDurSpotId === s.id
                  ? <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
                      <input type="number"
                        aria-label={`${t.durationLabel} ${s.nm} ${t.transitHours}`}
                        value={editingDurH} min={0} autoFocus
                        onChange={(e) => setEditingDurH(Math.max(0, parseInt(e.target.value) || 0))}
                        onKeyDown={(e) => { if (e.key === "Enter") updateSpotDuration(dd.id, s.id, String(editingDurH * 60 + editingDurM)); if (e.key === "Escape") setEditingDurSpotId(null); }}
                        style={{ width: 36, fontSize: 11, border: `1px solid ${borderColor}`, borderRadius: 6, padding: "1px 4px", outline: "none" }} />
                      <span style={{ fontSize: 11, color }}>{t.transitHours}</span>
                      <input type="number"
                        aria-label={`${t.durationLabel} ${s.nm} ${t.min}`}
                        value={editingDurM} min={0} max={59}
                        onChange={(e) => setEditingDurM(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
                        onKeyDown={(e) => { if (e.key === "Enter") updateSpotDuration(dd.id, s.id, String(editingDurH * 60 + editingDurM)); if (e.key === "Escape") setEditingDurSpotId(null); }}
                        style={{ width: 36, fontSize: 11, border: `1px solid ${borderColor}`, borderRadius: 6, padding: "1px 4px", outline: "none" }} />
                      <span style={{ fontSize: 11, color }}>{t.min}</span>
                    </span>
                  : <button onClick={() => { setEditingDurSpotId(s.id); setEditingDurH(Math.floor(s.d / 60)); setEditingDurM(s.d % 60); }} aria-label={`${t.durationLabel} ${s.nm}`} style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 11, color, background: bg, border: "none", borderRadius: 20, padding: "2px 8px", cursor: "pointer" }}><span style={{ fontSize: 14 }}>⏱</span>{durText}</button>;

                return (
                  <div key={s.id}>
                    {i > 0 && (sp[i - 1].tr || 0) > 0 && (
                      <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "2px 0 2px 26px", fontSize: 9, color: C.muted }}>
                        ↓{" "}
                        {editingTrSpotId === sp[i - 1].id
                          ? <><input type="number" defaultValue={sp[i - 1].tr} min={0} autoFocus
                              aria-label={`${t.transitTimeLabel} ${sp[i - 1].nm}`}
                              style={{ width: 36, fontSize: 9, border: `1px solid ${C.accent}`, borderRadius: 4, padding: "0 2px", outline: "none" }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") updateSpotTr(dd.id, sp[i - 1].id, e.currentTarget.value);
                                if (e.key === "Escape") setEditingTrSpotId(null);
                              }} />{" "}{t.min}</>
                          : <button onClick={() => setEditingTrSpotId(sp[i - 1].id)}
                              style={{ fontSize: 9, background: "none", border: "none", color: C.muted, cursor: "pointer", padding: 0 }}>
                              {sp[i - 1].tr}{t.min}
                            </button>
                        }
                      </div>
                    )}
                    <div draggable onDragStart={() => setDragI(i)} onDragOver={(e) => e.preventDefault()} onDrop={() => { if (dragI !== null && dragI !== i) moveSpot(dd.id, dragI, i); setDragI(null); }} onDragEnd={() => setDragI(null)}
                      style={{ display: "flex", alignItems: "flex-start", gap: 6, marginBottom: 4, opacity: dragI === i ? 0.4 : 1 }}>

                      {/* Drag handle */}
                      <span style={{ paddingTop: 9, color: C.muted, fontSize: 13, cursor: "grab", userSelect: "none", flexShrink: 0 }}>⠿</span>

                      {s.isA && s.ao ? (
                        /* ── Alternative slot card ── */
                        <div style={{ flex: 1, border: `1.5px dashed ${C.infoBorder}`, borderRadius: 10, padding: "8px 10px", background: C.card }}>
                          <div style={{ fontSize: 9, color: C.infoText, fontWeight: 500, marginBottom: 4 }}>{t.alternatives}</div>
                          <div style={{ display: "flex", gap: 2, marginBottom: 6, flexWrap: "wrap", alignItems: "center" }}>
                            {s.ao.map((o, ai) => (
                              <div key={ai} style={{ display: "inline-flex", alignItems: "center" }}>
                                <button onClick={() => switchAlt(dd.id, s.id, ai)} style={{ ...pill, fontSize: 9, padding: "2px 6px", background: s.si === ai ? C.infoBg : "transparent", color: s.si === ai ? C.infoText : C.muted, borderColor: s.si === ai ? C.infoBorder : C.light }}>{o.nm.length > 14 ? o.nm.slice(0, 14) + ".." : o.nm}</button>
                                <button onClick={() => openEditAlt(s.id, ai)} style={{ background: "none", border: "none", cursor: "pointer", padding: "0 1px", color: C.muted, display: "flex", alignItems: "center" }}>{pencilSvg}</button>
                              </div>
                            ))}
                            <button onClick={() => openAddAlt(s.id)} style={{ ...pill, fontSize: 9, padding: "2px 8px", color: C.accent, borderColor: C.accent }}>+</button>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span style={{ width: 8, height: 8, borderRadius: 4, background: C.infoBorder, flexShrink: 0 }} />
                            <span style={{ fontSize: 12, fontWeight: 500, color: C.ink }}>{s.nm}</span>
                            {durEl("#f0efec", C.muted, C.accent)}
                            {deltaBadge}
                            <span style={{ flex: 1 }} />
                            {editingTimeSpotId === s.id
                              ? <input type="text" defaultValue={fmt(s.t)} aria-label={`${t.startTimeLabel} ${s.nm}`} autoFocus onKeyDown={(e) => { if (e.key === "Enter") updateSpotTime(dd.id, s.id, e.currentTarget.value); if (e.key === "Escape") setEditingTimeSpotId(null); }} style={{ width: 44, fontSize: 11, border: `1px solid ${C.accent}`, borderRadius: 4, padding: "1px 4px", outline: "none" }} />
                              : <button onClick={() => setEditingTimeSpotId(s.id)} aria-label={`${t.startTimeLabel} ${s.nm}`} style={{ fontSize: 11, color: C.muted, background: "none", border: "none", cursor: "pointer", padding: "1px 4px" }}>{timeRangeText}</button>
                            }
                            <button aria-label={`${t.editSpotLabel} ${s.nm}`} onClick={() => openEditSpot(s)} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", padding: "0 2px", display: "flex", alignItems: "center" }}>{pencilSvg}</button>
                            <button aria-label={`${t.deleteSpotLabel} ${s.nm}`} onClick={() => deleteSpot(s.id)} style={{ fontSize: 13, background: "none", border: "none", color: C.muted, cursor: "pointer", padding: "0 2px" }}>×</button>
                          </div>
                          {s.nt && <p style={{ fontSize: 9, color: C.accent, margin: "4px 0 0 14px" }}>{s.nt}</p>}
                        </div>

                      ) : s.type === "transit" ? (
                        s.isArrival ? (
                          /* ── T-2: Arrival card ── */
                          <div data-testid="transit-arrival" style={{ flex: 1, background: "#f0f4ff", border: `1px solid #c8d6f8`, borderLeft: "3px solid #6366f1", borderRadius: 10, padding: "8px 10px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <span style={{ fontSize: 14, flexShrink: 0 }}>✈️</span>
                              <span style={{ fontSize: 12, fontWeight: 500, color: "#3a4a7a" }}>{s.nm}</span>
                              <span style={{ fontSize: 10, color: C.muted }}>{t.arrivalLabel}</span>
                              <span style={{ flex: 1 }} />
                              <span style={{ fontSize: 11, color: "#6366f1", padding: "1px 4px" }}>{fmt(s.t)}</span>
                              <button aria-label={`${t.deleteSpotLabel} ${s.nm}`} onClick={() => deleteSpot(s.id)} style={{ fontSize: 13, background: "none", border: "none", color: "#3a4a7a", cursor: "pointer", padding: "0 2px" }}>×</button>
                            </div>
                          </div>
                        ) : s.nextDayArrival !== undefined ? (
                          /* ── T-2: Departure card (cross-midnight) ── */
                          <div data-testid="transit-departure" style={{ flex: 1, background: "#f0f4ff", border: `1px solid #c8d6f8`, borderLeft: "3px solid #6366f1", borderRadius: 10, padding: "8px 10px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <span style={{ fontSize: 14, flexShrink: 0 }}>✈️</span>
                              <span style={{ fontSize: 12, fontWeight: 500, color: "#3a4a7a" }}>{s.nm}</span>
                              {durEl("#dce4ff", "#3a4a7a", "#6366f1")}
                              {deltaBadge}
                              <span style={{ flex: 1 }} />
                              <span style={{ fontSize: 11, color: "#6366f1", padding: "1px 4px" }}>
                                {fmt(s.t)} → {fmt(s.nextDayArrival)}<span style={{ marginLeft: 2, fontSize: 10, color: C.accent, fontWeight: 600 }}>{t.nextDayBadge}</span>
                                {s.tzOffset !== undefined && s.tzOffset !== 0 && (
                                  <span style={{ marginLeft: 4, fontSize: 10, color: "#6366f1", fontWeight: 600, background: "#e8eeff", borderRadius: 4, padding: "1px 4px" }}>
                                    {s.tzOffset > 0 ? `+${s.tzOffset}h` : `${s.tzOffset}h`}
                                  </span>
                                )}
                              </span>
                              <button aria-label={`${t.editSpotLabel} ${s.nm}`} onClick={() => openEditSpot(s)} style={{ background: "none", border: "none", color: "#3a4a7a", cursor: "pointer", padding: "0 2px", display: "flex", alignItems: "center" }}>{pencilSvg}</button>
                              <button aria-label={`${t.deleteSpotLabel} ${s.nm}`} onClick={() => deleteSpot(s.id)} style={{ fontSize: 13, background: "none", border: "none", color: "#3a4a7a", cursor: "pointer", padding: "0 2px" }}>×</button>
                            </div>
                          </div>
                        ) : (
                          /* ── Regular transit card ── */
                          <div data-testid="transit-item" style={{ flex: 1, background: "#f0f4ff", border: `1px solid #c8d6f8`, borderRadius: 10, padding: "8px 10px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <span style={{ fontSize: 14, flexShrink: 0 }}>🚌</span>
                              <span style={{ fontSize: 12, fontWeight: 500, color: "#3a4a7a" }}>{s.nm}</span>
                              {durEl("#dce4ff", "#3a4a7a", "#6366f1")}
                              {deltaBadge}
                              <span style={{ flex: 1 }} />
                              {editingTimeSpotId === s.id
                                ? <input type="text" defaultValue={fmt(s.t)} aria-label={`${t.startTimeLabel} ${s.nm}`} autoFocus onKeyDown={(e) => { if (e.key === "Enter") updateSpotTime(dd.id, s.id, e.currentTarget.value); if (e.key === "Escape") setEditingTimeSpotId(null); }} style={{ width: 44, fontSize: 11, border: `1px solid #6366f1`, borderRadius: 4, padding: "1px 4px", outline: "none" }} />
                                : <button onClick={() => setEditingTimeSpotId(s.id)} aria-label={`${t.startTimeLabel} ${s.nm}`} style={{ fontSize: 11, color: "#6366f1", background: "none", border: "none", cursor: "pointer", padding: "1px 4px" }}>{timeRangeText}</button>
                              }
                              <button aria-label={`${t.editSpotLabel} ${s.nm}`} onClick={() => openEditSpot(s)} style={{ background: "none", border: "none", color: "#3a4a7a", cursor: "pointer", padding: "0 2px", display: "flex", alignItems: "center" }}>{pencilSvg}</button>
                              <button aria-label={`${t.deleteSpotLabel} ${s.nm}`} onClick={() => deleteSpot(s.id)} style={{ fontSize: 13, background: "none", border: "none", color: "#3a4a7a", cursor: "pointer", padding: "0 2px" }}>×</button>
                            </div>
                          </div>
                        )

                      ) : (
                        /* ── Normal spot card ── */
                        <div style={{ flex: 1, background: c >= 2 ? C.errBg : c === 1 ? C.warnBg : C.card, border: `1px solid ${c >= 2 ? C.errBorder : c === 1 ? C.warnBorder : C.light}`, borderRadius: 10, padding: "8px 10px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span style={{ width: 8, height: 8, borderRadius: 4, background: c >= 2 ? C.errText : c === 1 ? C.warnText : dc, flexShrink: 0 }} />
                            <span style={{ fontSize: 12, fontWeight: 500, color: C.ink }}>{s.nm}</span>
                            {durEl("#f0efec", C.muted, C.accent)}
                            {c >= 2 && <span style={{ fontSize: 8, padding: "1px 5px", borderRadius: 100, background: C.errBg, color: C.errText, fontWeight: 500, border: `1px solid ${C.errBorder}` }}>{t.closed}</span>}
                            {c === 1 && <span style={{ fontSize: 8, padding: "1px 5px", borderRadius: 100, background: C.warnBg, color: C.warnText, fontWeight: 500, border: `1px solid ${C.warnBorder}` }}>{t.warning}</span>}
                            {s.cl && c === 0 && <span style={{ fontSize: 8, color: C.muted }}>{t.closes} {fmt(s.cl)}</span>}
                            {deltaBadge}
                            <span style={{ flex: 1 }} />
                            {editingTimeSpotId === s.id
                              ? <input type="text" defaultValue={fmt(s.t)} aria-label={`${t.startTimeLabel} ${s.nm}`} autoFocus onKeyDown={(e) => { if (e.key === "Enter") updateSpotTime(dd.id, s.id, e.currentTarget.value); if (e.key === "Escape") setEditingTimeSpotId(null); }} style={{ width: 44, fontSize: 11, border: `1px solid ${C.accent}`, borderRadius: 4, padding: "1px 4px", outline: "none" }} />
                              : <button onClick={() => setEditingTimeSpotId(s.id)} aria-label={`${t.startTimeLabel} ${s.nm}`} style={{ fontSize: 11, color: C.muted, background: "none", border: "none", cursor: "pointer", padding: "1px 4px" }}>{timeRangeText}</button>
                            }
                            <button aria-label={`${t.editSpotLabel} ${s.nm}`} onClick={() => openEditSpot(s)} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", padding: "0 2px", display: "flex", alignItems: "center" }}>{pencilSvg}</button>
                            <button aria-label={`${t.deleteSpotLabel} ${s.nm}`} onClick={() => deleteSpot(s.id)} style={{ fontSize: 13, background: "none", border: "none", color: C.muted, cursor: "pointer", padding: "0 2px" }}>×</button>
                          </div>
                          {s.nt && <p style={{ fontSize: 9, color: C.accent, margin: "4px 0 0 14px" }}>{s.nt}</p>}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* E-3 + T-1: Add buttons */}
              <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                <button onClick={openAddSpot}
                  style={{ flex: 1, padding: "6px 0", borderRadius: 8, border: `1px dashed ${C.light}`, background: "transparent", color: C.muted, fontSize: 11, cursor: "pointer" }}>
                  {t.addSpot}
                </button>
                <button onClick={openAddTransit} aria-label={t.addTransit}
                  style={{ flex: 1, padding: "6px 0", borderRadius: 8, border: `1px dashed ${C.light}`, background: "transparent", color: C.muted, fontSize: 11, cursor: "pointer" }}>
                  {t.addTransit}
                </button>
              </div>

              {nC > 0 && (
                <div style={{ marginTop: 8, background: C.errBg, border: `1px solid ${C.errBorder}`, borderRadius: 8, padding: 10 }}>
                  {/* Header row */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                    <p style={{ fontSize: 11, fontWeight: 600, color: C.errText, margin: 0 }}>{t.conflictN.replace("{n}", String(nC))}</p>
                    {/* C-5: Wizard button when >= 3 conflicts */}
                    {nC >= 3 && (
                      <button onClick={() => setWizardOpen(true)}
                        style={{ ...pill, fontSize: 10, background: C.warnBg, color: C.warnText, borderColor: C.warnBorder }}>
                        {t.conflictWizard}
                      </button>
                    )}
                  </div>
                  {/* C-1 / C-2 global actions */}
                  <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                    <button onClick={handleAutoAdjust}
                      style={{ ...pill, fontSize: 10, background: C.infoBg, color: C.infoText, borderColor: C.infoBorder }}>
                      {t.aiAutoAdjust}
                    </button>
                    <button onClick={() => handleKeepAnyway(conflictSpots)}
                      style={{ ...pill, fontSize: 10 }}>
                      {t.keepAnyway}
                    </button>
                  </div>
                  {/* C-3 / C-4: per-spot actions */}
                  {conflictSpots.map((s) => (
                    <div key={s.id} style={{ marginBottom: 6 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 10, color: C.errText, fontWeight: 500, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.nm}</span>
                        {/* C-3: shorten duration / reschedule */}
                        {s.cl && (
                          <button onClick={() => handleShortenDuration(s.id)}
                            style={{ ...pill, fontSize: 9, padding: "3px 8px" }}>
                            {t.conflictShortenDur}
                          </button>
                        )}
                        {/* C-4: move to another day */}
                        <div style={{ position: "relative" }}>
                          <button onClick={() => setMoveSpotPickerSpotId(moveSpotPickerSpotId === s.id ? null : s.id)}
                            style={{ ...pill, fontSize: 9, padding: "3px 8px" }}>
                            {t.conflictMoveDay}
                          </button>
                          {moveSpotPickerSpotId === s.id && (
                            <div data-testid="move-day-picker"
                              style={{ position: "absolute", top: "calc(100% + 4px)", right: 0, background: C.card, border: `1px solid ${C.light}`, borderRadius: 8, padding: 6, zIndex: 200, minWidth: 130, boxShadow: "0 4px 12px rgba(0,0,0,.1)" }}>
                              {days.filter((d) => d.id !== selDay).map((d) => (
                                <button key={d.id}
                                  onClick={() => handleMoveSpotToDay(s.id, d.id)}
                                  style={{ display: "block", width: "100%", padding: "5px 8px", fontSize: 11, background: "none", border: "none", cursor: "pointer", textAlign: "left", borderRadius: 4, color: C.ink }}>
                                  D{d.n} {d.lb}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
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
            <MapView key={dd.id} day={dd} dayIndex={di} />
          )}
        </div>
      </div>

      {/* E-2: Delete day confirmation dialog */}
      {deleteConfirmDayId !== null && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div role="alertdialog" aria-modal="true" style={{ background: C.card, borderRadius: 16, padding: 24, width: 320, maxWidth: "90vw" }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: C.ink, margin: "0 0 20px" }}>{t.deleteDayConfirmMsg}</p>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setDeleteConfirmDayId(null)} style={{ flex: 1, padding: "10px 0", borderRadius: 100, border: `1px solid ${C.light}`, background: "transparent", color: C.muted, fontSize: 13, cursor: "pointer" }}>{t.deleteDayCancelBtn}</button>
              <button onClick={confirmDeleteDay} style={{ flex: 1, padding: "10px 0", borderRadius: 100, border: "none", background: C.errText, color: "#fff", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>{t.deleteDayConfirmBtn}</button>
            </div>
          </div>
        </div>
      )}

      {/* E-3: Add / Edit spot modal */}
      {spotModalOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }} onClick={closeSpotModal}>
          <div role="dialog" aria-modal="true" aria-label={spotModalType === "transit" ? (editingSpotId ? t.editTransitModalTitle : t.addTransitModalTitle) : (editingSpotId ? t.editSpotModalTitle : t.addSpotModalTitle)}
            onClick={(e) => e.stopPropagation()}
            style={{ background: C.card, borderRadius: 20, padding: 28, width: 380, maxWidth: "90vw" }}>
            <h3 style={{ fontSize: 17, fontWeight: 700, color: C.ink, margin: "0 0 20px" }}>
              {spotModalType === "transit" ? (editingSpotId ? t.editTransitModalTitle : t.addTransitModalTitle) : (editingSpotId ? t.editSpotModalTitle : t.addSpotModalTitle)}
            </h3>
            <div style={{ marginBottom: 20 }}>
              <label htmlFor="spot-name-input" style={{ fontSize: 12, fontWeight: 600, color: C.ink, display: "block", marginBottom: 5 }}>{spotModalType === "transit" ? t.transitNameLabel : t.spotNameLabel}</label>
              <input id="spot-name-input" type="text" value={spotFormName} onChange={(e) => { setSpotFormName(e.target.value); setSpotFormErr(""); }} placeholder={spotModalType === "transit" ? t.transitNamePlaceholder : t.spotNamePlaceholder} autoFocus
                style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: `1px solid ${spotFormErr ? C.errBorder : C.light}`, fontSize: 13, outline: "none", boxSizing: "border-box" }} />
              {spotFormErr && <p style={{ fontSize: 11, color: C.errText, margin: "4px 0 0" }}>{spotFormErr}</p>}
            </div>
            {!editingSpotId && spotModalType === "spot" && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                <input type="checkbox" id="spot-is-alt-toggle" checked={spotFormIsAlt}
                  onChange={(e) => setSpotFormIsAlt(e.target.checked)}
                  style={{ cursor: "pointer", width: 14, height: 14, accentColor: C.accent }} />
                <label htmlFor="spot-is-alt-toggle" style={{ fontSize: 12, color: C.muted, cursor: "pointer", userSelect: "none" }}>
                  {t.spotIsAltLabel}
                </label>
              </div>
            )}
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={closeSpotModal} style={{ flex: 1, padding: "11px 0", borderRadius: 100, border: `1px solid ${C.light}`, background: "transparent", color: C.muted, fontSize: 13, cursor: "pointer" }}>{t.spotCancelBtn}</button>
              <button onClick={handleSaveSpot} style={{ flex: 1, padding: "11px 0", borderRadius: 100, border: "none", background: C.accent, color: "#fff", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>
                {editingSpotId ? t.editSpotConfirmBtn : t.addSpotConfirmBtn}
              </button>
            </div>
            {editingSpotId && (() => {
              const editingSpot = dd ? getSpotsForDay(dd).find((s) => s.id === editingSpotId) : null;
              if (!editingSpot) return null;
              if (editingSpot.isA) {
                return (
                  <div style={{ borderTop: `1px solid ${C.light}`, paddingTop: 14, marginTop: 14 }}>
                    <p style={{ fontSize: 11, color: C.muted, marginBottom: 8 }}>{t.convertToSpotHint}</p>
                    <button onClick={() => convertAltToSpot(editingSpotId)} style={{ ...pill, fontSize: 11, color: C.muted, borderColor: C.light }}>
                      {t.convertToSpotBtn}
                    </button>
                  </div>
                );
              }
              return (
                <div style={{ borderTop: `1px solid ${C.light}`, paddingTop: 14, marginTop: 14 }}>
                  <p style={{ fontSize: 11, color: C.muted, marginBottom: 8 }}>{t.convertToAltHint}</p>
                  <button onClick={() => convertSpotToAlt(editingSpotId)} style={{ ...pill, fontSize: 11, color: C.accent, borderColor: C.accent }}>
                    {t.convertToAltBtn}
                  </button>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* T-1 / T-2: Add transit modal */}
      {transitModalOpen && (() => {
        const tm = transitFormTime.match(/^(\d{1,2}):(\d{2})$/);
        const depT = tm ? parseInt(tm[1]) * 60 + parseInt(tm[2]) : 0;
        const totalDur = transitFormHours * 60 + transitFormMins;
        const tzNum = parseInt(transitFormTzOffset) || 0;
        const corrected = depT + totalDur + tzNum * 60;
        const isCross = corrected >= 1440;
        const arrFmt = fmt(isCross ? corrected - 1440 : Math.max(0, corrected));
        const depInfo = lookupAirport(transitFormDep);
        const destInfo = lookupAirport(transitFormDest);
        const fmtUtc = (n: number) => `UTC${n >= 0 ? "+" : ""}${n}`;
        // DST-adjusted effective UTC for display
        const _year = parseInt(trip.dates.match(/\d{4}/)?.[0] ?? String(new Date().getFullYear()));
        const _curDay = days.find(d => d.id === selDay);
        const _dtM = _curDay?.dt.match(/^(\d{1,2})\/(\d{1,2})/);
        const _date = _dtM ? new Date(_year, parseInt(_dtM[1]) - 1, parseInt(_dtM[2])) : new Date();
        const depEff = depInfo ? depInfo.utc + (depInfo.dst ? getDSTAdjustment(depInfo.dst, _date) : 0) : 0;
        const destEff = destInfo ? destInfo.utc + (destInfo.dst ? getDSTAdjustment(destInfo.dst, _date) : 0) : 0;
        return (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }} onClick={closeTransitModal}>
            <div role="dialog" aria-modal="true" aria-label={editingTransitId ? t.editTransitModalTitle : t.addTransitModalTitle}
              onClick={(e) => e.stopPropagation()}
              style={{ background: C.card, borderRadius: 20, padding: 28, width: 400, maxWidth: "90vw" }}>
              <h3 style={{ fontSize: 17, fontWeight: 700, color: C.ink, margin: "0 0 16px" }}>{editingTransitId ? t.editTransitModalTitle : t.addTransitModalTitle}</h3>
              {/* Name */}
              <div style={{ marginBottom: 14 }}>
                <label htmlFor="transit-name-input" style={{ fontSize: 12, fontWeight: 600, color: C.ink, display: "block", marginBottom: 5 }}>{t.transitNameLabel}</label>
                <input id="transit-name-input" type="text" value={transitFormName} onChange={(e) => { setTransitFormName(e.target.value); setTransitFormErr(""); }} placeholder={t.transitNamePlaceholder} autoFocus
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: `1px solid ${transitFormErr ? C.errBorder : C.light}`, fontSize: 13, outline: "none", boxSizing: "border-box" }} />
                {transitFormErr && <p style={{ fontSize: 11, color: C.errText, margin: "4px 0 0" }}>{transitFormErr}</p>}
              </div>
              {/* T-3: Departure → Destination */}
              <div style={{ marginBottom: 14, display: "flex", gap: 8, alignItems: "flex-start" }}>
                <div style={{ flex: 1 }}>
                  <label htmlFor="transit-dep-input" style={{ fontSize: 12, fontWeight: 600, color: C.ink, display: "block", marginBottom: 5 }}>{t.transitDepLabel}</label>
                  <input id="transit-dep-input" aria-label={t.transitDepLabel} value={transitFormDep}
                    onChange={(e) => setTransitFormDep(e.target.value)}
                    placeholder="TPE"
                    style={{ width: "100%", padding: "8px 10px", borderRadius: 10, border: `1px solid ${C.light}`, fontSize: 13, outline: "none", boxSizing: "border-box" }} />
                  {depInfo && <p style={{ fontSize: 11, color: "#16a34a", margin: "3px 0 0" }}>✓ {depInfo.city} ({fmtUtc(depEff)}{depInfo.dst && getDSTAdjustment(depInfo.dst, _date) ? " DST" : ""})</p>}
                  {transitFormDep && !depInfo && <p style={{ fontSize: 11, color: C.errText, margin: "3px 0 0" }}>{t.transitUnknownCode}</p>}
                </div>
                <span style={{ paddingTop: 30, color: C.muted, fontSize: 14 }}>→</span>
                <div style={{ flex: 1 }}>
                  <label htmlFor="transit-dest-input" style={{ fontSize: 12, fontWeight: 600, color: C.ink, display: "block", marginBottom: 5 }}>{t.transitDestLabel}</label>
                  <input id="transit-dest-input" aria-label={t.transitDestLabel} value={transitFormDest}
                    onChange={(e) => setTransitFormDest(e.target.value)}
                    placeholder="DXB"
                    style={{ width: "100%", padding: "8px 10px", borderRadius: 10, border: `1px solid ${C.light}`, fontSize: 13, outline: "none", boxSizing: "border-box" }} />
                  {destInfo && <p style={{ fontSize: 11, color: "#16a34a", margin: "3px 0 0" }}>✓ {destInfo.city} ({fmtUtc(destEff)}{destInfo.dst && getDSTAdjustment(destInfo.dst, _date) ? " DST" : ""})</p>}
                  {transitFormDest && !destInfo && <p style={{ fontSize: 11, color: C.errText, margin: "3px 0 0" }}>{t.transitUnknownCode}</p>}
                </div>
              </div>
              {/* Departure time */}
              <div style={{ marginBottom: 14 }}>
                <label htmlFor="transit-time-input" style={{ fontSize: 12, fontWeight: 600, color: C.ink, display: "block", marginBottom: 5 }}>{t.startTimeLabel}</label>
                <input id="transit-time-input" type="text" aria-label={t.startTimeLabel} value={transitFormTime} onChange={(e) => setTransitFormTime(e.target.value)}
                  style={{ width: 90, padding: "8px 12px", borderRadius: 10, border: `1px solid ${C.light}`, fontSize: 13, outline: "none" }} />
              </div>
              {/* Duration */}
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: C.ink, display: "block", marginBottom: 5 }}>{t.durationLabel}</label>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <input type="number" aria-label={t.transitHours} min={0} value={transitFormHours} onChange={(e) => setTransitFormHours(Math.max(0, parseInt(e.target.value) || 0))}
                    style={{ width: 60, padding: "8px 10px", borderRadius: 10, border: `1px solid ${C.light}`, fontSize: 13, outline: "none" }} />
                  <span style={{ fontSize: 12, color: C.muted }}>{t.transitHours}</span>
                  <input type="number" aria-label={t.transitMins} min={0} max={59} value={transitFormMins} onChange={(e) => setTransitFormMins(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
                    style={{ width: 60, padding: "8px 10px", borderRadius: 10, border: `1px solid ${C.light}`, fontSize: 13, outline: "none" }} />
                  <span style={{ fontSize: 12, color: C.muted }}>{t.transitMins}</span>
                </div>
              </div>
              {/* T-3: Timezone offset */}
              <div style={{ marginBottom: 14 }}>
                <label htmlFor="transit-tz-input" style={{ fontSize: 12, fontWeight: 600, color: C.ink, display: "block", marginBottom: 3 }}>{t.transitTzOffset}</label>
                {depInfo && destInfo && (
                  <p style={{ fontSize: 11, color: "#16a34a", margin: "0 0 4px" }}>
                    {t.transitTzAutoDetected}：{depInfo.city}({fmtUtc(depEff)}) → {destInfo.city}({fmtUtc(destEff)})
                  </p>
                )}
                {(!depInfo || !destInfo) && (
                  <p style={{ fontSize: 11, color: C.muted, margin: "0 0 4px" }}>{t.transitTzHint}</p>
                )}
                <input id="transit-tz-input" type="text" aria-label={t.transitTzOffset}
                  value={transitFormTzOffset}
                  onChange={(e) => setTransitFormTzOffset(e.target.value)}
                  style={{ width: 70, padding: "8px 10px", borderRadius: 10, border: `1px solid ${C.light}`, fontSize: 13, outline: "none" }} />
              </div>
              {/* Computed arrival */}
              <div style={{ marginBottom: 20, padding: "8px 12px", borderRadius: 10, background: isCross ? "#fff8f0" : "#f8f9fa", border: `1px solid ${isCross ? C.accent + "40" : C.light}` }}>
                <span style={{ fontSize: 12, color: C.muted }}>{t.arrivalTime}: </span>
                <span style={{ fontSize: 13, fontWeight: 600, color: C.ink }}>{arrFmt}</span>
                {isCross && <span style={{ marginLeft: 6, fontSize: 11, color: C.accent, fontWeight: 600 }}>{t.nextDayBadge}</span>}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={closeTransitModal} style={{ flex: 1, padding: "11px 0", borderRadius: 100, border: `1px solid ${C.light}`, background: "transparent", color: C.muted, fontSize: 13, cursor: "pointer" }}>{t.spotCancelBtn}</button>
                <button onClick={handleSaveTransit} style={{ flex: 1, padding: "11px 0", borderRadius: 100, border: "none", background: C.accent, color: "#fff", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>{editingTransitId ? t.editSpotConfirmBtn : t.addSpotConfirmBtn}</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* C-5: Resolution wizard modal */}
      {wizardOpen && dd && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div role="dialog" aria-modal="true" aria-label={t.conflictWizardTitle}
            style={{ background: C.card, borderRadius: 20, padding: 28, width: 420, maxWidth: "90vw", maxHeight: "80vh", overflowY: "auto" }}>
            <h3 style={{ fontSize: 17, fontWeight: 700, color: C.ink, margin: "0 0 6px" }}>{t.conflictWizardTitle}</h3>
            <p style={{ fontSize: 12, color: C.muted, margin: "0 0 16px" }}>{t.conflictWizardDesc}</p>
            {getSpotsForDay(dd).filter((s) => getConflictLevel(s) >= 2 && !ignoredConflicts.has(s.id)).map((s) => (
              <div key={s.id} style={{ padding: "10px 0", borderBottom: `1px solid ${C.light}` }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: C.errText, margin: "0 0 6px" }}>{s.nm}</p>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {s.cl && (
                    <button onClick={() => handleShortenDuration(s.id)}
                      style={{ ...pill, fontSize: 10 }}>
                      {t.conflictShortenDur}
                    </button>
                  )}
                  <button onClick={() => setMoveSpotPickerSpotId(moveSpotPickerSpotId === s.id ? null : s.id)}
                    style={{ ...pill, fontSize: 10 }}>
                    {t.conflictMoveDay}
                  </button>
                </div>
                {moveSpotPickerSpotId === s.id && (
                  <div style={{ marginTop: 6, background: C.bg, borderRadius: 8, padding: 6 }}>
                    {days.filter((d) => d.id !== selDay).map((d) => (
                      <button key={d.id}
                        onClick={() => handleMoveSpotToDay(s.id, d.id)}
                        style={{ display: "block", width: "100%", padding: "4px 8px", fontSize: 11, background: "none", border: "none", cursor: "pointer", textAlign: "left", borderRadius: 4, color: C.ink }}>
                        D{d.n} {d.lb}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
            <div style={{ marginTop: 16 }}>
              <button onClick={() => setWizardOpen(false)}
                style={{ ...pill, width: "100%", justifyContent: "center" }}>
                {t.conflictWizardClose}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Alt option add/edit modal */}
      {altModalOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }} onClick={() => setAltModalOpen(false)}>
          <div style={{ background: C.card, borderRadius: 16, padding: 24, width: 320, maxWidth: "90vw", boxShadow: "0 8px 32px rgba(0,0,0,.18)" }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: C.ink, margin: "0 0 16px" }}>{altModalIndex === null ? "新增替代方案" : "編輯替代方案"}</h3>
            <label style={{ fontSize: 12, fontWeight: 600, color: C.ink, display: "block", marginBottom: 3 }}>名稱</label>
            <input value={altFormNm} onChange={e => setAltFormNm(e.target.value)} placeholder="替代方案名稱" autoFocus
              style={{ width: "100%", padding: "8px 10px", borderRadius: 10, border: `1px solid ${C.light}`, fontSize: 13, outline: "none", boxSizing: "border-box", marginBottom: 12 }} />
            <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: C.ink, display: "block", marginBottom: 3 }}>停留時長（分鐘）</label>
                <input type="number" value={altFormD} onChange={e => setAltFormD(e.target.value)}
                  style={{ width: "100%", padding: "8px 10px", borderRadius: 10, border: `1px solid ${C.light}`, fontSize: 13, outline: "none", boxSizing: "border-box" }} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: C.ink, display: "block", marginBottom: 3 }}>前往交通（分鐘）</label>
                <input type="number" value={altFormTr} onChange={e => setAltFormTr(e.target.value)}
                  style={{ width: "100%", padding: "8px 10px", borderRadius: 10, border: `1px solid ${C.light}`, fontSize: 13, outline: "none", boxSizing: "border-box" }} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              {altModalIndex !== null && dd && (getSpotsForDay(dd).find(s => s.id === altModalSpotId)?.ao?.length ?? 0) > 1 && (
                <button onClick={() => altModalSpotId !== null && deleteAlt(altModalSpotId, altModalIndex)}
                  style={{ padding: "11px 14px", borderRadius: 100, border: "none", background: "#fee2e2", color: "#dc2626", fontSize: 13, cursor: "pointer" }}>✕</button>
              )}
              <button onClick={() => setAltModalOpen(false)} style={{ flex: 1, padding: "11px 0", borderRadius: 100, border: `1px solid ${C.light}`, background: "transparent", color: C.muted, fontSize: 13, cursor: "pointer" }}>取消</button>
              <button onClick={saveAlt} disabled={!altFormNm.trim()}
                style={{ flex: 1, padding: "11px 0", borderRadius: 100, border: "none", background: altFormNm.trim() ? C.accent : C.light, color: "#fff", fontSize: 13, fontWeight: 500, cursor: altFormNm.trim() ? "pointer" : "default" }}>儲存</button>
            </div>
          </div>
        </div>
      )}

      {/* T-2: Linked transit delete confirmation dialog */}
      {linkedDeleteTargetId !== null && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div role="alertdialog" aria-modal="true" style={{ background: C.card, borderRadius: 16, padding: 24, width: 340, maxWidth: "90vw" }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: C.ink, margin: "0 0 20px" }}>{t.linkedTransitDeleteMsg}</p>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setLinkedDeleteTargetId(null)} style={{ flex: 1, padding: "10px 0", borderRadius: 100, border: `1px solid ${C.light}`, background: "transparent", color: C.muted, fontSize: 13, cursor: "pointer" }}>{t.deleteDayCancelBtn}</button>
              <button onClick={confirmLinkedDelete} style={{ flex: 1, padding: "10px 0", borderRadius: 100, border: "none", background: C.errText, color: "#fff", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>{t.linkedTransitDeleteBtn}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
