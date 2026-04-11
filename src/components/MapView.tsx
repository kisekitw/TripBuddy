import React, { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { MapContainer, TileLayer, Marker, Popup, Polyline } from "react-leaflet";
import type { Day } from "../types";
import { getSpotsForDay } from "../utils";
import { dayColors as DC } from "../utils/colors";
import { fetchTransitMinutes } from "../utils/directions";

// Fix Leaflet's broken default icon URLs when bundled with Vite
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

function fmtTr(minutes: number): string {
  if (minutes <= 0) return "";
  const h = Math.floor(minutes / 60), m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

interface Props {
  day: Day;
  dayIndex: number;
  /** M-5: Google Maps API key. When provided, real transit times are fetched. */
  apiKey?: string;
  /** M-5: Called with (spotId, minutes) after a directions fetch succeeds. */
  onTransitUpdate?: (spotId: string, minutes: number) => void;
}

export function MapView({ day, dayIndex, apiKey, onTransitUpdate }: Props) {
  const spots = getSpotsForDay(day);
  const pts = spots.filter((s) => s.la);

  const segments = pts.slice(0, -1).map((from, i) => {
    const to = pts[i + 1];
    return {
      from, to,
      midLat: (from.la + to.la) / 2,
      midLng: (from.ln + to.ln) / 2,
      label: fmtTr(from.tr),
    };
  });

  // M-5: Fetch real transit times when API key is provided.
  // Use ref so the latest onTransitUpdate is always called without adding it to deps.
  const onTransitUpdateRef = useRef(onTransitUpdate);
  onTransitUpdateRef.current = onTransitUpdate;

  useEffect(() => {
    if (!apiKey || !pts.length) return;
    segments.forEach(({ from, to }) => {
      if (!from.la || !to.la) return;
      fetchTransitMinutes([from.la, from.ln], [to.la, to.ln], apiKey).then(
        (minutes) => {
          if (minutes !== null) onTransitUpdateRef.current?.(from.id, minutes);
        },
      );
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [day.id, day.av, apiKey]);

  if (!pts.length) return null;

  const lats = pts.map((s) => s.la);
  const lngs = pts.map((s) => s.ln);
  const centerLat = lats.reduce((a, b) => a + b, 0) / lats.length;
  const centerLng = lngs.reduce((a, b) => a + b, 0) / lngs.length;

  const dc = DC[Math.max(0, dayIndex) % DC.length];

  const makeIcon = (index: number) =>
    L.divIcon({
      className: "",
      html: `<div style="width:22px;height:22px;border-radius:50%;background:${dc};color:#fff;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;box-shadow:0 1px 4px rgba(0,0,0,.3)">${index + 1}</div>`,
      iconSize: [22, 22],
      iconAnchor: [11, 11],
    });

  const makeLabelIcon = (label: string) =>
    L.divIcon({
      className: "",
      html: `<div style="
        background:#fff;color:${dc};border:1.5px solid ${dc};
        border-radius:100px;padding:2px 7px;font-size:10px;font-weight:600;
        white-space:nowrap;box-shadow:0 1px 3px rgba(0,0,0,.25);
        transform:translate(-50%,-50%);pointer-events:none;
      ">${label}</div>`,
      iconSize: [0, 0],
      iconAnchor: [0, 0],
    });

  // M-4: semi-transparent icons for unselected alternative options
  const makeAltIcon = (initial: string) =>
    L.divIcon({
      className: "",
      html: `<div style="width:18px;height:18px;border-radius:50%;background:${dc};color:#fff;display:flex;align-items:center;justify-content:center;font-size:8px;font-weight:700;opacity:0.35;box-shadow:0 1px 3px rgba(0,0,0,.2)">${initial}</div>`,
      iconSize: [18, 18],
      iconAnchor: [9, 9],
    });

  // M-4: collect unselected ao options for each isA spot
  const altMarkers = pts
    .filter((s) => s.isA && s.ao && s.ao.length > 1)
    .flatMap((s) =>
      (s.ao ?? [])
        .filter((_, i) => i !== (s.si ?? 0))
        .map((o, idx) => ({
          key: `alt-${s.id}-${idx}`,
          nm: o.nm,
          la: s.la,
          ln: s.ln,
        })),
    );

  return (
    // M-3: data-variant tracks active variant for animation; key change in App.tsx forces remount
    <div
      data-testid="map-container"
      data-variant={day.av ?? 0}
      style={{ height: "100%", animation: "mapFadeIn 0.35s ease" }}
    >
      <style>{`@keyframes mapFadeIn { from { opacity: 0; } to { opacity: 1; } }`}</style>
      <MapContainer
        center={[centerLat, centerLng]}
        zoom={14}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />
        {pts.map((s, i) => (
          <Marker key={s.id} position={[s.la, s.ln]} icon={makeIcon(i)}>
            <Popup>{s.nm}</Popup>
          </Marker>
        ))}
        {segments.map(({ from, to, midLat, midLng, label }) => (
          <React.Fragment key={`seg-${from.id}-${to.id}`}>
            <Polyline
              positions={[[from.la, from.ln], [to.la, to.ln]]}
              color={dc} weight={2} dashArray="6 4" opacity={0.6}
            />
            {label && (
              <Marker
                position={[midLat, midLng]}
                icon={makeLabelIcon(label)}
                interactive={false}
                aria-label={label}
              />
            )}
          </React.Fragment>
        ))}
        {/* M-4: semi-transparent markers for unselected alt options */}
        {altMarkers.map((am) => (
          <Marker
            key={am.key}
            position={[am.la, am.ln]}
            icon={makeAltIcon(am.nm.slice(0, 1))}
            interactive={false}
            // @ts-expect-error — data-testid is consumed by the test mock, ignored by Leaflet
            data-testid="map-alt-marker"
            aria-label={am.nm}
            opacity={0.35}
          />
        ))}
      </MapContainer>
    </div>
  );
}
