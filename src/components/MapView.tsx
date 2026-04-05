import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { MapContainer, TileLayer, Marker, Popup, Polyline } from "react-leaflet";
import type { Day } from "../types";
import { getSpotsForDay } from "../utils";
import { dayColors as DC } from "../utils/colors";

// Fix Leaflet's broken default icon URLs when bundled with Vite
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

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
  const centerLat = lats.reduce((a, b) => a + b, 0) / lats.length;
  const centerLng = lngs.reduce((a, b) => a + b, 0) / lngs.length;

  const dc = DC[Math.max(0, dayIndex) % DC.length];
  const polylinePositions: [number, number][] = pts.map((s) => [s.la, s.ln]);

  const makeIcon = (index: number) =>
    L.divIcon({
      className: "",
      html: `<div style="width:22px;height:22px;border-radius:50%;background:${dc};color:#fff;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;box-shadow:0 1px 4px rgba(0,0,0,.3)">${index + 1}</div>`,
      iconSize: [22, 22],
      iconAnchor: [11, 11],
    });

  return (
    <div data-testid="map-container" style={{ height: "100%" }}>
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
        {pts.length > 1 && (
          <Polyline
            positions={polylinePositions}
            color={dc}
            weight={2}
            dashArray="6 4"
            opacity={0.6}
          />
        )}
      </MapContainer>
    </div>
  );
}
